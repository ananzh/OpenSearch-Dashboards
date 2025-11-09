/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema, TypeOf } from '@osd/config-schema';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  agUiUrl: schema.maybe(schema.string()),
  mlCommonsAgentId: schema.maybe(schema.string()),
  oasis: schema.object({
    endpoint: schema.string({ defaultValue: 'https://localhost:3001' }),
    region: schema.string({ defaultValue: 'us-west-2' }),
    timeout: schema.number({ defaultValue: 5000 }),
    enabled: schema.boolean({ defaultValue: true }),
  }),
});

export type ChatConfigType = TypeOf<typeof configSchema>;
