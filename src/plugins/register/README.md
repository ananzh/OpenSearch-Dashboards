# Register Plugin - Server-Based IAM and OpenSearch Integration

This plugin provides server-side endpoints for managing IAM credentials and creating OpenSearch applications.

## Features

- **IAM Credentials Management**: Store and retrieve AWS IAM credentials
- **OpenSearch Application Creation**: Create OpenSearch clients with IAM authentication
- **Manual Configuration**: Support for manual IAM credential input
- **Session Management**: Future support for session-based credential storage

## API Endpoints

### GET `/api/register/iam-credentials`
Retrieve current IAM credentials (currently from environment variables or manual input).

### POST `/api/register/iam-credentials`
Update IAM credentials.

**Request Body:**
```json
{
  "accessKeyId": "string",
  "secretAccessKey": "string", 
  "sessionToken": "string (optional)",
  "region": "string"
}
```

### POST `/api/register/create-saas-instance`
Create a complete SAAS instance with IAM credentials and optional OpenSearch connection.

**Request Body:**
```json
{
  "opensearchEndpoint": "https://your-opensearch-domain.region.es.amazonaws.com (optional)",
  "credentials": {
    "accessKeyId": "string (optional - uses env vars if not provided)",
    "secretAccessKey": "string (optional)",
    "sessionToken": "string (optional)",
    "region": "string (optional - defaults to us-east-1)"
  }
}
```

**Response:**
```json
{
  "message": "SAAS instance created successfully",
  "credentials": {
    "region": "us-east-1",
    "hasAccessKey": true,
    "hasSecretKey": true
  },
  "opensearch": {
    "endpoint": "https://...",
    "connected": true,
    "clusterName": "my-cluster",
    "version": "2.11.0"
  }
}
```

### GET `/api/register/opensearch-application/status`
Check the status of the OpenSearch application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables (optional):
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_SESSION_TOKEN=your_session_token
export AWS_REGION=us-east-1
```

3. The plugin will be available at `/app/register/awsaccount`

## Usage

1. Navigate to the register application
2. Enter your AWS IAM credentials manually
3. Optionally provide an OpenSearch endpoint
4. Click "Create SAAS Instance" to test the connection

## Future Enhancements

- Session-based credential storage
- Integration with existing OpenSearch Dashboards authentication
- Support for multiple credential profiles
- Enhanced error handling and validation