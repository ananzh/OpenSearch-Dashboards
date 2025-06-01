/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SortOrder } from '../../../../saved_explore/types';

/**
 * Legacy state interface
 * This contains state that is used by legacy components but not needed in the new architecture
 */
export interface LegacyState {
  // Saved search information
  savedSearch: {
    id?: string;
    title?: string;
    description?: string;
  } | null;

  // Column configuration
  columns: string[];

  // Sort configuration - using SortOrder format to match Discover
  sort: SortOrder[];

  // Interval configuration
  interval: string;

  // Row count configuration
  rowCount: number;

  // Saved query ID (legacy discover format)
  savedQuery?: string;

  // Additional state from legacy discover slice
  isDirty?: boolean;
  metadata?: {
    lineCount?: number;
  };
  saveExploreLoadCount: number;
}

const initialState: LegacyState = {
  savedSearch: null,
  columns: [],
  sort: [],
  interval: 'auto',
  rowCount: 50,
  savedQuery: undefined,
  isDirty: false,
  metadata: undefined,
  saveExploreLoadCount: 0,
};

const legacySlice = createSlice({
  name: 'legacy',
  initialState,
  reducers: {
    setSavedSearch: (state, action: PayloadAction<LegacyState['savedSearch']>) => {
      state.savedSearch = action.payload;
    },
    setColumns: (state, action: PayloadAction<string[]>) => {
      state.columns = action.payload;
    },
    addColumn: (state, action: PayloadAction<{ column: string }>) => {
      if (!state.columns.includes(action.payload.column)) {
        state.columns.push(action.payload.column);
      }
    },
    removeColumn: (state, action: PayloadAction<string>) => {
      state.columns = state.columns.filter((col) => col !== action.payload);
    },
    moveColumn: (state, action: PayloadAction<{ columnName: string; destination: number }>) => {
      const { columnName, destination } = action.payload;
      const index = state.columns.indexOf(columnName);
      if (index !== -1 && destination >= 0 && destination < state.columns.length) {
        state.columns.splice(index, 1);
        state.columns.splice(destination, 0, columnName);
      }
    },
    setSort: (state, action: PayloadAction<SortOrder[]>) => {
      state.sort = action.payload;
    },
    setInterval: (state, action: PayloadAction<string>) => {
      state.interval = action.payload;
    },
    setRowCount: (state, action: PayloadAction<number>) => {
      state.rowCount = action.payload;
    },
    setSavedQuery: (state, action: PayloadAction<string | undefined>) => {
      state.savedQuery = action.payload;
    },
    setIsDirty: (state, action: PayloadAction<boolean>) => {
      state.isDirty = action.payload;
    },
    setMetadata: (state, action: PayloadAction<LegacyState['metadata']>) => {
      state.metadata = action.payload;
    },
    setSaveExploreLoadCount: (state, action: PayloadAction<number>) => {
      state.saveExploreLoadCount = action.payload;
    },
    incrementSaveExploreLoadCount: (state) => {
      state.saveExploreLoadCount += 1;
    },
  },
});

export const {
  setSavedSearch,
  setColumns,
  addColumn,
  removeColumn,
  moveColumn,
  setSort,
  setInterval,
  setRowCount,
  setSavedQuery,
  setIsDirty,
  setMetadata,
  setSaveExploreLoadCount,
  incrementSaveExploreLoadCount,
} = legacySlice.actions;

export const legacyReducer = legacySlice.reducer;
