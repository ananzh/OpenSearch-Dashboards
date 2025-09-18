import { schema } from '@osd/config-schema';
import { IRouter, Logger } from 'opensearch-dashboards/server';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { SoapClient } from '../utils/soap-client';

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
  const tempHardCodedAccountId = "746602329284";
  const appName = applicationName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const region = credentials.region;
  
  try {
    //Test AWS credentials first using STS
    const stsClient = new STSClient({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        ...(credentials.sessionToken && { sessionToken: credentials.sessionToken })
      }
    });
    
    const identityCommand = new GetCallerIdentityCommand({});
    const identity = await stsClient.send(identityCommand);
    logger.info(`AWS credentials validated successfully for account: ${identity.Account}`);
    
    // Create OpenSearch Application using SoapClient
    const soapClient = new SoapClient({
      endpoint: 'https://soap-dev.beta.us-west-2.cs.neo.oss.aws.dev/',
      region: region,
      accessKey: credentials.accessKeyId,
      secretKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      service: 'opensearch'
    });
    
    const result = await soapClient.createApplication(appName, tempHardCodedAccountId);
    logger.info(`status code: ${JSON.stringify(result.body)}`)
    if (result.statusCode !== 200) {
      throw new Error(`Failed to create application: ${JSON.stringify(result.body)}`);
    }

    logger.info(`OpenSearch Application created: ${appName}`);

    const getResult = await soapClient.getApplication(appName, tempHardCodedAccountId);
 
    const getData = getResult.body;
    logger.info(`Response: ${JSON.stringify(result.body)}`)
    
    return {
      applicationName: appName,
      status: getData.status,
      arn: getData.arn,
      id: getData.id
    };
  } catch (error: any) {
    logger.error(`SoapClient error: ${error.message}`);
    throw new Error(`Failed to create OpenSearch application: ${error.message}`);
  }
}

export function saasInstanceRoute(router: IRouter, logger: Logger) {
  router.post(
    {
      path: '/api/soap/register/display-json',
      validate: {
        body: schema.any(),
      },
    },
    async (context, request, response) => {
      const jsonData = request.body;
      
      return response.ok({
        body: {
          message: 'JSON data received successfully',
          data: jsonData,
          timestamp: new Date().toISOString()
        },
      });
    }
  );

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
      try {
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

        // Create AWS OpenSearch Application
        const applicationResult = await createAwsOpenSearchApplication(finalApplicationName, credentials, logger) as any;


        logger.info('=== AWS OPENSEARCH APPLICATION CREATED ===');
        logger.info(`Application Name: ${applicationResult.applicationName}`);
        logger.info(`AppId: ${applicationResult.id}`);
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
              ...applicationResult
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