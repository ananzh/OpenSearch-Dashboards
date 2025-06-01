/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { EuiPanel } from '@elastic/eui';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../types';
import { ResultStatus } from '../utils/state_management/types';
import { TopNav } from '../legacy/discover/application/view_components/canvas/top_nav';
import { DiscoverChartContainer } from '../legacy/discover/application/view_components/canvas/discover_chart_container';
import { QueryPanel } from './query_panel';
import { TabBar } from './tab_bar';
import { TabContent } from './tab_content';

export interface ExploreCanvasProps {
  setHeaderActionMenu?: any;
}

export const ExploreCanvas: React.FC<ExploreCanvasProps> = ({ setHeaderActionMenu }) => {
  // Get services from context
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const isEnhancementsEnabled =
    services?.uiSettings?.get('query:enhancementsEnabled', false) || false;

  // Create refs for TopNav components
  const datasetSelectorRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Create TopNav props
  const topNavProps = {
    isEnhancementsEnabled,
    opts: {
      setHeaderActionMenu,
      onQuerySubmit: ({ dateRange, query }: any) => {
        // Update time range
        if (dateRange && services?.data?.query?.timefilter?.timefilter) {
          services.data.query.timefilter.timefilter.setTime(dateRange);
        }
      },
      optionalRef: {
        datasetSelectorRef,
        datePickerRef,
      },
    },
    showSaveQuery: true,
  };

  return (
    <EuiPanel
      hasBorder={true}
      hasShadow={false}
      paddingSize="s"
      className="dscCanvas"
      data-test-subj="dscCanvas"
      borderRadius="l"
    >
      {/* Legacy TopNav component */}
      <TopNav {...topNavProps} />

      {/* New QueryPanel component */}
      <div className="dscCanvas__queryPanel">
        <QueryPanel datePickerRef={datePickerRef} />
      </div>

      {/* Tab Bar for switching between tabs */}
      <div className="dscCanvas__tabBar">
        <TabBar />
      </div>

      {/* Chart container from legacy */}
      <div className="dscCanvas__chart">
        <DiscoverChartContainer rows={[]} status={ResultStatus.READY} />
      </div>

      {/* Tab content that renders the active tab */}
      <div className="dscCanvas__tabContent">
        <TabContent />
      </div>
    </EuiPanel>
  );
};
