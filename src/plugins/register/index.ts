import { PluginInitializerContext } from 'opensearch-dashboards/public';
import { RegisterPlugin } from './public/plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new RegisterPlugin(initializerContext);
}

export { RegisterPluginSetup, RegisterPluginStart } from './public/plugin';