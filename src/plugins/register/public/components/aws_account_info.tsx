import React, { useState } from 'react';
import { i18n } from '@osd/i18n';
import {
  EuiButton,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
 
export const AWSAccountInfo: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
 
  const awsAccountId = '123456789012';
 
  const handleCreateSaasInstance = async () => {
    setIsCreating(true);
    setTimeout(() => {
      setIsCreating(false);
      setIsCreated(true);
    }, 2000);
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
 
      <div style={{ marginBottom: '32px' }}>
        <EuiText size="s" style={{ marginBottom: '8px', color: '#374151', fontWeight: '500' }}>
          AWS Account ID
        </EuiText>
        <EuiText size="m">
          <strong style={{ fontSize: '16px' }}>{awsAccountId}</strong>
        </EuiText>
      </div>
 
      {isCreated && (
        <>
          <EuiCallOut
            title="SAAS Instance Created Successfully"
            color="success"
            iconType="check"
            size="s"
          >
            Your SAAS instance has been created for AWS Account ID: {awsAccountId}
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