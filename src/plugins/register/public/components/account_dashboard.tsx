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
import { createSaasInstanceBrowser } from '../utils/browser-soap-client';

interface Props {
  api: RegisterApiService;
  accountId: string;
  credentials: IAMCredentials;
  onLogout: () => void;
}

export const AccountDashboard: React.FC<Props> = ({ api, accountId, credentials, onLogout }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [applicationName, setApplicationName] = useState('');
  const [region, setRegion] = useState('us-west-2');
  const [error, setError] = useState<string | null>(null);

  const handleCreateSaasInstance = async () => {
    console.log('=== CREATE SAAS INSTANCE CLICKED ===');
    console.log('Application name:', applicationName);
    console.log('Region:', region);
    console.log('Account ID:', accountId);
    console.log('Credentials:', { ...credentials, secretAccessKey: '***' });
    
    if (!applicationName.trim()) {
      setError('Application name is required');
      return;
    }

    setIsCreating(true);
    setError(null);
    
    try {
      // Use server-side API only (credentials read from cookie)
      const result = await api.createSaasInstance({
        applicationName: applicationName.trim()
        // credentials removed - server reads from cookie
      });
      
      console.log('SAAS instance created via server:', result);
      setShowSuccess(true);
    } catch (err: any) {
      console.log('Server API failed:', err);
      console.log('Server error body:', err.body);
      console.log('Server error message:', err.message);
      
      let errorMessage = 'Failed to create SAAS instance';
      if (err.body) {
        if (typeof err.body === 'string') {
          errorMessage = err.body;
        } else if (err.body.message) {
          errorMessage = err.body.message;
        } else if (err.body.error) {
          errorMessage = err.body.error;
        }
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
    setRegion('us-west-2');
    setError(null);
  };

  if (showSuccess) {
    return (
      <SaasCreationSuccess
        applicationName={applicationName}
        region={region}
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
              Create SAAS Instance
            </h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p style={{ margin: 0, color: '#6b7280' }}>
              Account: {accountId}
            </p>
          </EuiText>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <EuiFormRow label="Application Name" isRequired>
            <EuiFieldText
              value={applicationName}
              onChange={(e) => setApplicationName(e.target.value)}
              placeholder="Enter application name (e.g., my-search-app)"
            />
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiFormRow label="Region">
            <EuiFieldText
              value={region}
              onChange={(e) => setRegion(e.target.value)}
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


      </EuiPanel>
    </div>
  );
};