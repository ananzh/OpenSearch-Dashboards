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
import { TopNav } from './legacy/discover/application/view_components/canvas/top_nav';
import { QueryPanel } from './components/query_panel';
import { TabBar } from './components/tab_bar';
import { TabContent } from './components/tab_content';
import { DiscoverChartContainer } from './legacy/discover/application/view_components/canvas/discover_chart_container';
import { SidebarWrapper } from './components/sidebar_wrapper';

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

  // Create refs for dataset selector and date picker
  const datasetSelectorRef = React.useRef<HTMLDivElement>(null);
  const datePickerRef = React.useRef<HTMLDivElement>(null);

  // Sync query state with URL
  useEffect(() => {
    if (osdUrlStateStorage && plugins.data) {
      // syncs `_g` portion of url with query services
      const { stop } = syncQueryStateWithUrl(plugins.data.query, osdUrlStateStorage);
      return () => stop();
    }
  }, [osdUrlStateStorage, plugins.data]);

  // Create TopNav props structure
  const topNavProps = {
    opts: {
      setHeaderActionMenu: () => {}, // placeholder
      onQuerySubmit: ({ dateRange, query }: any) => {
        // Handle query submission
        console.log('Query submitted:', { dateRange, query });
      },
      optionalRef: {
        datasetSelectorRef,
        datePickerRef,
      },
    },
    showSaveQuery: true,
    isEnhancementsEnabled: true,
  };

  return (
    <div className="exploreApp">
      {/* Top Navigation with Dataset Selector */}
      <TopNav {...topNavProps} />

      {/* Query Panel with Date Picker */}
      <div className="exploreQueryPanel">
        <QueryPanel datePickerRef={datePickerRef} />
      </div>

      <div className="exploreContent">
        {/* Histogram (using legacy component directly) */}
        <div className="exploreChartContainer">
          <DiscoverChartContainer />
        </div>

        <div className="exploreMainContent">
          {/* Left Side Panel */}
          <div className="exploreSidebar">
            <SidebarWrapper />
          </div>

          {/* Right Content Area */}
          <div className="exploreRightContent">
            {/* Tab Bar */}
            <TabBar />

            {/* Tab Content */}
            <div className="exploreTabContent">
              <TabContent />
            </div>
          </div>
        </div>
      </div>
    </div>
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
