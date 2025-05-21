/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo } from 'react';
import {
  DEFAULT_COLUMNS_SETTING,
  MODIFY_COLUMNS_ON_SWITCH,
} from '../../../../../../../common/legacy/discover';
import { DiscoverViewServices } from '../../../build_services';
import { useOpenSearchDashboards } from '../../../../../../../../opensearch_dashboards_react/public';
import { DataGridTable } from '../../components/data_grid/data_grid_table';
import {
  addColumn,
  moveColumn,
  removeColumn,
  setSort,
  useDispatch,
  useSelector,
} from '../../utils/state_management';
import { IndexPatternField, opensearchFilters } from '../../../../../../../../data/public';
import { SortOrder } from '../../../saved_searches/types';
import { popularizeField } from '../../helpers/popularize_field';
import { buildColumns } from '../../utils/columns';
import { filterColumns } from '../utils/filter_columns';
import { DocViewFilterFn } from '../../doc_views/doc_views_types';

interface Props {
  scrollToTop?: () => void;
}

export const DiscoverTable = ({ scrollToTop }: Props) => {
  const { services } = useOpenSearchDashboards<DiscoverViewServices>();
  const {
    uiSettings,
    capabilities,
    indexPatterns,
  } = services;

  // Get data from Redux using useSelector directly
  const rows = useSelector((state: any) => {
    const queryState = state.query;
    const resultsState = state.results;
    const services = state.services;
    
    // Get current time range
    const timeRange = services.data.query.timefilter.timefilter.getTime();
    
    // Create cache key
    const cacheKey = `${queryState.query.query}_${timeRange.from}_${timeRange.to}`;
    
    // Get results from cache
    const results = resultsState[cacheKey];
    
    if (results?.hits?.hits) {
      return results.hits.hits;
    }
    return [];
  });
  
  const isLoading = useSelector((state: any) => state.ui.isLoading);
  const error = useSelector((state: any) => state.ui.error);
  
  // Get index pattern and saved search from Redux
  const indexPattern = useSelector((state: any) => {
    return state.query.query.dataset || state.services.indexPattern;
  });
  
  const savedSearch = useSelector((state: any) => state.legacy?.savedSearch);
  
  // Get columns and sort from Redux
  const { columns } = useSelector((state: any) => {
    const stateColumns = state.logs?.columns;
    return {
      columns: stateColumns !== undefined ? stateColumns : buildColumns([]),
    };
  });
  
  const filteredColumns = useMemo(() => {
    return filterColumns(
      columns,
      indexPattern,
      uiSettings.get(DEFAULT_COLUMNS_SETTING),
      uiSettings.get(MODIFY_COLUMNS_ON_SWITCH)
    );
  }, [columns, indexPattern, uiSettings]);
  
  const { sort } = useSelector((state: any) => {
    const stateSort = state.logs?.sort;
    return {
      sort: stateSort !== undefined ? stateSort : [],
    };
  });
  
  const dispatch = useDispatch();
  
  // Use transaction pattern directly
  const startTransaction = useCallback(() => {
    const state = dispatch((_, getState) => getState());
    const previousState = {
      query: { ...state.query },
      ui: { ...state.ui },
      tab: { ...state.tab },
    };
    
    dispatch({ type: 'transaction/startTransaction', payload: { previousState } });
  }, [dispatch]);
  
  const completeTransaction = useCallback(() => {
    dispatch({ type: 'transaction/commitTransaction' });
    dispatch({ type: 'transaction/commitState' });
  }, [dispatch]);
  
  const onAddColumn = (col: string) => {
    if (indexPattern && capabilities.discover?.save) {
      popularizeField(indexPattern, col, indexPatterns);
    }

    dispatch(addColumn({ column: col }));
  };
  
  const onRemoveColumn = (col: string) => {
    if (indexPattern && capabilities.discover?.save) {
      popularizeField(indexPattern, col, indexPatterns);
    }

    dispatch(removeColumn(col));
  };

  const onMoveColumn = (col: string, destination: number) => {
    if (indexPattern && capabilities.discover?.save) {
      popularizeField(indexPattern, col, indexPatterns);
    }
    dispatch(moveColumn({ columnName: col, destination }));
  };

  const onSetSort = (s: SortOrder[]) => {
    // Use transaction to batch state updates
    startTransaction();
    dispatch(setSort(s));
    completeTransaction();
  };
  
  // Add onFilter function
  const onAddFilter = useCallback(
    (field: string | IndexPatternField, values: string, operation: '+' | '-') => {
      if (!indexPattern) return;
      
      // Since we're removing FilterManager, this is a no-op
      // In a real implementation, we would dispatch an action to update the query
      console.log('Filter operation not supported in Explore');
      return;
    },
    [indexPattern]
  );

  if (indexPattern === undefined) {
    return null;
  }

  if (isLoading && (!rows || rows.length === 0)) {
    return <div>{'loading...'}</div>;
  }

  if (error) {
    return <div>{'Error loading data: ' + error.message}</div>;
  }

  if (!rows || rows.length === 0) {
    return <div>{'No results found'}</div>;
  }

  return (
    <DataGridTable
      columns={filteredColumns}
      indexPattern={indexPattern}
      onAddColumn={onAddColumn}
      onMoveColumn={onMoveColumn}
      onRemoveColumn={onRemoveColumn}
      onSort={onSetSort}
      onFilter={onAddFilter as DocViewFilterFn}
      sort={sort}
      rows={rows}
      title={savedSearch?.id ? savedSearch.title : ''}
      description={savedSearch?.id ? savedSearch.description : ''}
      scrollToTop={scrollToTop}
    />
  );
};
