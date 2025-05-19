/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiButton, EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { setQueryString } from '../state_management/slices/query_slice';
import { beginTransaction, finishTransaction } from '../state_management/actions/transaction_actions';
import { clearResults } from '../state_management/slices/results_slice';
import { RootState } from '../state_management/store';

/**
 * Query panel component for entering and executing queries
 */
export const QueryPanel: React.FC = () => {
  const dispatch = useDispatch();
  const queryState = useSelector((state: RootState) => state.query);
  const isLoading = useSelector((state: RootState) => state.ui.isLoading);
  
  // Local state for query input
  const [localQuery, setLocalQuery] = useState(
    typeof queryState.query.query === 'string' ? queryState.query.query : ''
  );
  
  // Update local state when input changes
  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value);
  }, []);
  
  // Execute query when run button is clicked
  const handleRunQuery = useCallback(() => {
    // Start transaction to batch state updates
    dispatch(beginTransaction());
    
    // Update query state
    dispatch(setQueryString(localQuery));
    
    // Clear results cache
    dispatch(clearResults());
    
    // Commit transaction to trigger query execution
    dispatch(finishTransaction());
  }, [dispatch, localQuery]);
  
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem>
        <EuiFormRow fullWidth>
          <EuiFieldText
            fullWidth
            value={localQuery}
            onChange={handleQueryChange}
            placeholder="Enter query..."
            data-test-subj="exploreQueryInput"
            aria-label="Query input"
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          onClick={handleRunQuery}
          isLoading={isLoading}
          data-test-subj="exploreQuerySubmitButton"
        >
          Run
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};