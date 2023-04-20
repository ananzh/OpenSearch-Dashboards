/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ToolingLog,
  ToolingLogCollectingWriter,
  createAnyInstanceSerializer,
  createAbsolutePathSerializer,
} from '@osd/dev-utils';
import { Build, Config } from '../lib';
import { PatchNativeModules } from './patch_native_modules_task';

const log = new ToolingLog();
const testWriter = new ToolingLogCollectingWriter();
log.setWriters([testWriter]);
expect.addSnapshotSerializer(createAnyInstanceSerializer(Config));
expect.addSnapshotSerializer(createAnyInstanceSerializer(ToolingLog));
expect.addSnapshotSerializer(createAbsolutePathSerializer());

jest.mock('../lib/download');
jest.mock('../lib/fs', () => ({
  ...jest.requireActual('../lib/fs'),
  untar: jest.fn(),
  gunzip: jest.fn(),
}));

const { untar } = jest.requireMock('../lib/fs');
const { gunzip } = jest.requireMock('../lib/fs');
const { download } = jest.requireMock('../lib/download');

async function setup() {
  const config = await Config.create({
    isRelease: true,
    targetAllPlatforms: false,
    targetPlatforms: {
      linux: false,
      linuxArm: false,
      darwin: false,
      windows: false,
    },
  });

  const build = new Build(config);

  download.mockImplementation(() => {});
  untar.mockImplementation(() => {});
  gunzip.mockImplementation(() => {});

  return { config, build };
}

beforeEach(() => {
  testWriter.messages.length = 0;
  jest.clearAllMocks();
});

it('patch native modules task downloads the correct platform package', async () => {
  const { config, build } = await setup();
  config.targetPlatforms.linuxArm = true;
  await PatchNativeModules.run(config, log, build);
  expect(download.mock.calls.length).toBe(1);
  expect(download.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "destination": <absolute path>/.native_modules/re2/linux-arm64-108.tar.gz,
          "log": <ToolingLog>,
          "retries": 3,
          "sha256": "9ec1c0485ad1e0356ba12ae267d7fe485915a40d0bd74019ce6e7ba109912512",
          "url": "https://d1v1sj258etie.cloudfront.net/node-re2/releases/download/1.18.0/linux-arm64-108.tar.gz",
        },
      ],
    ]
  `);
});

it('for .tar.gz artifact, patch native modules task unzip it via untar', async () => {
  const { config, build } = await setup();
  config.targetPlatforms.linuxArm = true;
  await PatchNativeModules.run(config, log, build);
  expect(untar.mock.calls.length).toBe(1);
  expect(gunzip.mock.calls.length).toBe(0);
});

it('for .gz artifact, patch native modules task unzip it via gunzip', async () => {
  const { config, build } = await setup();
  config.targetPlatforms.linux = true;
  await PatchNativeModules.run(config, log, build);
  expect(untar.mock.calls.length).toBe(0);
  expect(gunzip.mock.calls.length).toBe(1);
});
