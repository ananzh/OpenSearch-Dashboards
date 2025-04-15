/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import { initialize } from '../../worker'; // Use the exported worker module
import { PPLWorker } from './ppl_worker';

// Add debug logs
console.log('[PPL Worker] Worker script loaded');

self.onmessage = () => {
  console.log('[PPL Worker] onmessage handler called');
  initialize((ctx: any) => {
    console.log('[PPL Worker] Initializing PPL worker with context');
    return new PPLWorker(ctx);
  });
};
