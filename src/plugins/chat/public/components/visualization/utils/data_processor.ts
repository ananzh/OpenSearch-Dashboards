/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { VisColumn, VisFieldType, ProcessedVisualizationData, ChartType } from '../types';

interface OpenSearchHit {
  _source: Record<string, any>;
  _id: string;
}

interface FieldSchema {
  name?: string;
  type?: string;
}

/**
 * Processes OpenSearch query results into visualization-ready format
 */
export class ChatDataProcessor {
  /**
   * Process OpenSearch results into visualization data
   */
  static processOpenSearchResults(
    hits: OpenSearchHit[],
    schema: FieldSchema[]
  ): ProcessedVisualizationData {
    // Create columns from schema
    const columns = this.createColumnsFromSchema(schema);

    // Transform hits to flat records
    const transformedData = hits.map((hit) => {
      const record: Record<string, any> = {};
      columns.forEach((column) => {
        record[column.column] = hit._source[column.name];
      });
      return record;
    });

    // Update column statistics
    const columnsWithStats = this.calculateColumnStatistics(columns, transformedData);

    // Categorize columns by type
    const numericalColumns = columnsWithStats.filter((c) => c.schema === VisFieldType.Number);
    const categoricalColumns = columnsWithStats.filter((c) => c.schema === VisFieldType.String);
    const dateColumns = columnsWithStats.filter((c) => c.schema === VisFieldType.Date);

    return {
      transformedData,
      numericalColumns,
      categoricalColumns,
      dateColumns,
    };
  }

  /**
   * Create columns from field schema
   */
  private static createColumnsFromSchema(schema: FieldSchema[]): VisColumn[] {
    return schema.map((field, index) => ({
      id: index,
      schema: this.mapFieldType(field.type),
      name: field.name || `field_${index}`,
      column: `field-${index}`,
      validValuesCount: 0,
      uniqueValuesCount: 0,
    }));
  }

  /**
   * Map OpenSearch field types to visualization field types
   */
  private static mapFieldType(type?: string): VisFieldType {
    if (!type) return VisFieldType.Unknown;

    const lowerType = type.toLowerCase();

    if (
      [
        'long',
        'integer',
        'short',
        'byte',
        'double',
        'float',
        'half_float',
        'scaled_float',
      ].includes(lowerType)
    ) {
      return VisFieldType.Number;
    }

    if (['date', 'date_nanos'].includes(lowerType)) {
      return VisFieldType.Date;
    }

    if (['boolean'].includes(lowerType)) {
      return VisFieldType.Boolean;
    }

    if (['text', 'keyword', 'string'].includes(lowerType)) {
      return VisFieldType.String;
    }

    return VisFieldType.Unknown;
  }

  /**
   * Calculate statistics for columns
   */
  private static calculateColumnStatistics(
    columns: VisColumn[],
    data: Array<Record<string, any>>
  ): VisColumn[] {
    return columns.map((column) => {
      const values = data.map((row) => row[column.column]);
      const validValues = values.filter((v) => v !== null && v !== undefined && v !== '');
      const uniqueValues = new Set(validValues);

      return {
        ...column,
        validValuesCount: validValues.length,
        uniqueValuesCount: uniqueValues.size,
      };
    });
  }

  /**
   * Auto-detect best chart type based on data characteristics
   */
  static autoDetectChartType(data: ProcessedVisualizationData): ChartType {
    const { numericalColumns, categoricalColumns, dateColumns } = data;

    // If we have date + numerical data, suggest line chart
    if (dateColumns.length >= 1 && numericalColumns.length >= 1) {
      return 'line';
    }

    // If we have categorical + numerical, suggest bar chart
    if (categoricalColumns.length >= 1 && numericalColumns.length >= 1) {
      return 'bar';
    }

    // If we have multiple numerical columns, suggest scatter
    if (numericalColumns.length >= 2) {
      return 'scatter';
    }

    // If we have single numerical column, suggest metric
    if (numericalColumns.length === 1 && categoricalColumns.length === 0) {
      return 'metric';
    }

    // Default to table for everything else
    return 'table';
  }
}
