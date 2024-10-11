import { schema, TypeOf } from '@osd/config-schema';
import { PluginConfigDescriptor } from 'opensearch-dashboards/server';
import {
  DEFAULT_BATCHING_INTERVAL_FOR_UI_METRIC_IN_S,
} from '../common/constants';

export const configSchema = schema.object({
  record: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
    debug: schema.boolean({ defaultValue: schema.contextRef('dev') }),
    batchingIntervalInS: schema.number({
      min: 0,
      defaultValue: DEFAULT_BATCHING_INTERVAL_FOR_UI_METRIC_IN_S,
    }),
    reportIntervalInS: schema.number({
      min: 0,
      defaultValue: DEFAULT_BATCHING_INTERVAL_FOR_UI_METRIC_IN_S,
    }),
  }),
});

export type ConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    record: true,
  },
};
