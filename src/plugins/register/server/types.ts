export interface RegisterServerPluginSetup {}
export interface RegisterServerPluginStart {}

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