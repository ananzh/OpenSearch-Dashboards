import { PluginInitializerContext } from 'opensearch-dashboards/public';
import { RegisterPlugin } from './plugin';
 
export function plugin(initializerContext: PluginInitializerContext) {
  return new RegisterPlugin(initializerContext);
}
 
export { RegisterPlugin };