import React from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiIcon,
} from '@elastic/eui';

interface Props {
  applicationName: string;
  region: string;
  onBackToRegister: () => void;
}

export const SaasCreationSuccess: React.FC<Props> = ({ 
  applicationName, 
  region, 
  onBackToRegister 
}) => {
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
          maxWidth: '500px',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}
      >
        <div style={{ marginBottom: '32px' }}>
          <EuiIcon 
            type="checkInCircleFilled" 
            size="xxl" 
            color="success"
            style={{ marginBottom: '16px' }}
          />
          <EuiTitle size="l">
            <h1 style={{ color: '#059669', fontWeight: 'bold', fontSize: '28px', margin: 0 }}>
              Success!
            </h1>
          </EuiTitle>
        </div>

        <EuiCallOut
          title="SaaS Instance Created"
          color="success"
          iconType="check"
          size="m"
          style={{ marginBottom: '24px' }}
        >
          <EuiText size="s">
            <p>Your SaaS instance has been successfully created with the following details:</p>
          </EuiText>
        </EuiCallOut>

        <div style={{ 
          backgroundColor: '#f0f9ff', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #bae6fd',
          marginBottom: '24px'
        }}>
          <EuiText size="s">
            <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>
              <strong>Instance Name:</strong> {applicationName || 'Default Instance'}
            </p>
            <p style={{ margin: 0, fontWeight: '600' }}>
              <strong>Region:</strong> {region}
            </p>
          </EuiText>
        </div>

        <EuiText size="s" color="subdued" style={{ marginBottom: '24px' }}>
          <p>
            Your SaaS instance is now ready to use. You can start configuring your search 
            and analytics workloads.
          </p>
        </EuiText>

        <EuiButton
          fill
          size="m"
          onClick={() => window.location.href = 'https://demo.soap.aws.dev/_login/app-selector.html'}
          style={{
            height: '44px',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Login
        </EuiButton>
      </EuiPanel>
    </div>
  );
};