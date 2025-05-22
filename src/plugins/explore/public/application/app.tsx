/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { I18nProvider } from '@osd/i18n/react';
import {
  EuiErrorBoundary,
  EuiLoadingSpinner,
  EuiPage,
  EuiPageBody,
  EuiPageSideBar,
} from '@elastic/eui';
import { AppMountParameters, CoreStart } from 'src/core/public';
import { ExploreStartDependencies } from '../types';
import { getExploreStore } from './state_management/store';
import { registerTabs } from './register_tabs';
import { syncQueryStateWithUrl } from '../../../data/public';
import {
  createOsdUrlStateStorage,
  withNotifyOnErrors,
} from '../../../opensearch_dashboards_utils/public';
import { ExploreCanvas } from './components/explore_canvas';
import DiscoverPanel from './legacy/discover/application/view_components/panel';

/**
 * Services interface for the Explore plugin
 */
export interface ExploreServices {
  core: CoreStart;
  plugins: ExploreStartDependencies;
  scopedHistory: AppMountParameters['history'];
  tabRegistry?: any;
  store?: any;
  osdUrlStateStorage?: any;
}

/**
 * Main application component for the Explore plugin
 */
const ExploreApp: React.FC<{ services: ExploreServices }> = ({ services }) => {
  const { core, plugins, osdUrlStateStorage } = services;

  // Sync query state with URL
  useEffect(() => {
    if (osdUrlStateStorage && plugins.data) {
      // syncs `_g` portion of url with query services
      const { stop } = syncQueryStateWithUrl(plugins.data.query, osdUrlStateStorage);
      return () => stop();
    }
  }, [osdUrlStateStorage, plugins.data]);

  return (
    <EuiPage className="dscPage">
      <EuiPageSideBar className="dscPageSidebar">
        <DiscoverPanel />
      </EuiPageSideBar>
      <EuiPageBody className="dscPageContent">
        <ExploreCanvas />
      </EuiPageBody>
    </EuiPage>
  );
};

/**
 * Renders the Explore application
 */
export const renderApp = async (
  coreStart: CoreStart,
  plugins: ExploreStartDependencies,
  params: AppMountParameters
) => {
  const { element, history, setHeaderActionMenu } = params;

  // Create URL state storage
  const osdUrlStateStorage = createOsdUrlStateStorage({
    history,
    useHash: coreStart.uiSettings.get('state:storeInSessionStorage'),
    ...withNotifyOnErrors(coreStart.notifications.toasts),
  });

  // Create services object
  const services: ExploreServices = {
    core: coreStart,
    plugins,
    scopedHistory: history,
    osdUrlStateStorage,
  };

  // Register tabs
  const tabRegistry = {};
  services.tabRegistry = tabRegistry;
  registerTabs(services);

  // Initialize store
  const { store, unsubscribe: unsubscribeStore } = await getExploreStore(services);
  services.store = store;

  // Create a loading component
  const LoadingComponent = () => (
    <div
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
    >
      <EuiLoadingSpinner size="xl" />
    </div>
  );

  // Render the application
  const App = () => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      // Simulate loading time for initial state setup
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);

      return () => {
        clearTimeout(timer);
      };
    }, []);

    if (isLoading) {
      return <LoadingComponent />;
    }

    return (
      <Provider store={store}>
        <I18nProvider>
          <EuiErrorBoundary>
            <ExploreApp services={services} />
          </EuiErrorBoundary>
        </I18nProvider>
      </Provider>
    );
  };

  // Mount the application
  const unmount = () => {
    // Render the React application
    const root = document.createElement('div');
    element.appendChild(root);

    // Use ReactDOM to render the application
    const ReactDOM = window.ReactDOM;
    ReactDOM.render(<App />, root);

    // Return a cleanup function
    return () => {
      ReactDOM.unmountComponentAtNode(root);
      element.removeChild(root);
    };
  };

  // Return a function to clean up
  return () => {
    unsubscribeStore();
    unmount();
  };
};
