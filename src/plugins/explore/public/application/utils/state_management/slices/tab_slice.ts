/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  ChartStyleControlMap,
  ChartType,
} from '../../../../components/visualizations/utils/use_visualization_types';

export interface TabState {
  logs: {};
  visualizations: {
    styleOptions?: ChartStyleControlMap[ChartType];
    chartType: ChartType;
  };
}

const initialState: TabState = {
  logs: {},
  visualizations: {
    styleOptions: undefined,
    chartType: 'line',
  },
};

const tabSlice = createSlice({
  name: 'tab',
  initialState,
  reducers: {
    setVisualizationStyleOptions: (
      state,
      action: PayloadAction<ChartStyleControlMap[ChartType]>
    ) => {
      state.visualizations.styleOptions = action.payload;
    },
    setVisualizationChartType: (state, action: PayloadAction<ChartType>) => {
      state.visualizations.chartType = action.payload;
    },
  },
});

export const { setVisualizationStyleOptions, setVisualizationChartType } = tabSlice.actions;
export const tabReducer = tabSlice.reducer;
