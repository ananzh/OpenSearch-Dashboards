import { schema } from '@osd/config-schema';
import { IRouter, Logger } from 'opensearch-dashboards/server';
import { IAMCredentials } from '../types';

export function iamCredentialsRoute(router: IRouter, logger: Logger) {
  router.get(
    {
      path: '/api/register/iam-credentials',
      validate: false,
    },
    async (context, request, response) => {
      try {
        // For now, return manual IAM credentials
        // TODO: Retrieve from stored session credentials
        const credentials: IAMCredentials = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'MANUAL_ACCESS_KEY',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'MANUAL_SECRET_KEY',
          sessionToken: process.env.AWS_SESSION_TOKEN,
          region: process.env.AWS_REGION || 'us-west-2',
        };

        logger.info('IAM credentials retrieved');
        return response.ok({
          body: { credentials },
        });
      } catch (error) {
        logger.error('Error retrieving IAM credentials:', error);
        return response.badRequest({
          body: { error: 'Failed to retrieve IAM credentials' },
        });
      }
    }
  );

  router.post(
    {
      path: '/api/register/iam-credentials',
      validate: {
        body: schema.object({
          accessKeyId: schema.string(),
          secretAccessKey: schema.string(),
          sessionToken: schema.maybe(schema.string()),
          region: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const credentials = request.body as IAMCredentials;
        
        // TODO: Store credentials in session or secure storage
        logger.info('IAM credentials updated');
        
        return response.ok({
          body: { message: 'IAM credentials updated successfully' },
        });
      } catch (error) {
        logger.error('Error updating IAM credentials:', error);
        return response.badRequest({
          body: { error: 'Failed to update IAM credentials' },
        });
      }
    }
  );
}