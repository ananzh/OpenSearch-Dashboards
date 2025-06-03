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

export const DiscoverChartContainer = ({
  rows = [],
  bucketInterval,
  chartData,
  cacheKey,
  status = 'ready' as any
}: Partial<SearchData> & { cacheKey?: string }) => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const { uiSettings, data } = services;

  const indexPatternId = useSelector((state: any) => state.metadata?.indexPattern);
  const dataset = useSelector((state: any) => state.query?.dataset);
  const results = useSelector((state: any) => cacheKey ? state.results[cacheKey] : null);

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

  console.log('🔍 DiscoverChartContainer - cacheKey:', cacheKey);
  console.log('🔍 DiscoverChartContainer - isTimeBased:', isTimeBased);
  console.log('🔍 DiscoverChartContainer - dataset:', dataset);
  console.log('🔍 DiscoverChartContainer - indexPatternId:', indexPatternId);
  console.log('🔍 DiscoverChartContainer - indexPattern:', indexPattern);
  console.log('🔍 DiscoverChartContainer - hasResults:', !!results);

  if (!isTimeBased) {
    console.log('❌ DiscoverChartContainer: Not time-based, returning null');
    return null;
  }

  // Use cached results if available, otherwise fall back to props
  const finalChartData = results?.chartData || chartData;
  const finalBucketInterval = results?.bucketInterval || bucketInterval;
  const finalRows = results?.hits?.hits || rows || [];

  console.log('🔍 DiscoverChartContainer Final Data:', {
    finalChartData: !!finalChartData,
    finalBucketInterval: !!finalBucketInterval,
    finalRowsLength: finalRows.length
  });

  if (!finalRows.length && !finalChartData) {
    console.log('❌ DiscoverChartContainer: No data available, returning null');
    return null;
  }

  return (
    <DiscoverChart
      bucketInterval={finalBucketInterval}
      chartData={finalChartData}
      config={uiSettings}
      data={data}
      services={services}
      isEnhancementsEnabled={isEnhancementsEnabled}
    />
  );
};
