/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, Switch } from 'react-router-dom';
import { Provider as ReduxProvider } from 'react-redux';
import { Store } from 'redux';
import { AppMountParameters } from '../../../../core/public';
import { ExploreServices } from '../types';
import { ExploreApp } from './app';
import { OpenSearchDashboardsContextProvider } from '../../../opensearch_dashboards_react/public';

// Route component props interface
interface ExploreRouteProps {
  services: ExploreServices;
  history: AppMountParameters['history'];
}

// Route components for different paths
const ExploreMainRoute = (props: ExploreRouteProps) => <ExploreApp />;

// View route for saved searches
const ViewRoute = (props: ExploreRouteProps) => <ExploreApp />;

export const renderApp = (
  { element, history }: AppMountParameters,
  services: ExploreServices,
  store: Store
) => {
  // Create main route props
  const mainRouteProps: ExploreRouteProps = {
    services,
    history,
  };
  ReactDOM.render(
    <Router history={history}>
      <OpenSearchDashboardsContextProvider services={services}>
        <ReduxProvider store={store}>
          <services.core.i18n.Context>
            <Switch>
              {/* View route for saved searches */}
              <Route path="/view/:id" exact>
                <ViewRoute {...mainRouteProps} />
              </Route>

              {/* Main route */}
              <Route path="/" exact>
                <ExploreMainRoute {...mainRouteProps} />
              </Route>

              {/* Default fallback */}
              <Route>
                <ExploreMainRoute {...mainRouteProps} />
              </Route>
            </Switch>
          </services.core.i18n.Context>
        </ReduxProvider>
      </OpenSearchDashboardsContextProvider>
    </Router>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
