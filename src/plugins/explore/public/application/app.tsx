/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  EuiErrorBoundary,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiResizableContainer,
  EuiPage,
  EuiPageBody,
  useIsWithinBreakpoints,
} from '@elastic/eui';
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
import { setQuery } from './utils/state_management/slices/query_slice';
import { ResultStatus } from './utils/state_management/types';
import { TopNav } from './legacy/discover/application/view_components/canvas/top_nav';
import { DiscoverChartContainer } from './legacy/discover/application/view_components/canvas/discover_chart_container';
import { QueryPanel } from './components/query_panel';
import { TabBar } from './components/tab_bar';
import { TabContent } from './components/tab_content';
import { DiscoverPanel } from './legacy/discover/application/view_components/panel';
import { HeaderDatasetSelector } from './components/header_dataset_selector';
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
  const resultsState = useSelector((state: RootState) => state.results);
  const uiState = useSelector((state: RootState) => state.ui);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPPLConverted, setIsPPLConverted] = useState(false);
  const isMobile = useIsWithinBreakpoints(['xs', 's', 'm']);
  

  // Check if should search on page load (like discover)
  const shouldSearchOnPageLoad = useMemo(() => {
    return services.uiSettings.get('discover:searchOnPageLoad', true);
  }, [services.uiSettings]);


  // Convert to PPL and generate default query after app loads
  useEffect(() => {
    if (!isPPLConverted && services?.data?.query?.queryString) {
      const checkPPLAvailability = () => {
        const queryStringManager = services.data.query.queryString;
        const languageService = queryStringManager.getLanguageService();
        const pplLanguage = languageService.getLanguage('PPL');

        if (pplLanguage) {
          const currentQuery = queryStringManager.getQuery();

          console.log('🔧 PPL Conversion: Current query from URL:', {
            language: currentQuery.language,
            query: currentQuery.query,
            dataset: currentQuery.dataset
              ? {
                  id: currentQuery.dataset.id,
                  title: currentQuery.dataset.title,
                  type: currentQuery.dataset.type,
                }
              : 'undefined',
          });

          if (currentQuery.language !== 'PPL' && currentQuery.dataset) {
            // Convert to PPL and generate default query
            console.log('🔧 PPL Conversion: Converting non-PPL to PPL');
            const datasetWithPPL = { ...currentQuery.dataset, language: 'PPL' };
            const pplQuery = queryStringManager.getInitialQueryByDataset(datasetWithPPL);

            console.log('🔧 PPL Conversion: Generated PPL query:', pplQuery);

            // Update both queryStringManager and Redux
            queryStringManager.setQuery(pplQuery);
            dispatch(setQuery(pplQuery));
          } else if (
            currentQuery.language === 'PPL' &&
            currentQuery.dataset &&
            (!currentQuery.query || currentQuery.query === '')
          ) {
            // Already PPL but no query string, generate default
            console.log('🔧 PPL Conversion: PPL language but missing query, generating default');
            const datasetWithPPL = { ...currentQuery.dataset, language: 'PPL' };
            const pplQuery = queryStringManager.getInitialQueryByDataset(datasetWithPPL);

            console.log('🔧 PPL Conversion: Generated default PPL query:', pplQuery);

            queryStringManager.setQuery(pplQuery);
            dispatch(setQuery(pplQuery));
          } else if (
            currentQuery.language === 'PPL' &&
            currentQuery.dataset &&
            currentQuery.query
          ) {
            // Already PPL with query, just sync to Redux
            console.log('🔧 PPL Conversion: PPL query already exists, syncing to Redux');
            dispatch(setQuery(currentQuery));
          }

          setIsPPLConverted(true);
          return true; // PPL found and converted
        } else {
          console.warn('PPL language not yet available, will retry...');
          return false; // PPL not found, need to retry
        }
      };

      // Try immediately
      if (!checkPPLAvailability()) {
        // If not available, retry every 100ms for up to 5 seconds
        let retryCount = 0;
        const maxRetries = 50; // 5 seconds

        const retryInterval = setInterval(() => {
          retryCount++;
          if (checkPPLAvailability() || retryCount >= maxRetries) {
            clearInterval(retryInterval);
            if (retryCount >= maxRetries) {
              console.error('PPL language not available after 5 seconds, giving up');
            }
          }
        }, 100);

        // Cleanup interval on unmount
        return () => clearInterval(retryInterval);
      }
    }
  }, [isPPLConverted, services, dispatch]);

  // Simplified dataset change detection - mainly for edge cases
  // Primary dataset handling is now in QueryPanel.handleDatasetSelect
  useEffect(() => {
    if (isPPLConverted && services?.data?.query?.queryString && queryState.dataset) {
      const queryStringManager = services.data.query.queryString;
      const currentQuery = queryStringManager.getQuery();

      // Only regenerate if there's a clear mismatch (backup mechanism)
      const datasetIdMismatch = currentQuery.dataset?.id !== queryState.dataset?.id;
      const queryMismatch =
        currentQuery.language === 'PPL' && !currentQuery.query?.includes(queryState.dataset.title);

      if (datasetIdMismatch || queryMismatch) {
        const datasetWithPPL = { ...queryState.dataset, language: 'PPL' };
        const pplQuery = queryStringManager.getInitialQueryByDataset(datasetWithPPL);

        queryStringManager.setQuery(pplQuery);
        dispatch(setQuery(pplQuery));
      }
    }
  }, [isPPLConverted, services, dispatch, queryState.dataset?.id, queryState.dataset?.title]);

  // Initial query execution
  useEffect(() => {
    if (!isInitialized && queryState.query && shouldSearchOnPageLoad && isPPLConverted && services) {
      console.log('🚀 App.tsx - Triggering initial query execution on page load');
      console.log('🚀 App.tsx - Query state:', queryState);
      
      // Trigger initial query execution (cache keys will be stored in Redux)
      dispatch(executeQueries({ services }) as any);
      console.log('🚀 App.tsx - Initial query execution triggered');
      setIsInitialized(true);
    }
  }, [isInitialized, queryState.query, shouldSearchOnPageLoad, isPPLConverted, dispatch, services]);

  // Subscribe to timefilter changes (global state)
  // This follows the middleware-driven architecture where timefilter changes
  // trigger Redux actions that are handled by the query middleware
  useEffect(() => {
    if (!services?.timefilter) return;

    const subscription = services.timefilter.getTimeUpdate$().subscribe(() => {
      // Clear cached results when time range changes
      dispatch(clearResults());
      // Re-execute queries with new time range (cache keys will be stored in Redux)
      dispatch(executeQueries({ services }) as any);
      console.log('🔄 App.tsx - Time range changed, re-executing queries');
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

        <EuiPage className="deLayout" paddingSize="none" grow={false}>
          <EuiPageBody>
            {/* TopNav component - configured like discover */}
            <TopNav {...topNavProps} />

            {/* HeaderDatasetSelector component - renders dataset selector in portal */}
            {isEnhancementsEnabled && (
              <HeaderDatasetSelector datasetSelectorRef={datasetSelectorRef} />
            )}

            {/* QueryPanel component */}
            <div className="dscCanvas__queryPanel">
              <QueryPanel datePickerRef={datePickerRef} />
            </div>

            {/* Main content area with resizable panels under QueryPanel */}
            <EuiResizableContainer
              direction={isMobile ? 'vertical' : 'horizontal'}
              style={{ flex: 1 }}
            >
              {(EuiResizablePanel, EuiResizableButton) => (
                <>
                  {/* Left Panel: DiscoverPanel (Fields) */}
                  <EuiResizablePanel
                    initialSize={20}
                    minSize="260px"
                    mode={['collapsible', { position: 'top' }]}
                    paddingSize="none"
                  >
                    <DiscoverPanel />
                  </EuiResizablePanel>

                  <EuiResizableButton />

                  {/* Right Panel: Chart and Tab Content */}
                  <EuiResizablePanel initialSize={80} mode="main" paddingSize="none">
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      {/* Tab Bar for switching between tabs */}
                      <div className="dscCanvas__tabBar">
                        <TabBar />
                      </div>

                      {/* Chart container from legacy */}
                      <div className="dscCanvas__chart">
                        <DiscoverChartContainer />
                      </div>

                      {/* Tab content that renders the active tab */}
                      <div className="dscCanvas__tabContent">
                        <TabContent />
                      </div>
                    </div>
                  </EuiResizablePanel>
                </>
              )}
            </EuiResizableContainer>
          </EuiPageBody>
        </EuiPage>
      </div>
    </EuiErrorBoundary>
  );
};
