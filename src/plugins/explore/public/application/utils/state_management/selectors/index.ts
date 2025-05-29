/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { createCacheKey } from '../handlers/query_handler';
import { TabDefinition } from '../../../../services/tab_registry/tab_registry_service';

/**
 * Basic selectors
 */
const selectQueryState = (state: RootState) => state.query;
const selectUIState = (state: RootState) => state.ui;
const selectResultsState = (state: RootState) => state.results;
const selectServicesState = (state: RootState) => state.services;
const selectLegacyState = (state: RootState) => state.legacy;
const selectTransactionState = (state: RootState) => state.ui.transaction;

/**
 * Query selectors
 */
export const selectQuery = createSelector([selectQueryState], (queryState) => queryState.query);

export const selectQueryString = createSelector([selectQuery], (query) =>
  typeof query.query === 'string' ? query.query : ''
);

export const selectQueryLanguage = createSelector([selectQuery], (query) => query.language);

export const selectDataset = createSelector([selectQuery], (query) => query.dataset);

/**
 * UI selectors
 */
export const selectActiveTabId = createSelector([selectUIState], (uiState) => uiState.activeTabId);

export const selectIsLoading = createSelector([selectUIState], (uiState) => uiState.isLoading);

export const selectError = createSelector([selectUIState], (uiState) => uiState.error);

export const selectFlavor = createSelector([selectUIState], (uiState) => uiState.flavor);

export const selectPromptQuery = createSelector(
  [selectUIState],
  (uiState) => uiState.queryPanel.promptQuery
);

/**
 * Tab selectors
 */
export const selectActiveTab = createSelector(
  [selectActiveTabId, selectServicesState],
  (activeTabId, services) => services.tabRegistry?.getTab?.(activeTabId)
);

export const selectAllTabs = createSelector(
  [selectServicesState],
  (services) => services.tabRegistry?.getAllTabs?.() || []
);

export const selectTabsForLanguage = createSelector(
  [selectAllTabs, selectQueryLanguage],
  (tabs, language) => tabs.filter((tab: TabDefinition) => tab.supportedLanguages.includes(language))
);

/**
 * Results selectors
 */
export const selectCacheKey = createSelector(
  [selectQuery, selectServicesState],
  (query, services) => {
    const timeRange = services.data.query.timefilter.timefilter.getTime();
    return createCacheKey(query, timeRange);
  }
);

export const selectResults = createSelector(
  [selectResultsState, selectCacheKey],
  (resultsState, cacheKey) => resultsState[cacheKey]
);

export const selectRows = createSelector([selectResults], (results) => {
  if (results?.hits?.hits) {
    return results.hits.hits;
  }
  return [];
});

export const selectTotalHits = createSelector([selectResults], (results) => {
  if (results?.hits?.total?.value !== undefined) {
    return results.hits.total.value;
  }
  return 0;
});

export const selectFieldCounts = createSelector([selectResults], (results) => {
  if (results?.fieldCounts) {
    return results.fieldCounts;
  }
  return {};
});

/**
 * Legacy selectors
 */
export const selectColumns = createSelector(
  [selectLegacyState],
  (legacyState) => legacyState.columns
);

export const selectSort = createSelector([selectLegacyState], (legacyState) => legacyState.sort);

export const selectSavedSearch = createSelector(
  [selectLegacyState],
  (legacyState) => legacyState.savedSearch
);

/**
 * Transaction selectors
 */
export const selectIsTransactionInProgress = createSelector(
  [selectTransactionState],
  (transactionState) => transactionState.inProgress
);

// Transaction error is now handled in UI state
export const selectTransactionError = createSelector([selectUIState], (uiState) => uiState.error);

/**
 * Combined selectors
 */
export const selectTabData = createSelector(
  [
    selectActiveTabId,
    selectQuery,
    selectResults,
    selectIsLoading,
    selectError,
    selectServicesState,
  ],
  (activeTabId, query, results, isLoading, error, services) => {
    const tabDefinition = services.tabRegistry?.getTab?.(activeTabId);

    if (!tabDefinition) {
      return {
        tabId: activeTabId,
        query,
        results,
        isLoading,
        error,
        preparedQuery: query,
      };
    }

    // Prepare query for the active tab
    const preparedQuery = tabDefinition.prepareQuery(query);

    return {
      tabId: activeTabId,
      tabDefinition,
      query,
      preparedQuery,
      results,
      isLoading,
      error,
    };
  }
);

export const selectIndexPattern = createSelector(
  [selectQuery, selectServicesState],
  (query, services) => query.dataset || services.indexPattern
);

export const selectTimeRange = createSelector([selectServicesState], (services) =>
  services.data.query.timefilter.timefilter.getTime()
);
