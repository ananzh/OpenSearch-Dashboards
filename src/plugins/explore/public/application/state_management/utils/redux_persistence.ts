/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { RootState } from '../store';

/**
 * Loads Redux state from URL parameters
 */
export const loadReduxState = async (services: any) => {
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
 * Persists Redux state to URL parameters
 */
export const persistReduxState = ({ query, ui, tab, legacy }: RootState, services: any) => {
  try {
    // Update application state in URL
    services.osdUrlStateStorage.set(
      '_a',
      {
        query: query.query,
        ui: {
          activeTabId: ui.activeTabId,
          flavor: ui.flavor,
        },
        tab,
        legacy,
      },
      { replace: true }
    );

    // Update global state in URL if needed
    // This is typically handled by the timefilter service directly
  } catch (err) {
    return;
  }
};
