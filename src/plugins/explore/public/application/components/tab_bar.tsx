/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { setActiveTab } from '../state_management/slices/ui_slice';
import {
  beginTransaction,
  finishTransaction,
} from '../state_management/actions/transaction_actions';
import {
  selectActiveTabId,
  selectAllTabs,
  selectTabsForLanguage,
  selectQueryLanguage,
} from '../state_management/selectors';
import { TabDefinition } from '../../services/tab_registry/tab_registry_service';

/**
 * Tab bar component for switching between different views
 * Uses memoized selectors for optimal performance
 */
export const TabBar: React.FC = () => {
  const dispatch = useDispatch();

  // Use memoized selectors
  const activeTabId = useSelector(selectActiveTabId);
  const queryLanguage = useSelector(selectQueryLanguage);

  // Get tabs that support the current query language
  const tabs = useSelector(selectTabsForLanguage);

  // Get all tabs (used as fallback)
  const allTabs = useSelector(selectAllTabs);

  // Handle tab click with transaction pattern
  const handleTabClick = useCallback(
    (tabId: string) => {
      if (tabId === activeTabId) return;

      // Start transaction to batch state updates
      dispatch(beginTransaction());

      // Update active tab
      dispatch(setActiveTab(tabId));

      // Commit transaction to trigger query execution if needed
      dispatch(finishTransaction());
    },
    [dispatch, activeTabId]
  );

  // If no tabs support the current language, show all tabs
  // Use useMemo instead of conditional hook call
  const displayTabs = useMemo(() => {
    return tabs.length > 0 ? tabs : allTabs;
  }, [tabs, allTabs]);

  return (
    <EuiTabs>
      {displayTabs.map((tab: TabDefinition) => (
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
