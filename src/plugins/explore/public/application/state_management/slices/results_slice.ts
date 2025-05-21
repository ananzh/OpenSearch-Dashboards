/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ResultsState {
  [cacheKey: string]: any;
}

const initialState: ResultsState = {};

const resultsSlice = createSlice({
  name: 'results',
  initialState,
  reducers: {
    setResults: (state, action: PayloadAction<{ cacheKey: string; results: any }>) => {
      const { cacheKey, results } = action.payload;
      state[cacheKey] = results;
    },
    clearResults: (state) => {
      // Clear all results
      return {};
    },
    clearResultsByKey: (state, action: PayloadAction<string>) => {
      // Clear results for a specific cache key
      const cacheKey = action.payload;
      delete state[cacheKey];
    },
  },
});

export const { setResults, clearResults, clearResultsByKey } = resultsSlice.actions;
export const resultsReducer = resultsSlice.reducer;