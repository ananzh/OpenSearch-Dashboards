/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { matchPath } from 'react-router-dom';
import { cloneDeep } from 'lodash';
import { DataExplorerServices, ViewProps } from '../../../../../data_explorer/public';
import {
  OpenSearchDashboardsContextProvider,
  useOpenSearchDashboards,
} from '../../../../../opensearch_dashboards_react/public';
import { getServices } from '../../../opensearch_dashboards_services';
import { useSearch, SearchContextValue } from '../utils/use_search';
import { useDispatch, useSelector, setSavedSearchId } from '../../utils/state_management';

const SearchContext = React.createContext<SearchContextValue>({} as SearchContextValue);

export default function DiscoverContext({ children }: React.PropsWithChildren<ViewProps>) {
  const hashPath = window.location.hash.split('?')[0]; // Hack to remove query params
  const { savedSearch: savedSearchIdInState } = useSelector((state) => state.discover);
  const dispatch = useDispatch();

  const currentSavedSearchId = matchPath<{ id?: string }>(hashPath, {
    path: '#/view/:id',
  })?.params.id;

  // Use useMemo to memoize savedSearchIdFromUrl
  const savedSearchIdFromUrl = useMemo(() => {
    if (currentSavedSearchId && currentSavedSearchId !== savedSearchIdInState) {
      dispatch(setSavedSearchId(currentSavedSearchId));
      return currentSavedSearchId; // Return the new value to be memoized
    }
    return undefined;
  }, [currentSavedSearchId, savedSearchIdInState, dispatch]);

  const { services: deServices } = useOpenSearchDashboards<DataExplorerServices>();
  const services = getServices();
  const searchParams = useSearch({
    ...deServices,
    ...services,
  });

  const { getSavedSearchById, data, filterManager, chrome } = services;
  // const { savedSearch: savedSearchInstance} = searchParams;

  useEffect(() => {
    if (!savedSearchIdInState || savedSearchIdInState === '') return;
    (async () => {
      const savedSearchInstance = await getSavedSearchById(savedSearchIdInState);
      // Sync initial app filters from savedObject to filterManager
      const filters = cloneDeep(savedSearchInstance.searchSource.getOwnField('filter'));
      const query =
        savedSearchInstance.searchSource.getField('query') ||
        data.query.queryString.getDefaultQuery();
      const actualFilters = [];

      if (filters !== undefined) {
        const result = typeof filters === 'function' ? filters() : filters;
        if (result !== undefined) {
          actualFilters.push(...(Array.isArray(result) ? result : [result]));
        }
      }

      filterManager.setAppFilters(actualFilters);
      data.query.queryString.setQuery(query);

      if (savedSearchInstance?.id) {
        chrome.recentlyAccessed.add(
          savedSearchInstance.getFullPath(),
          savedSearchInstance.title,
          savedSearchInstance.id
        );
      }
    })();

    // This effect will only run when savedSearchIdFromUrl changes
  }, [getSavedSearchById, savedSearchIdInState, data.query.queryString, filterManager, chrome]);

  return (
    <OpenSearchDashboardsContextProvider services={services}>
      <SearchContext.Provider value={searchParams}>{children}</SearchContext.Provider>
    </OpenSearchDashboardsContextProvider>
  );
}

export const useDiscoverContext = () => React.useContext(SearchContext);
