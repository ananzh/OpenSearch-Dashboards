/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { mapChartTypeToVegaType } from '../utils/helpers';
import { AxisFormats } from '../utils/types';

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
 * @param {any} dimensions - The dimensions of the data.
 * @param {AxisFormats} formats - The formatting information for axes.
 * @returns {VegaMark[] | VegaLiteMark} The mark configuration.
 */
export const buildMark = (
  chartType: string,
  isVega: boolean = false,
  dimensions?: any,
  formats?: AxisFormats
): VegaMark[] | VegaLiteMark => {
  const vegaType = mapChartTypeToVegaType(chartType) as VegaMarkType;

  if (isVega) {
    return buildMarkForVega(vegaType, dimensions, formats);
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
  switch (vegaType) {
    case 'line':
      return { type: 'line', point: true };
    case 'area':
      return { type: 'area', line: true, opacity: 1, fillOpacity: 1 };
    case 'rect':
    case 'bar':
      return { type: 'bar' };
    default:
      return { type: vegaType };
  }
};

/**
 * Builds a mark configuration for Vega based on the chart type.
 *
 * @param {VegaMarkType} chartType - The type of chart to build the mark for.
 * @param {any} dimensions - The dimensions of the data.
 * @param {AxisFormats} formats - The formatting information for axes.
 * @returns {VegaMark} An array of mark configurations.
 */
const buildMarkForVega = (
  chartType: VegaMarkType,
  dimensions: any,
  formats: AxisFormats
): VegaMark => {
  const baseMark: VegaMark = {
    type: 'group',
    from: {
      facet: {
        name: 'split_data',
        data: 'source',
        groupby: 'split',
      },
    },
    encode: {
      enter: {
        width: { signal: 'chartWidth' },
        height: { signal: 'height' },
      },
    },
    signals: [{ name: 'width', update: 'chartWidth' }],
    scales: [
      buildXScale(chartType),
      buildYScale(chartType),
      {
        name: 'color',
        type: 'ordinal',
        domain: { data: 'split_data', field: 'series' },
        range: 'category',
      },
    ],
    axes: [
      {
        orient: 'bottom',
        scale: 'x',
        labelAngle: -90,
        labelAlign: 'right',
        labelBaseline: 'middle',
      },
      {
        orient: 'left',
        scale: 'y',
        title: 'Count',
      },
    ],
    title: {
      text: { signal: 'parent.split' },
    },
    marks: [
      {
        type: 'group',
        from: {
          facet: {
            name: 'series_data',
            data: 'split_data',
            groupby: 'series',
          },
        },
        marks: buildChartTypeMarksForVega(chartType, dimensions, formats),
      },
    ],
  };

  return baseMark;
};

const buildXScale = (chartType: VegaMarkType) => {
  switch (chartType) {
    case 'bar':
      return {
        name: 'x',
        type: 'band',
        domain: { data: 'source', field: 'x' },
        range: 'width',
        padding: 0.1,
      };
    case 'line':
    case 'area':
    default:
      return {
        name: 'x',
        type: 'point',
        domain: { data: 'source', field: 'x' },
        range: 'width',
        padding: 0.5,
      };
  }
};

const buildYScale = (chartType: VegaMarkType) => {
  return {
    name: 'y',
    type: 'linear',
    domain: { data: 'source', field: 'y' },
    range: 'height',
    nice: true,
    zero: true,
  };
};

/**
 * Builds a mark configuration for Vega based on the chart type.
 *
 * @param {VegaMarkType} chartType - The type of chart to build the mark for.
 * @param {any} dimensions - The dimensions of the data.
 * @param {AxisFormats} formats - The formatting information for axes.
 * @returns {VegaMark[]} An array of mark configurations.
 */
const buildChartTypeMarksForVega = (
  chartType: VegaMarkType,
  dimensions: any,
  formats: AxisFormats
): VegaMark[] => {
  switch (chartType) {
    case 'line':
      return buildMarkForLine(dimensions, formats);
    case 'bar':
      return buildMarkForBar(dimensions, formats);
    case 'area':
      return buildMarkForArea(dimensions, formats);
    default:
      return buildMarkForLine(dimensions, formats);
  }
};

/**
 * Builds a mark configuration for a line chart in Vega.
 *
 * @param {any} dimensions - The dimensions of the data.
 * @param {AxisFormats} formats - The formatting information for axes.
 * @returns {VegaMark[]} An array of mark configurations for line and point marks.
 */
const buildMarkForLine = (dimensions: any, formats: AxisFormats): VegaMark[] => {
  const marks: VegaMark[] = [
    {
      type: 'line',
      from: { data: 'series_data' },
      encode: {
        enter: {
          x: { scale: 'x', field: 'x' },
          y: { scale: 'y', field: 'y' },
          stroke: { scale: 'color', field: 'series' },
          strokeWidth: { value: 2 },
        },
      },
    },
    {
      type: 'symbol',
      from: { data: 'series_data' },
      encode: {
        enter: {
          x: { scale: 'x', field: 'x' },
          y: { scale: 'y', field: 'y' },
          fill: { scale: 'color', field: 'series' },
          size: dimensions.z ? { scale: 'size', field: 'z' } : { value: 50 },
        },
      },
    },
  ];
  return marks;
};

/**
 * Builds a mark configuration for a histogram in Vega.
 *
 * @returns {VegaMark[]} An array with a single mark configuration for rect marks.
 */
const buildMarkForBar = (dimensions: any, formats: AxisFormats): VegaMark[] => {
  return [
    {
      type: 'rect',
      from: { data: 'series_data' },
      encode: {
        enter: {
          x: { scale: 'x', field: 'x' },
          width: { scale: 'x', band: 1, offset: -1 },
          y: { scale: 'y', field: 'y' },
          y2: { scale: 'y', value: 0 },
          fill: { scale: 'color', field: 'series' },
        },
      },
    },
  ];
};

/**
 * Builds a mark configuration for an area chart in Vega.
 *
 * @returns {VegaMark[]} An array with a single mark configuration for grouped area marks.
 */
const buildMarkForArea = (dimensions: any, formats: AxisFormats): VegaMark[] => {
  return [
    {
      type: 'area',
      from: { data: 'series_data' },
      encode: {
        enter: {
          x: { scale: 'x', field: 'x' },
          y: { scale: 'y', field: 'y' },
          y2: { scale: 'y', value: 0 },
          fill: { scale: 'color', field: 'series' },
          fillOpacity: { value: 1 },
          stroke: { scale: 'color', field: 'series' },
          strokeOpacity: { value: 1 },
        },
      },
    },
  ];
};
// const buildMarkForArea = (dimensions: any, formats: AxisFormats): VegaMark[] => {
//   return [
//     {
//       type: 'group',
//       from: { data: 'series_data' },
//       marks: [
//         {
//           type: 'area',
//           from: { data: 'series_data' },
//           encode: {
//             enter: {
//               x: { scale: 'x', field: 'x' },
//               y: { scale: 'y', field: 'y0' },
//               y2: { scale: 'y', field: 'y1' },
//               fill: { scale: 'color', field: 'series' },
//               fillOpacity: { value: 0.7 },
//               stroke: { scale: 'color', field: 'series' },
//               strokeWidth: { value: 1 },
//             },
//           },
//         }
//       ]
//     }
//   ];
// };
