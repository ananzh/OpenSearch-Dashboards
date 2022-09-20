/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SchemaConfig } from '../../../../visualizations/public';
import { TableVisExpressionFunctionDefinition } from '../../../../vis_type_table_new/public';
import { AggConfigs, IAggConfig } from '../../../../data/common';
import { buildExpression, buildExpressionFunction } from '../../../../expressions/public';
import { RootState } from '../../application/utils/state_management';
import { TableOptionsDefaults } from './table_viz_type';
import { getAggExpressionFunctions } from '../common/expression_helpers';
import { OpenSearchaggsExpressionFunctionDefinition } from '../../../../data/public';

// TODO: Update to the common getShemas from src/plugins/visualizations/public/legacy/build_pipeline.ts
//  And move to a common location accessible by all the visualizations
const getVisSchemas = (
  aggConfigs: AggConfigs,
  showPartialRows: boolean,
  showMetricsAtAllLevels: boolean
): any => {
  const createSchemaConfig = (accessor: number, agg: IAggConfig): SchemaConfig => {
    const hasSubAgg = [
      'derivative',
      'moving_avg',
      'serial_diff',
      'cumulative_sum',
      'sum_bucket',
      'avg_bucket',
      'min_bucket',
      'max_bucket',
    ].includes(agg.type.name);

    const formatAgg = hasSubAgg
      ? agg.params.customMetric || agg.aggConfigs.getRequestAggById(agg.params.metricAgg)
      : agg;

    const params = {};

    const label = agg.makeLabel && agg.makeLabel();

    return {
      accessor,
      format: formatAgg.toSerializedFieldFormat(),
      params,
      label,
      aggType: agg.type.name,
    };
  };

  let cnt = 0;
  const schemas: any = {
    metric: [],
  };

  if (!aggConfigs) {
    return schemas;
  }

  const responseAggs = aggConfigs.getResponseAggs().filter((agg: IAggConfig) => agg.enabled);
  const metrics = responseAggs.filter((agg: IAggConfig) => agg.type.type === 'metrics');
  const isHierarchical = showMetricsAtAllLevels;
  responseAggs.forEach((agg) => {
    let skipMetrics = false;
    const schemaName = agg.schema;

    if (!schemaName) {
      cnt++;
      return;
    }

    if (schemaName === 'split_row' || schemaName === 'split_column') {
      skipMetrics = responseAggs.length - metrics.length > 1;
    }

    if (!schemas[schemaName]) {
      schemas[schemaName] = [];
    }

    if (!isHierarchical || agg.type.type !== 'metrics') {
      schemas[schemaName]!.push(createSchemaConfig(cnt++, agg));
    }
    if (isHierarchical && (agg.type.type !== 'metrics' || metrics.length === responseAggs.length)) {
      metrics.forEach((metric: any) => {
        const schemaConfig = createSchemaConfig(cnt++, metric);
        if (!skipMetrics) {
          schemas.metric.push(schemaConfig);
        }
      });
    }
  });

  return schemas;
};

export interface TableRootState extends RootState {
  style: TableOptionsDefaults;
}

export const toExpression = async ({ style: styleState, visualization }: TableRootState) => {
  const { aggConfigs, indexPattern, expressionFns } = await getAggExpressionFunctions(
    visualization
  );
  const { id: indexId = '' } = indexPattern;
  let [opensearchaggs] = expressionFns;

  const {
    perPage,
    showPartialRows,
    showMetricsAtAllLevels,
    showTotal,
    totalFunc,
    percentageCol,
  } = styleState;

  const schemas = getVisSchemas(aggConfigs, showPartialRows, showMetricsAtAllLevels);

  const metrics =
    schemas.bucket && showPartialRows && !showMetricsAtAllLevels
      ? schemas.metric.slice(-1 * (schemas.metric.length / schemas.bucket.length))
      : schemas.metric;

  const tableData = {
    metrics,
    buckets: schemas.bucket || [],
    splitRow: schemas.split_row,
    splitColumn: schemas.split_column,
  };

  const tableConfig = {
    perPage,
    percentageCol,
    showPartialRows,
    showMetricsAtAllLevels,
    showTotal,
    totalFunc,
  };

  const visConfig = {
    ...tableConfig,
    ...tableData,
  };

  // Update buildExpressionFunction to correctly handle optional arguments
  const tableVis = buildExpressionFunction<TableVisExpressionFunctionDefinition>(
    'opensearch_dashboards_table_new',
    {
      visConfig: JSON.stringify(visConfig),
    }
  );

  opensearchaggs = buildExpressionFunction<OpenSearchaggsExpressionFunctionDefinition>(
    'opensearchaggs',
    {
      index: indexId,
      metricsAtAllLevels: showMetricsAtAllLevels,
      partialRows: showPartialRows,
      aggConfigs: JSON.stringify(aggConfigs.aggs),
      includeFormatHints: false,
    }
  );

  const expressionFnsTableVis = [expressionFns[0], opensearchaggs];
  return buildExpression([...expressionFnsTableVis, tableVis]).toString();
};
