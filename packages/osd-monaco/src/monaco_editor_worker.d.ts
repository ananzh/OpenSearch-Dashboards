/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// This declaration file is needed for TypeScript to recognize the monaco-editor worker module
declare module 'monaco-editor/esm/vs/editor/editor.worker' {
  /**
   * Initialize the web worker with a callback function
   * @param callback The callback function that creates a worker instance
   */
  export function initialize(callback: (ctx: any) => any): void;
}
