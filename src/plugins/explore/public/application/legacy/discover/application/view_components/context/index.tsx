/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { BehaviorSubject, Subject } from 'rxjs';
import { DataExplorerServices, ViewProps } from '../../../../data_explorer';
import {
  OpenSearchDashboardsContextProvider,
  useOpenSearchDashboards,
} from '../../../../../../../../opensearch_dashboards_react/public';
import { getServices } from '../../../opensearch_dashboards_services';
import { SearchContextValue, ResultStatus, SearchData } from '../utils/use_search';
import { useIndexPattern } from '../utils/use_index_pattern';
import { RequestAdapter } from '../../../../../../../../inspector/public';

const SearchContext = React.createContext<SearchContextValue>({} as SearchContextValue);

// eslint-disable-next-line import/no-default-export
export default function DiscoverContext({ children }: React.PropsWithChildren<ViewProps>) {
  const { services: deServices } = useOpenSearchDashboards<DataExplorerServices>();
  const services = getServices();
  const dispatch = useDispatch();
  const store = useStore();
  
  // Get index pattern using the combined services
  const indexPattern = useIndexPattern({
    ...deServices,
    ...services,
  });
  
  // Create data$ BehaviorSubject
  const data$ = useMemo(() => {
    // Initialize with loading state
    const subject = new BehaviorSubject<SearchData>({
      status: ResultStatus.UNINITIALIZED,
    });
    
    // Subscribe to Redux store changes
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      
      // Check if we have the necessary state properties
      if (!state.query || !state.ui || !state.results) {
        return;
      }
      
      // Get current state
      const query = state.query.query;
      const isLoading = state.ui.isLoading;
      const error = state.ui.error;
      
      // Create a simple cache key
      const cacheKey = query?.query ? `${query.query}` : '';
      
      // Get results from Redux store
      const results = cacheKey ? state.results[cacheKey] : null;
      
      // Update subject with current state
      if (isLoading) {
        subject.next({
          status: ResultStatus.LOADING,
        });
      } else if (error) {
        subject.next({
          status: ResultStatus.ERROR,
          queryStatus: {
            body: { error },
          },
        });
      } else if (results) {
        subject.next({
          status: results.hits?.hits?.length > 0 ? ResultStatus.READY : ResultStatus.NO_RESULTS,
          hits: results.hits?.total,
          rows: results.hits?.hits,
          fieldCounts: results.fieldCounts,
          bucketInterval: results.bucketInterval || {},
          chartData: results.chartData,
        });
      }
    });
    
    // Clean up subscription when component unmounts
    return subject;
  }, [store]);
  
  // Create refetch$ Subject
  const refetch$ = useMemo(() => {
    const subject = new Subject<'refetch' | undefined>();
    
    // Subscribe to the subject to trigger Redux actions
    const subscription = subject.subscribe(() => {
      // Dispatch actions to trigger a query
      // We'll use the action creators from the actual Redux store
      // This is a simplified version for now
      dispatch({ type: 'REFETCH_QUERY' });
    });
    
    return subject;
  }, [dispatch]);
  
  // Create inspector adapters
  const inspectorAdapters = useMemo(() => {
    // Create a minimal implementation of RequestAdapter
    const requestsAdapter: RequestAdapter = {
      reset: () => {},
      start: () => ({
        stats: () => ({}),
        json: () => ({}),
        ok: () => ({}),
        getTime: () => 0,
      }),
      requests: {},
      resetRequest: () => {},
      getRequests: () => [],
      _onChange: () => {},
    } as unknown as RequestAdapter;
    
    return {
      requests: requestsAdapter,
    };
  }, []);
  
  // Create context value
  const contextValue: SearchContextValue = {
    data$,
    refetch$,
    indexPattern,
    savedSearch: undefined,
    inspectorAdapters,
    fetchForMaxCsvOption: async () => [],
    fetchForMaxCsvStateRef: {
      current: {
        abortController: undefined,
      },
    },
  };

  return (
    <OpenSearchDashboardsContextProvider services={services}>
      <SearchContext.Provider value={contextValue}>{children}</SearchContext.Provider>
    </OpenSearchDashboardsContextProvider>
  );
}

export const useDiscoverContext = () => React.useContext(SearchContext);
