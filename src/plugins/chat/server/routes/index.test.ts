/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import supertest from 'supertest';
import { setupServer } from '../../../../core/server/test_utils';
import { loggingSystemMock } from '../../../../core/server/mocks';
import { defineRoutes } from './index';

// Mock native fetch
global.fetch = jest.fn();

jest.mock('./ml_routes/oasis_ml_commons_agent', () => ({
  forwardToOasisMLAgent: jest.fn(),
}));

import { forwardToOasisMLAgent } from './ml_routes/oasis_ml_commons_agent';
const mockForwardToOasisMLAgent = forwardToOasisMLAgent as jest.MockedFunction<
  typeof forwardToOasisMLAgent
>;

describe('Chat Proxy Routes', () => {
  let server: any;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockLogger: any;
  let mockCapabilitiesResolver: jest.Mock;
  let mockOasisService: any;

  const testSetup = async (
    agUiUrl?: string,
    getCapabilitiesResolver?: () => ((request: any) => Promise<any>) | undefined,
    mlCommonsAgentId?: string,
    oasisService?: any
  ) => {
    const { server: testServer, httpSetup } = await setupServer();
    const router = httpSetup.createRouter('');
    mockLogger = loggingSystemMock.create().get();

    defineRoutes(
      router,
      mockLogger,
      agUiUrl,
      getCapabilitiesResolver,
      mlCommonsAgentId,
      oasisService
    );

    // Mock dynamicConfigService required by server.start()
    const dynamicConfigService = {
      getClient: jest.fn(),
      getAsyncLocalStore: jest.fn(),
      createStoreFromRequest: jest.fn(),
    };
    await testServer.start({ dynamicConfigService });
    server = testServer;
    return httpSetup;
  };

  beforeEach(() => {
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;

    // Mock capabilities resolver
    mockCapabilitiesResolver = jest.fn().mockResolvedValue({
      investigation: {
        agenticFeaturesEnabled: false, // Default to false
      },
    });

    // Mock OASIS service
    mockOasisService = {
      getScopedClient: jest.fn(),
      getOasisConfig: jest.fn().mockReturnValue({
        enabled: true,
        endpoint: 'https://mock-oasis:3001',
        region: 'us-west-2',
        timeout: 5000,
      }),
    };

    // Configure OASIS ML agent mock to return a proper response object
    mockForwardToOasisMLAgent.mockImplementation(async (...args) => {
      const response = args[2]; // The response object is the third parameter
      const configuredAgentId = args[5]; // The configuredAgentId is the sixth parameter

      // Simulate the real function's behavior when agent ID is missing
      if (!configuredAgentId) {
        return response.customError({
          statusCode: 503,
          body: { message: 'ML Commons agent ID not configured' },
        });
      }

      // Normal success case
      return response.ok({
        headers: { 'Content-Type': 'text/event-stream' },
        body: 'Mock OASIS streaming response',
      });
    });

    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('POST /api/chat/proxy', () => {
    const validRequest = {
      threadId: 'thread-123',
      runId: 'run-456',
      messages: [{ role: 'user', content: 'Hello' }],
      tools: [],
      context: [],
      state: {},
      forwardedProps: {},
    };

    it('should successfully proxy request to AG-UI server with streaming response', async () => {
      // Mock a streaming response
      const mockChunks = [
        Buffer.from('data: {"type":"start"}\n'),
        Buffer.from('data: {"type":"message","content":"Hello!"}\n'),
        Buffer.from('data: {"type":"end"}\n'),
      ];

      let chunkIndex = 0;
      const mockReader = {
        read: jest.fn().mockImplementation(async () => {
          if (chunkIndex < mockChunks.length) {
            return { done: false, value: mockChunks[chunkIndex++] };
          }
          return { done: true, value: undefined };
        }),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: {
          getReader: () => mockReader,
        },
      } as any);

      const httpSetup = await testSetup('http://test-agui:3000');

      const response = await supertest(httpSetup.server.listener)
        .post('/api/chat/proxy')
        .send(validRequest)
        .expect(200);

      // Verify fetch was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith('http://test-agui:3000', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(validRequest),
      });

      // Verify response headers for SSE
      expect(response.headers['content-type']).toContain('text/event-stream');
      expect(response.headers['content-encoding']).toBe('identity');
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.headers.connection).toBe('keep-alive');
    });

    it('should return 503 when AG-UI URL is not configured', async () => {
      const httpSetup = await testSetup(); // No agUiUrl provided

      const response = await supertest(httpSetup.server.listener)
        .post('/api/chat/proxy')
        .send(validRequest)
        .expect(503);

      expect(response.body).toEqual({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'No AI agent available: ML Commons agent not enabled and AG-UI URL not configured',
      });

      // Verify fetch was not called
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle AG-UI server errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as any);

      const httpSetup = await testSetup('http://test-agui:3000');

      const response = await supertest(httpSetup.server.listener)
        .post('/api/chat/proxy')
        .send(validRequest)
        .expect(500);

      expect(response.body.message).toContain('AG-UI server error');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle network/fetch errors', async () => {
      const networkError = new Error('Network connection failed');
      mockFetch.mockRejectedValue(networkError);

      const httpSetup = await testSetup('http://test-agui:3000');

      const response = await supertest(httpSetup.server.listener)
        .post('/api/chat/proxy')
        .send(validRequest)
        .expect(500);

      expect(response.body.message).toBe('Network connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error proxying request to AG-UI')
      );
    });

    it('should validate request body schema', async () => {
      const httpSetup = await testSetup('http://test-agui:3000');

      // Missing required fields
      await supertest(httpSetup.server.listener)
        .post('/api/chat/proxy')
        .send({ invalid: 'data' })
        .expect(400);

      // Missing threadId
      await supertest(httpSetup.server.listener)
        .post('/api/chat/proxy')
        .send({ runId: 'run-123', messages: [] })
        .expect(400);

      // Missing runId
      await supertest(httpSetup.server.listener)
        .post('/api/chat/proxy')
        .send({ threadId: 'thread-123', messages: [] })
        .expect(400);

      // Verify fetch was never called due to validation failures
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle empty stream responses', async () => {
      const mockReader = {
        read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: {
          getReader: () => mockReader,
        },
      } as any);

      const httpSetup = await testSetup('http://test-agui:3000');

      await supertest(httpSetup.server.listener)
        .post('/api/chat/proxy')
        .send(validRequest)
        .expect(200);

      expect(mockReader.read).toHaveBeenCalled();
    });

    it('should handle stream read errors gracefully', async () => {
      const mockReader = {
        read: jest.fn().mockRejectedValue(new Error('Stream read error')),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: {
          getReader: () => mockReader,
        },
      } as any);

      const httpSetup = await testSetup('http://test-agui:3000');

      // Stream errors during transmission will cause connection to close
      // This is expected behavior - we just verify the server doesn't crash
      try {
        await supertest(httpSetup.server.listener).post('/api/chat/proxy').send(validRequest);
      } catch (error) {
        // Socket hang up or ECONNRESET is expected when stream fails
        expect(error.message).toMatch(/socket hang up|ECONNRESET|aborted/i);
      }

      // Verify the stream was attempted to be read
      expect(mockReader.read).toHaveBeenCalled();
    });

    describe('OASIS Integration', () => {
      it('should route to OASIS when agenticFeaturesEnabled is true and OASIS is enabled', async () => {
        // Enable agentic features
        mockCapabilitiesResolver.mockResolvedValue({
          investigation: {
            agenticFeaturesEnabled: true,
          },
        });

        const httpSetup = await testSetup(
          'http://test-agui:3000',
          () => mockCapabilitiesResolver,
          'test-agent-id',
          mockOasisService
        );

        await supertest(httpSetup.server.listener)
          .post('/api/chat/proxy')
          .send(validRequest)
          .expect(200);

        // Verify capabilities were checked
        expect(mockCapabilitiesResolver).toHaveBeenCalled();

        // Verify OASIS ML agent function was called
        expect(mockForwardToOasisMLAgent).toHaveBeenCalledWith(
          expect.any(Object), // context
          expect.objectContaining({
            body: validRequest,
          }), // request
          expect.any(Object), // response
          expect.any(Object), // logger
          mockOasisService, // oasisService
          'test-agent-id', // configuredAgentId
          undefined // dataSourceId
        );

        // Verify AG-UI was NOT called
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should fallback to AG-UI when agenticFeaturesEnabled is true but OASIS is disabled', async () => {
        // Enable agentic features but disable OASIS
        mockCapabilitiesResolver.mockResolvedValue({
          investigation: {
            agenticFeaturesEnabled: true,
          },
        });
        mockOasisService.getOasisConfig.mockReturnValue({
          enabled: false,
        });

        // Mock successful AG-UI response
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          body: {
            getReader: () => ({
              read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
            }),
          },
        } as any);

        const httpSetup = await testSetup(
          'http://test-agui:3000',
          () => mockCapabilitiesResolver,
          'test-agent-id',
          mockOasisService
        );

        await supertest(httpSetup.server.listener)
          .post('/api/chat/proxy')
          .send(validRequest)
          .expect(200);

        // Verify capabilities were checked
        expect(mockCapabilitiesResolver).toHaveBeenCalled();

        // Verify OASIS was checked but not used
        expect(mockOasisService.getOasisConfig).toHaveBeenCalled();
        expect(mockOasisService.getScopedClient).not.toHaveBeenCalled();
        expect(mockForwardToOasisMLAgent).not.toHaveBeenCalled();

        // Verify AG-UI was called as fallback
        expect(mockFetch).toHaveBeenCalledWith('http://test-agui:3000', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(validRequest),
        });
      });

      it('should fallback to AG-UI when agenticFeaturesEnabled is false', async () => {
        // Disable agentic features
        mockCapabilitiesResolver.mockResolvedValue({
          investigation: {
            agenticFeaturesEnabled: false,
          },
        });

        // Mock successful AG-UI response
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          body: {
            getReader: () => ({
              read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
            }),
          },
        } as any);

        const httpSetup = await testSetup(
          'http://test-agui:3000',
          () => mockCapabilitiesResolver,
          'test-agent-id',
          mockOasisService
        );

        await supertest(httpSetup.server.listener)
          .post('/api/chat/proxy')
          .send(validRequest)
          .expect(200);

        // Verify capabilities were checked
        expect(mockCapabilitiesResolver).toHaveBeenCalled();

        // Verify OASIS was not used
        expect(mockOasisService.getScopedClient).not.toHaveBeenCalled();
        expect(mockForwardToOasisMLAgent).not.toHaveBeenCalled();

        // Verify AG-UI was called
        expect(mockFetch).toHaveBeenCalled();
      });

      it('should return 503 when ML Commons agent ID is not configured', async () => {
        // Enable agentic features
        mockCapabilitiesResolver.mockResolvedValue({
          investigation: {
            agenticFeaturesEnabled: true,
          },
        });

        const httpSetup = await testSetup(
          undefined, // No AG-UI URL
          () => mockCapabilitiesResolver,
          undefined, // No ML Commons agent ID
          mockOasisService
        );

        const response = await supertest(httpSetup.server.listener)
          .post('/api/chat/proxy')
          .send(validRequest)
          .expect(503);

        expect(response.body.message).toContain('ML Commons agent ID not configured');

        // Verify OASIS ML agent function was called but returned error due to missing agent ID
        expect(mockForwardToOasisMLAgent).toHaveBeenCalledWith(
          expect.any(Object), // context
          expect.objectContaining({
            body: validRequest,
          }), // request
          expect.any(Object), // response
          expect.any(Object), // logger
          mockOasisService, // oasisService
          undefined, // configuredAgentId (undefined = missing)
          undefined // dataSourceId
        );

        // Verify AG-UI was not called since OASIS handled the error
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should fallback to AG-UI when capabilities resolver is not available', async () => {
        // Mock successful AG-UI response
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          body: {
            getReader: () => ({
              read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
            }),
          },
        } as any);

        const httpSetup = await testSetup(
          'http://test-agui:3000',
          undefined, // No capabilities resolver
          'test-agent-id',
          mockOasisService
        );

        await supertest(httpSetup.server.listener)
          .post('/api/chat/proxy')
          .send(validRequest)
          .expect(200);

        // Verify OASIS was not used
        expect(mockOasisService.getScopedClient).not.toHaveBeenCalled();
        expect(mockForwardToOasisMLAgent).not.toHaveBeenCalled();

        // Verify AG-UI was called as fallback
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });
});
