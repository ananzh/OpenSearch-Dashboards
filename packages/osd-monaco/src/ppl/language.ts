/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { monaco } from '../monaco';
import { registerWorker } from '../worker_store';
import { ID as PPL_LANGUAGE_ID } from '../xjson/lexer_rules/opensearchppl';

// We'll need to add the worker source in webpack.config.js
// For now, we'll use a placeholder
const workerSrc = '';

// Define the validator owner ID
const OWNER = 'PPL_VALIDATOR';

// Register PPL worker
registerWorker(PPL_LANGUAGE_ID, workerSrc);

// Create worker proxy
let worker: monaco.editor.MonacoWebWorker<any> | null = null;

function getWorker(): monaco.editor.MonacoWebWorker<any> {
  if (!worker) {
    worker = monaco.editor.createWebWorker({
      moduleId: '',
      label: PPL_LANGUAGE_ID,
    });
  }
  return worker;
}

// Register validator
export function registerPPLValidator() {
  const disposables: monaco.IDisposable[] = [];

  const updateMarkers = async (model: monaco.editor.IModel): Promise<void> => {
    if (model.isDisposed() || model.getLanguageId() !== PPL_LANGUAGE_ID) {
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
      if (model.getLanguageId() === PPL_LANGUAGE_ID) {
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
    if (model.getLanguageId() === PPL_LANGUAGE_ID) {
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

// Define the PPL language configuration
monaco.languages.setLanguageConfiguration(PPL_LANGUAGE_ID, {
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

// Register the validator when the PPL language is loaded
monaco.languages.onLanguage(PPL_LANGUAGE_ID, registerPPLValidator);
