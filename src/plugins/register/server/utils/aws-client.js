/**
 * AWS Client
 *
 * This module provides a unified client for making AWS API requests using the AWS SDK.
 */
 
const { HttpRequest } = require('@aws-sdk/protocol-http');
const { SignatureV4 } = require('@aws-sdk/signature-v4');
const { Sha256 } = require('@aws-crypto/sha256-js');
const { NodeHttpHandler } = require('@aws-sdk/node-http-handler');
 
/**
 * Make a REST call to an AWS service with SigV4 signing
 *
 * @param {Object} options - Request options
 * @param {string} options.method - HTTP method
 * @param {string} options.endpoint - Full endpoint URL
 * @param {string} options.path - Request path
 * @param {Object} options.headers - Additional request headers
 * @param {Object} options.queryParams - Query parameters
 * @param {Object|string} options.body - Request body
 * @param {string} options.service - AWS service name
 * @param {string} options.region - AWS region
 * @param {string} options.accessKey - AWS access key
 * @param {string} options.secretKey - AWS secret key
 * @param {string} options.sessionToken - AWS session token
 * @returns {Promise<Object>} - Response data
 */
async function makeRequest(options) {
  const {
    method,
    endpoint,
    path,
    headers = {},
    body = '',
    service,
    region,
    accessKey,
    secretKey,
    sessionToken
  } = options;
 
  // Parse the endpoint URL
  const parsedUrl = new URL(endpoint);
  const host = parsedUrl.host;
 
  // Prepare request body
  let requestBody = body;
  if (typeof body === 'object' && body !== null) {
    requestBody = JSON.stringify(body);
  }
 
  // Prepare headers
  const requestHeaders = {
    ...headers,
    host
  };
 
  // Create credentials
  const credentials = {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    sessionToken: sessionToken
  };
 
  // Create an HTTP request object
  const request = new HttpRequest({
    hostname: host,
    path: path,
    method,
    headers: requestHeaders,
    body: typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody)
  });
 
  // Create a SignatureV4 instance
  const signer = new SignatureV4({
    credentials,
    region,
    service,
    sha256: Sha256
  });
 
  // Sign the request
  const signedRequest = await signer.sign(request);
 
  // Make the request using the AWS SDK's NodeHttpHandler
  const nodeHttpHandler = new NodeHttpHandler();
 
  try {
    const { response } = await nodeHttpHandler.handle({
      ...signedRequest,
      hostname: host
    });
 
    // Read the response body
    const { body: responseBody, statusCode, headers: responseHeaders } = response;
 
    // Convert the response body to a string
    const chunks = [];
    for await (const chunk of responseBody) {
      chunks.push(chunk);
    }
 
    const responseData = Buffer.concat(chunks).toString('utf8');
 
    // Try to parse as JSON if possible
    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch (e) {
      // If not JSON, return as string
      parsedData = responseData;
    }
 
    return {
      statusCode,
      headers: responseHeaders,
      body: parsedData
    };
  } catch (error) {
    throw error;
  }
}
 
module.exports = {
  makeRequest
};