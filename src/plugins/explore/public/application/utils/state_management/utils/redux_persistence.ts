/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { RootState } from '../store';

/**
 * Persists Redux state to URL
 * This function is called after each state change
 */
export const persistReduxState = (state: RootState, services: any) => {
  // Skip if in a transaction
  if (state.ui.transaction?.inProgress) {
    return;
  }

  try {
    // Persist _q (Query state) - following current_design.txt
    services.osdUrlStateStorage.set(
      '_q',
      {
        query: state.query.query.query,
        dataset: state.query.query.dataset,
        // Note: timeRange and filters handled by data plugin
      },
      { replace: true }
    );

    // Persist _a (Application state) - following vis_builder pattern
    services.osdUrlStateStorage.set(
      '_a',
      {
        ui: state.ui,
        tab: state.tab,
        legacy: state.legacy,
        // Note: results not persisted
      },
      { replace: true }
    );
  } catch (err) {
    console.error('Error persisting state:', err);
  }
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
        interval: state.interval || 'auto',
        rowCount: state.rowCount || 50,
      },
    };
  } catch (error) {
    return null;
  }
};

/**
 * Loads Redux state from URL or returns default state
 * Following data_explorer pattern with both _q and _a
 */
export const loadReduxState = async (services: any): Promise<any> => {
  try {
    // Load both _q (query state) and _a (application state)
    const queryState = services.osdUrlStateStorage?.get('_q');
    const appState = services.osdUrlStateStorage?.get('_a');

    if (queryState !== null || appState !== null) {
      // Start with default state
      const defaultState = await getPreloadedState(services);

      // Merge URL states
      const mergedState = {
        ...defaultState,
        ...(queryState && { query: { ...defaultState.query, ...queryState } }),
        ...(appState && {
          ui: { ...defaultState.ui, ...appState.ui },
          tab: { ...defaultState.tab, ...appState.tab },
          legacy: { ...defaultState.legacy, ...appState.legacy },
        }),
      };

      // Handle dataset migration (following data_explorer pattern)
      const isQueryEnhancementEnabled = services.uiSettings.get('query:enhancements:enabled');

      // Check if we have a dataset in query state that needs data source info
      if (isQueryEnhancementEnabled && mergedState.query.query.dataset?.id) {
        const dataset = mergedState.query.query.dataset;

        try {
          const indexPattern = await services.data.indexPatterns.get(dataset.id);

          // Handle data source reference (for PPL support)
          if (indexPattern.dataSourceRef) {
            const dataSource = await services.data.indexPatterns.getDataSource(
              indexPattern.dataSourceRef.id
            );

            if (dataSource) {
              // Update dataset with data source info
              const updatedDataset = {
                ...dataset,
                dataSource: {
                  id: dataSource.id,
                  title: dataSource.attributes.title,
                  type: dataSource.attributes.dataSourceEngineType || '',
                },
              };

              // Update query string manager with dataset
              services.data.query.queryString.setQuery({ dataset: updatedDataset });

              // Update merged state with enhanced dataset
              mergedState.query.query = {
                ...mergedState.query.query,
                dataset: updatedDataset,
              };
            }
          }
        } catch (error) {
          console.warn('Failed to load index pattern for dataset migration:', error);
        }
      }

      return mergedState;
    }
  } catch (err) {
    console.error('Error loading state from URL:', err);
  }

  // If state is not found, load the default state
  return await getPreloadedState(services);
};

/**
 * Get preloaded state for each slice (following vis_builder pattern)
 */
export const getPreloadedState = async (services: any): Promise<any> => {
  const queryState = await getPreloadedQueryState(services);
  const uiState = await getPreloadedUIState(services);
  const resultsState = await getPreloadedResultsState(services);
  const tabState = await getPreloadedTabState(services);
  const legacyState = await getPreloadedLegacyState(services);

  return {
    query: queryState,
    ui: uiState,
    results: resultsState,
    tab: tabState,
    legacy: legacyState,
    services, // Inject services for thunks
  };
};

/**
 * Get preloaded query state with default query from data plugin
 */
const getPreloadedQueryState = async (services: any) => {
  // Get default query from data plugin (like discover does)
  const defaultQuery = services.data.query.queryString.getDefaultQuery();

  return {
    query: defaultQuery, // This will be "source = dataset_name" for PPL
    // Note: timeRange and filters are handled by data plugin, not stored in Redux
  };
};

/**
 * Get preloaded UI state
 */
const getPreloadedUIState = async (services: any) => {
  const defaultQuery = services.data.query.queryString.getDefaultQuery();

  return {
    activeTabId: 'logs',
    flavor: 'log',
    isLoading: false,
    error: null,
    abortController: null,
    queryPanel: {
      promptQuery: defaultQuery.query, // Show default query in panel
    },
    // Transaction state moved to UI slice
    transaction: {
      inProgress: false,
      pendingActions: [],
    },
  };
};

/**
 * Get preloaded results state (empty - not persisted)
 */
const getPreloadedResultsState = async (services: any) => {
  return {};
};

/**
 * Get preloaded tab state
 */
const getPreloadedTabState = async (services: any) => {
  return {};
};

/**
 * Get preloaded legacy state
 */
const getPreloadedLegacyState = async (services: any) => {
  return {
    columns: ['_source'],
    sort: [],
    interval: 'auto',
    rowCount: 50,
  };
};
