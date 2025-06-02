/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { EuiErrorBoundary, EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
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
import { ResultStatus } from './utils/state_management/types';
import { TopNav } from './legacy/discover/application/view_components/canvas/top_nav';
import { DiscoverChartContainer } from './legacy/discover/application/view_components/canvas/discover_chart_container';
import { QueryPanel } from './components/query_panel';
import { TabBar } from './components/tab_bar';
import { TabContent } from './components/tab_content';
import { QUERY_ENHANCEMENT_ENABLED_SETTING } from './constants';
import './app.scss';

/**
 * Main application component for the Explore plugin
 */
export const ExploreApp: React.FC<{ setHeaderActionMenu?: (menuMount: any) => void }> = ({
  setHeaderActionMenu,
}) => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const dispatch = useDispatch();
  const queryState = useSelector((state: RootState) => state.query);
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

  // Get enhanced UI setting
  const isEnhancementsEnabled = services.uiSettings?.get(QUERY_ENHANCEMENT_ENABLED_SETTING);

  // Create refs for portal positioning to match discover layout
  const topLinkRef = useRef<HTMLDivElement>(null);
  const datasetSelectorRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Create TopNav props - use portal approach for precise positioning
  const topNavProps = {
    isEnhancementsEnabled,
    opts: {
      setHeaderActionMenu: setHeaderActionMenu || (() => {}), // Use real global header mount point
      onQuerySubmit: ({ dateRange, query }: any) => {
        // Update time range
        if (dateRange && services?.data?.query?.timefilter?.timefilter) {
          services.data.query.timefilter.timefilter.setTime(dateRange);
        }
      },
      optionalRef: {
        topLinkRef,
        datasetSelectorRef,
        datePickerRef,
      },
    },
    showSaveQuery: true,
  };

  return (
    <EuiErrorBoundary>
      <div className="mainPage">
        {/* Nav bar structure exactly like data_explorer */}
        {isEnhancementsEnabled && (
          <EuiFlexGroup
            direction="row"
            className="mainPage navBar"
            gutterSize="none"
            alignItems="center"
            justifyContent="spaceBetween"
          >
            <EuiFlexItem grow={false}>
              <div ref={topLinkRef} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <div ref={datasetSelectorRef} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <div ref={datePickerRef} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        <EuiPanel
          hasBorder={true}
          hasShadow={false}
          paddingSize="s"
          className="dscCanvas"
          data-test-subj="dscCanvas"
          borderRadius="l"
        >
          {/* TopNav component - configured like discover */}
          <TopNav {...topNavProps} />

          {/* QueryPanel component */}
          <div className="dscCanvas__queryPanel">
            <QueryPanel datePickerRef={datePickerRef} datasetSelectorRef={datasetSelectorRef} />
          </div>

          {/* Tab Bar for switching between tabs */}
          <div className="dscCanvas__tabBar">
            <TabBar />
          </div>

          {/* Chart container from legacy */}
          <div className="dscCanvas__chart">
            <DiscoverChartContainer rows={[]} status={ResultStatus.READY} />
          </div>

          {/* Tab content that renders the active tab */}
          <div className="dscCanvas__tabContent">
            <TabContent />
          </div>
        </EuiPanel>
      </div>
    </EuiErrorBoundary>
  );
};
