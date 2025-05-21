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
  
  // Filter configuration
  filters: any[];
  
  // Interval configuration
  interval: string;
  
  // Row count configuration
  rowCount: number;
  
  // Saved query ID
  savedQueryId: string | null;
}

const initialState: LegacyState = {
  savedSearch: null,
  columns: [],
  sort: [],
  filters: [],
  interval: 'auto',
  rowCount: 50,
  savedQueryId: null,
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
      state.columns = state.columns.filter(col => col !== action.payload);
    },
    moveColumn: (state, action: PayloadAction<{ columnName: string; destination: number }>) => {
      const { columnName, destination } = action.payload;
      const index = state.columns.indexOf(columnName);
      if (index !== -1 && destination >= 0 && destination < state.columns.length) {
        state.columns.splice(index, 1);
        state.columns.splice(destination, 0, columnName);
      }
    },
    setSort: (state, action: PayloadAction<Array<{ columnName: string; direction: 'asc' | 'desc' }>>) => {
      state.sort = action.payload;
    },
    setFilters: (state, action: PayloadAction<any[]>) => {
      state.filters = action.payload;
    },
    setInterval: (state, action: PayloadAction<string>) => {
      state.interval = action.payload;
    },
    setRowCount: (state, action: PayloadAction<number>) => {
      state.rowCount = action.payload;
    },
    setSavedQueryId: (state, action: PayloadAction<string | null>) => {
      state.savedQueryId = action.payload;
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
  setFilters,
  setInterval,
  setRowCount,
  setSavedQueryId,
} = legacySlice.actions;

export const legacyReducer = legacySlice.reducer;
