/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiForm } from '@elastic/eui';
import React from 'react';
import { useVisualizationType } from '../../utils/use';
import { useSelector } from '../../utils/state_management';
import { mapSchemaToAggPanel } from './schema_to_dropbox';
import { SecondaryPanel } from './secondary_panel';

import './index.scss';

export function ConfigPanel() {
  const vizType = useVisualizationType();
  const editingState = useSelector((state) => state.vbVisualization.activeVisualization?.draftAgg);
  const schemas = vizType.ui.containerConfig.data.schemas;

  if (!schemas) return null;

  const mainPanel = mapSchemaToAggPanel(schemas);

  return (
    <EuiForm className={`vbConfig ${editingState ? 'showSecondary' : ''}`}>
      <div className="vbConfig__section">{mainPanel}</div>
      <SecondaryPanel />
    </EuiForm>
  );
}
