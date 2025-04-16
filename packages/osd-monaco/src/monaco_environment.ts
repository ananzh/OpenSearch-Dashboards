/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { getWorker as getRegisteredWorker } from './worker_store';
import { monaco } from './monaco';

// @ts-ignore
window.MonacoEnvironment = {
  getWorker: (_moduleId: string, label: string) => {
    console.log(`[Monaco Environment] Creating worker for: ${label}`);
    
    // Check if a worker is registered in the worker store
    const registeredWorkerPath = getRegisteredWorker(label);
    if (registeredWorkerPath) {
      console.log(`[Monaco Environment] Using registered worker for ${label} from path: ${registeredWorkerPath}`);
      // Create a worker from the registered path
      // Convert relative path to absolute URL
      const workerUrl = new URL(registeredWorkerPath, window.location.origin + window.location.pathname).href;
      console.log(`[Monaco Environment] Creating worker with absolute URL: ${workerUrl}`);
      return new Worker(workerUrl);
    }
    
    // Note: PPL worker is now registered properly through the worker_store
    
    // Create a fully inline worker for SQL
    if (label === 'SQL') {
      console.log(`[Monaco Environment] Creating inline SQL worker`);
      const workerCode = `
        // SQL Worker implementation
        self.onmessage = function() {
          console.log('[SQL Worker] Worker initialized');
          
          self.onmessage = function(e) {
            console.log('[SQL Worker] Received message:', e.data);
            const { id, method, params } = e.data;
            
            if (method === 'validate') {
              console.log('[SQL Worker] Validating code:', params.code);
              const code = params.code || '';
              const errors = [];
              
              // Basic validation for SQL
              if (code.trim() && !code.toLowerCase().trim().startsWith('select')) {
                console.log('[SQL Worker] Found error: SQL query must start with SELECT');
                errors.push({
                  message: 'SQL query must start with SELECT',
                  line: 1,
                  column: 1,
                  length: Math.min(code.length, 10)
                });
              }
              
              console.log('[SQL Worker] Validation complete, errors:', errors);
              self.postMessage({ id, result: errors });
            }
          };
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      return new Worker(URL.createObjectURL(blob));
    }
    
    // Default editor worker
    console.log(`[Monaco Environment] Creating default worker`);
    const blob = new Blob([`
      self.onmessage = function() {
        self.onmessage = function(e) {
          const { id } = e.data;
          self.postMessage({ id, result: [] });
        };
      };
    `], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }
};
