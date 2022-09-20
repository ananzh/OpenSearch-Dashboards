/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { get, cloneDeep } from 'lodash';
import React, { useCallback, useEffect, useMemo } from 'react';
import { i18n } from '@osd/i18n';
import produce from 'immer';
import { Draft } from 'immer';
import { EuiIconTip } from '@elastic/eui';
import { search } from '../../../../../data/public';
import { NumberInputOption, SwitchOption, SelectOption } from '../../../../../charts/public';
import {
  useTypedDispatch,
  useTypedSelector,
  setStyleState,
} from '../../../application/utils/state_management';
import { TableOptionsDefaults } from '../table_viz_type';
import { Option } from '../../../application/app';
import { useIndexPatterns } from '../../../application/utils/use';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { VisBuilderServices } from '../../../types';

const { tabifyGetColumns } = search;

export enum AggTypes {
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
}

const totalAggregations = [
  {
    value: AggTypes.SUM,
    text: i18n.translate('visTypeTableNew.totalAggregations.sumText', {
      defaultMessage: 'Sum',
    }),
  },
  {
    value: AggTypes.AVG,
    text: i18n.translate('visTypeTableNew.totalAggregations.averageText', {
      defaultMessage: 'Average',
    }),
  },
  {
    value: AggTypes.MIN,
    text: i18n.translate('visTypeTableNewNew.totalAggregations.minText', {
      defaultMessage: 'Min',
    }),
  },
  {
    value: AggTypes.MAX,
    text: i18n.translate('visTypeTableNewNew.totalAggregations.maxText', {
      defaultMessage: 'Max',
    }),
  },
  {
    value: AggTypes.COUNT,
    text: i18n.translate('visTypeTableNewNew.totalAggregations.countText', {
      defaultMessage: 'Count',
    }),
  },
];

function TableVizOptions() {
  const perPageLabel = i18n.translate('visTypeTableNewNew.params.perPageLabel', {
    defaultMessage: 'Max rows per page',
  });
  const showMetricsLabel = i18n.translate('visTypeTableNewNew.params.showMetricsLabel', {
    defaultMessage: 'Show metrics for every bucket/level',
  });
  const showPartialRowsLabel = i18n.translate('visTypeTableNewNew.params.showPartialRowsLabel', {
    defaultMessage: 'Show partial rows',
  });
  const showTotalLabel = i18n.translate('visTypeTableNewNew.params.showTotalLabel', {
    defaultMessage: 'Show total',
  });
  const totalFunctionLabel = i18n.translate('visTypeTableNewNew.params.totalFunctionLabel', {
    defaultMessage: 'Total function',
  });
  const percentageColLabel = i18n.translate('visTypeTableNewNew.params.PercentageColLabel', {
    defaultMessage: 'Percentage column',
  });
  const showPartialRowsTip = i18n.translate('visTypeTableNewNew.params.showPartialRowsTip', {
    defaultMessage:
      'Show rows that have partial data. This will still calculate metrics for every bucket/level, even if they are not displayed.',
  });
  const defaultPercentageColText = i18n.translate('visTypeTableNewNew.params.defaultPercentageCol', {
    defaultMessage: 'Don’t show',
  });
  const defaultPercentageColumns = useMemo(() => [{ value: '', text: defaultPercentageColText }], [
    defaultPercentageColText,
  ]);

  const styleState = useTypedSelector((state) => state.style) as TableOptionsDefaults;
  const dispatch = useTypedDispatch();
  const indexPattern = useIndexPatterns().selected;
  const {
    services: {
      data: {
        search: { aggs: aggService },
      },
    },
  } = useOpenSearchDashboards<VisBuilderServices>();
  const aggConfigParams = useTypedSelector(
    (state) => state.visualization.activeVisualization?.aggConfigParams
  );
  const aggConfigs = useMemo(() => {
    return indexPattern && aggService.createAggConfigs(indexPattern, cloneDeep(aggConfigParams));
  }, [aggConfigParams, aggService, indexPattern]);

  const setOption = useCallback(
    (callback: (draft: Draft<typeof styleState>) => void) => {
      const newState = produce(styleState, callback);
      dispatch(setStyleState<TableOptionsDefaults>(newState));
    },
    [dispatch, styleState]
  );

  // const percentageColumns = aggConfigs
  //  ? useMemo(
  //      () => [
  //        defaultPercentageColumns,
  //        ...tabifyGetColumns(aggConfigs.getResponseAggs(), true)
  //          .filter((col) => get(col.aggConfig.toSerializedFieldFormat(), 'id') === 'number')
  //          .map(({ name }) => ({ value: name, text: name })),
  //      ],
  //      [aggConfigs]
  //    )
  //  : [defaultPercentageColumns];

  const percentageColumns = useMemo(
    () =>
      aggConfigs
        ? [
            defaultPercentageColumns,
            ...tabifyGetColumns(aggConfigs.getResponseAggs(), true)
              .filter((col) => get(col.aggConfig.toSerializedFieldFormat(), 'id') === 'number')
              .map(({ name }) => ({ value: name, text: name })),
          ]
        : [defaultPercentageColumns],
    [aggConfigs, defaultPercentageColumns]
  );

  useEffect(() => {
    if (
      !percentageColumns.find(({ value }) => value === styleState.percentageCol) &&
      percentageColumns[0] &&
      percentageColumns[0].value !== styleState.percentageCol
    ) {
      setOption((draft) => {
        draft.percentageCol = percentageColumns[0].value;
      });
    }
  }, [percentageColumns, styleState.percentageCol, setOption]);

  const isPerPageValid = styleState.perPage === '' || styleState.perPage > 0;

  return (
    <>
      <Option
        title={i18n.translate('visTypeTableNewNew.params.settingsTitle', { defaultMessage: 'Settings' })}
        initialIsOpen
      >
        <NumberInputOption
          label={
            <>
              {perPageLabel},
              <EuiIconTip
                content="Leaving this field empty means it will use number of buckets from the response."
                position="right"
              />
            </>
          }
          isInvalid={!isPerPageValid}
          min={1}
          paramName="perPage"
          value={styleState.perPage}
          setValue={(_, value) =>
            setOption((draft) => {
              draft.perPage = value;
            })
          }
        />

        <SwitchOption
          label={showMetricsLabel}
          paramName="showMetricsAtAllLevels"
          value={styleState.showMetricsAtAllLevels}
          setValue={(_, value) =>
            setOption((draft) => {
              draft.showMetricsAtAllLevels = value;
            })
          }
          data-test-subj="showMetricsAtAllLevels"
        />

        <SwitchOption
          label={showPartialRowsLabel}
          tooltip={showPartialRowsTip}
          paramName="showPartialRows"
          value={styleState.showPartialRows}
          setValue={(_, value) =>
            setOption((draft) => {
              draft.showPartialRows = value;
            })
          }
          data-test-subj="showPartialRows"
        />

        <SwitchOption
          label={showTotalLabel}
          paramName="showTotal"
          value={styleState.showTotal}
          setValue={(_, value) =>
            setOption((draft) => {
              draft.showTotal = value;
            })
          }
        />

        <SelectOption
          label={totalFunctionLabel}
          disabled={!styleState.showTotal}
          options={totalAggregations}
          paramName="totalFunc"
          value={styleState.totalFunc}
          setValue={(_, value) =>
            setOption((draft) => {
              draft.totalFunc = value;
            })
          }
        />

        <SelectOption
          label={percentageColLabel}
          options={percentageColumns}
          paramName="percentageCol"
          value={styleState.percentageCol}
          setValue={(_, value) =>
            setOption((draft) => {
              draft.percentageCol = value;
            })
          }
          id="datatableVisualizationPercentageCol"
        />
      </Option>
    </>
  );
}

export { TableVizOptions };
