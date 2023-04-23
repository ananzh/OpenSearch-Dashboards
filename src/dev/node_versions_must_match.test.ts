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

import { readFile } from 'fs/promises';
import semver from 'semver';
import { engines } from '../../package.json';
import expect from '@osd/expect';

// ToDo: `.node-version` seems to exist for no good reason; find out if we can get rid of it and this test.
describe('All configs should use a single version of Node', () => {
  it('should compare .node-version and .nvmrc', async () => {
    const [nodeVersion, nvmrc] = await Promise.all([
      readFile('./.node-version', { encoding: 'utf-8' }),
      readFile('./.nvmrc', { encoding: 'utf-8' }),
    ]);

    expect(nodeVersion.trim()).to.be(nvmrc.trim());
  });

  it('should compare .node-version and engines.node from package.json', async () => {
    const nodeVersion = await readFile('./.node-version', {
      encoding: 'utf-8',
    });
    expect(semver.satisfies(nodeVersion.trim(), engines.node)).to.be(true);
  });
});
