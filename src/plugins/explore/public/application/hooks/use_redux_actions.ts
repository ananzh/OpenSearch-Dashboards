/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { executeTabQuery, executeHistogramQuery, executeQueries } from '../state_management/actions/query_actions';
import { beginTransaction, finishTransaction, abortTransaction } from '../state_management/actions/transaction_actions';

/**
 * Custom hook that provides access to Redux Thunk actions
 * This hook wraps thunks with useCallback to prevent unnecessary re-renders
 */
export const useReduxActions = () => {
  const dispatch = useDispatch();
  
  // Wrap each thunk in useCallback to prevent unnecessary re-renders
  const runTabQuery = useCallback((options?: { clearCache?: boolean }) => {
    return dispatch(executeTabQuery(options) as any);
  }, [dispatch]);
  
  const runHistogramQuery = useCallback(() => {
    return dispatch(executeHistogramQuery() as any);
  }, [dispatch]);
  
  const runAllQueries = useCallback((options?: { clearCache?: boolean }) => {
    return dispatch(executeQueries(options) as any);
  }, [dispatch]);
  
  const startTransaction = useCallback(() => {
    dispatch(beginTransaction() as any);
  }, [dispatch]);
  
  const completeTransaction = useCallback(() => {
    dispatch(finishTransaction() as any);
  }, [dispatch]);
  
  const cancelTransaction = useCallback((error: Error) => {
    dispatch(abortTransaction(error) as any);
  }, [dispatch]);
  
  // Return all the wrapped thunk actions
  return {
    runTabQuery,
    runHistogramQuery,
    runAllQueries,
    startTransaction,
    completeTransaction,
    cancelTransaction,
  };
};