/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildVislibDimensions, VisualizationsStart } from '../../../../../visualizations/public';
import {
  buildExpression,
  buildExpressionFunction,
  IExpressionLoaderParams,
} from '../../../../../expressions/public';
import { LineOptionsDefaults } from './line_vis_type';
import { getAggExpressionFunctions } from '../../common/expression_helpers';
import { VislibRootState, getValueAxes, getPipelineParams } from '../common';
import { createVis } from '../common/create_vis';
import { LineVegaSpecExpressionFunctionDefinition, VegaExpressionFunctionDefinition } from '../../../../../vis_type_vega/public';
import { convertIsoToMillis } from '../../../../../discover/public/application/components/doc_views/context/api/utils/date_conversion';
import { convertSavedDashboardPanelToPanelState } from '../../../../../dashboard/public/application/utils/embeddable_saved_object_converters';
import { createVegaSpec } from './util';
import { buildPipeline } from '../../../../../visualizations/public';

const logObject = (name, obj) => {
  const seen = new WeakSet();
  const stringifyWithCircularRefs = (obj) => {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    }, 2);
  };

  console.log(name, stringifyWithCircularRefs(obj));
};

export const toExpression = async (
  { style: styleState, visualization }: VislibRootState<LineOptionsDefaults>,
  searchContext: IExpressionLoaderParams['searchContext'],
  visualizations: VisualizationsStart
) => {
  const { aggConfigs, expressionFns, indexPattern } = await getAggExpressionFunctions(
    visualization
  );
  const { addLegend, addTooltip, legendPosition, type, useVegaLiteRendering, isDonut } = styleState;

  let vis = await createVis(type, aggConfigs, indexPattern, searchContext);

  const params = getPipelineParams();
  const dimensions = await buildVislibDimensions(vis, params);
  const valueAxes = getValueAxes(dimensions.y);

  logObject('vis', vis);
  logObject('styleState', styleState);
  logObject('params', params);
  logObject('dimensions', dimensions);
  logObject('valueAxes', valueAxes);
  logObject('aggConfigs', aggConfigs);
  logObject('expressionFns', expressionFns);
  logObject('indexPattern', indexPattern);
  logObject('searchContext', searchContext);

  // TODO: what do we want to put in this "vis config"?
  const visConfig = {
    addLegend,
    legendPosition,
    addTimeMarker: false,
    addTooltip,
    dimensions,
    valueAxes,
    isDonut,
  };

  debugger;
  if(useVegaLiteRendering){
    let vis1 = await createVis('vega', aggConfigs, indexPattern, searchContext);
    const vegaSpec = createVegaSpec(styleState, dimensions, valueAxes, aggConfigs, indexPattern, searchContext);
    
    vis1.params = {
      spec: JSON.stringify(vegaSpec),
    };

    vis1.data.searchSource?.setField('filter', searchContext?.filters);
    vis1.data.searchSource?.setField('query', searchContext?.query);

    const vega_expression = await buildPipeline(vis1, {
      timefilter: params.timefilter,
      timeRange: params.timeRange,
      abortSignal: undefined,
      visLayers: undefined,
      visAugmenterConfig: undefined,
    });

    // let a = buildExpression([...expressionFns, vegaSpecFn]).toString();
    // console.log(a);
    console.log('vega_expression', vega_expression);
    // return buildExpression([...expressionFns, vegaSpecFn]).toString();
    return vega_expression;
  } else {
  const vislib = buildExpressionFunction<any>('vislib', {
    type,
    visConfig: JSON.stringify(visConfig),
  });
  let a = buildExpression([...expressionFns, vislib]).toString();
  return buildExpression([...expressionFns, vislib]).toString();
  }
};
