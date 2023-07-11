/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { ViewMountParameters } from '../../../../../data_explorer/public';
import { OpenSearchDashboardsContextProvider } from '../../../../../opensearch_dashboards_react/public';
import { DiscoverServices } from '../../../build_services';
import { DiscoverCanvas } from './discover_canvas';

export const renderCanvas = (
  { canvasElement }: ViewMountParameters,
  services: DiscoverServices
) => {
  const { history: getHistory } = services;
  const history = getHistory();
  ReactDOM.render(
    <OpenSearchDashboardsContextProvider services={services}>
      <DiscoverCanvas services={services} history={history} />
    </OpenSearchDashboardsContextProvider>,
    canvasElement
  );

  return () => ReactDOM.unmountComponentAtNode(canvasElement);
};
