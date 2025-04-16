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

const path = require('path');

const createLangWorkerConfig = (lang) => ({
  mode: 'production',
  entry: path.resolve(__dirname, 'src', lang, 'worker', `${lang}.worker.ts`),
  output: {
    path: path.resolve(__dirname, 'target/public'),
    filename: `${lang}.editor.worker.js`,
    // Use hashFunction compatible with webpack 4
    hashFunction: 'md4',
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.ts', '.tsx'],
    // Add alias for ANTLR runtime and generated files when building the PPL worker
    ...(lang === 'ppl' ? {
      alias: {
        // Ensure antlr4ng is resolved correctly
        'antlr4ng': path.resolve(__dirname, '../../node_modules/antlr4ng'),
        // Add alias for generated files
        '../generated': path.resolve(__dirname, 'src/ppl/generated')
      }
    } : {})
  },
  stats: 'errors-only',
  // No externals - we want to bundle everything the worker needs
  externals: {},
  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        // Modified to include monaco-editor files for transpilation
        exclude: /node_modules\/(?!(monaco-editor)\/).*/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            presets: [
              [
                require.resolve('@osd/babel-preset/webpack_preset'),
                {
                  // Enable modern syntax features
                  modern: true,
                },
              ],
            ],
            // Add plugin to handle numeric separators in Monaco editor code
            plugins: [require.resolve('@babel/plugin-transform-numeric-separator')],
          },
        },
      },
      // Process CSS files for Monaco editor
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      // Handle font files for codicons
      {
        test: /\.(woff|woff2|ttf|eot)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'fonts/',
            },
          },
        ],
      },
    ],
  },
});

module.exports = [
  createLangWorkerConfig('xjson'),
  createLangWorkerConfig('json'),
  createLangWorkerConfig('ppl'), // PPL worker
  createLangWorkerConfig('sql'), // SQL worker
];
