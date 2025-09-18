/**
 * Browser-compatible SOAP Service Client with AWS SigV4 signing
 */

import { IAMCredentials } from '../services/api';

const APP_PREFIX = 'SOAPDEMOONLY';

interface SoapClientConfig {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  sessionToken?: string;
  service: string;
}

// Browser-compatible AWS SigV4 signing
class BrowserAwsSigner {
  private accessKey: string;
  private secretKey: string;
  private sessionToken?: string;
  private region: string;
  private service: string;

  constructor(accessKey: string, secretKey: string, region: string, service: string, sessionToken?: string) {
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.sessionToken = sessionToken;
    this.region = region;
    this.service = service;
  }

  private async sha256(message: string): Promise<string> {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API not available');
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async hmac(key: ArrayBuffer | string, message: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    let keyData: ArrayBuffer;
    
    if (typeof key === 'string') {
      keyData = encoder.encode(key);
    } else {
      keyData = key;
    }
    
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    return await window.crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  }

  private async getSignatureKey(dateStamp: string): Promise<ArrayBuffer> {
    const kDate = await this.hmac(`AWS4${this.secretKey}`, dateStamp);
    const kRegion = await this.hmac(kDate, this.region);
    const kService = await this.hmac(kRegion, this.service);
    const kSigning = await this.hmac(kService, 'aws4_request');
    return kSigning;
  }

  async signRequest(method: string, url: string, headers: Record<string, string>, body: string): Promise<Record<string, string>> {
    const parsedUrl = new URL(url);
    const host = parsedUrl.host;
    const path = parsedUrl.pathname;
    
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\..*/g, '');
    const dateStamp = amzDate.substr(0, 8);
    
    const payloadHash = await this.sha256(body);
    
    const signedHeaders = Object.keys(headers).map(k => k.toLowerCase()).sort().join(';');
    const canonicalHeaders = Object.keys(headers)
      .map(k => k.toLowerCase())
      .sort()
      .map(k => `${k}:${headers[k]}\n`)
      .join('');
    
    const canonicalRequest = [
      method,
      path,
      '', // query string
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');
    
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${this.region}/${this.service}/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      await this.sha256(canonicalRequest)
    ].join('\n');
    
    const signingKey = await this.getSignatureKey(dateStamp);
    const signature = await this.hmac(signingKey, stringToSign);
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const authorization = `${algorithm} Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`;
    
    return {
      ...headers,
      'X-Amz-Date': amzDate,
      'Authorization': authorization,
      ...(this.sessionToken && { 'X-Amz-Security-Token': this.sessionToken })
    };
  }
}

export class BrowserSoapClient {
  private endpoint: string;
  private region: string;
  private accessKey: string;
  private secretKey: string;
  private sessionToken?: string;
  private service: string;
  private signer: BrowserAwsSigner;

  constructor(config: SoapClientConfig) {
    this.endpoint = config.endpoint;
    this.region = config.region;
    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
    this.sessionToken = config.sessionToken;
    this.service = config.service;
    this.signer = new BrowserAwsSigner(
      config.accessKey,
      config.secretKey,
      config.region,
      config.service,
      config.sessionToken
    );
  }

  private async makeRequest(method: string, path: string, body: any) {
    const url = `${this.endpoint}${path}`;
    const parsedUrl = new URL(url);
    const requestBody = JSON.stringify(body);
    
    console.log(`Making ${method} request to:`, url);
    console.log('Request body:', requestBody);
    
    const headers = {
      'Content-Type': 'application/json',
      'Host': parsedUrl.host
    };
    
    try {
      const signedHeaders = await this.signer.signRequest(method, url, headers, requestBody);
      console.log('Signed headers:', signedHeaders);
      
      const response = await fetch(url, {
        method,
        headers: signedHeaders,
        body: requestBody,
      });

      console.log('Response status:', response.status);
      
      let responseBody;
      try {
        responseBody = await response.json();
      } catch (e) {
        const textBody = await response.text();
        console.log('Non-JSON response:', textBody);
        responseBody = textBody;
      }
      
      console.log('Response body:', responseBody);
      
      return {
        statusCode: response.status,
        body: responseBody,
      };
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  async createApplication(applicationName: string, accountId: string) {
    return this.makeRequest('POST', '/2024-01-01/create-web-app', {
      name: applicationName,
      accountId: accountId,
    });
  }

  async getApplication(applicationId: string, accountId: string) {
    return this.makeRequest('POST', '/2024-01-01/get-web-app', {
      id: applicationId,
      accountId: accountId,
    });
  }

  async listWebApps(accountId: string) {
    return this.makeRequest('POST', '/2024-01-01/list-web-apps', {
      accountId: accountId,
    });
  }
}

export async function createSaasInstanceBrowser(
  applicationName: string,
  credentials: IAMCredentials,
  accountId: string
): Promise<any> {
  console.log('=== BROWSER SAAS CREATION START ===');
  console.log('Application name:', applicationName);
  console.log('Account ID:', accountId);
  console.log('Region:', credentials.region);
  console.log('Has access key:', !!credentials.accessKeyId);
  console.log('Has secret key:', !!credentials.secretAccessKey);
  console.log('Has session token:', !!credentials.sessionToken);
  
  // Check if Web Crypto API is available
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available - requires HTTPS');
  }
  
  console.log('Web Crypto API is available');
  
  const appName = `${APP_PREFIX}-${applicationName}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  console.log('Final app name:', appName);
  
  try {
    // Create SOAP client
    const soapClient = new BrowserSoapClient({
      endpoint: 'https://soap-dev.beta.us-west-2.cs.neo.oss.aws.dev/',
      region: credentials.region,
      accessKey: credentials.accessKeyId,
      secretKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      service: 'opensearch'
    });
    
    console.log('SOAP client created successfully');

    // List existing applications
    const listResult = await soapClient.listWebApps(accountId);
    console.log('Existing applications:', listResult.body);

    // List existing applications for logging (allowing multiple apps now)
    if (listResult.statusCode === 200 && listResult.body && listResult.body.webAppSummaries) {
      const existingApps = listResult.body.webAppSummaries.filter((app: any) => 
        app.name && app.name.toUpperCase().startsWith(APP_PREFIX)
      );
      console.log(`Found ${existingApps.length} existing SOAP applications in account`);
    }

    // Create application
    const result = await soapClient.createApplication(appName, accountId);
    console.log('Create result:', result);
    
    if (result.statusCode !== 200) {
      throw new Error(`Failed to create application: ${JSON.stringify(result.body)}`);
    }

    // Get application details
    const getResult = await soapClient.getApplication(appName, accountId);
    const getData = getResult.body;

    return {
      applicationName: appName,
      status: getData.status,
      arn: getData.arn,
      id: getData.id
    };
  } catch (error: any) {
    console.error('Browser SOAP client error:', error);
    throw new Error(`Error: ${error.message}`);
  }
}