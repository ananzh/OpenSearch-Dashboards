/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TransactionState {
  inProgress: boolean;
  previousState: any | null;
  error: Error | null;
}

const initialState: TransactionState = {
  inProgress: false,
  previousState: null,
  error: null,
};

const transactionSlice = createSlice({
  name: 'transaction',
  initialState,
  reducers: {
    startTransaction: (state, action: PayloadAction<{ previousState: any }>) => {
      state.inProgress = true;
      state.previousState = action.payload.previousState;
      state.error = null;
    },
    commitTransaction: (state) => {
      state.inProgress = false;
    },
    rollbackTransaction: (state, action: PayloadAction<Error>) => {
      state.inProgress = false;
      state.error = action.payload;
    },
  },
});

export const {
  startTransaction,
  commitTransaction,
  rollbackTransaction,
} = transactionSlice.actions;
export const transactionReducer = transactionSlice.reducer;
