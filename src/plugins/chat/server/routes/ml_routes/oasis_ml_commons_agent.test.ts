/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { forwardToOasisMLAgent } from './oasis_ml_commons_agent';
import { loggingSystemMock } from '../../../../../core/server/mocks';
import * as stream from 'stream';

describe('forwardToOasisMLAgent', () => {
  let mockContext: any;
  let mockRequest: any;
  let mockResponse: any;
  let mockLogger: any;
  let mockOasisService: any;
  let mockOasisClient: any;

  const validRequestBody = {
    threadId: 'thread-123',
    runId: 'run-456',
    messages: [{ role: 'user', content: 'Hello' }],
    tools: [],
    context: [],
    state: {},
    forwardedProps: {},
  };

  beforeEach(() => {
    mockLogger = loggingSystemMock.create().get();

    mockContext = {
      core: {
        savedObjects: {
          client: {
            get: jest.fn(),
          },
        },
      },
    };

    mockRequest = {
      body: validRequestBody,
      query: {},
      headers: {},
    };

    mockResponse = {
      ok: jest.fn().mockReturnValue({ status: 200 }),
      customError: jest.fn().mockReturnValue({ status: 400 }),
    };

    // Mock OASIS client
    mockOasisClient = {
      request: jest.fn(),
    };

    // Mock OASIS service
    mockOasisService = {
      getScopedClient: jest.fn().mockReturnValue(mockOasisClient),
      getOasisConfig: jest.fn().mockReturnValue({
        enabled: true,
        endpoint: 'https://mock-oasis:3001',
        region: 'us-west-2',
        timeout: 5000,
      }),
    };

    jest.clearAllMocks();
  });

  describe('Parameter validation', () => {
    it('should return 503 when configuredAgentId is not provided', async () => {
      await forwardToOasisMLAgent(
        mockContext,
        mockRequest,
        mockResponse,
        mockLogger,
        mockOasisService,
        undefined // No agent ID
      );

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: { message: 'ML Commons agent ID not configured' },
      });
      expect(mockOasisService.getScopedClient).not.toHaveBeenCalled();
    });

    it('should return 400 when request body is missing', async () => {
      mockRequest.body = undefined;

      await forwardToOasisMLAgent(
        mockContext,
        mockRequest,
        mockResponse,
        mockLogger,
        mockOasisService,
        'test-agent-id'
      );

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: { message: 'Invalid request body for ML Commons agent' },
      });
      expect(mockOasisService.getScopedClient).not.toHaveBeenCalled();
    });

    it('should return 400 when request body is not an object', async () => {
      mockRequest.body = 'invalid string body';

      await forwardToOasisMLAgent(
        mockContext,
        mockRequest,
        mockResponse,
        mockLogger,
        mockOasisService,
        'test-agent-id'
      );

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: { message: 'Invalid request body for ML Commons agent' },
      });
      expect(mockOasisService.getScopedClient).not.toHaveBeenCalled();
    });
  });

  describe('Successful OASIS requests', () => {
    it('should handle streaming response correctly', async () => {
      // Mock streaming response (has readable stream body)
      const mockStream = new stream.Readable();
      mockStream.pipe = jest.fn();

      mockOasisClient.request.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/event-stream' },
        body: mockStream, // Readable stream indicates streaming response
      });

      await forwardToOasisMLAgent(
        mockContext,
        mockRequest,
        mockResponse,
        mockLogger,
        mockOasisService,
        'test-agent-id'
      );

      // Verify OASIS client was called correctly
      expect(mockOasisService.getScopedClient).toHaveBeenCalledWith(mockRequest, mockContext);
      expect(mockOasisClient.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_plugins/_ml/agents/test-agent-id/_execute',
        body: JSON.stringify(validRequestBody),
        datasourceId: undefined,
        stream: true,
      });

      // Verify streaming response was returned
      expect(mockResponse.ok).toHaveBeenCalledWith({
        headers: {
          'Content-Type': 'text/event-stream',
          'Content-Encoding': 'identity',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Transfer-Encoding': 'chunked',
          'X-Accel-Buffering': 'no',
        },
        body: mockStream,
      });
    });

    it('should handle buffered string response correctly', async () => {
      const mockResponseBody = '{"result": "success", "message": "ML agent completed"}';

      mockOasisClient.request.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: mockResponseBody, // String body indicates buffered response
      });

      await forwardToOasisMLAgent(
        mockContext,
        mockRequest,
        mockResponse,
        mockLogger,
        mockOasisService,
        'test-agent-id'
      );

      // Verify OASIS client was called correctly
      expect(mockOasisClient.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_plugins/_ml/agents/test-agent-id/_execute',
        body: JSON.stringify(validRequestBody),
        datasourceId: undefined,
        stream: true,
      });

      // Verify buffered response was parsed and returned
      expect(mockResponse.ok).toHaveBeenCalledWith({
        headers: { 'Content-Type': 'application/json' },
        body: JSON.parse(mockResponseBody),
      });
    });

    it('should handle buffered object response correctly', async () => {
      const mockResponseBody = { result: 'success', message: 'ML agent completed' };

      mockOasisClient.request.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: mockResponseBody, // Object body indicates buffered response
      });

      await forwardToOasisMLAgent(
        mockContext,
        mockRequest,
        mockResponse,
        mockLogger,
        mockOasisService,
        'test-agent-id'
      );

      // Verify buffered response was returned as-is
      expect(mockResponse.ok).toHaveBeenCalledWith({
        headers: { 'Content-Type': 'application/json' },
        body: mockResponseBody,
      });
    });

    it('should pass dataSourceId when provided', async () => {
      mockOasisClient.request.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: '{"result": "success"}',
      });

      await forwardToOasisMLAgent(
        mockContext,
        mockRequest,
        mockResponse,
        mockLogger,
        mockOasisService,
        'test-agent-id',
        'datasource-123' // dataSourceId provided
      );

      expect(mockOasisClient.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_plugins/_ml/agents/test-agent-id/_execute',
        body: JSON.stringify(validRequestBody),
        datasourceId: 'datasource-123', // Should be passed through
        stream: true,
      });
    });
  });

  describe('OASIS error handling', () => {
    it('should handle network/connection errors', async () => {
      const networkError = new Error('Network connection failed');
      mockOasisClient.request.mockRejectedValue(networkError);

      await forwardToOasisMLAgent(
        mockContext,
        mockRequest,
        mockResponse,
        mockLogger,
        mockOasisService,
        'test-agent-id'
      );

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'OASIS ML Commons agent error: Network connection failed',
        },
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle 404 agent not found errors', async () => {
      const notFoundError = new Error('404 Agent not found: test-agent-id');
      mockOasisClient.request.mockRejectedValue(notFoundError);

      await forwardToOasisMLAgent(
        mockContext,
        mockRequest,
        mockResponse,
        mockLogger,
        mockOasisService,
        'test-agent-id'
      );

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 404,
        body: { message: 'ML Commons agent "test-agent-id" not found' },
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Something went wrong');
      mockOasisClient.request.mockRejectedValue(genericError);

      await forwardToOasisMLAgent(
        mockContext,
        mockRequest,
        mockResponse,
        mockLogger,
        mockOasisService,
        'test-agent-id'
      );

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'OASIS ML Commons agent error: Something went wrong',
        },
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle non-Error objects', async () => {
      const stringError = 'String error message';
      mockOasisClient.request.mockRejectedValue(stringError);

      await forwardToOasisMLAgent(
        mockContext,
        mockRequest,
        mockResponse,
        mockLogger,
        mockOasisService,
        'test-agent-id'
      );

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'OASIS ML Commons agent error: Unknown error',
        },
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid JSON in string response by returning error', async () => {
      const invalidJsonResponse = '{"invalid": json}'; // Invalid JSON

      mockOasisClient.request.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: invalidJsonResponse,
      });

      await forwardToOasisMLAgent(
        mockContext,
        mockRequest,
        mockResponse,
        mockLogger,
        mockOasisService,
        'test-agent-id'
      );

      // JSON.parse error should be caught and result in 500 error
      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: expect.stringContaining('OASIS ML Commons agent error:'),
        },
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should log detailed information on successful requests', async () => {
      mockOasisClient.request.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: '{"result": "success"}',
      });

      await forwardToOasisMLAgent(
        mockContext,
        mockRequest,
        mockResponse,
        mockLogger,
        mockOasisService,
        'test-agent-id',
        'datasource-123'
      );

      // Verify debug logging occurred
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Forwarding request to OASIS ML Commons agent',
        {
          agentId: 'test-agent-id',
          dataSourceId: 'datasource-123',
        }
      );
    });
  });
});
