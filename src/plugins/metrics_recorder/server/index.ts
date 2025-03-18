import { PluginInitializerContext } from 'opensearch-dashboards/server';
import { MetricsRecorderPlugin } from './plugin';

export { MetricsRecorderSetup, MetricsRecorderStart } from './plugin';
export { MetricsRecorder } from './types'
export { config } from './config';
export const plugin = (initializerContext: PluginInitializerContext) =>
  new MetricsRecorderPlugin(initializerContext);
