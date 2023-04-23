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

import bluebird from 'bluebird';
import Handlebars from 'handlebars';
import fs from 'fs';
import { readFile, writeFile, readdir } from 'fs/promises';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import moment from 'moment';
import SimpleGit from 'simple-git';

Handlebars.registerHelper('lte', function lessThanEquals(value, threshold, options) {
  if (value <= threshold) {
    return options.fn(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper('gte', function greaterThanEquals(value, threshold, options) {
  if (value >= threshold) {
    return options.fn(this);
  }
  return options.inverse(this);
});

async function buildGallery(comparisons) {
  const simpleGit = new SimpleGit();
  const branch = await simpleGit.branch();

  const template = Handlebars.compile(
    await readFile(
      path.resolve('./utilities/templates/visual_regression_gallery.handlebars'),
      'utf8'
    ),
    { knownHelpersOnly: true }
  );

  const html = template({
    date: moment().format('MMMM Do YYYY, h:mm:ss a'),
    branch: branch.current,
    hiddenThreshold: 0,
    warningThreshold: 0.03,
    comparisons,
  });

  return writeFile(
    path.resolve('./test/functional/screenshots/visual_regression_gallery.html'),
    html
  );
}

async function compareScreenshots() {
  const SCREENSHOTS_DIR = 'test/functional/screenshots';
  const BASELINE_SCREENSHOTS_DIR = path.resolve(SCREENSHOTS_DIR, 'baseline');
  const DIFF_SCREENSHOTS_DIR = path.resolve(SCREENSHOTS_DIR, 'diff');
  const SESSION_SCREENSHOTS_DIR = path.resolve(SCREENSHOTS_DIR, 'session');

  // We don't need to create the baseline dir because it's committed.
  fs.mkdirSync(DIFF_SCREENSHOTS_DIR, { recursive: true });
  fs.mkdirSync(SESSION_SCREENSHOTS_DIR, { recursive: true });
  const files = await readdir(SESSION_SCREENSHOTS_DIR);
  const screenshots = files.filter((file) => file.indexOf('.png') !== -1);

  // We'll use this data to build a screenshot gallery in HTML.
  return await bluebird.map(screenshots, async (screenshot) => {
    // We're going to load image data and cache it in this object.
    const comparison = {
      name: screenshot,
      change: undefined,
      percentage: undefined,
      imageData: {
        session: undefined,
        baseline: undefined,
        diff: undefined,
      },
    };

    const sessionImagePath = path.resolve(SESSION_SCREENSHOTS_DIR, screenshot);

    const baselineImagePath = path.resolve(BASELINE_SCREENSHOTS_DIR, screenshot);

    const diffImagePath = path.resolve(DIFF_SCREENSHOTS_DIR, screenshot);

    const sessionImage = PNG.sync.read(await readFile(sessionImagePath));
    const baselineImage = PNG.sync.read(await readFile(baselineImagePath));
    const { width, height } = sessionImage;
    const diff = new PNG({ width, height });

    const numDiffPixels = pixelmatch(
      sessionImage.data,
      baselineImage.data,
      diff.data,
      width,
      height,
      { threshold: 0 }
    );

    await writeFile(diffImagePath, PNG.sync.write(diff));

    const change = numDiffPixels / (width * height);
    const changePercentage = (change * 100).toFixed(2);
    console.log(`(${changePercentage}%) ${screenshot}`);
    comparison.percentage = changePercentage;
    comparison.change = change;

    // Once the images have been diffed, we can load and store the image data.
    comparison.imageData.session = await readFile(sessionImagePath, 'base64');

    comparison.imageData.baseline = await readFile(baselineImagePath, 'base64');

    comparison.imageData.diff = await readFile(diffImagePath, 'base64');

    return comparison;
  });
}

export function run(done) {
  compareScreenshots().then(
    (screenshotComparisons) => {
      // Once all of the data has been loaded, we can build the gallery.
      buildGallery(screenshotComparisons).then(() => {
        done();
      });
    },
    (error) => {
      console.error(error);
      done(false);
    }
  );
}
