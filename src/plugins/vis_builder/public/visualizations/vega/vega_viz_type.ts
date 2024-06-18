/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { VisualizationTypeOptions } from '../../services/type_service';
import VegaVisEditorWrapper from './components/vega_viz_editor_wrapper';
// import { VegaVisEditorWrapper } from '../../../../vis_type_vega/public/components';
import { toExpression } from './to_expression';
import { DefaultEditorSize } from '../../../../vis_default_editor/public';
import { getDefaultSpec } from '../../../../vis_type_vega/public/default_spec';
import { Schemas } from '../../../../vis_default_editor/public';

export const createVegaConfig = (): VisualizationTypeOptions<any>=> ({
      name: 'vega',
      title: 'Vega',
      description: i18n.translate('visTypeVega.type.vegaDescription', {
        defaultMessage: 'Create custom visualizations using Vega and Vega-Lite',
        description: 'Vega and Vega-Lite are product names and should not be translated',
      }),
      icon: 'visVega',
      toExpression,
      //visConfig: { defaults: { spec: getDefaultSpec() } },
      ui: {
        containerConfig: {
          data: { schemas: new Schemas([])},
          style: {
            defaults: {},
            render: VegaVisEditorWrapper,
          },
        },
      },
  });