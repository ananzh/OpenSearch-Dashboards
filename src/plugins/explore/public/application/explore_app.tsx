/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { i18n } from '@osd/i18n';
import { EuiLoadingSpinner, EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';
import { getExploreStore } from './state_management/store';
import { loadReduxState } from './state_management/utils/redux_persistence';
import { QueryPanel } from './components/query_panel';
import { TabBar } from './components/tab_bar';
import { TabContent } from './components/tab_content';
import { registerBuiltInTabs } from './register_tabs';

/**
 * Main Explore application component
 */
export const ExploreApp = () => {
  const services = useOpenSearchDashboards();
  const [storeData, setStoreData] = useState<{ store: any; unsubscribe: () => void } | null>(null);
  
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load state from URL
        const preloadedState = await loadReduxState(services);
        
        // Create Redux store
        const storeData = await getExploreStore(services, preloadedState);
        setStoreData(storeData);
        
        // Register built-in tabs
        registerBuiltInTabs(services.tabRegistry);
        
        // Set up bidirectional sync between URL and services
        services.syncQueryStateWithUrl(
          services.data.query,
          services.osdUrlStateStorage
        );
        
        // Set page title
        services.chrome.docTitle.change(
          i18n.translate('explore.pageTitle', {
            defaultMessage: 'Explore',
          })
        );
      } catch (error) {
        console.error('Failed to initialize Explore app:', error);
      }
    };
    
    initializeApp();
    
    // Clean up when component unmounts
    return () => {
      if (storeData) {
        storeData.unsubscribe();
      }
    };
  }, [services]);
  
  if (!storeData) {
    return (
      <EuiPageTemplate.Section>
        <EuiLoadingSpinner size="xl" />
      </EuiPageTemplate.Section>
    );
  }
  
  return (
    <Provider store={storeData.store}>
      <EuiPageTemplate>
        <EuiPageTemplate.Header
          pageTitle={i18n.translate('explore.title', {
            defaultMessage: 'Explore',
          })}
        />
        <EuiPageTemplate.Section>
          <QueryPanel />
          <EuiSpacer size="m" />
          <TabBar />
          <EuiSpacer size="m" />
          <TabContent />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </Provider>
  );
};