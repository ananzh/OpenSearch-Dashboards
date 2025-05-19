/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { setActiveTab } from '../state_management/slices/ui_slice';
import { beginTransaction, finishTransaction } from '../state_management/actions/transaction_actions';
import { RootState } from '../state_management/store';
import { TabDefinition } from '../../services/tab_registry/tab_registry_service';

/**
 * Tab bar component for switching between different views
 */
export const TabBar: React.FC = () => {
  const dispatch = useDispatch();
  const { activeTabId } = useSelector((state: RootState) => state.ui);
  const services = useSelector((state: RootState) => state.services);
  
  // Get all registered tabs from the tab registry
  const tabs = services.tabRegistry.getAllTabs() as TabDefinition[];
  
  // Handle tab click
  const handleTabClick = useCallback((tabId: string) => {
    if (tabId === activeTabId) return;
    
    // Start transaction to batch state updates
    dispatch(beginTransaction());
    
    // Update active tab
    dispatch(setActiveTab(tabId));
    
    // Commit transaction to trigger query execution if needed
    dispatch(finishTransaction());
  }, [dispatch, activeTabId]);
  
  return (
    <EuiTabs>
      {tabs.map((tab: TabDefinition) => (
        <EuiTab
          key={tab.id}
          isSelected={tab.id === activeTabId}
          onClick={() => handleTabClick(tab.id)}
          data-test-subj={`exploreTab-${tab.id}`}
        >
          {tab.label}
        </EuiTab>
      ))}
    </EuiTabs>
  );
};