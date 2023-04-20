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

import path from 'path';

import { ToolingLog } from '@osd/dev-utils';

import { deleteAll, download, gunzip, untar, Task, Config, Build, Platform, read } from '../lib';

const DOWNLOAD_DIRECTORY = '.native_modules';

interface Package {
  name: string;
  version: string;
  destinationPath: string;
  extractMethod: string;
  archives: Record<
    string,
    {
      url: string;
      sha256: string;
      overriddenExtractMethod?: string;
      overriddenDestinationPath?: string;
    }
  >;
}

/* Process for updating URLs and checksums after bumping the version of `re2` or NodeJS:
 *   1. Match the `version` with the version in the yarn.lock file.
 *   2. Match the module version, the digits at the end of the filename, with the output of
 *      `node -p process.versions.modules`.
 *   3. Confirm that the URLs exist for each platform-architecture combo on
 *      https://github.com/uhop/node-re2/releases/tag/[VERSION]; reach out to maintainers for ARM
 *      releases of `re2` as they currently don't have an official ARM release.
 *   4. Generate new checksums for each artifact by downloading each one and calling
 *      `shasum -a 256` or `sha256sum` on the downloaded file.
 */
const packages: Package[] = [
  {
    name: 're2',
    version: '1.18.0',
    destinationPath: 'node_modules/re2/build/Release/re2.node',
    extractMethod: 'gunzip',
    archives: {
      'darwin-x64': {
        url: 'https://github.com/uhop/node-re2/releases/download/1.18.0/darwin-x64-108.gz',
        sha256: '1fbe31075a86b44b26a3f188ccc6145600b12a1e9096af97076c9f690065137e',
      },
      'linux-x64': {
        url: 'https://github.com/uhop/node-re2/releases/download/1.18.0/linux-x64-108.gz',
        sha256: 'f256e25870feb6c371585aca321eb865c3592ab3bb9547591b5af9513c7ac008',
      },
      'linux-arm64': {
        url:
          'https://d1v1sj258etie.cloudfront.net/node-re2/releases/download/1.18.0/linux-arm64-108.tar.gz',
        sha256: '9ec1c0485ad1e0356ba12ae267d7fe485915a40d0bd74019ce6e7ba109912512',
        overriddenExtractMethod: 'untar',
        overriddenDestinationPath: 'node_modules/re2/build/Release',
      },
      'win32-x64': {
        url: 'https://github.com/uhop/node-re2/releases/download/1.18.0/win32-x64-108.gz',
        sha256: 'a9be9c18995b687724bc0c8a41ff0b4bef836d0165fe4fff42589220240cabf9',
      },
    },
  },
];

async function getInstalledVersion(config: Config, packageName: string) {
  const packageJSONPath = config.resolveFromRepo(
    path.join('node_modules', packageName, 'package.json')
  );
  const json = await read(packageJSONPath);
  const packageJSON = JSON.parse(json);
  return packageJSON.version;
}

async function patchModule(
  config: Config,
  log: ToolingLog,
  build: Build,
  platform: Platform,
  pkg: Package
) {
  const installedVersion = await getInstalledVersion(config, pkg.name);
  if (installedVersion !== pkg.version) {
    throw new Error(
      `Can't patch ${pkg.name}'s native module, we were expecting version ${pkg.version} and found ${installedVersion}`
    );
  }
  const platformName = platform.getNodeArch();
  const archive = pkg.archives[platformName];
  const archiveName = path.basename(archive.url);
  const downloadPath = config.resolveFromRepo(DOWNLOAD_DIRECTORY, pkg.name, archiveName);
  const extractMethod = archive.overriddenExtractMethod || pkg.extractMethod;
  const extractPath = build.resolvePathForPlatform(
    platform,
    archive.overriddenDestinationPath || pkg.destinationPath
  );
  log.debug(`Patching ${pkg.name} binaries from ${archive.url} to ${extractPath}`);

  await deleteAll([extractPath], log);
  await download({
    log,
    url: archive.url,
    destination: downloadPath,
    sha256: archive.sha256,
    retries: 3,
  });
  switch (extractMethod) {
    case 'gunzip':
      await gunzip(downloadPath, extractPath);
      break;
    case 'untar':
      await untar(downloadPath, extractPath);
      break;
    default:
      throw new Error(`Extract method of ${extractMethod} is not supported`);
  }
}

export const PatchNativeModules: Task = {
  description: 'Patching platform-specific native modules',
  async run(config, log, build) {
    for (const pkg of packages) {
      await Promise.all(
        config.getTargetPlatforms().map(async (platform) => {
          await patchModule(config, log, build, platform, pkg);
        })
      );
    }
  },
};
