/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './discover_chart_container.scss';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { DiscoverViewServices } from '../../../build_services';
import { useOpenSearchDashboards } from '../../../../../../../../opensearch_dashboards_react/public';
import { SearchData } from '../utils/use_search';
import { DiscoverChart } from '../../components/chart/chart';
import { QUERY_ENHANCEMENT_ENABLED_SETTING } from '../../../../../../../common/legacy/discover';

export const DiscoverChartContainer = ({ rows, bucketInterval, chartData }: SearchData) => {
  const { services } = useOpenSearchDashboards<DiscoverViewServices>();
  const { uiSettings, data } = services;

  // Get indexPattern from Redux instead of useDiscoverContext
  const indexPattern = useSelector((state: any) => {
    return state.query.query.dataset || state.services.indexPattern;
  });

  const isEnhancementsEnabled = uiSettings.get(QUERY_ENHANCEMENT_ENABLED_SETTING);

  const isTimeBased = useMemo(() => (indexPattern ? indexPattern.isTimeBased() : false), [
    indexPattern,
  ]);

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
