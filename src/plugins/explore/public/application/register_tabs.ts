/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TabRegistryService } from '../services/tab_registry/tab_registry_service';

// Import tab components
const LogsTabComponent = React.lazy(() => import('./components/tabs/logs_tab'));
const VisualizationsTabComponent = React.lazy(() => import('./components/tabs/visualizations_tab'));

/**
 * Registers built-in tabs with the tab registry
 */
export const registerBuiltInTabs = (tabRegistry: TabRegistryService) => {
  // Register Logs Tab
  tabRegistry.registerTab({
    id: 'logs',
    label: 'Logs',
    flavor: ['log'],
    order: 10,
    supportedLanguages: ['ppl', 'sql'],
    
    prepareQuery: (query) => {
      if (query.language === 'ppl') {
        // Remove stats pipe for logs view
        return {
          ...query,
          query: typeof query.query === 'string' 
            ? query.query.replace(/\s*\|\s*stats.*$/i, '')
            : query.query,
        };
      }
      return query;
    },
    
    component: LogsTabComponent,
  });
  
  // Register Visualizations Tab
  tabRegistry.registerTab({
    id: 'visualizations',
    label: 'Visualizations',
    flavor: ['line', 'bar', 'pie'],
    order: 20,
    supportedLanguages: ['ppl', 'sql', 'promql'],
    
    prepareQuery: (query) => {
      // No transformation needed for visualizations
      return query;
    },
    
    component: VisualizationsTabComponent,
  });
};