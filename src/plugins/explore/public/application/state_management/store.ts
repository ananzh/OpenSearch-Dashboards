/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { isEqual } from 'lodash';
import { queryReducer } from './slices/query_slice';
import { uiReducer } from './slices/ui_slice';
import { resultsReducer } from './slices/results_slice';
import { tabReducer } from './slices/tab_slice';
import { transactionReducer } from './slices/transaction_slice';
import { persistReduxState } from './utils/redux_persistence';
import { handleQueryStateChanges } from './handlers/query_handler';
import { handleTransactionChanges } from './handlers/transaction_handler';
import { handleTabChanges } from './handlers/tab_handler';

// Define a services slice to store services in the Redux store
const servicesReducer = (state = null, action: any) => {
  if (action.type === 'SET_SERVICES') {
    return action.payload;
  }
  return state;
};

const rootReducer = combineReducers({
  query: queryReducer,
  ui: uiReducer,
  results: resultsReducer,
  tab: tabReducer,
  transaction: transactionReducer,
  services: servicesReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export const getExploreStore = async (services: any, preloadedState?: any) => {
  // Create store with Redux Thunk middleware
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      ...preloadedState,
      services, // Inject services into the store for thunks to access
    },
  });

  // Keep track of previous state for change detection
  let previousState = store.getState();

  // Set up store subscriber for side effects
  const unsubscribe = store.subscribe(() => {
    const currentState = store.getState();
    
    // Skip if state hasn't changed
    if (isEqual(currentState, previousState)) return;
    
    // Persist state to URL
    persistReduxState(currentState, services);
    
    // Apply side effects based on what changed
    
    // Handle query state changes
    if (!isEqual(currentState.query, previousState.query)) {
      handleQueryStateChanges(store, currentState, previousState);
    }
    
    // Handle transaction state changes
    if (!isEqual(currentState.transaction, previousState.transaction)) {
      handleTransactionChanges(store, currentState, previousState);
    }
    
    // Handle tab state changes
    if (currentState.ui.activeTabId !== previousState.ui.activeTabId) {
      handleTabChanges(store, currentState, previousState);
    }
    
    // Update previous state reference
    previousState = { ...currentState };
  });

  return { store, unsubscribe };
};

// Define the AppDispatch type for use in components
export type AppDispatch = ReturnType<typeof configureStore>['dispatch'];