/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Query, Dataset } from '../../../../../../data/common';

export interface QueryState {
  query: Query;
}

// Get the default language from the language service
const initialState: QueryState = {
  query: {
    query: '',
    language: 'ppl', // Default to PPL as mentioned in requirements
    dataset: undefined, // Store dataset here
  },
};

const querySlice = createSlice({
  name: 'query',
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<Query>) => {
      // Use the language from the action payload
      state.query = {
        ...action.payload,
      };
    },
    setQueryString: (state, action: PayloadAction<string>) => {
      if (typeof state.query.query === 'string') {
        state.query.query = action.payload;
      } else {
        state.query.query = { ...state.query.query, query: action.payload };
      }
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      // Use the language from the action payload
      state.query.language = action.payload;
    },
    setDataset: (state, action: PayloadAction<Dataset | undefined>) => {
      state.query.dataset = action.payload;
      // Language will be managed by the language selector
    },
  },
});

export const { setQuery, setQueryString, setLanguage, setDataset } = querySlice.actions;
export const queryReducer = querySlice.reducer;
