/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dispatch } from 'redux';
import { setLoading, setError } from '../slices/ui_slice';
import { setResults, clearResults } from '../slices/results_slice';
import { createCacheKey } from '../handlers/query_handler';

/**
 * Creates a cache key for storing query results
 * This is a regular function, not a thunk
 */
export const createTabCacheKey = (query: any, timeRange: any): string => {
  return `${query.query}_${timeRange.from}_${timeRange.to}`;
};

/**
 * This is a Redux Thunk for executing tab queries
 * A Redux Thunk is a function that returns another function which receives dispatch and getState
 * This pattern allows for async logic and accessing the Redux store
 */
export const executeTabQuery = (options: { clearCache?: boolean } = {}) => {
  // This is the thunk function that will be executed by the Redux Thunk middleware
  return async (dispatch: Dispatch, getState: () => any) => {
    const state = getState();
    const { query } = state.query;
    const { activeTabId } = state.ui;
    const services = state.services;

    // Get tab definition
    const tabDefinition = services.tabRegistry?.getTab?.(activeTabId);
    
    // Prepare query for the tab (transform if needed)
    const preparedQuery = tabDefinition?.prepareQuery ? tabDefinition.prepareQuery(query) : query;

    // Get current time range
    const timeRange = services.data.query.timefilter.timefilter.getTime();

    // Create cache key
    const cacheKey = createTabCacheKey(preparedQuery, timeRange);

    // Clear cache if requested
    if (options.clearCache) {
      dispatch(clearResults());
    }

    // Check cache first - if we have results, use them
    if (state.results[cacheKey] && !options.clearCache) {
      console.log('Using cached tab results for', cacheKey);
      return state.results[cacheKey];
    }

    // Set loading state
    dispatch(setLoading(true));

    try {
      console.log('Executing tab query for', preparedQuery.query);
      
      // Create new SearchSource for this query
      const searchSource = await services.data.search.searchSource.create();

      // Configure SearchSource
      const indexPattern = preparedQuery.dataset || services.indexPattern;
      const timeRangeFilter = services.data.query.timefilter.timefilter.createFilter(indexPattern);

      searchSource
        .setField('index', indexPattern)
        .setField('query', {
          query: preparedQuery.query,
          language: preparedQuery.language,
        })
        .setField('filter', timeRangeFilter ? [timeRangeFilter] : []);

      // Execute query
      const results = await searchSource.fetch();

      // Process results
      const fieldCounts: Record<string, number> = {};
      if (results.hits && results.hits.hits) {
        for (const hit of results.hits.hits) {
          const fields = Object.keys(indexPattern.flattenHit(hit));
          for (const fieldName of fields) {
            fieldCounts[fieldName] = (fieldCounts[fieldName] || 0) + 1;
          }
        }
      }

      const tabData = {
        hits: results.hits,
        fieldCounts
      };

      // Store results in cache
      dispatch(setResults({ cacheKey, results: tabData }));

      return tabData;
    } catch (error) {
      dispatch(setError(error as Error));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };
};

/**
 * This is a Redux Thunk for executing histogram queries
 * It demonstrates how thunks can perform async operations and dispatch multiple actions
 */
export const executeHistogramQuery = () => {
  // Return a thunk function
  return async (dispatch: Dispatch, getState: () => any) => {
    const state = getState();
    const { query } = state.query;
    const services = state.services;
    
    // Skip if no time field
    const indexPattern = query.dataset || services.indexPattern;
    if (!indexPattern.timeFieldName) {
      return null;
    }
    
    try {
      console.log('Executing histogram query for', query.query);
      
      // Create new SearchSource for histogram query
      const searchSource = await services.data.search.searchSource.create();
      
      // Get current time range
      const timeRange = services.data.query.timefilter.timefilter.getTime();
      
      // Configure SearchSource
      const timeRangeFilter = services.data.query.timefilter.timefilter.createFilter(indexPattern);
      
      // Add aggregation for histogram
      const aggConfig = {
        aggs: {
          histogram: {
            date_histogram: {
              field: indexPattern.timeFieldName,
              interval: 'auto',
              min_doc_count: 0,
              extended_bounds: {
                min: timeRange.from,
                max: timeRange.to
              }
            }
          }
        },
        size: 0
      };
      
      searchSource
        .setField('index', indexPattern)
        .setField('query', {
          query: query.query,
          language: query.language,
        })
        .setField('filter', timeRangeFilter ? [timeRangeFilter] : [])
        .setField('aggs', aggConfig.aggs);
      
      // Execute query
      const results = await searchSource.fetch();
      
      // Process results to create chart data
      const bucketInterval = {
        interval: aggConfig.aggs.histogram.date_histogram.interval,
        scale: 1
      };
      
      // Transform aggregation results into chart data
      const chartData = transformAggregationToChartData(results, indexPattern);
      
      return {
        chartData,
        bucketInterval
      };
    } catch (error) {
      console.error('Error executing histogram query:', error);
      return null;
    }
  };
};

/**
 * This is a composed thunk that calls other thunks
 * It demonstrates how thunks can be composed together
 */
export const executeQueries = (options: { clearCache?: boolean } = {}) => {
  // Return a thunk function
  return async (dispatch: Dispatch) => {
    // Execute tab query first - note how we're dispatching another thunk
    await dispatch(executeTabQuery(options) as any);
    
    // Then execute histogram query - again dispatching another thunk
    return dispatch(executeHistogramQuery() as any);
  };
};

/**
 * Helper function to transform aggregation results into chart data
 * This is a regular function, not a thunk
 */
function transformAggregationToChartData(results: any, indexPattern: any) {
  if (!results.aggregations || !results.aggregations.histogram) {
    return null;
  }
  
  const buckets = results.aggregations.histogram.buckets;
  
  return {
    xAxisOrderedValues: buckets.map((bucket: any) => bucket.key),
    xAxisFormat: { id: 'date' },
    xAxisLabel: indexPattern.timeFieldName,
    yAxisLabel: 'Count',
    series: [{
      label: 'Documents',
      values: buckets.map((bucket: any) => ({
        x: bucket.key,
        y: bucket.doc_count
      }))
    }]
  };
}
