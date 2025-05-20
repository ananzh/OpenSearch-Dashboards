/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TODO: This slice is temporary and will be removed after the transition period.
 * It contains states and actions that are needed to support legacy components
 * from discover during the refactoring process. Once all components have been
 * properly migrated to the new architecture, this slice should be removed.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Filter } from '../../../../../data/common';

// Using any for SortOrder since we don't have direct access to the type
export type SortOrder = [string, string];

export interface LegacyState {
  /**
   * Columns displayed in the table
   */
  columns: string[];
  /**
   * Array of applied filters
   */
  filters?: Filter[];
  /**
   * Used interval of the histogram
   */
  interval?: string;
  /**
   * Array of the used sorting [[field,direction],...]
   */
  sort: SortOrder[];
  /**
   * id of the used saved search
   */
  savedSearch?: string;
  /**
   * dirty flag to indicate if the saved search has been modified
   * since the last save
   */
  isDirty?: boolean;
  /**
   * Metadata for the view
   */
  savedQuery?: string;
  metadata?: {
    /**
     * Number of lines to display per row
     */
    lineCount?: number;
  };
}

const initialState: LegacyState = {
  columns: ['_source'],
  sort: [],
  isDirty: false,
};

const legacySlice = createSlice({
  name: 'legacy',
  initialState,
  reducers: {
    setColumns: (state, action: PayloadAction<string[]>) => {
      state.columns = action.payload;
    },
    setFilters: (state, action: PayloadAction<Filter[]>) => {
      state.filters = action.payload;
    },
    setInterval: (state, action: PayloadAction<string>) => {
      state.interval = action.payload;
    },
    setSort: (state, action: PayloadAction<SortOrder[]>) => {
      state.sort = action.payload;
    },
    setSavedSearch: (state, action: PayloadAction<string>) => {
      state.savedSearch = action.payload;
      state.isDirty = false;
    },
    setIsDirty: (state, action: PayloadAction<boolean>) => {
      state.isDirty = action.payload;
    },
    setSavedQuery: (state, action: PayloadAction<string | undefined>) => {
      state.savedQuery = action.payload;
    },
    setMetadata: (state, action: PayloadAction<Partial<LegacyState['metadata']>>) => {
      state.metadata = {
        ...state.metadata,
        ...action.payload,
      };
    },
    updateLegacyState: (state, action: PayloadAction<Partial<LegacyState>>) => {
      return {
        ...state,
        ...action.payload,
      };
    },
  },
});

export const {
  setColumns,
  setFilters,
  setInterval,
  setSort,
  setSavedSearch,
  setIsDirty,
  setSavedQuery,
  setMetadata,
  updateLegacyState,
} = legacySlice.actions;
export const legacyReducer = legacySlice.reducer;
