/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// Let's assume DiscoverChart exists in this path
// If it doesn't, you'll need to create or import it from the correct location
const DiscoverChart = ({ chartData, bucketInterval, timeField }: any) => (
  <div>
    <h3>Chart for {timeField}</h3>
    <div>Interval: {bucketInterval.interval}</div>
    <div>Data points: {chartData?.series?.[0]?.values?.length || 0}</div>
  </div>
);

/**
 * This is a Redux Thunk for executing histogram queries
 * It's defined inline here for simplicity, but should be moved to a separate file
 */
const executeHistogramQuery = () => {
  // Return a thunk function
  return async (dispatch: any, getState: () => any) => {
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
 * Helper function to transform aggregation results into chart data
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

export const DiscoverChartContainer = () => {
  const dispatch = useDispatch();
  
  // Get index pattern from Redux
  const indexPattern = useSelector((state: any) => {
    return state.query.query.dataset || state.services.indexPattern;
  });
  
  // Get query from Redux
  const query = useSelector((state: any) => state.query.query);
  
  // Local state for histogram data
  const [histogramData, setHistogramData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch histogram data when query changes
  useEffect(() => {
    const fetchData = async () => {
      // Skip if no time field or already loading
      if (!indexPattern?.timeFieldName || isLoading || !query.query) {
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Execute histogram query - this dispatches a thunk
        const data = await dispatch(executeHistogramQuery() as any);
        setHistogramData(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [query, dispatch, indexPattern, isLoading]);
  
  if (!indexPattern || !indexPattern.timeFieldName) {
    return null;
  }
  
  if (isLoading && !histogramData) {
    return <div>Loading histogram...</div>;
  }
  
  if (error) {
    return <div>Error loading histogram: {error.message}</div>;
  }
  
  if (!histogramData?.chartData) {
    return null;
  }
  
  return (
    <DiscoverChart
      chartData={histogramData.chartData}
      bucketInterval={histogramData.bucketInterval || {}}
      timeField={indexPattern.timeFieldName}
    />
  );
};
