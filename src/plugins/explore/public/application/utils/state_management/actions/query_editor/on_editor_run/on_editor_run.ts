/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { ExploreServices } from '../../../../../../types';
import { AppDispatch, RootState } from '../../../store';
import { EditorMode } from '../../../types';
import { callAgentActionCreator } from './call_agent';
import { runQueryActionCreator } from '../run_query';
import { clearLastExecutedData } from '../../../slices';

// This is used when user submits a query or a prompt. This called runQueryActionCreator under the hood
export const onEditorRunActionCreator = (
  services: ExploreServices,
  editorText: string,
  isUpdate?: boolean
) => (dispatch: AppDispatch, getState: () => RootState) => {
  const {
    queryEditor: { editorMode, promptModeIsAvailable, isQueryExecutionDisabled },
  } = getState();

  if (isQueryExecutionDisabled) return;
  dispatch(clearLastExecutedData());

  if (editorMode === EditorMode.Prompt) {
    // Handle the unlikely situation where user is on prompt mode but does not have prompt available
    if (!promptModeIsAvailable) {
      services.notifications.toasts.addWarning({
        title: i18n.translate('explore.queryPanel.queryAssist-not-available-title', {
          defaultMessage: 'Unavailable',
        }),
        text: i18n.translate('explore.queryPanel.queryAssist-not-available-text', {
          defaultMessage: 'Query assist feature is not enabled or configured.',
        }),
        id: 'queryAssist-not-available',
      });
      return;
    }

    dispatch(callAgentActionCreator({ services, editorText, isUpdate }));
  } else {
    dispatch(runQueryActionCreator({ services, query: editorText, isUpdate }));
  }
};
