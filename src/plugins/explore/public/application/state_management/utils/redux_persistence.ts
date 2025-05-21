/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { RootState } from '../store';
import { Query } from '../../../../../data/common';

/**
 * Persists Redux state to URL
 * This function is called after each state change
 */
export const persistReduxState = (state: RootState, services: any) => {
  // Skip if in a transaction
  if (state.transaction.inProgress) {
    return;
  }

  // Get the state we want to persist
  const { query, ui, legacy } = state;
  
  // Create state object for URL
  const urlState = {
    query: query.query,
    tab: ui.activeTabId,
    columns: legacy.columns,
    sort: legacy.sort,
    filters: legacy.filters,
    interval: legacy.interval,
    rowCount: legacy.rowCount,
  };
  
  // Get current time range
  const timeRange = services.data.query.timefilter.timefilter.getTime();
  
  // Update URL state
  services.data.query.state.update({
    query: urlState.query,
    filters: urlState.filters,
    time: timeRange,
  });
  
  // Update URL hash
  updateUrlHash(urlState);
};

/**
 * Updates URL hash with state
 */
const updateUrlHash = (state: any) => {
  // Encode state as JSON and base64
  const encodedState = btoa(JSON.stringify(state));
  
  // Update URL hash
  const url = new URL(window.location.href);
  url.hash = `#/view/${encodedState}`;
  
  // Replace URL without reloading page
  window.history.replaceState({}, '', url.toString());
};

/**
 * Loads state from URL
 * This function is called during initialization
 */
export const loadStateFromUrl = (services: any): any => {
  try {
    // Get URL hash
    const hash = window.location.hash;
    
    // Check if hash contains state
    if (!hash || !hash.startsWith('#/view/')) {
      return null;
    }
    
    // Extract encoded state
    const encodedState = hash.substring('#/view/'.length);
    
    // Decode state
    const state = JSON.parse(atob(encodedState));
    
    // Get query state from URL
    const queryState = services.data.query.state.get();
    
    // Merge URL state with query state
    return {
      query: {
        query: queryState.query || state.query,
      },
      ui: {
        activeTabId: state.tab || 'logs',
      },
      legacy: {
        columns: state.columns || [],
        sort: state.sort || [],
        filters: queryState.filters || state.filters || [],
        interval: state.interval || 'auto',
        rowCount: state.rowCount || 50,
      },
    };
  } catch (error) {
    console.error('Error loading state from URL:', error);
    return null;
  }
};
