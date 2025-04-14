/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import { initialize } from '../../worker'; // Use the exported worker module
import { SQLWorker } from './sql_worker';

self.onmessage = () => {
  initialize((ctx: any) => {
    return new SQLWorker(ctx);
  });
};
