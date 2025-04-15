/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { monaco } from '../monaco';
import { registerWorker } from '../worker_store';
import { ID as PPL_LANGUAGE_ID } from '../xjson/lexer_rules/opensearchppl';

// Get the worker URL from the webpack build
// Use a relative path that will be resolved at runtime
const workerSrc = 'ppl.editor.worker.js';

// Define the validator owner ID
const OWNER = 'PPL_VALIDATOR';

console.log(`[PPL Language] Registering worker for ${PPL_LANGUAGE_ID} with path: ${workerSrc}`);
// Register PPL worker
const registered = registerWorker(PPL_LANGUAGE_ID, workerSrc);
console.log(`[PPL Language] Worker registration ${registered ? 'succeeded' : 'failed'}`);

// Create worker proxy
let worker: monaco.editor.MonacoWebWorker<any> | null = null;

function getWorker(): monaco.editor.MonacoWebWorker<any> {
  if (!worker) {
    console.log('[PPL Language] Creating worker with label:', PPL_LANGUAGE_ID);
    worker = monaco.editor.createWebWorker({
      moduleId: '',
      label: PPL_LANGUAGE_ID,
    });
    console.log('[PPL Language] Worker created');
  }
  return worker;
}

// Register validator
export function registerPPLValidator() {
  console.log('[PPL Language] registerPPLValidator called');
  const disposables: monaco.IDisposable[] = [];

  const updateMarkers = async (model: monaco.editor.IModel): Promise<void> => {
    console.log('[PPL Language] updateMarkers called for model:', model.uri.toString());
    console.log('[PPL Language] Model language ID:', model.getLanguageId());
    
    if (model.isDisposed() || model.getLanguageId() !== PPL_LANGUAGE_ID) {
      console.log('[PPL Language] Model disposed or language ID mismatch, returning');
      return;
    }

    console.log('[PPL Language] Getting worker instance');
    const workerInstance = getWorker();
    console.log('[PPL Language] Syncing resources with worker');
    await workerInstance.withSyncedResources([model.uri]);
    console.log('[PPL Language] Getting worker proxy');
    const proxy = await workerInstance.getProxy();
    console.log('[PPL Language] Calling validate on worker proxy');
    const errors = await proxy.validate(model.uri.toString());
    console.log('[PPL Language] Validation complete, errors:', errors);

    console.log('[PPL Language] Setting model markers');
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
console.log('[PPL Language] Registering onLanguage handler for:', PPL_LANGUAGE_ID);
monaco.languages.onLanguage(PPL_LANGUAGE_ID, registerPPLValidator);
console.log('[PPL Language] onLanguage handler registered');

// Also register the validator immediately for any existing models
console.log('[PPL Language] Checking for existing models with language:', PPL_LANGUAGE_ID);
const existingModels = monaco.editor.getModels().filter(model =>
  model.getLanguageId() === PPL_LANGUAGE_ID
);
console.log('[PPL Language] Found existing models:', existingModels.length);
if (existingModels.length > 0) {
  console.log('[PPL Language] Registering validator for existing models');
  registerPPLValidator();
}
