/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { isEqual } from 'lodash';
import { merge } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { queryReducer } from './slices/query_slice';
import { uiReducer } from './slices/ui_slice';
import { resultsReducer } from './slices/results_slice';
import { tabReducer } from './slices/tab_slice';
import { transactionReducer } from './slices/transaction_slice';
import { legacyReducer } from './slices/legacy_slice';
import { persistReduxState } from './utils/redux_persistence';
import { handleQueryStateChanges } from './handlers/query_handler';
import { handleTransactionChanges } from './handlers/transaction_handler';
import { handleTabChanges } from './handlers/tab_handler';
import { executeQueries } from './actions/query_actions';
import { clearResults } from './slices/results_slice';

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
  legacy: legacyReducer,
  services: servicesReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/**
 * Sets up timefilter subscriptions to automatically trigger query execution
 * when time range changes, time updates, or auto-refresh occurs
 */
const setupTimefilterTriggers = (store: any, services: any) => {
  if (!services?.data?.query?.timefilter?.timefilter) {
    // Timefilter service not available, skipping timefilter triggers
    return { unsubscribe: () => {} };
  }

  const timefilter = services.data.query.timefilter.timefilter;

  // Combine all timefilter observables
  const timefilterTriggers$ = merge(
    timefilter.getFetch$(), // Time range changes
    timefilter.getTimeUpdate$(), // Time updates
    timefilter.getAutoRefreshFetch$() // Auto-refresh
  ).pipe(debounceTime(100));

  // Subscribe to timefilter changes
  const subscription = timefilterTriggers$.subscribe(() => {
    // Timefilter triggered query execution

    // Clear results cache since time range changed
    store.dispatch(clearResults());

    // Execute queries with new time range
    store.dispatch(executeQueries() as any);
  });

  return subscription;
};

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

  // Set up timefilter subscriptions for automatic query execution
  const timefilterSubscription = setupTimefilterTriggers(store, services);

  return {
    store,
    unsubscribe: () => {
      unsubscribe();
      timefilterSubscription.unsubscribe();
    },
  };
};

// Define the AppDispatch type for use in components
export type AppDispatch = ReturnType<typeof configureStore>['dispatch'];
