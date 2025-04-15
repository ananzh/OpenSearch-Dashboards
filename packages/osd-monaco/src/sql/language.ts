/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { monaco } from '../monaco';
import { registerWorker } from '../worker_store';

// Import the SQL language ID from the lexer rules
import { ID as SQL_LANGUAGE_ID } from '../xjson/lexer_rules/opensearchsql';
const OWNER = 'SQL_VALIDATOR';
// Get the worker URL from the webpack build
// Use a relative path that will be resolved at runtime
const workerSrc = 'sql.editor.worker.js';

console.log(`[SQL Language] Registering worker for ${SQL_LANGUAGE_ID} with path: ${workerSrc}`);
// Register SQL worker
const registered = registerWorker(SQL_LANGUAGE_ID, workerSrc);
console.log(`[SQL Language] Worker registration ${registered ? 'succeeded' : 'failed'}`);
registerWorker(SQL_LANGUAGE_ID, workerSrc);

// Create worker proxy
let worker: monaco.editor.MonacoWebWorker<any> | null = null;

function getWorker(): monaco.editor.MonacoWebWorker<any> {
  if (!worker) {
    console.log(`[SQL Language] Creating worker with label: ${SQL_LANGUAGE_ID}`);
    worker = monaco.editor.createWebWorker({
      moduleId: '',
      label: SQL_LANGUAGE_ID,
    });
    console.log(`[SQL Language] Worker created`);
  }
  return worker;
}

// Register validator
export function registerSQLValidator() {
  console.log('[SQL Language] registerSQLValidator called');
  const disposables: monaco.IDisposable[] = [];

  const updateMarkers = async (model: monaco.editor.IModel): Promise<void> => {
    console.log('[SQL Language] updateMarkers called for model:', model.uri.toString());
    console.log('[SQL Language] Model language ID:', model.getLanguageId());
    
    if (model.isDisposed() || model.getLanguageId() !== SQL_LANGUAGE_ID) {
      console.log('[SQL Language] Model disposed or language ID mismatch, returning');
      return;
    }

    console.log('[SQL Language] Getting worker instance');
    const workerInstance = getWorker();
    console.log('[SQL Language] Syncing resources with worker');
    await workerInstance.withSyncedResources([model.uri]);
    console.log('[SQL Language] Getting worker proxy');
    const proxy = await workerInstance.getProxy();
    console.log('[SQL Language] Calling validate on worker proxy');
    const errors = await proxy.validate(model.uri.toString());
    console.log('[SQL Language] Validation complete, errors:', errors);

    console.log('[SQL Language] Setting model markers');
    monaco.editor.setModelMarkers(
      model,
      OWNER,
      errors.map((error: any) => ({
        startLineNumber: error.line,
        startColumn: error.column,
        endLineNumber: error.line,
        endColumn: error.column + error.length,
        message: error.message,
        severity: monaco.MarkerSeverity.Error,
      }))
    );
  };

  // Listen for model changes
  disposables.push(
    monaco.editor.onDidCreateModel((model) => {
      if (model.getLanguageId() === SQL_LANGUAGE_ID) {
        updateMarkers(model);
        disposables.push(
          model.onDidChangeContent(() => {
            updateMarkers(model);
          })
        );
      }
    })
  );

  // Check existing models
  monaco.editor.getModels().forEach((model) => {
    if (model.getLanguageId() === SQL_LANGUAGE_ID) {
      updateMarkers(model);
      disposables.push(
        model.onDidChangeContent(() => {
          updateMarkers(model);
        })
      );
    }
  });

  return () => {
    if (worker) {
      worker.dispose();
      worker = null;
    }
    disposables.forEach((d) => d.dispose());
  };
}

// Define the SQL language configuration
monaco.languages.setLanguageConfiguration(SQL_LANGUAGE_ID, {
  comments: {
    lineComment: '--',
    blockComment: ['/*', '*/'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '`', close: '`' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '`', close: '`' },
  ],
});

// Register the validator when the SQL language is loaded
console.log('[SQL Language] Registering onLanguage handler for:', SQL_LANGUAGE_ID);
monaco.languages.onLanguage(SQL_LANGUAGE_ID, registerSQLValidator);
console.log('[SQL Language] onLanguage handler registered');

// Also register the validator immediately for any existing models
console.log('[SQL Language] Checking for existing models with language:', SQL_LANGUAGE_ID);
const existingModels = monaco.editor.getModels().filter(model =>
  model.getLanguageId() === SQL_LANGUAGE_ID
);
console.log('[SQL Language] Found existing models:', existingModels.length);
if (existingModels.length > 0) {
  console.log('[SQL Language] Registering validator for existing models');
  registerSQLValidator();
}
