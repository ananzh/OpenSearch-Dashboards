/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dispatch } from 'redux';
import { i18n } from '@osd/i18n';
import { RequestAdapter } from '../../../../../inspector/public';
import { setLoading, setError, setAbortController } from '../slices/ui_slice';
import { setResults, clearResults } from '../slices/results_slice';
import { createCacheKey } from '../handlers/query_handler';

/**
 * Default results processor for tabs
 * Processes raw hits to calculate field counts
 */
export const defaultResultsProcessor = (rawResults: any, indexPattern: any) => {
  const fieldCounts: Record<string, number> = {};
  if (rawResults.hits && rawResults.hits.hits) {
    for (const hit of rawResults.hits.hits) {
      const fields = Object.keys(indexPattern.flattenHit(hit));
      for (const fieldName of fields) {
        fieldCounts[fieldName] = (fieldCounts[fieldName] || 0) + 1;
      }
    }
  }
  return {
    hits: rawResults.hits,
    fieldCounts,
  };
};

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
      // Using cached tab results
      return state.results[cacheKey];
    }

    // Abort any in-progress requests
    if (state.ui.abortController) {
      state.ui.abortController.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    dispatch(setAbortController(abortController));

    // Set loading state
    dispatch(setLoading(true));

    try {
      // Executing tab query

      // Create inspector adapter if not already in services
      if (!services.inspectorAdapters) {
        services.inspectorAdapters = {
          requests: new RequestAdapter(),
        };
      }

      // Reset inspector adapter
      services.inspectorAdapters.requests.reset();

      // Create inspector request
      const title = i18n.translate('explore.discover.inspectorRequestDataTitle', {
        defaultMessage: 'data',
      });
      const description = i18n.translate('explore.discover.inspectorRequestDescription', {
        defaultMessage: 'This request queries OpenSearch to fetch the data for the search.',
      });
      const inspectorRequest = services.inspectorAdapters.requests.start(title, { description });

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

      // Add inspector stats
      if (services.getRequestInspectorStats) {
        inspectorRequest.stats(services.getRequestInspectorStats(searchSource));
      }

      // Get search request body for inspector
      searchSource.getSearchRequestBody().then((body: object) => {
        inspectorRequest.json(body);
      });

      // Execute query
      const results = await searchSource.fetch({
        abortSignal: abortController.signal,
        withLongNumeralsSupport: await services.uiSettings.get('data:withLongNumerals'),
      });

      // Add response stats to inspector
      if (services.getResponseInspectorStats) {
        inspectorRequest
          .stats(services.getResponseInspectorStats(results, searchSource))
          .ok({ json: results });
      } else {
        inspectorRequest.ok({ json: results });
      }

      // Get current tab definition to use its data processor
      const currentTabId = state.ui.activeTab || 'logs'; // Default to logs tab
      const tabRegistry = services.tabRegistry;
      const currentTabDefinition = tabRegistry?.getTab(currentTabId);

      // Use tab's processor or default results processor
      const processor = currentTabDefinition?.dataProcessor || defaultResultsProcessor;
      const processedData = processor(results, indexPattern);

      const tabData = {
        ...processedData,
        elapsedMs: inspectorRequest.getTime(),
      };

      // Store results in cache
      dispatch(setResults({ cacheKey, results: tabData }));

      return tabData;
    } catch (error: any) {
      // Handle abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      dispatch(setError(error as Error));
      throw error;
    } finally {
      dispatch(setLoading(false));
      dispatch(setAbortController(null));
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
      // Executing histogram query

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
                max: timeRange.to,
              },
            },
          },
        },
        size: 0,
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
        scale: 1,
      };

      // Transform aggregation results into chart data
      const chartData = transformAggregationToChartData(results, indexPattern);

      return {
        chartData,
        bucketInterval,
      };
    } catch (error) {
      // Error executing histogram query
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
    series: [
      {
        label: 'Documents',
        values: buckets.map((bucket: any) => ({
          x: bucket.key,
          y: bucket.doc_count,
        })),
      },
    ],
  };
}
