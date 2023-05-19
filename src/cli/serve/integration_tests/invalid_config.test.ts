/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { spawn } from 'child_process';

import { REPO_ROOT } from '@osd/dev-utils';

const INVALID_CONFIG_PATH = require.resolve('./__fixtures__/invalid_config.yml');

interface LogEntry {
  message: string;
  tags: string[];
  type: string;
}

describe('cli invalid config support', function () {
  it(
    'exits with statusCode 64 and logs a single line when config is invalid',
    async function () {
      // Unused keys only throw once LegacyService starts, so disable migrations so that Core
      // will finish the start lifecycle without a running OpenSearch instance.

      // eslint-disable-next-line no-console
      console.log('REPO_ROOT is:', REPO_ROOT); // Added log
      // eslint-disable-next-line no-console
      console.log('INVALID_CONFIG_PATH is:', INVALID_CONFIG_PATH); // Added log
      // eslint-disable-next-line no-console
      console.log(
        'Running command:',
        `${process.execPath} scripts/opensearch_dashboards --config ${INVALID_CONFIG_PATH} --migrations.skip=true`
      );

      const result = await new Promise((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            'scripts/opensearch_dashboards',
            '--config',
            INVALID_CONFIG_PATH,
            '--migrations.skip=true',
          ],
          {
            cwd: REPO_ROOT,
          }
        );

        let stdoutData = '';
        let stderrData = '';

        child.stdout.on('data', (data) => {
          stdoutData += data;
        });

        child.stderr.on('data', (data) => {
          stderrData += data;
        });

        child.on('error', (spawnError) => {
          resolve({ error: spawnError, stdout: stdoutData, stderr: stderrData, status: null });
        });

        child.on('close', (status) => {
          resolve({ error: null, stdout: stdoutData, stderr: stderrData, status });
        });
      });

      const { stdout, stderr, error, status } = result;

      // eslint-disable-next-line no-console
      console.log('spawnSync error is:', error); // Added log
      // eslint-disable-next-line no-console
      console.log('spawnSync stdout is:', stdout.toString('utf8')); // Added log
      // eslint-disable-next-line no-console
      console.log('spawnSync stderr is:', stderr.toString('utf8')); // Added log

      const [fatalLogLine] = stdout
        .toString('utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as LogEntry)
        .filter((line) => line.tags.includes('fatal'))
        .map((obj) => ({
          ...obj,
          pid: '## PID ##',
          '@timestamp': '## @timestamp ##',
          error: '## Error with stack trace ##',
        }));

      expect(error).toBeNull();

      if (!fatalLogLine) {
        throw new Error(
          `cli did not log the expected fatal error message:\n\nstdout: \n${stdout}\n\nstderr:\n${stderr}`
        );
      }

      expect(fatalLogLine.message).toContain(
        'Error: Unknown configuration key(s): "unknown.key", "other.unknown.key", "other.third", "some.flat.key", ' +
          '"some.array". Check for spelling errors and ensure that expected plugins are installed.'
      );
      expect(fatalLogLine.tags).toEqual(['fatal', 'root']);
      expect(fatalLogLine.type).toEqual('log');

      expect(status).toBe(64);
    },
    50 * 1000
  );
});
