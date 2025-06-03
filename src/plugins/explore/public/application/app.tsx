/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { debounceTime } from 'rxjs/operators';
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
import { ResultStatus } from './legacy/discover/application/view_components/utils/use_search';
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

  // Get status and rows for histogram and tab content
  const status = useSelector((state: RootState) => {
    console.log('🎯 App.tsx - Current Status:', state.ui?.status);
    return state.ui?.status || ResultStatus.UNINITIALIZED;
  });
  const rows = useSelector((state: RootState) => {
    console.log('🔍 App.tsx - Full Redux State:', state);
    console.log('🔍 App.tsx - UI State:', state.ui);
    console.log('🔍 App.tsx - ExecutionCacheKeys:', state.ui?.executionCacheKeys);
    console.log('🔍 App.tsx - Results State:', state.results);

    const executionCacheKeys = state.ui?.executionCacheKeys || [];
    if (executionCacheKeys.length === 0) {
      console.log('❌ App.tsx - No cache keys available');
      return [];
    }

    const cacheKey = executionCacheKeys[0];
    console.log('🔑 App.tsx - Using cache key:', cacheKey);

    const results = state.results[cacheKey];
    console.log('📊 App.tsx - Results for cache key:', results);

    const hits = results?.hits?.hits || [];
    console.log('📈 App.tsx - Rows count:', hits.length);

    return hits;
  });

  // Get cache key from Redux state - use executionCacheKeys if available
  const cacheKey = useSelector((state: RootState) => {
    console.log('🔍 App.tsx Cache Key Selector - UI State:', state.ui);
    console.log(
      '🔍 App.tsx Cache Key Selector - ExecutionCacheKeys:',
      state.ui?.executionCacheKeys
    );
    console.log(
      '🔍 App.tsx Cache Key Selector - ExecutionCacheKeys length:',
      state.ui?.executionCacheKeys?.length
    );
    console.log(
      '🔍 App.tsx Cache Key Selector - ExecutionCacheKeys array:',
      JSON.stringify(state.ui?.executionCacheKeys)
    );

    const executionCacheKeys = state.ui?.executionCacheKeys;
    if (executionCacheKeys && executionCacheKeys.length > 0) {
      console.log(
        '✅ App.tsx Cache Key Selector - Using executionCacheKeys[0]:',
        executionCacheKeys[0]
      );
      // Use the first cache key for histogram data
      return executionCacheKeys[0];
    }

    console.log(
      '❌ App.tsx Cache Key Selector - No cache key available, length:',
      executionCacheKeys?.length
    );
    return '';
  });

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
    if (
      !isInitialized &&
      queryState.query &&
      shouldSearchOnPageLoad &&
      isPPLConverted &&
      services
    ) {
      console.log('🚀 App.tsx - Triggering initial query execution on page load');
      console.log('🚀 App.tsx - Query state:', queryState);

      // Trigger initial query execution (cache keys will be stored in Redux)
      dispatch(executeQueries({ services }) as any);
      console.log('🚀 App.tsx - Initial query execution triggered');
      setIsInitialized(true);
    }
  }, [isInitialized, queryState.query, shouldSearchOnPageLoad, isPPLConverted, dispatch, services]);

  // Sync query state with URL and handle timefilter changes
  useEffect(() => {
    if (!services?.data) return;

    // Create URL state storage
    const osdUrlStateStorage = createOsdUrlStateStorage({
      history: services.history(),
      useHash: services.uiSettings.get('state:storeInSessionStorage', false),
      ...withNotifyOnErrors(services.toastNotifications),
    });

    // syncs `_g` portion of url with query services
    const { stop: stopUrlSync } = syncQueryStateWithUrl(
      services.data.query,
      osdUrlStateStorage,
      services.uiSettings
    );

    // Subscribe to timefilter changes (integrated with URL sync)
    const timefilter = services.data.query.timefilter.timefilter;
    const filterManager = services.data.query.filterManager;

    // Combine all the observables that should trigger a search
    const searchTriggers$ = services.data.query.state$.pipe(
      // Debounce to avoid multiple rapid searches
      debounceTime(100)
    );

    const subscription = searchTriggers$.subscribe(() => {
      // Clear cached results when query state changes (time, filters, etc.)
      dispatch(clearResults());
      // Re-execute queries with new state (cache keys will be stored in Redux)
      dispatch(executeQueries({ services }) as any);
      console.log('🔄 App.tsx - Query state changed, re-executing queries');
    });

    return () => {
      stopUrlSync();
      subscription.unsubscribe();
    };
  }, [services, dispatch]);

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
                      {/* Chart container from legacy - show above tabs when there are results */}
                      {(status === ResultStatus.READY ||
                        (status === ResultStatus.LOADING && !!rows?.length) ||
                        (status === ResultStatus.ERROR && !!rows?.length)) && (
                        <div className="dscCanvas__chart">
                          <DiscoverChartContainer />
                        </div>
                      )}

                      {/* Tab Bar for switching between tabs */}
                      <div className="dscCanvas__tabBar">
                        <TabBar />
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
