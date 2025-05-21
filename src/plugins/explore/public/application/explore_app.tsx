/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { I18nProvider } from '@osd/i18n/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { CoreStart } from 'opensearch-dashboards/public';
import { getExploreStore } from './state_management/store';
import { loadStateFromUrl } from './state_management/utils/redux_persistence';

// Placeholder for ExploreLayout component
// In a real implementation, this would be imported from the correct path
const ExploreLayout = () => (
  <div>
    <h1>Explore</h1>
    <p>This is the Explore application.</p>
  </div>
);

// Placeholder for registerTabs function
// In a real implementation, this would be imported from the correct path
const registerTabs = (services: any) => {
  console.log('Registering tabs...');
  // Register tabs here
};

interface ExploreAppDeps {
  services: any; // Use any for now, should be properly typed in real implementation
  core: CoreStart;
}

export const ExploreApp = ({ services, core }: ExploreAppDeps) => {
  const [store, setStore] = useState<any>(null);
  
  // Initialize store and load state from URL
  useEffect(() => {
    const initializeStore = async () => {
      // Load state from URL
      const preloadedState = loadStateFromUrl(services);
      
      // Create store with preloaded state
      const { store: newStore } = await getExploreStore(services, preloadedState);
      
      // Register tabs
      registerTabs(services);
      
      // Set store
      setStore(newStore);
    };
    
    initializeStore();
  }, [services]);
  
  // Wait for store to be initialized
  if (!store) {
    return <div>Loading...</div>;
  }
  
  return (
    <I18nProvider>
      <Provider store={store}>
        <Router>
          <ExploreLayout />
        </Router>
      </Provider>
    </I18nProvider>
  );
};