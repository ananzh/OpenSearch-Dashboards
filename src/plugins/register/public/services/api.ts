import { HttpSetup } from 'opensearch-dashboards/public';

export interface IAMCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
}

export interface OpenSearchConfig {
  endpoint: string;
  credentials: IAMCredentials;
}

export class RegisterApiService {
  constructor(private http: HttpSetup) {}

  async getIamCredentials(): Promise<{ credentials: IAMCredentials }> {
    return this.http.get('/api/soap/register/iam-credentials');
  }

  async updateIamCredentials(credentials: IAMCredentials): Promise<{ message: string }> {
    return this.http.post('/api/soap/register/iam-credentials', {
      body: JSON.stringify(credentials),
    });
  }

  async createSaasInstance(data: {
    applicationName?: string;
    credentials?: IAMCredentials;
  }): Promise<{
    message: string;
    credentials: any;
    opensearch: any;
  }> {
    return this.http.post('/api/soap/register/create-saas-instance', {
      body: JSON.stringify(data),
    });
  }

  async getApplicationStatus(): Promise<{ status: string; message: string }> {
    return this.http.get('/api/soap/register/opensearch-application/status');
  }
}