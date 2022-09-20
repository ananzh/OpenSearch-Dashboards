/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { getVisSchemas, Vis } from '../../visualizations/public';
import { buildExpression, buildExpressionFunction } from '../../expressions/public';
import { TableVisExpressionFunctionDefinition } from './table_vis_fn';
import { OpenSearchaggsExpressionFunctionDefinition } from '../../data/common/search/expressions';

export const toExpressionAst = (vis: Vis, params: any) => {
  const opensearchaggs = buildExpressionFunction<OpenSearchaggsExpressionFunctionDefinition>(
    'opensearchaggs',
    {
      index: vis.data.indexPattern!.id!,
      metricsAtAllLevels: vis.isHierarchical(),
      partialRows: vis.params.showPartialRows || false,
      aggConfigs: JSON.stringify(vis.data.aggs!.aggs),
      includeFormatHints: false,
    }
  );

  const schemas = getVisSchemas(vis, params);
  // manul slice to remove duplicate metrics
  const metrics =
    schemas.bucket && vis.params.showPartialRows && !vis.params.showMetricsAtAllLevels
      ? schemas.metric.slice(-1 * (schemas.metric.length / schemas.bucket.length))
      : schemas.metric;

  const tableData = {
    title: vis.title,
    metrics,
    buckets: schemas.bucket || [],
    splitRow: schemas.split_row,
    splitColumn: schemas.split_column,
  };

  const tableConfig = {
    perPage: vis.params.perPage,
    percentageCol: vis.params.percentageCol,
    showPartialRows: vis.params.showPartialRows,
    showMetricsAtAllLevels: vis.params.showMetricsAtAllLevels,
    showTotal: vis.params.showTotal,
    totalFunc: vis.params.totalFunc,
  };

  const visConfig = {
    ...tableConfig,
    ...tableData,
  };

  const tableVis = buildExpressionFunction<TableVisExpressionFunctionDefinition>(
    'opensearch_dashboards_table_new',
    {
      visConfig: JSON.stringify(visConfig),
    }
  );

  const ast = buildExpression([opensearchaggs, tableVis]);

  return ast.toAst();
};
