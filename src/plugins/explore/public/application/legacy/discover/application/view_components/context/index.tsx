/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BehaviorSubject, Subject } from 'rxjs';
import { OpenSearchDashboardsContextProvider } from '../../../../../../../../opensearch_dashboards_react/public';
import { executeTabQuery } from '../../../../../utils/state_management/actions/query_actions';
import {
  exportToCsv,
  exportMaxSizeCsv,
} from '../../../../../utils/state_management/actions/export_actions';
import * as selectors from '../../../../../utils/state_management/selectors';
import { IndexPattern } from '../../../../../../../../data/public';
import { getServices } from '../../../opensearch_dashboards_services';
import { SavedSearch } from '../../../saved_searches';
import { OpenSearchSearchHit } from '../../doc_views/doc_views_types';
import { ResultStatus, SearchData } from '../utils/use_search';

// Define the SearchContextValue interface
interface SearchContextValue {
  data$: BehaviorSubject<SearchData>;
  refetch$: Subject<'refetch' | undefined>;
  indexPattern?: IndexPattern;
  savedSearch?: SavedSearch;
  inspectorAdapters: {
    requests: any;
  };
  refetch: () => void;
  exportData: (options?: { fileName?: string }) => void;
  exportMaxSizeData: (options?: { maxSize?: number; fileName?: string }) => void;
}

const SearchContext = React.createContext<SearchContextValue>({} as SearchContextValue);

// Define interface for component props
interface ContextProps {
  children: React.ReactNode;
}

// eslint-disable-next-line import/no-default-export
export default function DiscoverContext({ children }: ContextProps) {
  const discoverServices = getServices();
  const dispatch = useDispatch();

  // Get data from Redux store
  const indexPattern = useSelector(selectors.selectIndexPattern);
  const savedSearchObj = useSelector(selectors.selectSavedSearch);
  const services = useSelector((state: any) => state.services);
  const rows = useSelector(selectors.selectRows);
  const isLoading = useSelector(selectors.selectIsLoading);
  const error = useSelector(selectors.selectError);
  const fieldCounts = useSelector(selectors.selectFieldCounts);

  // Create data$ BehaviorSubject
  const data$ = useMemo(() => {
    // Determine status based on Redux state
    let status: ResultStatus;
    if (isLoading) {
      status = ResultStatus.LOADING;
    } else if (error) {
      status = ResultStatus.ERROR;
    } else if (rows && rows.length > 0) {
      status = ResultStatus.READY;
    } else {
      status = ResultStatus.NO_RESULTS;
    }

    // Create initial data
    const initialData: SearchData = {
      status,
      rows,
      fieldCounts,
      queryStatus: error
        ? {
            body: {
              error: {
                message: {
                  error: error.message,
                },
              },
            },
          }
        : undefined,
    };

    return new BehaviorSubject<SearchData>(initialData);
  }, [isLoading, error, rows, fieldCounts]);

  // Create refetch$ Subject
  const refetch$ = useMemo(() => new Subject<'refetch' | undefined>(), []);

  // Create refetch function
  const refetch = () => {
    refetch$.next('refetch');
    dispatch(executeTabQuery({ clearCache: true }) as any);
  };

  // Create export functions
  const exportData = (options: { fileName?: string } = {}) => {
    dispatch(exportToCsv(options) as any);
  };

  const exportMaxSizeData = (options: { maxSize?: number; fileName?: string } = {}) => {
    dispatch(exportMaxSizeCsv(options) as any);
  };

  // Create inspector adapters if they don't exist
  if (!services.inspectorAdapters) {
    services.inspectorAdapters = {
      requests: {},
    };
  }

  // Get savedSearch from services if available
  const savedSearch = useMemo(() => {
    if (!savedSearchObj?.id) return undefined;

    // Try to get the saved search from services
    if (services.getSavedSearchById) {
      try {
        return services.getSavedSearchById(savedSearchObj.id);
      } catch (e) {
        // Error getting saved search - silently handle
      }
    }

    return undefined;
  }, [savedSearchObj, services]);

  // Create context value
  const contextValue: SearchContextValue = {
    data$,
    refetch$,
    indexPattern,
    savedSearch,
    inspectorAdapters: services.inspectorAdapters,
    refetch,
    exportData,
    exportMaxSizeData,
  };

  return (
    <OpenSearchDashboardsContextProvider services={discoverServices}>
      <SearchContext.Provider value={contextValue}>{children}</SearchContext.Provider>
    </OpenSearchDashboardsContextProvider>
  );
}

// Export the useDiscoverContext hook
export const useDiscoverContext = () => React.useContext(SearchContext);
