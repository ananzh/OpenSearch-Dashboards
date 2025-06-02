/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './discover_chart_container.scss';
import React, { useMemo, useState, useEffect } from 'react';
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

  const [indexPattern, setIndexPattern] = useState<any>(undefined);

  // Fetch IndexPattern from dataset
  useEffect(() => {
    const fetchIndexPattern = async () => {
      if (dataset?.id) {
        try {
          const pattern = await services.data.indexPatterns.get(dataset.id);
          setIndexPattern(pattern);
        } catch (err) {
          console.error('Failed to fetch index pattern for chart:', err);
          setIndexPattern(undefined);
        }
      } else if (indexPatternId) {
        // Fallback to legacy approach
        try {
          const pattern = await services.data.indexPatterns.get(indexPatternId);
          setIndexPattern(pattern);
        } catch (err) {
          console.error('Failed to fetch index pattern for chart (legacy):', err);
          setIndexPattern(undefined);
        }
      } else {
        setIndexPattern(undefined);
      }
    };

    fetchIndexPattern();
  }, [dataset?.id, indexPatternId, services.data.indexPatterns]);

  const isTimeBased = useMemo(() => {
    return indexPattern ? indexPattern.isTimeBased() : false;
  }, [indexPattern]);

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
