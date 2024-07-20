/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Define types for selection configurations
interface SelectionConfig {
  type: 'single' | 'multi';
  fields: string[];
  bind: 'legend' | { [key: string]: any };
}

interface VegaLiteSelection {
  [key: string]: SelectionConfig;
}

/**
 * Builds a selection configuration for Vega-Lite specifications.
 * This function creates a multi-selection bound to the legend,
 * allowing for interactive filtering of data based on legend items.
 *
 * @returns {VegaLiteSelection} The selection configuration object.
 */
export const buildSelection = (): VegaLiteSelection => {
  return {
    legend_selection: {
      type: 'multi', // Allows multiple items to be selected
      fields: ['series'], // The field to be used for selection (typically the series field)
      bind: 'legend', // Binds the selection to the chart's legend
    },
  };
};
