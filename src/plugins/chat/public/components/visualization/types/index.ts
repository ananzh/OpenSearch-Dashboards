/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Essential types extracted from Explore
export interface VisColumn {
  id: number;
  schema: VisFieldType;
  name: string;
  column: string;
  validValuesCount: number;
  uniqueValuesCount: number;
}

export enum VisFieldType {
  Number = 'number',
  String = 'string',
  Date = 'date',
  Boolean = 'boolean',
  Unknown = 'unknown',
}

export type ChartType =
  | 'line'
  | 'bar'
  | 'area'
  | 'pie'
  | 'metric'
  | 'heatmap'
  | 'scatter'
  | 'table'
  | 'gauge';

export interface ProcessedVisualizationData {
  transformedData: Array<Record<string, any>>;
  numericalColumns: VisColumn[];
  categoricalColumns: VisColumn[];
  dateColumns: VisColumn[];
}

export interface VisualizationResult {
  success: boolean;
  chartType?: ChartType;
  dataPoints?: number;
  expression?: string;
  error?: string;
  message?: string;
  autoDetected?: boolean;
}

export enum Positions {
  RIGHT = 'right',
  LEFT = 'left',
  TOP = 'top',
  BOTTOM = 'bottom',
}

// Minimal style interfaces for basic charts
export interface BasicChartStyle {
  addLegend?: boolean;
  legendPosition?: Positions;
  title?: string;
}

// Vega schema constant
export const VEGASCHEMA = 'https://vega.github.io/schema/vega-lite/v5.json';
