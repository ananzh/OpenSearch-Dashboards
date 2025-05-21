/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { HeaderVariant } from 'opensearch-dashboards/public';
import { LOGS_VIEW_ID } from '../../../../../../../common';
import { TopNav } from './top_nav';
import { ViewProps } from '../../../../data_explorer';
import { DiscoverTable } from './discover_table';
import { DiscoverChartContainer } from './discover_chart_container';
import { ResultStatus } from '../utils/use_search';
import { DiscoverNoResults } from '../../components/no_results/no_results';
import { DiscoverNoIndexPatterns } from '../../components/no_index_patterns/no_index_patterns';
import { DiscoverUninitialized } from '../../components/uninitialized/uninitialized';
import { LoadingSpinner } from '../../components/loading_spinner/loading_spinner';
import { DiscoverResultsActionBar } from '../../components/results_action_bar/results_action_bar';
import { DiscoverViewServices } from '../../../build_services';
import { useOpenSearchDashboards } from '../../../../../../../../opensearch_dashboards_react/public';
import { QUERY_ENHANCEMENT_ENABLED_SETTING } from '../../../../../../../common/legacy/discover';
import './discover_canvas.scss';

// eslint-disable-next-line import/no-default-export
export default function DiscoverCanvas({ setHeaderActionMenu, optionalRef }: ViewProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();
  
  // Get services from context
  const {
    services: {
      uiSettings,
      capabilities,
      chrome: { setHeaderVariant },
      data,
      core,
    },
  } = useOpenSearchDashboards<DiscoverViewServices>();
  
  // Get data from Redux
  const isLoading = useSelector((state: any) => state.ui.isLoading);
  const error = useSelector((state: any) => state.ui.error);
  const indexPattern = useSelector((state: any) => {
    return state.query.query.dataset || state.services.indexPattern;
  });
  const savedSearch = useSelector((state: any) => state.legacy?.savedSearch);
  const rows = useSelector((state: any) => {
    const queryState = state.query;
    const resultsState = state.results;
    const services = state.services;
    
    // Get current time range
    const timeRange = services.data.query.timefilter.timefilter.getTime();
    
    // Create cache key
    const cacheKey = `${queryState.query.query}_${timeRange.from}_${timeRange.to}`;
    
    // Get results from cache
    const results = resultsState[cacheKey];
    
    if (results?.hits?.hits) {
      return results.hits.hits;
    }
    return [];
  });
  
  // Determine status based on Redux state
  let status: ResultStatus;
  if (isLoading) {
    status = ResultStatus.LOADING;
  } else if (error) {
    status = ResultStatus.ERROR;
  } else if (rows.length > 0) {
    status = ResultStatus.READY;
  } else {
    status = ResultStatus.NO_RESULTS;
  }
  
  const isEnhancementsEnabled = uiSettings.get(QUERY_ENHANCEMENT_ENABLED_SETTING);

  // Create refetch function using transaction pattern
  const refetch = useCallback(() => {
    // Dispatch actions directly
    dispatch({ 
      type: 'transaction/startTransaction', 
      payload: { 
        previousState: {
          query: {},
          ui: {},
          tab: {},
        } 
      } 
    });
    
    // Clear results
    dispatch({ type: 'results/clearResults' });
    
    // Commit transaction
    dispatch({ type: 'transaction/commitTransaction' });
    dispatch({ type: 'transaction/commitState' });
  }, [dispatch]);

  // Create a wrapper for onQuerySubmit that matches the expected type
  const handleQuerySubmit = useCallback(
    // Use any type to avoid type errors
    (payload: any, isUpdate?: boolean) => {
      if (isUpdate === false) {
        refetch();
      }
    },
    [refetch]
  );
  
  const scrollToTop = () => {
    if (panelRef.current) {
      panelRef.current.scrollTop = 0;
    }
  };
  
  const showSaveQuery = !!capabilities.discover?.saveQuery;

  const discoverResultsActionBar = (
    <DiscoverResultsActionBar
      hits={rows?.length}
      showResetButton={!!savedSearch?.id}
      resetQuery={() => {
        core.application.navigateToApp('explore', {
          path: `${LOGS_VIEW_ID}#/view/${savedSearch?.id}`,
        });
      }}
      rows={rows}
      indexPattern={indexPattern}
    />
  );

  return (
    <EuiPanel
      panelRef={panelRef}
      hasBorder={true}
      hasShadow={false}
      paddingSize="s"
      className="dscCanvas"
      data-test-subj="dscCanvas"
      borderRadius="l"
    >
      <TopNav
        isEnhancementsEnabled={isEnhancementsEnabled}
        opts={{
          setHeaderActionMenu,
          onQuerySubmit: handleQuerySubmit,
          optionalRef,
        }}
        showSaveQuery={showSaveQuery}
      />

      {indexPattern ? (
        <>
          {status === ResultStatus.NO_RESULTS && (
            <DiscoverNoResults
              queryString={data.query.queryString}
              query={data.query.queryString.getQuery()}
              savedQuery={data.query.savedQueries}
              timeFieldName={indexPattern.timeFieldName}
            />
          )}
          {/* We don't use UNINITIALIZED status, so this will never render */}
          {false && (
            <DiscoverUninitialized onRefresh={() => refetch()} />
          )}
          {status === ResultStatus.LOADING && !rows?.length && <LoadingSpinner />}
          {status === ResultStatus.ERROR && !rows?.length && (
            <DiscoverUninitialized onRefresh={() => refetch()} />
          )}
          {(status === ResultStatus.READY ||
            (status === ResultStatus.LOADING && !!rows?.length) ||
            (status === ResultStatus.ERROR && !!rows?.length)) &&
            (isEnhancementsEnabled ? (
              <>
                <DiscoverChartContainer />
                {discoverResultsActionBar}
                <DiscoverTable scrollToTop={scrollToTop} />
              </>
            ) : (
              <EuiPanel
                hasShadow={false}
                paddingSize="none"
                className="dscCanvas_results"
                data-test-subj="dscCanvasResults"
              >
                <DiscoverChartContainer />
                {discoverResultsActionBar}
                <DiscoverTable scrollToTop={scrollToTop} />
              </EuiPanel>
            ))}
        </>
      ) : (
        <>
          <EuiSpacer size="xxl" />
          <DiscoverNoIndexPatterns />
        </>
      )}
    </EuiPanel>
  );
}
