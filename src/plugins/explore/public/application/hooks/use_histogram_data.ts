/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../state_management/store';
import { executeHistogramQuery } from '../state_management/actions/query_actions';

/**
 * Hook that provides histogram data
 * This executes the histogram query directly and stores results in component state
 */
export const useHistogramData = () => {
  const dispatch = useDispatch();
  const queryState = useSelector((state: RootState) => state.query);
  const uiState = useSelector((state: RootState) => state.ui);
  
  // Local state for histogram data
  const [histogramData, setHistogramData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch histogram data when query changes
  useEffect(() => {
    const fetchData = async () => {
      // Skip if already loading or if query is empty
      if (isLoading || !queryState.query.query) {
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
  }, [queryState.query, dispatch, isLoading]);
  
  // Extract chart data from histogram data
  const chartData = histogramData?.chartData || null;
  
  // Extract bucket interval from histogram data
  const bucketInterval = histogramData?.bucketInterval || {};
  
  return {
    chartData,
    bucketInterval,
    isLoading: isLoading || uiState.isLoading,
    error: error || uiState.error
  };
};