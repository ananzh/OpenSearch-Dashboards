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
 
interface Props {
  api: RegisterApiService;
}

export const AWSAccountInfo: React.FC<Props> = ({ api }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
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
      setIsCreated(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create SAAS instance');
    } finally {
      setIsCreating(false);
    }
  };
 
  return (
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

      {isCreated && (
        <>
          <EuiCallOut
            title="SAAS Instance Created Successfully"
            color="success"
            iconType="check"
            size="s"
          >
            Your SAAS instance has been created with the provided credentials
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
 
      <EuiButton
        fill
        fullWidth
        size="m"
        onClick={handleCreateSaasInstance}
        disabled={isCreating || isCreated}
        isLoading={isCreating}
        style={{
          height: '48px',
          fontSize: '14px',
          fontWeight: '500'
        }}
      >
        {isCreating ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EuiLoadingSpinner size="s" />
            Creating SAAS Instance...
          </span>
        ) : isCreated ? (
          'SAAS Instance Created'
        ) : (
          'Create SAAS Instance'
        )}
      </EuiButton>
    </EuiPanel>
  );
};