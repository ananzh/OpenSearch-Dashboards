/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TypeServiceSetup } from '../services/type_service';
import { createMetricConfig } from './metric';
import { createTableConfig } from './table';
import { createVegaConfig } from './vega';
import {
  createAreaConfig,
  createHistogramConfig,
  createLineConfig,
  createPieConfig,
} from './vislib';

export function registerDefaultTypes(typeServiceSetup: TypeServiceSetup) {
  const visualizationTypes = [
    createAreaConfig,
    createHistogramConfig,
    createLineConfig,
    createMetricConfig,
    createPieConfig,
    createTableConfig,
    createVegaConfig,
  ];

  visualizationTypes.forEach((createTypeConfig) => {
    typeServiceSetup.createVisualizationType(createTypeConfig());
  });
}
