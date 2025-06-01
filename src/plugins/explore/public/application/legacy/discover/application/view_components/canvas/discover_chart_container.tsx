/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './discover_chart_container.scss';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ExploreServices } from '../../../../../../types';
import { useOpenSearchDashboards } from '../../../../../../../../opensearch_dashboards_react/public';
import { SearchData } from '../utils/use_search';
import { DiscoverChart } from '../../components/chart/chart';
import { QUERY_ENHANCEMENT_ENABLED_SETTING } from '../../../../../../../common/legacy/discover';

export const DiscoverChartContainer = ({ rows, bucketInterval, chartData }: SearchData) => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const { uiSettings, data } = services;

  const indexPatternId = useSelector((state: any) => state.metadata?.indexPattern);
  const dataset = useSelector((state: any) => state.query?.dataset);

  const isEnhancementsEnabled = uiSettings.get(QUERY_ENHANCEMENT_ENABLED_SETTING, false);

  const isTimeBased = useMemo(() => {
    // Use dataset if available (modern), otherwise use indexPatternId (legacy)
    // Both approaches work - dataset is preferred for explore
    const indexPattern =
      dataset || (indexPatternId ? { id: indexPatternId, isTimeBased: () => true } : undefined);
    return indexPattern ? indexPattern.isTimeBased() : false;
  }, [dataset, indexPatternId]);

  if (!rows || !isTimeBased) return null;

  return (
    <DiscoverChart
      bucketInterval={bucketInterval}
      chartData={chartData}
      config={uiSettings}
      data={data}
      services={services}
      isEnhancementsEnabled={isEnhancementsEnabled}
    />
  );
};
