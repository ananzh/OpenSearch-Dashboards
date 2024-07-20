/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { mapChartTypeToVegaType } from '../utils/helpers';

type VegaMarkType =
  | 'line'
  | 'rect'
  | 'area'
  | 'symbol'
  | 'bar'
  | 'point'
  | 'circle'
  | 'square'
  | 'group';

interface VegaMark {
  type: VegaMarkType;
  from?: {
    data?: string;
    facet?: {
      name?: string;
      data?: string;
      groupby?: string;
      filter?: string;
    };
  };
  encode?: {
    enter?: Record<string, any>;
    update?: Record<string, any>;
  };
}

interface BaseVegaLiteMark {
  type: VegaMarkType;
  tooltip?: boolean;
  [key: string]: any;
}

interface LineVegaLiteMark extends BaseVegaLiteMark {
  type: 'line';
  point?: boolean | { filled?: boolean; size?: number };
}

interface AreaVegaLiteMark extends BaseVegaLiteMark {
  type: 'area';
  line?: boolean;
}

interface BarVegaLiteMark extends BaseVegaLiteMark {
  type: 'bar';
  cornerRadius?: number;
}

type VegaLiteMark = BaseVegaLiteMark | LineVegaLiteMark | AreaVegaLiteMark | BarVegaLiteMark;

/**
 * Builds a mark configuration for Vega or Vega-Lite based on the chart type.
 *
 * @param {string} chartType - The type of chart to build the mark for.
 * @param {boolean} isVega - Whether to build for Vega (true) or Vega-Lite (false).
 * @returns {VegaMark[] | VegaLiteMark} The mark configuration.
 */
export const buildMark = (
  chartType: string,
  isVega: boolean = false
): VegaMark[] | VegaLiteMark => {
  const vegaType = mapChartTypeToVegaType(chartType) as VegaMarkType;

  if (isVega) {
    return buildMarkForVega(vegaType);
  }

  return buildMarkForVegaLite(vegaType);
};

/**
 * Builds a mark configuration for Vega-Lite based on the chart type.
 *
 * @param {VegaMarkType} vegaType - The type of Vega mark to build.
 * @returns {VegaLiteMark} The Vega-Lite mark configuration.
 */
const buildMarkForVegaLite = (vegaType: VegaMarkType): VegaLiteMark => {
  const baseMark = {
    opacity: { condition: { selection: 'hover', value: 1 }, value: 0.3 },
  };
  switch (vegaType) {
    case 'line':
      return { ...baseMark, type: 'line', point: true };
    case 'area':
      return { ...baseMark, type: 'area', line: true, opacity: 1, fillOpacity: 1 };
    case 'rect':
    case 'bar':
      return { ...baseMark, type: 'bar' };
    default:
      return { ...baseMark, type: vegaType };
  }
};

/**
 * Builds a mark configuration for Vega based on the chart type.
 *
 * @param {VegaMarkType} chartType - The type of chart to build the mark for.
 * @returns {VegaMark[]} An array of mark configurations.
 */
const buildMarkForVega = (chartType: VegaMarkType): VegaMark[] => {
  switch (chartType) {
    case 'line':
      return buildMarkForLine();
    case 'bar':
      return buildMarkForHistogram();
    case 'area':
      return buildMarkForArea();
    default:
      return buildMarkForLine();
  }
};

/**
 * Builds a mark configuration for a line chart in Vega.
 *
 * @returns {VegaMark[]} An array of mark configurations for line and point marks.
 */
const buildMarkForLine = (): VegaMark[] => [
  {
    type: 'line',
    from: { data: 'source' },
    encode: {
      enter: {
        x: { scale: 'xscale', field: 'x' },
        y: { scale: 'yscale', field: 'y' },
      },
      update: {
        opacity: { value: 1 },
        defined: { signal: 'datum.split == parent.split' },
      },
    },
  },
  {
    type: 'symbol',
    from: { data: 'source' },
    encode: {
      enter: {
        x: { scale: 'xscale', field: 'x' },
        y: { scale: 'yscale', field: 'y' },
        fill: { scale: 'color', field: 'series' },
      },
      update: {
        opacity: { signal: 'datum.split == parent.split ? 1 : 0' },
      },
    },
  },
];

/**
 * Builds a mark configuration for a histogram in Vega.
 *
 * @returns {VegaMark[]} An array with a single mark configuration for rect marks.
 */
const buildMarkForHistogram = (): VegaMark[] => [
  {
    type: 'bar',
    from: { data: 'source' },
    encode: {
      enter: {
        x: { scale: 'xscale', field: 'x' },
        width: { scale: 'xscale', band: 1 },
        y: { scale: 'yscale', field: 'y' },
        y2: { scale: 'yscale', value: 0 },
        fill: { scale: 'color', field: 'series' },
      },
      update: {
        opacity: { signal: 'datum.split == parent.split ? 1 : 0' },
      },
    },
  },
];

/**
 * Builds a mark configuration for an area chart in Vega.
 *
 * @returns {VegaMark[]} An array with a single mark configuration for grouped area marks.
 */
const buildMarkForArea = (): VegaMark[] => [
  {
    type: 'group',
    from: {
      facet: {
        name: 'series_data',
        data: 'source',
        groupby: 'series',
        filter: 'datum.split == parent.split',
      },
    },
    marks: [
      {
        type: 'area',
        from: { data: 'series_data' },
        encode: {
          enter: {
            x: { scale: 'xscale', field: 'x' },
            y: { scale: 'yscale', field: 'y' },
            y2: { scale: 'yscale', value: 0 },
            fill: { scale: 'color', field: 'series' },
            fillOpacity: { value: 1 },
            stroke: { scale: 'color', field: 'series' },
            strokeOpacity: { value: 1 },
          },
        },
      },
    ],
  },
];
