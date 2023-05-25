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

import {
  ToolingLog,
  ToolingLogCollectingWriter,
  createAbsolutePathSerializer,
  createRecursiveSerializer,
} from '@osd/dev-utils';

import { Config } from '../../lib';
import { ExtractNodeBuilds } from './extract_node_builds_task';
import { getLatestNodeVersion } from './node_download_info';

jest.mock('../../lib/fs');
jest.mock('../../lib/get_build_number');

const Fs = jest.requireMock('../../lib/fs');

const log = new ToolingLog();
const testWriter = new ToolingLogCollectingWriter();
log.setWriters([testWriter]);

expect.addSnapshotSerializer(createAbsolutePathSerializer());

async function setup() {
  const config = await Config.create({
    isRelease: true,
    targetAllPlatforms: true,
    targetPlatforms: {
      linux: false,
      linuxArm: false,
      darwin: false,
      windows: false,
    },
  });

  const realNodeVersion = await getLatestNodeVersion(config);
  if (realNodeVersion) {
    expect.addSnapshotSerializer(
      createRecursiveSerializer(
        (s) => typeof s === 'string' && s.includes(realNodeVersion),
        (s) => s.split(realNodeVersion).join('<node version>')
      )
    );
  }

  return { config };
}

beforeEach(() => {
  testWriter.messages.length = 0;
  jest.clearAllMocks();
});

it('runs expected fs operations', async () => {
  const { config } = await setup();

  await ExtractNodeBuilds.run(config, log, []);

  const usedMethods = Object.fromEntries(
    Object.entries(Fs)
      .filter((entry): entry is [string, jest.Mock] => {
        const [, mock] = entry;

        if (typeof mock !== 'function') {
          return false;
        }

        return (mock as jest.Mock).mock.calls.length > 0;
      })
      .map(([name, mock]) => [name, mock.mock.calls])
  );

  expect(usedMethods).toMatchInlineSnapshot(`
    Object {
      "untar": Array [
        Array [
          <absolute path>/.node_binaries/<node version>/node-v<node version>-linux-x64.tar.gz,
          <absolute path>/.node_binaries/<node version>/linux-x64,
          Object {
            "strip": 1,
          },
        ],
        Array [
          <absolute path>/.node_binaries/<node version>/node-v<node version>-linux-arm64.tar.gz,
          <absolute path>/.node_binaries/<node version>/linux-arm64,
          Object {
            "strip": 1,
          },
        ],
        Array [
          <absolute path>/.node_binaries/<node version>/node-v<node version>-darwin-x64.tar.gz,
          <absolute path>/.node_binaries/<node version>/darwin-x64,
          Object {
            "strip": 1,
          },
        ],
        Array [
          <absolute path>/.node_binaries/14.21.3/node-v14.21.3-linux-x64.tar.gz,
          <absolute path>/.node_binaries/14.21.3/linux-x64,
          Object {
            "strip": 1,
          },
        ],
        Array [
          <absolute path>/.node_binaries/14.21.3/node-v14.21.3-linux-arm64.tar.gz,
          <absolute path>/.node_binaries/14.21.3/linux-arm64,
          Object {
            "strip": 1,
          },
        ],
        Array [
          <absolute path>/.node_binaries/14.21.3/node-v14.21.3-darwin-x64.tar.gz,
          <absolute path>/.node_binaries/14.21.3/darwin-x64,
          Object {
            "strip": 1,
          },
        ],
      ],
      "unzip": Array [
        Array [
          <absolute path>/.node_binaries/<node version>/node-v<node version>-win-x64.zip,
          <absolute path>/.node_binaries/<node version>/win32-x64,
          Object {
            "strip": 1,
          },
        ],
        Array [
          <absolute path>/.node_binaries/14.21.3/node-v14.21.3-win-x64.zip,
          <absolute path>/.node_binaries/14.21.3/win32-x64,
          Object {
            "strip": 1,
          },
        ],
      ],
    }
  `);
});
