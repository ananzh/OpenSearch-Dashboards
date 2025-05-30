/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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

  // Sort configuration
  sort: Array<{
    columnName: string;
    direction: 'asc' | 'desc';
  }>;

  // Interval configuration
  interval: string;

  // Row count configuration
  rowCount: number;

  // Saved query ID (legacy discover format)
  savedQuery?: string;
}

const initialState: LegacyState = {
  savedSearch: null,
  columns: [],
  sort: [],
  interval: 'auto',
  rowCount: 50,
  savedQuery: undefined,
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
    setSort: (
      state,
      action: PayloadAction<Array<{ columnName: string; direction: 'asc' | 'desc' }>>
    ) => {
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
} = legacySlice.actions;

export const legacyReducer = legacySlice.reducer;
