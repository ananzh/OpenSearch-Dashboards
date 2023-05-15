/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = {
  mode: 'development',
  entry: {
    'osd-ui-shared-deps': './entry.js',
    'osd-ui-shared-deps.v7.dark': ['@elastic/eui/dist/eui_theme_dark.css'],
    'osd-ui-shared-deps.v7.light': ['@elastic/eui/dist/eui_theme_light.css'],
    'osd-ui-shared-deps.v8.dark': ['@elastic/eui/dist/eui_theme_amsterdam_dark.css'],
    'osd-ui-shared-deps.v8.light': ['@elastic/eui/dist/eui_theme_amsterdam_light.css'],
  },
  context: '/home/ubuntu/OpenSearch-Dashboards/packages/osd-ui-shared-deps',
  devtool: '#cheap-source-map',
  output: {
    path: '/home/ubuntu/OpenSearch-Dashboards/packages/osd-ui-shared-deps/target',
    filename: '[name].js',
    sourceMapFilename: '[file].map',
    library: '__osdSharedDeps__',
  },
  module: {
    noParse: ['/home/ubuntu/OpenSearch-Dashboards/node_modules/moment/min/moment-with-locales.js'],
    rules: [
      {
        include: ['/home/ubuntu/OpenSearch-Dashboards/packages/osd-ui-shared-deps/entry.js'],
        use: [
          {
            loader:
              '/home/ubuntu/OpenSearch-Dashboards/packages/osd-ui-shared-deps/public_path_loader.js',
            options: { key: 'osd-ui-shared-deps' },
          },
        ],
      },
      {
        test: {},
        use: [
          '/home/ubuntu/OpenSearch-Dashboards/node_modules/mini-css-extract-plugin/dist/loader.js',
          'css-loader',
        ],
      },
      {
        include: ['/home/ubuntu/OpenSearch-Dashboards/packages/osd-ui-shared-deps/theme.ts'],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '/home/ubuntu/OpenSearch-Dashboards/packages/osd-babel-preset/webpack_preset.js',
              ],
            },
          },
        ],
      },
      {
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: [
                [
                  '/home/ubuntu/OpenSearch-Dashboards/node_modules/babel-plugin-transform-react-remove-prop-types/lib/index.js',
                  { mode: 'remove', removeImport: true },
                ],
              ],
            },
          },
        ],
      },
    ],
  },
  resolve: {
    alias: {
      moment: '/home/ubuntu/OpenSearch-Dashboards/node_modules/moment/min/moment-with-locales.js',
    },
    extensions: ['.js', '.ts'],
  },
  optimization: {
    noEmitOnErrors: true,
    splitChunks: {
      cacheGroups: {
        'osd-ui-shared-deps.@elastic': {
          name: 'osd-ui-shared-deps.@elastic',
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },
  performance: { hints: false },
  plugins: [
    {
      _sortedModulesCache: {},
      options: {
        filename: '[name].css',
        ignoreOrder: false,
        experimentalUseImportModule: false,
        chunkFilename: '[name].css',
      },
      runtimeOptions: { linkType: 'text/css' },
    },
    { definitions: { 'process.env.NODE_ENV': '"development"' } },
  ],
};
