/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { DiscoverSidebar } from '../legacy/discover/application/components/sidebar/discover_sidebar';

export const SidebarWrapper: React.FC = () => {
  // Get data from Redux store
  const results = useSelector((state: any) => state.results);
  const services = useSelector((state: any) => state.services);

  // Mock props for now - in a real implementation these would come from the Redux store
  const sidebarProps = {
    columns: [], // Will be populated from legacy slice
    fieldCounts: results?.fieldCounts || {},
    hits: results?.hits || 0,
    onAddField: (fieldName: string) => {
      console.log('Add field:', fieldName);
      // TODO: Implement field addition logic
    },
    onAddFilter: (field: any, value: any, type: string) => {
      console.log('Add filter:', field, value, type);
      // TODO: Implement filter addition logic
    },
    onRemoveField: (fieldName: string) => {
      console.log('Remove field:', fieldName);
      // TODO: Implement field removal logic
    },
    onReorderFields: (sourceIdx: number, destinationIdx: number) => {
      console.log('Reorder fields:', sourceIdx, destinationIdx);
      // TODO: Implement field reordering logic
    },
    onCreateIndexPattern: () => {
      console.log('Create index pattern');
      // TODO: Implement index pattern creation logic
    },
    onNormalize: () => {
      console.log('Normalize');
      // TODO: Implement normalization logic
    },
    selectedIndexPattern: services?.indexPattern || null,
    services: services || {},
    state: {
      columns: [],
      sort: [],
    },
    trackUiMetric: () => {
      // TODO: Implement UI metrics tracking
    },
    isEnhancementsEnabledOverride: false,
  };

  return <DiscoverSidebar {...sidebarProps} />;
};
