/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { EuiErrorBoundary } from '@elastic/eui';
import { syncQueryStateWithUrl } from '../../../data/public';
import {
  createOsdUrlStateStorage,
  withNotifyOnErrors,
} from '../../../opensearch_dashboards_utils/public';
import { useOpenSearchDashboards } from '../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../types';
import { RootState } from './utils/state_management/store';
import { executeQueries } from './utils/state_management/actions/query_actions';
import { clearResults } from './utils/state_management/slices/results_slice';
import { ExploreCanvas } from './components/explore_canvas';

/**
 * Main application component for the Explore plugin
 */
export const ExploreApp: React.FC = () => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const dispatch = useDispatch();
  const queryState = useSelector((state: RootState) => state.query);
  const uiState = useSelector((state: RootState) => state.ui);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if should search on page load (like discover)
  const shouldSearchOnPageLoad = useMemo(() => {
    return services.uiSettings.get('discover:searchOnPageLoad', true);
  }, [services.uiSettings]);

  // Initial query execution
  useEffect(() => {
    if (!isInitialized && queryState.query && shouldSearchOnPageLoad) {
      // Trigger initial query execution
      dispatch(executeQueries());
      setIsInitialized(true);
    }
  }, [isInitialized, queryState.query, shouldSearchOnPageLoad, dispatch]);

  // Subscribe to timefilter changes (global state)
  // This follows the middleware-driven architecture where timefilter changes
  // trigger Redux actions that are handled by the query middleware
  useEffect(() => {
    if (!services?.timefilter) return;

    const subscription = services.timefilter.getTimeUpdate$().subscribe(() => {
      // Clear cached results when time range changes
      dispatch(clearResults());
      // Re-execute queries with new time range
      dispatch(executeQueries());
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [services?.timefilter, dispatch]);

  // Sync query state with URL
  useEffect(() => {
    if (services?.data) {
      // Create URL state storage
      const osdUrlStateStorage = createOsdUrlStateStorage({
        history: services.history(),
        useHash: services.uiSettings.get('state:storeInSessionStorage', false),
        ...withNotifyOnErrors(services.toastNotifications),
      });

      // syncs `_g` portion of url with query services
      const { stop } = syncQueryStateWithUrl(services.data.query, osdUrlStateStorage);
      return () => stop();
    }
  }, [services]);

  return (
    <EuiErrorBoundary>
      <ExploreCanvas />
    </EuiErrorBoundary>
  );
};
