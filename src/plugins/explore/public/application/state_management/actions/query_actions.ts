/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dispatch } from 'redux';
import { setLoading, setError } from '../slices/ui_slice';
import { setResults } from '../slices/results_slice';
import { createCacheKey } from '../handlers/query_handler';

/**
 * Executes the current query based on the active tab
 */
export const executeQuery = () => async (dispatch: Dispatch, getState: any) => {
  const state = getState();
  const { query } = state.query;
  const services = state.services;

  // Note: We don't have tabs registered at this stage
  // const tabDefinition = services.tabRegistry.getTab(activeTabId);
  // if (!tabDefinition) return;

  // The prepared query is the same as the query at this stage
  // const preparedQuery = tabDefinition.prepareQuery(query);
  const preparedQuery = query;

  // Get current time range
  const timeRange = services.data.query.timefilter.timefilter.getTime();

  // Create cache key
  const cacheKey = createCacheKey(preparedQuery, timeRange);

  // Check cache first - if we have results, use them
  if (state.results[cacheKey]) {
    // console.log('Using cached results for', cacheKey);
    return state.results[cacheKey];
  }

  // Set loading state
  dispatch(setLoading(true));

  try {
    // Create new SearchSource for this query
    const searchSource = await services.data.search.searchSource.create();

    // Configure SearchSource
    const indexPattern = preparedQuery.dataset || services.indexPattern;
    const timeRangeFilter = services.data.query.timefilter.timefilter.createFilter(indexPattern);

    searchSource
      .setField('index', indexPattern)
      .setField('query', {
        query: preparedQuery.query,
        language: preparedQuery.language, // Use the language from the query
      })
      .setField('filter', timeRangeFilter ? [timeRangeFilter] : []);

    // Execute query
    const results = await searchSource.fetch();

    // Store results in cache
    dispatch(setResults({ cacheKey, results }));

    return results;
  } catch (error) {
    dispatch(setError(error as Error));
    throw error;
  } finally {
    dispatch(setLoading(false));
  }
};
