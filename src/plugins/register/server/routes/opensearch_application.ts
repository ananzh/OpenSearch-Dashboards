import { schema } from '@osd/config-schema';
import { IRouter, Logger } from 'opensearch-dashboards/server';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { OpenSearchConfig } from '../types';

export function opensearchApplicationRoute(router: IRouter, logger: Logger) {
  router.post(
    {
      path: '/api/soap/register/opensearch-application',
      validate: {
        body: schema.object({
          endpoint: schema.string(),
          credentials: schema.object({
            accessKeyId: schema.string(),
            secretAccessKey: schema.string(),
            sessionToken: schema.maybe(schema.string()),
            region: schema.string(),
          }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const config = request.body as OpenSearchConfig;
        
        // Create OpenSearch client with IAM credentials
        const client = new Client({
          ...AwsSigv4Signer({
            region: config.credentials.region,
            service: 'es',
            getCredentials: () =>
              Promise.resolve({
                accessKeyId: config.credentials.accessKeyId,
                secretAccessKey: config.credentials.secretAccessKey,
                sessionToken: config.credentials.sessionToken,
              }),
          }),
          node: config.endpoint,
        });

        // Test connection
        const info = await client.info();
        
        logger.info('OpenSearch application created successfully');
        return response.ok({
          body: {
            message: 'OpenSearch application created successfully',
            clusterInfo: info.body,
          },
        });
      } catch (error) {
        logger.error('Error creating OpenSearch application:', error);
        return response.badRequest({
          body: { error: 'Failed to create OpenSearch application' },
        });
      }
    }
  );

  router.get(
    {
      path: '/api/soap/register/opensearch-application/status',
      validate: false,
    },
    async (context, request, response) => {
      try {
        // TODO: Check stored application status
        return response.ok({
          body: { status: 'ready', message: 'OpenSearch application is ready' },
        });
      } catch (error) {
        logger.error('Error checking OpenSearch application status:', error);
        return response.badRequest({
          body: { error: 'Failed to check application status' },
        });
      }
    }
  );
}