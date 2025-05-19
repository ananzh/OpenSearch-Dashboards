/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  activeTabId: string;
  flavor: string;
  isLoading: boolean;
  error: Error | null;
  queryPanel: {
    promptQuery: string;
  };
}

const initialState: UIState = {
  activeTabId: 'logs',
  flavor: 'log',
  isLoading: false,
  error: null,
  queryPanel: {
    promptQuery: '',
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTabId = action.payload;
    },
    setFlavor: (state, action: PayloadAction<string>) => {
      state.flavor = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<Error | null>) => {
      state.error = action.payload;
    },
    setPromptQuery: (state, action: PayloadAction<string>) => {
      state.queryPanel.promptQuery = action.payload;
    },
  },
});

export const { setActiveTab, setFlavor, setLoading, setError, setPromptQuery } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;