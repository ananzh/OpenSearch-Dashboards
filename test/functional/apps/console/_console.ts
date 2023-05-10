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

import expect from '@osd/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const DEFAULT_REQUEST = `

GET _search
{
  "query": {
    "match_all": {}
  }
}

`.trim();

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const log = getService('log');
  const find = getService('find');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'console']);

  describe('console app', function describeIndexTests() {
    this.tags('includeFirefox');
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      log.debug('Navigated to console');
    });

    it('should show the default request', async () => {
      await retry.try(async () => {
        await PageObjects.console.collapseHelp();
        log.debug('Collapsed help');
      });
      await retry.try(async () => {
        const actualRequest = await PageObjects.console.getRequest();
        log.debug(`Actual request: ${actualRequest}`);
        expect(actualRequest.trim()).to.eql(DEFAULT_REQUEST);
      });
    });

    it('default request response should include `"timed_out" : false`', async () => {
      const expectedResponseContains = '"timed_out": false,';
      await PageObjects.console.clickPlay();
      log.debug('Clicked play');
      await retry.try(async () => {
        const actualResponse = await PageObjects.console.getResponse();
        log.debug(`Actual response: ${actualResponse}`);
        expect(actualResponse).to.contain(expectedResponseContains);
      });
    });

    it('settings should allow changing the text size', async () => {
      await PageObjects.console.setFontSizeSetting(20);
      log.debug('Set font size to 20');
      await retry.try(async () => {
        expect(await PageObjects.console.getRequestFontSize()).to.be('20px');
      });

      await PageObjects.console.setFontSizeSetting(24);
      log.debug('Set font size to 24');
      await retry.try(async () => {
        expect(await PageObjects.console.getRequestFontSize()).to.be('24px');
      });
    });

    it('should resize the editor', async () => {
      const editor = await find.byCssSelector('.conApp');
      await browser.setWindowSize(1300, 1100);
      log.debug('Set window size to 1300x1100');
      const initialSize = await editor.getSize();
      await browser.setWindowSize(1000, 1100);
      log.debug('Set window size to 1000x1100');
      const afterSize = await editor.getSize();
      expect(initialSize.width).to.be.greaterThan(afterSize.width);
    });
  });
}
