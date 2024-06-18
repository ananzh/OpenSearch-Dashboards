/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildVislibDimensions } from '../../../../visualizations/public';
import {
  buildExpression,
  buildExpressionFunction,
  IExpressionLoaderParams,
} from '../../../../expressions/public';
import { getAggExpressionFunctions } from '../common/expression_helpers';
import { VislibRootState, getValueAxes, getPipelineParams } from '../vislib/common';
import { createVis } from '../vislib/common/create_vis';
// import { createVegaSpec } from './util';
import { buildPipeline } from '../../../../visualizations/public';

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
  { style: styleState, visualization }: any,
  searchContext: IExpressionLoaderParams['searchContext'],
) => {
  const { aggConfigs, expressionFns, indexPattern } = await getAggExpressionFunctions(
    visualization
  );
//   const { addLegend, addTooltip, legendPosition, type, useVegaLiteRendering, isDonut } = styleState;

  let vis = await createVis('vega', aggConfigs, indexPattern, searchContext);

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



    // const vegaSpec = createVegaSpec(styleState, dimensions, valueAxes, aggConfigs, indexPattern, searchContext);
    
    // vis1.params = {
    //   spec: JSON.stringify(vegaSpec),
    // };

    // vis1.data.searchSource?.setField('filter', searchContext?.filters);
    // vis1.data.searchSource?.setField('query', searchContext?.query);

    const vega_expression = await buildPipeline(vis, {
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
};
