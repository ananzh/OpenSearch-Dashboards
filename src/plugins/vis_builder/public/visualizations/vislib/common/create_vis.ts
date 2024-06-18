/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { AggConfigs, IndexPattern, TimeRange } from '../../../../../data/public';
import { Vis } from '../../../../../visualizations/public';
import { getSearchService } from '../../../plugin_services';
import { IExpressionLoaderParams } from '../../../../../expressions/public';

export const createVis = async (
  type: string,
  aggConfigs: AggConfigs,
  indexPattern: IndexPattern,
  searchContext: IExpressionLoaderParams['searchContext']
) => {
  const vis = new Vis(type);
  vis.data.aggs = aggConfigs;
  vis.data.searchSource = await getSearchService().searchSource.create();
  vis.data.searchSource.setField('index', indexPattern);
  // vis.data.searchSource.filter = searchContext?.filters;
  // vis.data.searchSource.query = searchContext?.query;

  const responseAggs = vis.data.aggs.getResponseAggs().filter((agg) => agg.enabled);
  responseAggs.forEach((agg) => {
    agg.params.timeRange = searchContext?.timeRange;
  });
  return vis;
};
