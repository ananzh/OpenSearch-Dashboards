/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@osd/i18n';
import { chain, findIndex } from 'lodash';
import { OpenSearchDashboardsDatatableRow } from 'src/plugins/expressions';
import { Table } from '../table_vis_response_handler';
import { AggTypes, TableVisConfig } from '../types';
import { getFormatService } from '../services';
import { FormattedColumn } from '../types';

function insert(arr: FormattedColumn[], index: number, col: FormattedColumn) {
  const newArray = [...arr];
  newArray.splice(index + 1, 0, col);
  return newArray;
}

/**
 * @param columns - the formatted columns that will be displayed
 * @param title - the title of the column to add to
 * @param rows - the row data for the columns
 * @param insertAtIndex - the index to insert the percentage column at
 * @returns cols and rows for the table to render now included percentage column(s)
 */
function addPercentageCol(
  columns: FormattedColumn[],
  title: string,
  rows: Table['rows'],
  insertAtIndex: number
) {
  const { id, sumTotal } = columns[insertAtIndex];
  const newId = `${id}-percents`;
  const formatter = getFormatService().deserialize({ id: 'percent' });
  const i18nTitle = i18n.translate('visTypeTable.params.percentageTableColumnName', {
    defaultMessage: '{title} percentages',
    values: { title },
  });
  const newCols = insert(columns, insertAtIndex, {
    title: i18nTitle,
    id: newId,
    formatter,
    filterable: false,
  });
  const newRows = rows.map((row) => ({
    [newId]: (row[id] as number) / (sumTotal as number),
    ...row,
  }));

  return { cols: newCols, rows: newRows };
}

export interface FormattedDataProps {
  formattedRows: OpenSearchDashboardsDatatableRow[];
  formattedColumns: FormattedColumn[];
}
export const convertToFormattedData = (
  table: Table,
  visConfig: TableVisConfig
): FormattedDataProps => {
  const { buckets, metrics, splitColumn } = visConfig;
  let formattedRows: OpenSearchDashboardsDatatableRow[] = table.rows;
  let formattedColumns: FormattedColumn[] = table.columns
    .map(function (col, i) {
      const isBucket = buckets.find((bucket) => bucket.accessor === i);
      const isSplitColumn = splitColumn
        ? splitColumn.find((splitCol) => splitCol.accessor === i)
        : undefined;
      const dimension =
        isBucket || isSplitColumn || metrics.find((metric) => metric.accessor === i);

      const formatter = dimension ? getFormatService().deserialize(dimension.format) : undefined;

      const formattedColumn: FormattedColumn = {
        id: col.id,
        title: col.name,
        formatter,
        filterable: !!isBucket,
      };

      const isDate = dimension?.format?.id === 'date' || dimension?.format?.params?.id === 'date';
      const allowsNumericalAggregations = formatter?.allowsNumericalAggregations;

      if (allowsNumericalAggregations || isDate || visConfig.totalFunc === AggTypes.COUNT) {
        const sum = table.rows.reduce((prev, curr) => {
          // some metrics return undefined for some of the values
          // derivative is an example of this as it returns undefined in the first row
          if (curr[col.id] === undefined) return prev;
          return prev + (curr[col.id] as number);
        }, 0);

        formattedColumn.sumTotal = sum;
        switch (visConfig.totalFunc) {
          case AggTypes.SUM: {
            if (!isDate) {
              formattedColumn.formattedTotal = formatter?.convert(sum);
              formattedColumn.total = formattedColumn.sumTotal;
            }
            break;
          }
          case AggTypes.AVG: {
            if (!isDate) {
              const total = sum / table.rows.length;
              formattedColumn.formattedTotal = formatter?.convert(total);
              formattedColumn.total = total;
            }
            break;
          }
          case AggTypes.MIN: {
            const total = chain(table.rows).map(col.id).min().value() as number;
            formattedColumn.formattedTotal = formatter?.convert(total);
            formattedColumn.total = total;
            break;
          }
          case AggTypes.MAX: {
            const total = chain(table.rows).map(col.id).max().value() as number;
            formattedColumn.formattedTotal = formatter?.convert(total);
            formattedColumn.total = total;
            break;
          }
          case 'count': {
            const total = table.rows.length;
            formattedColumn.formattedTotal = total;
            formattedColumn.total = total;
            break;
          }
          default:
            break;
        }
      }

      return formattedColumn;
    })
    .filter((column) => column);

  if (visConfig.percentageCol) {
    const insertAtIndex = findIndex(formattedColumns, { title: visConfig.percentageCol });

    // column to show percentage for was removed
    if (insertAtIndex < 0) return;

    const { cols, rows } = addPercentageCol(
      formattedColumns,
      visConfig.percentageCol,
      table.rows,
      insertAtIndex
    );
    formattedRows = rows;
    formattedColumns = cols;
  }
  return { formattedRows, formattedColumns };
};
