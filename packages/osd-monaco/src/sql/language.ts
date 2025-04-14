/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { monaco } from '../monaco';
import { registerWorker } from '../worker_store';

// Define the SQL language ID - use the existing ID from the lexer rules
export const SQL_LANGUAGE_ID = 'opensearchsql';
const OWNER = 'SQL_VALIDATOR';

// We'll need to add the worker source in webpack.config.js
const workerSrc = '';

// Register SQL worker
registerWorker(SQL_LANGUAGE_ID, workerSrc);

// Create worker proxy
let worker: monaco.editor.MonacoWebWorker<any> | null = null;

function getWorker(): monaco.editor.MonacoWebWorker<any> {
  if (!worker) {
    worker = monaco.editor.createWebWorker({
      moduleId: '',
      label: SQL_LANGUAGE_ID,
    });
  }
  return worker;
}

// Register validator
export function registerSQLValidator() {
  const disposables: monaco.IDisposable[] = [];

  const updateMarkers = async (model: monaco.editor.IModel): Promise<void> => {
    if (model.isDisposed() || model.getLanguageId() !== SQL_LANGUAGE_ID) {
      return;
    }

    const workerInstance = getWorker();
    await workerInstance.withSyncedResources([model.uri]);
    const proxy = await workerInstance.getProxy();
    const errors = await proxy.validate(model.uri.toString());

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
monaco.languages.onLanguage(SQL_LANGUAGE_ID, registerSQLValidator);
