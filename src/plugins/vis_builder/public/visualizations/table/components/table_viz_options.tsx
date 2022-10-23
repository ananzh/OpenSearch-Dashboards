/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { get } from 'lodash';
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
import { TableOptionsDefaults, AggTypes } from '../table_viz_type';
import { Option } from '../../../application/app';
import { getAggExpressionFunctions } from '../../common/expression_helpers';
import { setValidity } from '../../../application/utils/state_management/metadata_slice';

const { tabifyGetColumns } = search;

const totalAggregations = [
  {
    value: AggTypes.SUM,
    text: i18n.translate('visTypeTable.totalAggregations.sumText', {
      defaultMessage: 'Sum',
    }),
  },
  {
    value: AggTypes.AVG,
    text: i18n.translate('visTypeTable.totalAggregations.averageText', {
      defaultMessage: 'Average',
    }),
  },
  {
    value: AggTypes.MIN,
    text: i18n.translate('visTypeTable.totalAggregations.minText', {
      defaultMessage: 'Min',
    }),
  },
  {
    value: AggTypes.MAX,
    text: i18n.translate('visTypeTable.totalAggregations.maxText', {
      defaultMessage: 'Max',
    }),
  },
  {
    value: AggTypes.COUNT,
    text: i18n.translate('visTypeTable.totalAggregations.countText', {
      defaultMessage: 'Count',
    }),
  },
];

export const TableVizOptions = async () => {
  const rootState = useTypedSelector((state) => state);
  const { visualization, style: styleState } = rootState;
  const { aggConfigs } = await getAggExpressionFunctions(visualization);

  const dispatch = useTypedDispatch();

  const setOption = useCallback(
    (callback: (draft: Draft<typeof styleState>) => void) => {
      const newState = produce(styleState, callback);
      dispatch(setStyleState<TableOptionsDefaults>(newState));
    },
    [dispatch, styleState]
  );

  const perPageLabel = i18n.translate('visTypeTable.params.perPageLabel', {
    defaultMessage: 'Max rows per page',
  });
  const showMetricsLabel = i18n.translate('visTypeTable.params.showMetricsLabel', {
    defaultMessage: 'Show metrics for every bucket/level',
  });
  const showPartialRowsLabel = i18n.translate('visTypeTable.params.showPartialRowsLabel', {
    defaultMessage: 'Show partial rows',
  });
  const showTotalLabel = i18n.translate('visTypeTable.params.showTotalLabel', {
    defaultMessage: 'Show total',
  });
  const totalFunctionLabel = i18n.translate('visTypeTable.params.totalFunctionLabel', {
    defaultMessage: 'Total function',
  });
  const percentageColLabel = i18n.translate('visTypeTable.params.PercentageColLabel', {
    defaultMessage: 'Percentage column',
  });
  const showPartialRowsTip = i18n.translate('visTypeTable.params.showPartialRowsTip', {
    defaultMessage:
      'Show rows that have partial data. This will still calculate metrics for every bucket/level, even if they are not displayed.',
  });
  const defaultPercentageColText = i18n.translate('visTypeTable.params.defaultPercentageCol', {
    defaultMessage: 'Don’t show',
  });

  const percentageColumns = useMemo(
    () => [
      {
        value: '',
        text: defaultPercentageColText,
      },
      ...tabifyGetColumns(aggConfigs.getResponseAggs(), true)
        .filter((col) => get(col.aggConfig.toSerializedFieldFormat(), 'id') === 'number')
        .map(({ name }) => ({ value: name, text: name })),
    ],
    [aggConfigs, defaultPercentageColText]
  );

  const isPerPageValid = styleState.perPage === '' || styleState.perPage > 0;

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

  return (
    <>
      <Option
        title={i18n.translate('visTypeTable.params.settingsTitle', { defaultMessage: 'Settings' })}
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
};
