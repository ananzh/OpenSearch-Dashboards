/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Import the monaco worker initialize function
// We need to use require instead of import to avoid TypeScript errors
// since the monaco-editor worker module doesn't have proper TypeScript declarations
// @ts-ignore
const { initialize } = require('monaco-editor/esm/vs/editor/editor.worker');

// Export the initialize function
export { initialize };
