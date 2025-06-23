/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dispatch } from 'redux';
import { saveAs } from 'file-saver';
import { createTabCacheKey, updateSearchSource } from './query_actions';
import { ExploreServices } from '../../../../types';

/**
 * Redux Thunk for exporting data to CSV
 * Uses existing results from the Redux store
 */
export const exportToCsv = (options: { fileName?: string; services?: ExploreServices } = {}) => {
  return (dispatch: Dispatch, getState: () => any) => {
    const state = getState();
    const services = options.services;

    if (!services) {
      return;
    }

    // Use existing tab cache key directly
    const executionCacheKeys = state.ui.executionCacheKeys;
    const cacheKey = executionCacheKeys[1]; // Use tab-specific cache key
    const results = state.results[cacheKey];

    if (!results || !results.hits || !results.hits.hits) {
      throw new Error('No results available for export');
    }

    // Get rows from results
    const rows = results.hits.hits;

    // Get index pattern from query state
    const indexPattern = state.query.dataset;

    // Get columns from legacy state
    const columns = state.legacy?.columns || [];

    // Generate CSV
    const csv = generateCsv(rows, indexPattern, columns);

    // Download CSV
    const fileName = options.fileName || `explore_export_${new Date().toISOString()}.csv`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, fileName);
  };
};

/**
 * Helper function to generate CSV from search results
 */
function generateCsv(rows: any[], indexPattern: any, columns: string[]) {
  // Get field names from columns or all fields if no columns specified
  const fieldNames = columns.length > 0 ? columns : Object.keys(indexPattern.fields);

  // Create header row
  const header = fieldNames.join(',');

  // Create data rows
  const dataRows = rows.map((row) => {
    const flattenedRow = indexPattern.flattenHit(row);
    return fieldNames
      .map((field) => {
        const value = flattenedRow[field];
        // Handle special characters in CSV
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value !== undefined ? value : '';
      })
      .join(',');
  });

  // Combine header and data rows
  return [header, ...dataRows].join('\n');
}

/**
 * Redux Thunk for exporting data to CSV with a maximum size
 * Creates a new SearchSource to fetch more data than is in the cache
 */
export const exportMaxSizeCsv = (
  options: { maxSize?: number; fileName?: string; services?: ExploreServices } = {}
) => {
  return async (dispatch: Dispatch, getState: () => any) => {
    const state = getState();
    const { activeTabId } = state.ui;
    const query = state.query;
    const services = options.services;

    if (!services) {
      return;
    }

    // Get tab definition
    const tabDefinition = services.tabRegistry?.getTab?.(activeTabId);

    // Prepare query for the tab
    const preparedQuery = tabDefinition?.prepareQuery ? tabDefinition.prepareQuery(query) : query;

    try {
      // Get IndexPattern
      let indexPattern;
      if (preparedQuery.dataset) {
        indexPattern = await services.data.indexPatterns.get(
          preparedQuery.dataset.id,
          preparedQuery.dataset.type !== 'INDEX_PATTERN'
        );
      } else {
        throw new Error('No dataset found for CSV export');
      }

      // Reuse existing search source creation logic
      const searchSource = await updateSearchSource(
        preparedQuery,
        indexPattern,
        services,
        false, // No histogram for CSV
        undefined, // No interval
        options.maxSize || 500 // Custom size
      );

      // Execute query
      const results = await searchSource.fetch();

      // Get rows from results
      const rows = results.hits.hits;

      // Get columns from legacy state
      const columns = state.legacy?.columns || [];

      // Generate CSV
      const csv = generateCsv(rows, indexPattern, columns);

      // Download CSV
      const fileName = options.fileName || `explore_export_${new Date().toISOString()}.csv`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, fileName);
    } catch (error) {
      // Error exporting CSV
      throw error;
    }
  };
};
