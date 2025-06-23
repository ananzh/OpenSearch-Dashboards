/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import { DiscoverResultsActionBar } from '../../../application/legacy/discover/application/components/results_action_bar/results_action_bar';
import { ExploreServices } from '../../../types';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { selectSavedSearch } from '../../../application/utils/state_management/selectors';
import { useIndexPatternContext } from '../../../application/components/index_pattern_context';
import { RootState } from '../../../application/utils/state_management/store';

/**
 * Logs tab component for displaying log entries
 * Uses legacy components from discover and handles all content states
 */
const ActionBarComponent = () => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const { indexPattern } = useIndexPatternContext();
  const { core } = services;

  const savedSearch = useSelector(selectSavedSearch);

  const executionCacheKeys = useSelector((state: RootState) => state.ui.executionCacheKeys);
  const results = useSelector((state: RootState) => state.results);

  // Safety check: ensure executionCacheKeys has at least 2 elements
  const cacheKey =
    executionCacheKeys && executionCacheKeys.length >= 2 ? executionCacheKeys[1] : null;
  const rawResults = cacheKey ? results[cacheKey] : null;

  const rows = rawResults?.hits?.hits || [];
  const totalHits = (rawResults?.hits?.total as any)?.value || rawResults?.hits?.total || 0;

  return (
    <DiscoverResultsActionBar
      hits={totalHits}
      showResetButton={!!savedSearch}
      resetQuery={() => {
        core.application.navigateToApp('explore', {
          path: `logs#/view/${savedSearch}`,
        });
      }}
      rows={rows}
      indexPattern={indexPattern}
    />
  );
};

export const ActionBar = memo(ActionBarComponent);
