/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';
import { PatternItem, PatternsTable } from './patterns_table';
import { COUNT_FIELD, PATTERNS_FIELD } from './utils/constants';
import { RootState } from '../../application/utils/state_management/store';
import { ExploreServices } from '../../types';

export const PatternsContainer = () => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const executionCacheKeys = useSelector((state: RootState) => state.ui.executionCacheKeys);
  const results = useSelector((state: RootState) => state.results);

  // Use tab-specific cache key
  const cacheKey = executionCacheKeys[1];
  const rawResults = results[cacheKey];

  // TODO: Register custom processor for patterns tab if needed
  //       If no need, feel free to remove this comment
  // const tabDefinition = services.tabRegistry?.getTab?.('patterns');
  // const processor = tabDefinition?.resultsProcessor || defaultResultsProcessor;
  // const processedResults = processor(rawResults, indexPattern);

  const rows = rawResults?.hits?.hits || [];
  const totalHits = (rawResults?.hits?.total as any)?.value || rawResults?.hits?.total || 0;

  // Convert rows to pattern items or use default if rows is undefined
  const items: PatternItem[] =
    rows?.map((row: any) => ({
      pattern: row._source[PATTERNS_FIELD],
      ratio: row._source[COUNT_FIELD] / totalHits,
      count: row._source[COUNT_FIELD],
    })) || [];

  return <PatternsTable items={items} />;
};
