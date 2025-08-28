import React from 'react';
import { CoreStart } from 'opensearch-dashboards/public';
import { AWSAccountInfo } from '../components/aws_account_info';
 
interface RegisterAppProps {
  core: CoreStart;
}
 
export const RegisterApp: React.FC<RegisterAppProps> = ({ core }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <AWSAccountInfo />
    </div>
  );
};