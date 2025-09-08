import React from 'react';
import { CoreStart } from 'opensearch-dashboards/public';
import { AWSAccountInfo } from '../components/aws_account_info';
import { RegisterApiService } from '../services/api';
 
interface RegisterAppProps {
  core: CoreStart;
}
 
export const RegisterApp: React.FC<RegisterAppProps> = ({ core }) => {
  const api = new RegisterApiService(core.http);
  
  return (
    <AWSAccountInfo api={api} />
  );
};