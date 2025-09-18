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
import { AccountDashboard } from './account_dashboard';
 
interface Props {
  api: RegisterApiService;
}

export const AWSAccountInfo: React.FC<Props> = ({ api }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [credentials, setCredentials] = useState<IAMCredentials>({
    accessKeyId: '',
    secretAccessKey: '',
    sessionToken: '',
    region: ''
  });
  const [error, setError] = useState<string | null>(null);

  // Check for stored credentials on component mount
  React.useEffect(() => {
    const storedCreds = document.cookie
      .split('; ')
      .find(row => row.startsWith('aws_soap_credentials='));
    
    if (storedCreds) {
      try {
        const credsData = JSON.parse(decodeURIComponent(storedCreds.split('=')[1]));
        setCredentials(credsData.credentials);
        setAccountId(credsData.accountId);
        setIsLoggedIn(true);
      } catch (e) {
        console.error('Error parsing stored credentials:', e);
      }
    }
  }, []);
 
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    
    try {
      const result = await api.login({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
      });
      
      // Store credentials in cookie (without region for now)
      const cookieData = {
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
          region: ''
        },
        accountId: result.accountId
      };
      document.cookie = `aws_soap_credentials=${encodeURIComponent(JSON.stringify(cookieData))}; path=/; max-age=3600`;
      
      setAccountId(result.accountId);
      setIsLoggedIn(true);
    } catch (err: any) {
      console.log('Login error:', err);
      
      let errorMessage = 'Login failed';
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
      
      console.log('Final login error message:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    // Clear cookie
    document.cookie = 'aws_soap_credentials=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    
    setIsLoggedIn(false);
    setAccountId('');
    setCredentials({
      accessKeyId: '',
      secretAccessKey: '',
      sessionToken: '',
      region: ''
    });
    setError(null);
  };
 
  if (isLoggedIn) {
    return (
      <AccountDashboard
        api={api}
        accountId={accountId}
        credentials={credentials}
        onLogout={handleLogout}
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
            Enter your AWS credentials to login
          </p>
        </EuiText>
      </div>
 
      <div style={{ marginBottom: '24px' }}>

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
        onClick={handleLogin}
        disabled={isLoggingIn}
        isLoading={isLoggingIn}
        style={{
          height: '48px',
          fontSize: '14px',
          fontWeight: '500'
        }}
      >
        {isLoggingIn ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EuiLoadingSpinner size="s" />
            Logging in...
          </span>
        ) : (
          'Login'
        )}
      </EuiButton>
      </EuiPanel>
    </div>
  );
};