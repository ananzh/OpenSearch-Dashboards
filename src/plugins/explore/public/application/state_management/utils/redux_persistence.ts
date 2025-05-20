/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { RootState } from '../store';

/**
 * Loads application state from URL parameters (_a)
 */
export const loadAppState = async (services: any) => {
  try {
    // Load application state from URL
    const serializedState = services.osdUrlStateStorage.get('_a');
    if (serializedState !== null) return serializedState as Partial<RootState>;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  // Return default state if nothing in URL
  return {};
};

/**
 * Loads query state from URL parameters (_q)
 */
export const loadQueryState = async (services: any) => {
  try {
    // Load query state from URL
    const serializedState = services.osdUrlStateStorage.get('_q');
    if (serializedState !== null && serializedState.query) {
      return {
        query: {
          query: serializedState.query,
          language: serializedState.language || '', // Use language from URL or let language selector decide
        },
      };
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  // Return default query state if nothing in URL
  return {
    query: {
      query: '',
      language: '', // Let language selector decide based on app configuration
    },
  };
};

/**
 * Loads Redux state from URL parameters (combines _a and _q)
 */
export const loadReduxState = async (services: any) => {
  const appState = await loadAppState(services);
  const queryState = await loadQueryState(services);

  return {
    ...appState,
    query: queryState.query,
  };
};

/**
 * Persists application state to URL parameters (_a)
 */
export const persistAppState = ({ ui, tab, legacy }: RootState, services: any) => {
  try {
    // Update application state in URL
    services.osdUrlStateStorage.set(
      '_a',
      {
        ui: {
          activeTabId: ui.activeTabId,
          flavor: ui.flavor,
        },
        tab,
        legacy,
      },
      { replace: true }
    );
  } catch (err) {
    return;
  }
};

/**
 * Persists query state to URL parameters (_q)
 */
export const persistQueryState = ({ query }: RootState, services: any) => {
  try {
    // Update query state in URL
    services.osdUrlStateStorage.set(
      '_q',
      {
        query: query.query.query,
        language: query.query.language, // Use the language from the query state
      },
      { replace: true }
    );
  } catch (err) {
    return;
  }
};

/**
 * Persists Redux state to URL parameters (both _a and _q)
 * Note: _g is handled by the timefilter service directly
 */
export const persistReduxState = (state: RootState, services: any) => {
  persistAppState(state, services);
  persistQueryState(state, services);
};
