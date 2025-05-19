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
      // TODO: Implement field addition logic
    },
    onAddFilter: (field: any, value: any, type: string) => {
      // TODO: Implement filter addition logic
    },
    onRemoveField: (fieldName: string) => {
      // TODO: Implement field removal logic
    },
    onReorderFields: (sourceIdx: number, destinationIdx: number) => {
      // TODO: Implement field reordering logic
    },
    onCreateIndexPattern: () => {
      // TODO: Implement index pattern creation logic
    },
    onNormalize: () => {
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
