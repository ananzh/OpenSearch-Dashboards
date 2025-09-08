import { schema } from '@osd/config-schema';
import { IRouter, Logger } from 'opensearch-dashboards/server';
import { OpenSearchClient, CreateApplicationCommand, ListApplicationsCommand } from '@aws-sdk/client-opensearch';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

function validateAwsCredentials(credentials: any, logger: Logger): boolean {
  const isValid = credentials.accessKeyId && 
                  credentials.secretAccessKey && 
                  credentials.region;
  
  if (isValid) {
    logger.info('AWS credentials format validation passed');
  } else {
    logger.error('AWS credentials validation failed - missing required fields');
  }
  
  return isValid;
}

async function createAwsOpenSearchApplication(applicationName: string, credentials: any, logger: Logger) {
  const appName = applicationName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const region = credentials.region;
  
  const awsConfig = {
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      ...(credentials.sessionToken && { sessionToken: credentials.sessionToken })
    }
  };
  
  logger.info(`Creating OpenSearch Application: ${appName}`);
  logger.info(`Using AWS SDK with: AccessKey=${credentials.accessKeyId?.substring(0, 4)}***, Region=${region}, HasSessionToken=${!!credentials.sessionToken}`);
  
  try {
    // Test AWS credentials first
    const stsClient = new STSClient(awsConfig);
    const identityCommand = new GetCallerIdentityCommand({});
    const identity = await stsClient.send(identityCommand);
    logger.info(`AWS credentials validated successfully for account: ${identity.Account}`);
    
    // Check if application already exists
    const openSearchClient = new OpenSearchClient(awsConfig);
    const listCommand = new ListApplicationsCommand({});
    const existingApps = await openSearchClient.send(listCommand);
    
    const existingApp = existingApps.applicationSummaries?.find(app => app.name === appName);
    if (existingApp) {
      throw new Error(`SaaS instance with name '${appName}' already exists, please use a different name`);
    }
    
    // Create OpenSearch Application
    const createCommand = new CreateApplicationCommand({
      name: appName
    });
    
    const result = await openSearchClient.send(createCommand);
    logger.info(`OpenSearch Application created: ${appName}`);
    
    return {
      applicationName: appName,
      endpoint: `https://${appName}.${region}.aoss.amazonaws.com`,
      status: 'creating',
      arn: result.arn,
      id: result.id
    };
  } catch (error: any) {
    logger.error(`AWS SDK error: ${error.message}`);
    throw new Error(error.message || 'AWS SDK error occurred');
  }
}

export function saasInstanceRoute(router: IRouter, logger: Logger) {
  router.post(
    {
      path: '/api/soap/register/create-saas-instance',
      validate: {
        body: schema.object({
          applicationName: schema.maybe(schema.string()),
          credentials: schema.maybe(schema.object({
            accessKeyId: schema.string(),
            secretAccessKey: schema.string(),
            sessionToken: schema.maybe(schema.string()),
            region: schema.string(),
          })),
        }),
      },
    },
    async (context, request, response) => {
      const { applicationName, credentials } = request.body;
      
      if (!credentials) {
        return response.badRequest({
          body: 'AWS credentials are required',
        });
      }
      
      // Validate AWS credentials
      logger.info('Validating AWS credentials...');
      const credentialsValid = validateAwsCredentials(credentials, logger);
      
      if (!credentialsValid) {
        logger.error('Invalid AWS credentials provided');
        return response.badRequest({
          body: 'Invalid AWS credentials. Please check your access key, secret key, and region.',
        });
      }
      
      const finalApplicationName = applicationName || `soap-${Math.floor(Date.now() / 1000)}`;
      
      try {
        // Create AWS OpenSearch Application
        const applicationResult = await createAwsOpenSearchApplication(finalApplicationName, credentials, logger) as any;

        // Generate AWS OpenSearch URLs
        const awsDashboardUrl = `${applicationResult.endpoint}/_dashboards`;
        const awsConsoleUrl = `https://${credentials.region}.console.aws.amazon.com/aos/home?region=${credentials.region}#opensearch/applications/${applicationResult.applicationName}`;
        
        logger.info('=== AWS OPENSEARCH APPLICATION CREATED ===');
        logger.info(`Application Name: ${applicationResult.applicationName}`);
        logger.info(`OpenSearch Endpoint: ${applicationResult.endpoint}`);
        logger.info(`Dashboard URL: ${awsDashboardUrl}`);
        logger.info(`AWS Console: ${awsConsoleUrl}`);
        logger.info(`Status: ${applicationResult.status}`);
        logger.info('==========================================');
        
        logger.info('SAAS instance created successfully');
        
        return response.ok({
          body: {
            message: 'AWS OpenSearch application created successfully',
            credentials: {
              region: credentials.region,
              hasAccessKey: !!credentials.accessKeyId,
              hasSecretKey: !!credentials.secretAccessKey,
            },
            application: {
              ...applicationResult,
              dashboardUrl: awsDashboardUrl,
              awsConsoleUrl: awsConsoleUrl
            },
            accessInstructions: {
              step1: 'Application should be ready in a few minutes',
              step2: `Visit AWS Console: ${awsConsoleUrl}`,
              step3: `Access Dashboard: ${awsDashboardUrl}`,
              note: 'OpenSearch Serverless applications are faster to provision than domains'
            }
          },
        });
      } catch (error) {
        logger.error('Error creating SAAS instance:', error);
        return response.badRequest({
          body: (error as Error).message || 'Failed to create SAAS instance',
        });
      }
    }
  );
}