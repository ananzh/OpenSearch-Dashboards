import React, { useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFieldText,
  EuiFormRow,
} from '@elastic/eui';
import { RegisterApiService, IAMCredentials } from '../services/api';
import { SaasCreationSuccess } from './saas_creation_success';
 
interface Props {
  api: RegisterApiService;
}

export const AWSAccountInfo: React.FC<Props> = ({ api }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [credentials, setCredentials] = useState<IAMCredentials>({
    accessKeyId: '',
    secretAccessKey: '',
    sessionToken: '',
    region: 'us-west-2'
  });
  const [applicationName, setApplicationName] = useState('');
  const [error, setError] = useState<string | null>(null);
 
  const handleCreateSaasInstance = async () => {
    setIsCreating(true);
    setError(null);
    
    try {
      const result = await api.createSaasInstance({
        applicationName: applicationName || undefined,
        credentials: credentials.accessKeyId ? credentials : undefined
      });
      
      console.log('SAAS instance created:', result);
      setShowSuccess(true);
    } catch (err: any) {
      console.log('Full error object:', err);
      console.log('Error body:', err.body);
      console.log('Error response:', err.response);
      console.log('Error status:', err.status);
      console.log('Error statusText:', err.statusText);
      
      let errorMessage = 'Failed to create SAAS instance';
      
      if (err.body) {
        errorMessage = typeof err.body === 'string' ? err.body : err.body.message || err.body.error || errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      console.log('Final error message:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleBackToRegister = () => {
    setShowSuccess(false);
    setApplicationName('');
    setCredentials({
      accessKeyId: '',
      secretAccessKey: '',
      sessionToken: '',
      region: 'us-west-2'
    });
    setError(null);
  };
 
  if (showSuccess) {
    return (
      <SaasCreationSuccess
        applicationName={applicationName}
        region={credentials.region}
        onBackToRegister={handleBackToRegister}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <EuiPanel
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb'
        }}
      >
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <EuiTitle size="l">
          <h1 style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '30px', margin: 0 }}>
            SOAP
          </h1>
        </EuiTitle>
      </div>
 
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <EuiTitle size="m">
          <h2 style={{ fontWeight: '600', fontSize: '20px', margin: '0 0 8px 0' }}>
            AWS Account Registration
          </h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <p style={{ margin: 0, color: '#6b7280' }}>
            Review your account information and create a SAAS instance
          </p>
        </EuiText>
      </div>
 
      <div style={{ marginBottom: '24px' }}>
        <EuiFormRow label="Application Name">
          <EuiFieldText
            value={applicationName}
            onChange={(e) => setApplicationName(e.target.value)}
            placeholder="Enter application name (e.g., my-search-app)"
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
        <EuiFormRow label="Access Key ID">
          <EuiFieldText
            value={credentials.accessKeyId}
            onChange={(e) => setCredentials({...credentials, accessKeyId: e.target.value})}
            placeholder="Enter AWS Access Key ID"
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
        <EuiFormRow label="Secret Access Key">
          <EuiFieldText
            type="password"
            value={credentials.secretAccessKey}
            onChange={(e) => setCredentials({...credentials, secretAccessKey: e.target.value})}
            placeholder="Enter AWS Secret Access Key"
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
        <EuiFormRow label="Session Token">
          <EuiFieldText
            type="password"
            value={credentials.sessionToken || ''}
            onChange={(e) => setCredentials({...credentials, sessionToken: e.target.value})}
            placeholder="Enter AWS Session Token"
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
        <EuiFormRow label="Region">
          <EuiFieldText
            value={credentials.region}
            onChange={(e) => setCredentials({...credentials, region: e.target.value})}
            placeholder="us-west-2"
          />
        </EuiFormRow>
      </div>
 
      {error && (
        <>
          <EuiCallOut
            title="Error"
            color="danger"
            iconType="alert"
            size="s"
          >
            {error}
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}


 
      <EuiButton
        fill
        fullWidth
        size="m"
        onClick={handleCreateSaasInstance}
        disabled={isCreating}
        isLoading={isCreating}
        style={{
          height: '48px',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '12px'
        }}
      >
        {isCreating ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EuiLoadingSpinner size="s" />
            Creating SAAS Instance...
          </span>
        ) : (
          'Create SAAS Instance'
        )}
      </EuiButton>
      
      <EuiButton
        fullWidth
        size="m"
        onClick={() => window.location.href = 'https://us-east-1.awsc-integ.aws.amazon.com/cloudwatch/home?pluginEndpoint=https%3A%2F%2F10.169.1.167%3A31214%2Fmain.js&pluginName=ApmSynthetics&region=us-east-1#synthetics:canary/list'}
        style={{
          height: '48px',
          fontSize: '14px',
          fontWeight: '500'
        }}
      >
        Login to AWS Account
      </EuiButton>
      </EuiPanel>
    </div>
  );
};