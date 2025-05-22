/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import { createGetterSetter } from 'src/plugins/opensearch_dashboards_utils/public';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';

export const [getUsageCollector, setUsageCollector] = createGetterSetter<UsageCollectionSetup>(
  'UsageCollector'
);