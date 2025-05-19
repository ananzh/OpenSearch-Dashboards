/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Store } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { executeQuery } from '../actions/query_actions';

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
      store.dispatch(executeQuery() as any);
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