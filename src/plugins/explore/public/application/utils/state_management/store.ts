/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { configureStore, combineReducers, PreloadedState } from '@reduxjs/toolkit';
import { isEqual } from 'lodash';
import { queryReducer } from './slices/query_slice';
import { uiReducer } from './slices/ui_slice';
import { resultsReducer } from './slices/results_slice';
import { tabReducer } from './slices/tab_slice';
import { legacyReducer } from './slices/legacy_slice';
import { persistReduxState, loadReduxState } from './utils/redux_persistence';
// Note: Query execution is handled by Redux Thunk actions, not store subscriptions
// This follows the design requirement for "Middleware-Driven: Query execution via Redux middleware"

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
  legacy: legacyReducer,
  services: servicesReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

// Timefilter subscriptions are handled in components, not in store
// This follows the design requirement for component-driven timefilter handling

export const configurePreloadedStore = (preloadedState: PreloadedState<RootState>) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
  });
};

export const getPreloadedStore = async (services: any) => {
  // Load initial state from URL or defaults (following vis_builder pattern)
  const preloadedState = await loadReduxState(services);
  const store = configurePreloadedStore(preloadedState);

  let previousState = store.getState();

  // Listen to changes (following data_explorer pattern)
  const handleChange = () => {
    const state = store.getState();
    persistReduxState(state, services);

    if (isEqual(state, previousState)) return;

    // Side effects to apply after changes to the store are made
    // Note: Query execution is handled by Redux Thunk actions, not store subscriptions
    // This follows the design requirement for "Middleware-Driven: Query execution via Redux middleware"

    previousState = state;
  };

  // The store subscriber will automatically detect changes and call handleChange function
  const unsubscribe = store.subscribe(handleChange);

  return { store, unsubscribe };
};

// Define the AppDispatch type for use in components
export type AppDispatch = ReturnType<typeof configureStore>['dispatch'];
