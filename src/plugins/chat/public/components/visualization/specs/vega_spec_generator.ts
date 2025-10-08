/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChartType, ProcessedVisualizationData, VEGASCHEMA, BasicChartStyle } from '../types';

/**
 * Generate Vega-Lite specifications for different chart types
 */
export class VegaSpecGenerator {
  /**
   * Main entry point to generate vega spec
   */
  static generateSpec(
    data: ProcessedVisualizationData,
    chartType: ChartType,
    options: {
      title?: string;
      xAxis?: string;
      yAxis?: string;
      style?: BasicChartStyle;
    } = {}
  ): any {
    const { transformedData } = data;

    switch (chartType) {
      case 'bar':
        return this.generateBarChart(data, options);
      case 'line':
        return this.generateLineChart(data, options);
      case 'pie':
        return this.generatePieChart(data, options);
      case 'area':
        return this.generateAreaChart(data, options);
      case 'scatter':
        return this.generateScatterChart(data, options);
      case 'metric':
        return this.generateMetricChart(data, options);
      case 'table':
        return this.generateTableSpec(data, options);
      default:
        return this.generateBarChart(data, options); // Default fallback
    }
  }

  /**
   * Generate bar chart specification
   */
  private static generateBarChart(data: ProcessedVisualizationData, options: any): any {
    const { transformedData, numericalColumns, categoricalColumns } = data;

    // Auto-select fields if not specified
    const xField = this.getFieldName(categoricalColumns[0] || numericalColumns[0]);
    const yField = this.getFieldName(numericalColumns[0] || categoricalColumns[0]);

    return {
      $schema: VEGASCHEMA,
      title: options.title || 'Bar Chart',
      data: { values: transformedData },
      mark: { type: 'bar', tooltip: true },
      encoding: {
        x: {
          field: xField,
          type: categoricalColumns.length > 0 ? 'nominal' : 'quantitative',
          title: xField,
        },
        y: {
          field: yField,
          type: 'quantitative',
          title: yField,
        },
        tooltip: [
          { field: xField, type: 'nominal' },
          { field: yField, type: 'quantitative' },
        ],
      },
    };
  }

  /**
   * Generate line chart specification
   */
  private static generateLineChart(data: ProcessedVisualizationData, options: any): any {
    const { transformedData, numericalColumns, dateColumns } = data;

    // Prefer date for X-axis, numerical for Y-axis
    const xField = this.getFieldName(dateColumns[0] || numericalColumns[0]);
    const yField = this.getFieldName(numericalColumns[0]);

    return {
      $schema: VEGASCHEMA,
      title: options.title || 'Line Chart',
      data: { values: transformedData },
      mark: { type: 'line', point: true, tooltip: true },
      encoding: {
        x: {
          field: xField,
          type: dateColumns.length > 0 ? 'temporal' : 'quantitative',
          title: xField,
        },
        y: {
          field: yField,
          type: 'quantitative',
          title: yField,
        },
        tooltip: [
          { field: xField, type: dateColumns.length > 0 ? 'temporal' : 'quantitative' },
          { field: yField, type: 'quantitative' },
        ],
      },
    };
  }

  /**
   * Generate pie chart specification
   */
  private static generatePieChart(data: ProcessedVisualizationData, options: any): any {
    const { transformedData, numericalColumns, categoricalColumns } = data;

    const categoryField = this.getFieldName(categoricalColumns[0]);
    const valueField = this.getFieldName(numericalColumns[0]);

    return {
      $schema: VEGASCHEMA,
      title: options.title || 'Pie Chart',
      data: { values: transformedData },
      mark: { type: 'arc', tooltip: true },
      encoding: {
        theta: {
          field: valueField,
          type: 'quantitative',
        },
        color: {
          field: categoryField,
          type: 'nominal',
          legend: { title: categoryField },
        },
        tooltip: [
          { field: categoryField, type: 'nominal' },
          { field: valueField, type: 'quantitative' },
        ],
      },
    };
  }

  /**
   * Generate area chart specification
   */
  private static generateAreaChart(data: ProcessedVisualizationData, options: any): any {
    const { transformedData, numericalColumns, dateColumns } = data;

    const xField = this.getFieldName(dateColumns[0] || numericalColumns[0]);
    const yField = this.getFieldName(numericalColumns[0]);

    return {
      $schema: VEGASCHEMA,
      title: options.title || 'Area Chart',
      data: { values: transformedData },
      mark: { type: 'area', tooltip: true },
      encoding: {
        x: {
          field: xField,
          type: dateColumns.length > 0 ? 'temporal' : 'quantitative',
          title: xField,
        },
        y: {
          field: yField,
          type: 'quantitative',
          title: yField,
        },
        tooltip: [
          { field: xField, type: dateColumns.length > 0 ? 'temporal' : 'quantitative' },
          { field: yField, type: 'quantitative' },
        ],
      },
    };
  }

  /**
   * Generate scatter plot specification
   */
  private static generateScatterChart(data: ProcessedVisualizationData, options: any): any {
    const { transformedData, numericalColumns } = data;

    const xField = this.getFieldName(numericalColumns[0]);
    const yField = this.getFieldName(numericalColumns[1] || numericalColumns[0]);

    return {
      $schema: VEGASCHEMA,
      title: options.title || 'Scatter Plot',
      data: { values: transformedData },
      mark: { type: 'point', tooltip: true },
      encoding: {
        x: {
          field: xField,
          type: 'quantitative',
          title: xField,
        },
        y: {
          field: yField,
          type: 'quantitative',
          title: yField,
        },
        tooltip: [
          { field: xField, type: 'quantitative' },
          { field: yField, type: 'quantitative' },
        ],
      },
    };
  }

  /**
   * Generate single metric specification
   */
  private static generateMetricChart(data: ProcessedVisualizationData, options: any): any {
    const { transformedData, numericalColumns } = data;

    // For metric charts, we typically want to show either:
    // 1. Count of records (for "total log count" type metrics)
    // 2. Sum of values (for aggregated metrics)
    // 3. Average, max, min, etc.

    // Determine metric type from title
    const title = options.title || 'Metric';
    const isCountMetric =
      title.toLowerCase().includes('count') || title.toLowerCase().includes('total');

    let metricValue: number;
    let metricType: string;

    if (isCountMetric) {
      // For count metrics, show the number of data points
      metricValue = transformedData.length;
      metricType = 'count';
    } else if (numericalColumns.length > 0) {
      // For non-count metrics, calculate aggregate value from the first numerical column
      const valueField = this.getFieldName(numericalColumns[0]);
      const values = transformedData
        .map((row) => row[valueField])
        .filter((v) => typeof v === 'number' && !isNaN(v));

      // Default to sum, but could be extended to support avg, max, min based on options
      metricValue = values.reduce((sum, val) => sum + val, 0);
      metricType = 'sum';
    } else {
      // Fallback to count if no numerical columns
      metricValue = transformedData.length;
      metricType = 'count';
    }

    return {
      $schema: VEGASCHEMA,
      title,
      data: { values: [{ value: metricValue, type: metricType }] },
      mark: {
        type: 'text',
        fontSize: 40,
        fontWeight: 'bold',
        align: 'center',
        baseline: 'middle',
      },
      encoding: {
        text: {
          field: 'value',
          type: 'quantitative',
          format: metricType === 'count' ? 'd' : '.2f', // Use integer format for counts
        },
      },
    };
  }

  /**
   * Generate table specification (simple version)
   */
  private static generateTableSpec(data: ProcessedVisualizationData, options: any): any {
    // For table, we'll return a simple structure that can be handled by the renderer
    return {
      type: 'table',
      title: options.title || 'Data Table',
      data: data.transformedData,
      columns: [...data.numericalColumns, ...data.categoricalColumns, ...data.dateColumns],
    };
  }

  /**
   * Helper to get field name from column
   */
  private static getFieldName(column?: any): string {
    return column?.column || column?.name || 'value';
  }
}
