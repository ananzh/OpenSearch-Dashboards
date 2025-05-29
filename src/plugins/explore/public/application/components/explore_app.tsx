/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { EuiErrorBoundary, EuiPage, EuiPageBody, EuiPageSideBar } from '@elastic/eui';
import { syncQueryStateWithUrl } from '../../../../data/public';
import {
  createOsdUrlStateStorage,
  withNotifyOnErrors,
} from '../../../../opensearch_dashboards_utils/public';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../build_services';
import { RootState } from '../utils/state_management/store';
import { executeQueries } from '../utils/state_management/actions/query_actions';
import { TopNav } from '../legacy/discover/application/view_components/canvas/top_nav';
import { QueryPanel } from './query_panel';
import { TabBar } from './tab_bar';
import { TabContent } from './tab_content';
import { DiscoverChartContainer } from '../legacy/discover/application/view_components/canvas/discover_chart_container';
import { SidebarWrapper } from './sidebar_wrapper';

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

  // Create refs for dataset selector and date picker
  const datasetSelectorRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Sync query state with URL
  useEffect(() => {
    if (services?.data) {
      // Create URL state storage
      const osdUrlStateStorage = createOsdUrlStateStorage({
        history: services.history(),
        useHash: services.uiSettings.get('state:storeInSessionStorage'),
        ...withNotifyOnErrors(services.toastNotifications),
      });

      // syncs `_g` portion of url with query services
      const { stop } = syncQueryStateWithUrl(services.data.query, osdUrlStateStorage);
      return () => stop();
    }
  }, [services]);

  // Create TopNav props structure
  const topNavProps = {
    opts: {
      setHeaderActionMenu: () => {}, // placeholder
      onQuerySubmit: ({ dateRange, query }: any) => {
        // Handle query submission
      },
      optionalRef: {
        datasetSelectorRef,
        datePickerRef,
      },
    },
    showSaveQuery: true,
    isEnhancementsEnabled: true,
  };

  return (
    <EuiErrorBoundary>
      <div className="exploreApp">
        {/* Top Navigation with Dataset Selector */}
        <TopNav {...topNavProps} />

        {/* Query Panel with Date Picker */}
        <div className="exploreQueryPanel">
          <QueryPanel datePickerRef={datePickerRef} />
        </div>

        <div className="exploreContent">
          {/* Histogram (using legacy component directly) */}
          <div className="exploreChartContainer">
            <DiscoverChartContainer />
          </div>

          <div className="exploreMainContent">
            {/* Left Side Panel */}
            <div className="exploreSidebar">
              <SidebarWrapper />
            </div>

            {/* Right Content Area */}
            <div className="exploreRightContent">
              {/* Tab Bar */}
              <TabBar />

              {/* Tab Content */}
              <div className="exploreTabContent">
                <TabContent />
              </div>
            </div>
          </div>
        </div>
      </div>
    </EuiErrorBoundary>
  );
};
