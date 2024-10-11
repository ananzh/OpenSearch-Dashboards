import { PluginInitializerContext } from '../../../core/public';
import { MetricsRecorderPlugin } from './plugin';

export { METRIC_TYPE } from '@osd/analytics';
export { MetricsRecorderSetup, MetricsRecorderStart } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new MetricsRecorderPlugin(initializerContext);
}
