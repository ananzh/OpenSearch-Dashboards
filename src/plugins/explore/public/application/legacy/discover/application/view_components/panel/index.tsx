/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  IndexPatternField,
  UI_SETTINGS,
  opensearchFilters,
  IndexPattern,
} from '../../../../../../../../data/public';
import { useOpenSearchDashboards } from '../../../../../../../../opensearch_dashboards_react/public';
import {
  addColumn,
  removeColumn,
  moveColumn,
  setColumns,
} from '../../../../../utils/state_management/slices/legacy_slice';
import {
  selectColumns,
  selectFieldCounts,
  selectRows,
  selectIndexPattern,
  selectQuery,
  selectResults,
} from '../../../../../utils/state_management/selectors';
import { DiscoverSidebar } from '../../components/sidebar';
import { ExploreServices } from '../../../../../../types';
import { popularizeField } from '../../helpers/popularize_field';
import { buildColumns } from '../../utils/columns';

export function DiscoverPanel() {
  console.log('🔍 DiscoverPanel: Component rendering...');

  const { services } = useOpenSearchDashboards<ExploreServices>();
  const {
    data: {
      query: { filterManager },
    },
    capabilities,
    application,
    uiSettings,
  } = services;

  // Get data from Redux store
  const columns = useSelector(selectColumns);
  const dataset = useSelector(selectIndexPattern); // This is actually a Dataset, not IndexPattern
  const queryState = useSelector(selectQuery);
  const results = useSelector(selectResults); // Get current results from cache

  // State for the actual IndexPattern
  const [indexPattern, setIndexPattern] = useState<IndexPattern | undefined>(undefined);

  // Get fieldCounts and rows from current results (after query execution)
  const fieldCounts = results?.fieldCounts || {};
  const rows = results?.hits?.hits || [];

  console.log('🔍 DiscoverPanel: Redux data:', {
    columns: JSON.stringify(columns),
    fieldCounts: JSON.stringify(fieldCounts),
    rows: Array.isArray(rows) ? rows.length : 'not array',
    dataset: dataset
      ? {
          title: dataset.title,
          id: dataset.id,
          type: dataset.type,
        }
      : 'undefined',
    queryState: queryState
      ? {
          query: queryState.query,
          language: queryState.language,
          dataset: queryState.dataset
            ? {
                id: queryState.dataset.id,
                title: queryState.dataset.title,
                type: queryState.dataset.type,
              }
            : 'undefined',
        }
      : 'undefined',
    indexPattern: indexPattern
      ? {
          title: indexPattern.title,
          id: indexPattern.id,
          timeFieldName: indexPattern.timeFieldName,
        }
      : 'undefined',
    services: !!services,
    filterManager: !!filterManager,
    capabilities: !!capabilities,
  });

  // Add debug for services.data.query.queryString
  const queryStringManager = services.data?.query?.queryString;
  if (queryStringManager) {
    const currentQuery = queryStringManager.getQuery();
    console.log('🔍 DiscoverPanel: QueryStringManager data:', {
      currentQuery: {
        query: currentQuery.query,
        language: currentQuery.language,
        dataset: currentQuery.dataset
          ? {
              id: currentQuery.dataset.id,
              title: currentQuery.dataset.title,
              type: currentQuery.dataset.type,
            }
          : 'undefined',
      },
    });
  }

  // Convert Dataset to IndexPattern (similar to discover's useIndexPattern hook)
  useEffect(() => {
    let isMounted = true;

    const convertDatasetToIndexPattern = async () => {
      console.log('🔍 DiscoverPanel: Converting dataset to IndexPattern...');

      // Try to get dataset from queryStringManager first (most reliable)
      const currentQuery = queryStringManager?.getQuery();
      const datasetToConvert = currentQuery?.dataset || dataset || queryState?.dataset;

      console.log('🔍 DiscoverPanel: Dataset sources:', {
        'currentQuery?.dataset': currentQuery?.dataset
          ? {
              id: currentQuery.dataset.id,
              title: currentQuery.dataset.title,
              type: currentQuery.dataset.type,
            }
          : 'undefined',
        'dataset (from selectIndexPattern)': dataset
          ? {
              id: dataset.id,
              title: dataset.title,
              type: dataset.type,
            }
          : 'undefined',
        'queryState?.dataset': queryState?.dataset
          ? {
              id: queryState.dataset.id,
              title: queryState.dataset.title,
              type: queryState.dataset.type,
            }
          : 'undefined',
        datasetToConvert: datasetToConvert
          ? {
              id: datasetToConvert.id,
              title: datasetToConvert.title,
              type: datasetToConvert.type,
            }
          : 'undefined',
      });

      if (!datasetToConvert) {
        console.log(
          '🔍 DiscoverPanel: No dataset found to convert - will retry when dataset becomes available'
        );
        return;
      }

      try {
        // Use the same logic as discover's useIndexPattern hook
        let pattern = await services.data.indexPatterns.get(
          datasetToConvert.id,
          datasetToConvert.type !== 'INDEX_PATTERN'
        );

        console.log('🔍 DiscoverPanel: First attempt to get IndexPattern:', pattern);

        if (!pattern) {
          console.log('🔍 DiscoverPanel: IndexPattern not found, caching dataset...');
          // Cache the dataset first
          await services.data.query.queryString.getDatasetService().cacheDataset(datasetToConvert, {
            uiSettings: services.uiSettings,
            savedObjects: services.savedObjects,
            notifications: services.notifications,
            http: services.http,
            data: services.data,
          });

          // Try again after caching
          pattern = await services.data.indexPatterns.get(
            datasetToConvert.id,
            datasetToConvert.type !== 'INDEX_PATTERN'
          );

          console.log('🔍 DiscoverPanel: Second attempt to get IndexPattern:', pattern);
        }

        if (isMounted && pattern) {
          console.log('🔍 DiscoverPanel: Successfully converted dataset to IndexPattern:', {
            title: pattern.title,
            id: pattern.id,
            timeFieldName: pattern.timeFieldName,
            fields: pattern.fields?.length,
          });
          setIndexPattern(pattern);
        }
      } catch (error) {
        console.error('🔍 DiscoverPanel: Error converting dataset to IndexPattern:', error);
      }
    };

    convertDatasetToIndexPattern();

    return () => {
      isMounted = false;
    };
  }, [dataset, queryState?.dataset, queryStringManager, services]);

  const prevColumns = useRef(columns);
  const dispatch = useDispatch();

  useEffect(() => {
    const timeFieldname = indexPattern?.timeFieldName;

    if (columns !== prevColumns.current) {
      let updatedColumns = buildColumns(columns);
      if (
        columns &&
        timeFieldname &&
        !prevColumns.current.includes(timeFieldname) &&
        columns.includes(timeFieldname)
      ) {
        // Remove timeFieldname from columns if previously chosen columns does not include time field
        updatedColumns = columns.filter((column: string) => column !== timeFieldname);
      }
      // Update the ref with the new columns
      dispatch(setColumns(updatedColumns));
      prevColumns.current = columns;
    }
  }, [columns, dispatch, indexPattern?.timeFieldName]);

  const onAddFilter = useCallback(
    (field: string | IndexPatternField, values: string, operation: '+' | '-') => {
      if (!indexPattern) return;

      const newFilters = opensearchFilters.generateFilters(
        filterManager,
        field,
        values,
        operation,
        indexPattern.id ?? ''
      );
      return filterManager.addFilters(newFilters);
    },
    [filterManager, indexPattern]
  );

  const onCreateIndexPattern = useCallback(async () => {
    if (!indexPattern?.title) return;
    application?.navigateToApp('management', {
      path: `opensearch-dashboards/indexPatterns/create?id=${indexPattern.title}`,
    });
  }, [application, indexPattern?.title]);

  const isEnhancementsEnabledOverride = uiSettings.get(UI_SETTINGS.QUERY_ENHANCEMENTS_ENABLED);

  // Debug render while IndexPattern is loading
  if (!indexPattern) {
    return (
      <div style={{ padding: '16px' }}>
        <h4>Debug: Loading IndexPattern...</h4>
        <p>Converting dataset to IndexPattern...</p>
        <p>
          <strong>Dataset:</strong> {dataset ? `${dataset.title} (${dataset.type})` : 'undefined'}
        </p>
        <p>
          <strong>QueryState Dataset:</strong>{' '}
          {queryState?.dataset
            ? `${queryState.dataset.title} (${queryState.dataset.type})`
            : 'undefined'}
        </p>
      </div>
    );
  }

  // Now we have a proper IndexPattern, render the actual DiscoverSidebar
  console.log('🔍 DiscoverPanel: Rendering DiscoverSidebar with IndexPattern:', {
    title: indexPattern.title,
    id: indexPattern.id,
    fieldsCount: indexPattern.fields?.length,
    columns: columns?.length,
    fieldCounts: Object.keys(fieldCounts || {}).length,
    rows: Array.isArray(rows) ? rows.length : 0,
  });

  return (
    <DiscoverSidebar
      columns={columns || []}
      fieldCounts={fieldCounts || {}}
      hits={rows || []}
      onAddField={(fieldName, index) => {
        if (indexPattern && capabilities.discover?.save) {
          popularizeField(indexPattern, fieldName, services.data.indexPatterns);
        }
        dispatch(addColumn({ column: fieldName }));
      }}
      onRemoveField={(fieldName) => {
        if (indexPattern && capabilities.discover?.save) {
          popularizeField(indexPattern, fieldName, services.data.indexPatterns);
        }
        dispatch(removeColumn(fieldName));
      }}
      onReorderFields={(source, destination) => {
        const columnName = columns[source];
        dispatch(
          moveColumn({
            columnName,
            destination,
          })
        );
      }}
      selectedIndexPattern={indexPattern}
      onCreateIndexPattern={onCreateIndexPattern}
      onNormalize={() => {}}
      onAddFilter={onAddFilter}
      isEnhancementsEnabledOverride={isEnhancementsEnabledOverride}
    />
  );

  // TODO: Fix type issues and re-enable
  /*
  return (
    <DiscoverSidebar
      columns={columns || []}
      fieldCounts={fieldCounts || {}}
      hits={rows || []}
      onAddField={(fieldName, index) => {
        // TODO: Fix type conversion
        dispatch(addColumn({ column: fieldName }));
      }}
      onRemoveField={(fieldName) => {
        // TODO: Fix type conversion
        dispatch(removeColumn(fieldName));
      }}
      onReorderFields={(source, destination) => {
        const columnName = columns[source];
        dispatch(
          moveColumn({
            columnName,
            destination,
          })
        );
      }}
      selectedIndexPattern={indexPattern as any} // TODO: Fix type
      onCreateIndexPattern={onCreateIndexPattern}
      onNormalize={() => {}}
      onAddFilter={onAddFilter}
      isEnhancementsEnabledOverride={isEnhancementsEnabledOverride}
    />
  );
  */
}
