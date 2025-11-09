/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Logger,
  RequestHandlerContext,
  OpenSearchDashboardsRequest,
  IOpenSearchDashboardsResponse,
} from '../../../../../core/server';
import { OasisServiceSetup } from '../../../../../../plugins/NeoDashboardsPlugin/server/oasis/service';
import {
  OasisStreamResponse,
  OasisBufferedResponse,
} from '../../../../../../plugins/NeoDashboardsPlugin/server/oasis/client';

/**
 * Type guard to check if response is streaming
 */
function isStreamResponse(
  response: OasisStreamResponse | OasisBufferedResponse
): response is OasisStreamResponse {
  return response && typeof response.body === 'object' && 'pipe' in response.body;
}

/**
 * Forward request to ML Commons agent via OASIS
 */
export async function forwardToOasisMLAgent(
  context: RequestHandlerContext,
  request: OpenSearchDashboardsRequest,
  response: IOpenSearchDashboardsResponse,
  logger: Logger,
  oasisService: OasisServiceSetup,
  configuredAgentId?: string,
  dataSourceId?: string
) {
  if (!configuredAgentId) {
    return response.customError({
      statusCode: 503,
      body: { message: 'ML Commons agent ID not configured' },
    });
  }

  // Validate request body
  if (!request.body || typeof request.body !== 'object') {
    return response.customError({
      statusCode: 400,
      body: { message: 'Invalid request body for ML Commons agent' },
    });
  }

  try {
    logger.debug('Forwarding request to OASIS ML Commons agent', {
      agentId: configuredAgentId,
      dataSourceId,
    });

    const oasisClient = oasisService.getScopedClient(request, context);

    const oasisResponse = await oasisClient.request({
      method: 'POST',
      path: `/_plugins/_ml/agents/${configuredAgentId}/_execute`,
      body: JSON.stringify(request.body),
      datasourceId: dataSourceId, // Use actual dataSourceId from request
      stream: true,
    });

    // Handle streaming response properly using type guard
    if (isStreamResponse(oasisResponse)) {
      return response.ok({
        headers: {
          'Content-Type': 'text/event-stream',
          'Content-Encoding': 'identity',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Transfer-Encoding': 'chunked',
          'X-Accel-Buffering': 'no',
        },
        body: oasisResponse.body,
      });
    } else {
      return response.ok({
        headers: { 'Content-Type': 'application/json' },
        body:
          typeof oasisResponse.body === 'string'
            ? JSON.parse(oasisResponse.body)
            : oasisResponse.body,
      });
    }
  } catch (error) {
    logger.error(`Error forwarding to OASIS ML Commons agent: ${error}`);

    if (error instanceof Error && error.message.includes('404')) {
      return response.customError({
        statusCode: 404,
        body: { message: `ML Commons agent "${configuredAgentId}" not found` },
      });
    }

    return response.customError({
      statusCode: 500,
      body: {
        message: `OASIS ML Commons agent error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      },
    });
  }
}
