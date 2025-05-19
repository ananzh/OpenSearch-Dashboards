/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Enum for query result status
 */
export enum ResultStatus {
  UNINITIALIZED = 'uninitialized',
  LOADING = 'loading', // initial data load
  READY = 'ready', // results came back
  NO_RESULTS = 'none', // no results came back
  ERROR = 'error', // error occurred
}

/**
 * Interface for search data
 */
export interface SearchData {
  status: ResultStatus;
  fetchCounter?: number;
  fieldCounts?: Record<string, number>;
  hits?: number;
  rows?: any[];
  bucketInterval?: any;
  chartData?: any;
  title?: string;
  error?: Error;
}

/**
 * Interface for query status
 */
export interface QueryStatus {
  status: ResultStatus;
  elapsedMs: number;
  startTime: number;
}
