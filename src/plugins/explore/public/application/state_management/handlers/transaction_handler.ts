/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Store } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { executeQuery } from '../actions/query_actions';
import { createCacheKey } from './query_handler';

/**
 * Handles side effects when transaction state changes
 */
export const handleTransactionChanges = (
  store: Store,
  currentState: RootState,
  previousState: RootState
) => {
  // If transaction just completed, execute query
  if (previousState.transaction.inProgress && !currentState.transaction.inProgress) {
    // Only execute query if we're not in an error state
    if (!currentState.transaction.error) {
      // Get the current query and time range
      const { query } = currentState.query;
      const services = currentState.services;

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

      // Check if we have cached results
      if (!currentState.results[cacheKey]) {
        // No cached results, execute query
        store.dispatch(executeQuery() as any);
      }
    }
  }
};

/**
 * Action type for committing a transaction
 */
export const COMMIT_STATE_TRANSACTION = 'transaction/commitState';

/**
 * Action type for restoring state after rollback
 */
export const RESTORE_STATE = 'transaction/restoreState';
