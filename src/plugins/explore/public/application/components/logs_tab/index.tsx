/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { EuiText } from '@elastic/eui';
import { TabComponentProps } from '../../../services/tab_registry/tab_registry_service';
import { DiscoverResultsActionBar } from '../../legacy/discover/application/components/results_action_bar/results_action_bar';
import { DiscoverTable } from '../../legacy/discover/application/view_components/canvas/discover_table';
import {
  selectColumns,
  selectSort,
  selectSavedSearch,
} from '../../utils/state_management/selectors';

/**
 * Logs tab component for displaying log entries
 * Uses legacy components from discover
 */
export const LogsTab: React.FC<TabComponentProps> = ({
  query,
  results,
  isLoading,
  error,
  cacheKey,
}) => {
  // Get data from Redux store
  const savedSearch = useSelector(selectSavedSearch);
  const services = useSelector((state: any) => state.services);

  // Create reset query function
  const resetQuery = () => {
    if (savedSearch?.id && services?.core?.application) {
      services.core.application.navigateToApp('explore', {
        path: `#/view/${savedSearch.id}`,
      });
    }
  };

  if (!results || !results.hits || !results.hits.hits) {
    return <EuiText>No logs found.</EuiText>;
  }

  const rows = results.hits.hits;
  const indexPattern = query.dataset || services.indexPattern;

  return (
    <div className="dscPage">
      <DiscoverResultsActionBar
        hits={rows.length}
        showResetButton={!!savedSearch?.id}
        resetQuery={resetQuery}
        rows={rows}
        indexPattern={indexPattern}
      />
      <DiscoverTable
        cacheKey={cacheKey}
        results={results}
        scrollToTop={() => {
          window.scrollTo(0, 0);
        }}
      />
    </div>
  );
};
