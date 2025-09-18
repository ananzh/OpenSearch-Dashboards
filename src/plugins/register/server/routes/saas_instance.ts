import { schema } from '@osd/config-schema';
import { IRouter, Logger } from 'opensearch-dashboards/server';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { SoapClient } from '../utils/soap-client';

function parseCredentialsFromCookie(cookieHeader: string | string[] | undefined, logger: Logger): any {
  if (!cookieHeader) return null;
  
  // Handle array case by taking first element
  const cookieString = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
  
  const cookies = cookieString.split(';').map(c => c.trim());
  const credsCookie = cookies.find(c => c.startsWith('aws_soap_credentials='));
  
  if (!credsCookie) {
    logger.info('AWS SOAP credentials cookie not found');
    return null;
  }
  
  logger.info('AWS SOAP credentials cookie found');
  
  try {
    const cookieValue = decodeURIComponent(credsCookie.split('=')[1]);
    const data = JSON.parse(cookieValue);
    return data.credentials;
  } catch (e) {
    logger.error('Failed to parse AWS SOAP credentials cookie');
    return null;
  }
}

const APP_PREFIX = 'SOAPDEMOONLYY';

function validateAwsCredentials(credentials: any, logger: Logger): boolean {
  const isValid = credentials.accessKeyId && 
                  credentials.secretAccessKey;
  
  if (isValid) {
    logger.info('AWS credentials format validation passed');
  } else {
    logger.error('AWS credentials validation failed - missing required fields');
  }
  
  return isValid;
}

async function createAwsOpenSearchApplication(applicationName: string, credentials: any, logger: Logger) {
  const appName = `${APP_PREFIX}-${applicationName}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
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
    
    // List existing applications in the account
    const listResult = await soapClient.listWebApps(identity.Account);
    logger.info(`Existing applications: ${JSON.stringify(listResult.body.webAppSummaries)}`);
    
    // List existing applications for logging (allowing multiple apps now)
    if (listResult.statusCode === 200 && listResult.body && listResult.body.webAppSummaries) {
      const existingApps = listResult.body.webAppSummaries.filter((app: any) => 
        app.name && app.name.toUpperCase().startsWith(APP_PREFIX)
      );
      logger.info(`Found ${existingApps.length} existing SOAP applications in account`);
    }
    
    const result = await soapClient.createApplication(appName, identity.Account);
    logger.info(`status code: ${JSON.stringify(result.body)}`)
    if (result.statusCode !== 200) {
      throw new Error(`Failed to create application: ${JSON.stringify(result.body)}`);
    }

    logger.info(`OpenSearch Application created: ${appName}`);

    const getResult = await soapClient.getApplication(appName, identity.Account);
 
    const getData = getResult.body;
    logger.info(`Response: ${JSON.stringify(result.body)}`)
    
    return {
      applicationName: applicationName, // Return user-provided name without prefix
      fullApplicationName: appName, // Keep full name for reference
      status: getData.status,
      arn: getData.arn,
      id: getData.id
    };
  } catch (error: any) {
    logger.error(`SoapClient error: ${error.message}`);
    // Remove prefix from error messages
    const cleanErrorMessage = error.message.replace(new RegExp(`${APP_PREFIX}-`, 'gi'), '');
    throw new Error(`Error: ${cleanErrorMessage}`);
  }
}

export function saasInstanceRoute(router: IRouter, logger: Logger) {
  router.post(
    {
      path: '/api/soap/register/login',
      validate: {
        body: schema.object({
          accessKeyId: schema.string(),
          secretAccessKey: schema.string(),
          sessionToken: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const credentials = request.body;
        
        // Validate AWS credentials
        logger.info('Validating AWS credentials for login...');
        const credentialsValid = validateAwsCredentials(credentials, logger);
        
        if (!credentialsValid) {
          logger.error('Invalid AWS credentials provided');
          return response.badRequest({
            body: 'Invalid AWS credentials. Please check your access key, secret key, and region.',
          });
        }
        
        // Get account number using STS (use default region for login)
        const stsClient = new STSClient({
          region: 'us-west-2',
          credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            ...(credentials.sessionToken && { sessionToken: credentials.sessionToken })
          }
        });
        
        const identityCommand = new GetCallerIdentityCommand({});
        const identity = await stsClient.send(identityCommand);
        logger.info(`AWS credentials validated successfully for account: ${identity.Account}`);
        
        return response.ok({
          body: {
            message: 'Login successful',
            accountId: identity.Account
          },
        });
      } catch (error) {
        logger.error('Error during login:', error);
        return response.badRequest({
          body: (error as Error).message || 'Login failed',
        });
      }
    }
  );
  router.post(
    {
      path: '/api/soap/register/create-saas-instance',
      validate: {
        body: schema.object({
          applicationName: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { applicationName } = request.body;
        
        // Get credentials from cookie only
        const credentials = parseCredentialsFromCookie(request.headers.cookie, logger);
 
        if (!credentials) {
          return response.badRequest({
            body: 'AWS credentials not found. Please login first.',
          });
        }
        
        // Add default region if not present
        if (!credentials.region) {
          credentials.region = 'us-west-2';
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

        logger.info('=== SERVER-SIDE AWS OPENSEARCH APPLICATION CREATED ===');
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