/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiSuperUpdateButton } from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { getQueryWithSource } from '../../../application/utils/languages';
import { useSelector } from '../../../application/legacy/discover/application/utils/state_management';
import { RootState } from '../../../application/utils/state_management/store';
import { ExploreServices } from '../../../types';

export interface QueryExecutionButtonProps {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isDisabled?: boolean;
  editorText: string;
  services: ExploreServices;
  localDateRange?: { from: string; to: string } | null;
}

/**
 * Query execution button that shows different text based on what has changed:
 * - "Update" when there are actual changes (query OR timefilter changed since last execution)
 * - "Refresh" when there are no changes (same query and time, just re-run)
 */
export const QueryExecutionButton: React.FC<QueryExecutionButtonProps> = ({
  onClick,
  isDisabled = false,
  editorText,
  services,
  localDateRange,
}) => {
  const timefilter = services?.data?.query?.timefilter?.timefilter;
  const queryStringManager = services?.data?.query?.queryString;
  const query = useSelector((state: RootState) => state.query);

  const currentTimeRange = timefilter ? timefilter.getTime() : { from: 'now-15m', to: 'now' };
  const currentQuery = getQueryWithSource(
    queryStringManager ? queryStringManager.getQuery() : { query: '', language: 'kuery' }
  );

  const localEditorQuery = getQueryWithSource({
    ...query,
    query: editorText,
  });

  const isQueryUpdated = localEditorQuery.query !== currentQuery.query;
  const isDateRangeUpdated =
    localDateRange &&
    (localDateRange.from !== currentTimeRange.from || localDateRange.to !== currentTimeRange.to);

  const isUpdated = isQueryUpdated || Boolean(isDateRangeUpdated);

  const buttonText = isUpdated
    ? i18n.translate('explore.topNav.queryExecutionButton.update', {
        defaultMessage: 'Update',
      })
    : i18n.translate('explore.topNav.queryExecutionButton.refresh', {
        defaultMessage: 'Refresh',
      });

  return (
    <EuiSuperUpdateButton
      needsUpdate={isUpdated}
      isDisabled={isDisabled}
      onClick={onClick || (() => {})}
      data-test-subj="exploreQueryExecutionButton"
      aria-label={i18n.translate('explore.topNav.queryExecutionButton.ariaLabel', {
        defaultMessage: 'Submit query: {buttonText}',
        values: { buttonText },
      })}
      compressed={true}
    >
      {buttonText}
    </EuiSuperUpdateButton>
  );
};
