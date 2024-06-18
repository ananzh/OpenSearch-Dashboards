/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */


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

export const createVegaSpec = (styleState, dimensions, valueAxes, aggConfigs, indexPattern, searchContext) => {
  const { addLegend, addTooltip, type } = styleState;
  const { x, y } = dimensions;
  const index = indexPattern.title;
  const timeField = searchContext.timeRange ? searchContext.timeRange.field : "@timestamp"; // Use the time range field or default to "@timestamp"

  const dateHistogram = aggConfigs.aggs.find(agg => agg.schema === 'segment');
  const metric = aggConfigs.aggs.find(agg => agg.schema === 'metric');
  const metricType = metric.type.name;

  const dataUrl = {
    context: true,
    timefield: timeField,
    index: index,
    body: {
      aggs: {
        1: {
          date_histogram: {
            field: dateHistogram.params.field.displayName,
            fixed_interval: "3h", // hard coded for now
            time_zone: "America/Los_Angeles", // can be dynamic if required
            min_doc_count: dateHistogram.params.min_doc_count,
            extended_bounds: dateHistogram.params.extended_bounds,
          },
          aggs: {
            2: {
              [metricType]: {
                field: metric.params.field.displayName
              }
            }
          }
        }
      },
      size: 0
    }
  };

  const vegaSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    data: {
      url: dataUrl,
      format: {
        property: "aggregations.1.buckets"
      }
    },
    transform: [
      {
        calculate: "datum.key",
        as: "timestamp"
      },
      {
        calculate: `datum[2].value`,
        as: metric.params.field.displayName
      }
    ],
    layer: [
      {
        mark: {
          type: "line" // or dynamic type if needed
        }
      },
      {
        mark: {
          type: "circle",
          tooltip: addTooltip
        }
      }
    ],
    encoding: {
      x: {
        field: "timestamp",
        type: "temporal",
        axis: {
          title: timeField
        }
      },
      y: {
        field: metric.params.field.displayName,
        type: "quantitative",
        axis: {
          title: metric.params.field.displayName
        }
      },
      color: {
        datum: metric.params.field.displayName,
        type: "nominal"
      }
    }
  };

  if (addLegend) {
    vegaSpec.encoding.color.legend = {
      title: metric.params.field.displayName
    };
  }

  return vegaSpec;
};