/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch } from 'react-redux';
import { DatasetSelector, DatasetSelectorAppearance, Query } from '../../../../data/public';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../types';
import { setQuery } from '../utils/state_management/slices/query_slice';
import {
  beginTransaction,
  finishTransaction,
} from '../utils/state_management/actions/transaction_actions';
import { clearResults } from '../utils/state_management/slices/results_slice';

export interface HeaderDatasetSelectorProps {
  datasetSelectorRef: React.RefObject<HTMLDivElement>;
}

/**
 * Header dataset selector component for Explore
 * Uses the Data plugin's ConnectedDatasetSelector and syncs with Explore's Redux store
 */
export const HeaderDatasetSelector: React.FC<HeaderDatasetSelectorProps> = ({
  datasetSelectorRef,
}) => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const dispatch = useDispatch();
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Handle dataset selection - sync with Explore's Redux store
  const handleDatasetSelect = useCallback(
    (query: Query, dateRange?: any) => {
      if (!isMounted.current || !query.dataset) return;

      // Start transaction to batch state updates
      dispatch(beginTransaction());

      // Use queryStringManager to get proper default query with dataset
      const queryWithDefaults = services.data.query.queryString.getInitialQueryByDataset(
        query.dataset
      );

      // Update Redux with the complete query (including generated query string)
      dispatch(setQuery(queryWithDefaults));

      // Clear results cache since dataset changed
      dispatch(clearResults());

      // Update time range if provided
      if (dateRange && services?.data?.query?.timefilter?.timefilter) {
        services.data.query.timefilter.timefilter.setTime(dateRange);
      }

      // Commit transaction to trigger query execution
      dispatch(finishTransaction());
    },
    [dispatch, services]
  );

  // Render dataset selector directly (no portal needed since we're already in the right location)
  return (
    <DatasetSelector
      onSubmit={handleDatasetSelect}
      appearance={DatasetSelectorAppearance.Button}
      buttonProps={{
        'data-test-subj': 'exploreHeaderDatasetSelector',
      }}
    />
  );
};
