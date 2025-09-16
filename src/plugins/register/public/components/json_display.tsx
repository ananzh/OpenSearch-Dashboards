import React, { useEffect, useState } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiCodeBlock,
  EuiSpacer,
} from '@elastic/eui';
import { RegisterApiService } from '../services/api';

interface Props {
  api: RegisterApiService;
}

export const JsonDisplay: React.FC<Props> = ({ api }) => {
  const [jsonData, setJsonData] = useState<any>(null);
  const [timestamp, setTimestamp] = useState<string>('');

  useEffect(() => {
    // Check if there's JSON data in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    
    if (dataParam) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(dataParam));
        setJsonData(parsedData);
        setTimestamp(new Date().toISOString());
        
        // Send to backend for logging
        api.displayJson(parsedData).catch(console.error);
      } catch (error) {
        console.error('Error parsing JSON data:', error);
        setJsonData({ error: 'Invalid JSON data provided' });
      }
    }
  }, [api]);

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
          maxWidth: '800px',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <EuiTitle size="l">
            <h1 style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '30px', margin: 0 }}>
              JSON Data Display
            </h1>
          </EuiTitle>
        </div>

        {jsonData ? (
          <>
            <EuiText size="s" color="subdued" style={{ marginBottom: '16px' }}>
              <p>Received at: {timestamp}</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiCodeBlock
              language="json"
              fontSize="m"
              paddingSize="m"
              overflowHeight={400}
              isCopyable
            >
              {JSON.stringify(jsonData, null, 2)}
            </EuiCodeBlock>
          </>
        ) : (
          <EuiText size="m" textAlign="center">
            <p>No JSON data provided. Use the 'data' URL parameter to pass JSON data.</p>
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
              Example: ?data=%7B%22key%22%3A%22value%22%7D
            </p>
          </EuiText>
        )}
      </EuiPanel>
    </div>
  );
};