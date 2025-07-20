/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppDispatch } from '../../../store';
import { clearResults, setQueryStringWithHistory, setActiveTab } from '../../../slices';
import { clearQueryStatusMap } from '../../../slices/query_editor/query_editor_slice';
import { executeQueries } from '../../query_actions';
import { ExploreServices } from '../../../../../../types';
import { detectAndSetOptimalTab } from '../../detect_optimal_tab';

export interface RunQueryActionCreatorParams {
  services: ExploreServices;
  query?: string;
  isUpdate?: boolean;
}

/**
 * This is called when you want to run the query
 */
export const runQueryActionCreator = ({
  services,
  query,
  isUpdate = false,
}: RunQueryActionCreatorParams) => async (dispatch: AppDispatch) => {
  if (typeof query === 'string') {
    dispatch(setQueryStringWithHistory(query));
  }
  dispatch(clearResults());
  dispatch(clearQueryStatusMap());

  await dispatch(executeQueries({ services }));

  // Only detect and set optimal tab for update
  if (isUpdate) {
    dispatch(setActiveTab(''));
    dispatch(detectAndSetOptimalTab({ services }));
  }
};
