import { PluginInitializerContext } from 'opensearch-dashboards/server';
import { MetricsRecorderPlugin } from './plugin';

export { MetricsRecorderSetup } from './plugin';
export { config } from './config';
export const plugin = (initializerContext: PluginInitializerContext) =>
  new MetricsRecorderPlugin(initializerContext);
