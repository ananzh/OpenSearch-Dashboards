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

import { convertToGeoJson } from '../../maps_legacy/public';
import { i18n } from '@osd/i18n';

export const createTileMapFn = () => ({
  name: 'tilemap',
  type: 'render',
  context: {
    types: ['opensearch_dashboards_datatable'],
  },
  help: i18n.translate('tileMap.function.help', {
    defaultMessage: 'Tilemap visualization',
  }),
  args: {
    visConfig: {
      types: ['string', 'null'],
      default: '"{}"',
    },
  },
  fn(context, args) {
    const visConfig = JSON.parse(args.visConfig);
    const { geohash, metric, geocentroid } = visConfig.dimensions;
    const convertedData = convertToGeoJson(context, {
      geohash,
      metric,
      geocentroid,
    });

    if (geohash && geohash.accessor) {
      convertedData.meta.geohash = context.columns[geohash.accessor].meta;
    }

    // Store the current zoom level in the visData metadata
    // This ensures that when the map is zoomed in a dashboard,
    // the zoom level is included in the expression output
    if (visConfig.mapZoom !== undefined && visConfig.mapZoom !== null) {
      // Ensure mapZoom is a number
      const zoomLevel = parseInt(visConfig.mapZoom);
      convertedData.meta.mapZoom = zoomLevel;
      console.log('[DEBUG] tile_map_fn: Including mapZoom in metadata:', zoomLevel);
    } else {
      // If mapZoom is not defined in visConfig, try to get it from the UI state
      // This is a fallback for embedded visualizations
      console.log('[DEBUG] tile_map_fn: mapZoom not defined in visConfig');
    }

    // Create a unique key based on the zoom level and timestamp to force re-rendering
    // when the zoom level changes
    const timestamp = Date.now();
    // Only use zoom in the key if it's actually defined and not null
    const zoomKey = (visConfig.mapZoom !== undefined && visConfig.mapZoom !== null)
      ? parseInt(visConfig.mapZoom)
      : 'default';
    const renderKey = `tilemap-${timestamp}-zoom-${zoomKey}`;
    console.log('[DEBUG] tile_map_fn: Created renderKey with zoom:', zoomKey);

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: convertedData,
        visType: 'tile_map',
        visConfig,
        renderKey, // Add a unique key to force re-rendering
        params: {
          listenOnChange: true,
        },
      },
    };
  },
});
