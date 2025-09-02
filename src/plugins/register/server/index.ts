import { PluginInitializerContext } from 'opensearch-dashboards/server';
import { RegisterServerPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new RegisterServerPlugin(initializerContext);
}

export { RegisterServerPluginSetup, RegisterServerPluginStart } from './types';