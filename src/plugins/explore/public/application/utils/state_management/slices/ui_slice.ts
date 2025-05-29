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
  abortController: AbortController | null;
  queryPanel: {
    promptQuery: string;
  };
  transaction: {
    inProgress: boolean;
    pendingActions: string[];
  };
}

const initialState: UIState = {
  activeTabId: 'logs',
  flavor: 'log',
  isLoading: false,
  error: null,
  abortController: null,
  queryPanel: {
    promptQuery: '',
  },
  transaction: {
    inProgress: false,
    pendingActions: [],
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
    setAbortController: (state, action: PayloadAction<AbortController | null>) => {
      state.abortController = action.payload;
    },
    // Transaction actions
    startTransaction: (state, action: PayloadAction<{ previousState: any }>) => {
      state.transaction.inProgress = true;
      state.transaction.pendingActions = [];
    },
    commitTransaction: (state) => {
      state.transaction.inProgress = false;
      state.transaction.pendingActions = [];
    },
    rollbackTransaction: (state, action: PayloadAction<Error>) => {
      state.transaction.inProgress = false;
      state.transaction.pendingActions = [];
      state.error = action.payload;
    },
  },
});

export const {
  setActiveTab,
  setFlavor,
  setLoading,
  setError,
  setPromptQuery,
  setAbortController,
  startTransaction,
  commitTransaction,
  rollbackTransaction,
} = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
