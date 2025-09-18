/**
 * SOAP Service Client
 *
 * This module provides a client for making calls to the SOAP service API.
 */
 
const { makeRequest } = require('./aws-client');
 
/**
 * SOAP Service Client
 */
class SoapClient {
  /**
   * Create a new SOAP client
   *
   * @param {Object} config - Client configuration
   * @param {string} config.endpoint - Service endpoint URL
   * @param {string} config.region - AWS region
   * @param {string} config.accessKey - AWS access key
   * @param {string} config.secretKey - AWS secret key
   * @param {string} config.sessionToken - AWS session token
   * @param {string} config.service - AWS service name
   */
  constructor(config) {
    this.endpoint = config.endpoint;
    this.region = config.region;
    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
    this.sessionToken = config.sessionToken;
    this.service = config.service;
  }
 
  /**
   * Create a new application
   *
   * @param {string} applicationName - Application name
   * @returns {Promise<Object>} - Response data
   */
  async createApplication(applicationName, accountId) {
    return makeRequest({
      method: 'POST',
      endpoint: this.endpoint,
      path: '/2024-01-01/create-web-app',
      body: { name: applicationName, accountId: accountId },
      service: this.service,
      region: this.region,
      accessKey: this.accessKey,
      secretKey: this.secretKey,
      sessionToken: this.sessionToken
    });
  }
 
  /**
   * Get an application by ID
   *
   * @param {string} applicationId - Application ID
   * @returns {Promise<Object>} - Response data
   */
  async getApplication(applicationId, accountId) {
    return makeRequest({
      method: 'POST',
      endpoint: this.endpoint,
      path: '/2024-01-01/get-web-app',
      body: { id: applicationId, accountId: accountId },
      service: this.service,
      region: this.region,
      accessKey: this.accessKey,
      secretKey: this.secretKey,
      sessionToken: this.sessionToken
    });
  }
}
 
module.exports = {
  SoapClient
};