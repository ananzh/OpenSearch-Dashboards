/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SchemaConfig } from '../../../../visualizations/public';
import { TableVisExpressionFunctionDefinition } from '../../../../vis_type_table/public';
import { AggConfigs, IAggConfig } from '../../../../data/common';
import { buildExpression, buildExpressionFunction } from '../../../../expressions/public';
import { RootState } from '../../application/utils/state_management';
import { TableOptionsDefaults } from './table_viz_type';
import { getAggExpressionFunctions } from '../common/expression_helpers';

// TODO: Update to the common getShemas from src/plugins/visualizations/public/legacy/build_pipeline.ts
//  And move to a common location accessible by all the visualizations
const getVisSchemas = (aggConfigs: AggConfigs): any => {
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

  const responseAggs = aggConfigs.getResponseAggs();
  responseAggs.forEach((agg) => {
    const schemaName = agg.schema;

    if (!schemaName) {
      cnt++;
      return;
    }

    if (!schemas[schemaName]) {
      schemas[schemaName] = [];
    }

    schemas[schemaName]!.push(createSchemaConfig(cnt++, agg));
  });

  return schemas;
};

export interface TableRootState extends RootState {
  style: TableOptionsDefaults;
}

export const toExpression = async ({ style: styleState, visualization }: TableRootState) => {
  const { aggConfigs, expressionFns } = await getAggExpressionFunctions(visualization);
  const { activeVisualization } = visualization;

  const {
    perPage,
    showPartialRows,
    showMetricsAtAllLevels,
    showTotal,
    totalFunc,
    percentageCol,
  } = styleState;

  const schemas = getVisSchemas(aggConfigs);

  const tableData = {
    title: activeVisualization?.name,
    metrics: schemas.metric,
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
    'opensearch_dashboards_table',
    {
      visConfig: JSON.stringify(visConfig),
    }
  );

  return buildExpression([expressionFns[1], tableVis]).toString();
};
