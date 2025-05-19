/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Store } from '@reduxjs/toolkit';
import { isEqual } from 'lodash';
import { RootState } from '../store';
import { executeQuery } from '../actions/query_actions';

/**
 * Handles side effects when query state changes
 */
export const handleQueryStateChanges = (
  store: Store,
  currentState: RootState,
  previousState: RootState
) => {
  // Skip if in a transaction - query execution will be handled by transaction handler
  if (currentState.transaction.inProgress) {
    return;
  }

  // Skip if only the query changed but not by user action (e.g., during loading)
  // This prevents unnecessary query execution during initialization
  const isInitialLoad = !previousState.query.query && currentState.query.query;
  if (isInitialLoad && !currentState.ui.isLoading) {
    return;
  }

  // If query changed and not in a transaction, execute query
  if (!isEqual(currentState.query.query, previousState.query.query)) {
    store.dispatch(executeQuery() as any);
  }
};

/**
 * Creates a cache key for storing query results
 */
export const createCacheKey = (query: any, timeRange: any): string => {
  return JSON.stringify({
    query: query.query,
    language: query.language,
    dataset: query.dataset,
    timeRange,
  });
};