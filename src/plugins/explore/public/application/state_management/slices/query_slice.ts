/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Query, Dataset } from '../../../../../data/common';

export interface QueryState {
  query: Query;
}

const initialState: QueryState = {
  query: {
    query: '',
    language: 'ppl',
  },
};

const querySlice = createSlice({
  name: 'query',
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<Query>) => {
      state.query = action.payload;
    },
    setQueryString: (state, action: PayloadAction<string>) => {
      if (typeof state.query.query === 'string') {
        state.query.query = action.payload;
      } else {
        state.query.query = { ...state.query.query, query: action.payload };
      }
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.query.language = action.payload;
    },
    setDataset: (state, action: PayloadAction<Dataset>) => {
      state.query.dataset = action.payload;
    },
  },
});

export const { setQuery, setQueryString, setLanguage, setDataset } = querySlice.actions;
export const queryReducer = querySlice.reducer;