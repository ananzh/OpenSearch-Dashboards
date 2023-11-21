/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { useEffect, useState } from 'react';
import { SavedObject } from '../../../../../saved_objects/public';
import {
  InvalidJSONProperty,
  redirectWhenMissing,
  SavedObjectNotFound,
} from '../../../../../opensearch_dashboards_utils/public';
import { EDIT_PATH, PLUGIN_ID } from '../../../../common';
import { VisBuilderViewServices } from '../../../types';
import { getCreateBreadcrumbs, getEditBreadcrumbs } from '../breadcrumbs';
import {
  useDispatch,
  setStyleState,
  setVisualizationState,
  setUIStateState,
} from '../state_management';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { setStatus } from '../state_management/editor_slice';
import { getStateFromSavedObject } from '../../../saved_visualizations/transforms';

// This function can be used when instantiating a saved vis or creating a new one
// using url parameters, embedding and destroying it in DOM
export const useSavedVisBuilderVis = (visualizationIdFromUrl: string | undefined) => {
  const { services } = useOpenSearchDashboards<VisBuilderViewServices>();
  const [savedVisState, setSavedVisState] = useState<SavedObject | undefined>(undefined);
  const dispatch = useDispatch();

  useEffect(() => {
    const {
      application: { navigateToApp },
      chrome,
      history,
      http: { basePath },
      toastNotifications,
      savedVisBuilderLoader,
    } = services;
    const toastNotification = (message: string) => {
      toastNotifications.addDanger({
        title: i18n.translate('visualize.createVisualization.failedToLoadErrorMessage', {
          defaultMessage: 'Failed to load the visualization',
        }),
        text: message,
      });
    };

    const loadSavedVisBuilderVis = async () => {
      try {
        dispatch(setStatus({ status: 'loading' }));
        const savedVisBuilderVis = await getSavedVisBuilderVis(
          savedVisBuilderLoader,
          visualizationIdFromUrl
        );

        if (savedVisBuilderVis.id) {
          const { title, state } = getStateFromSavedObject(savedVisBuilderVis);
          chrome.setBreadcrumbs(getEditBreadcrumbs(title, navigateToApp));
          chrome.docTitle.change(title);

          dispatch(setUIStateState(state.ui));
          dispatch(setStyleState(state.style));
          dispatch(setVisualizationState(state.visualization));
          dispatch(setStatus({ status: 'loaded' }));
        } else {
          chrome.setBreadcrumbs(getCreateBreadcrumbs(navigateToApp));
        }

        setSavedVisState(savedVisBuilderVis);
        dispatch(setStatus({ status: 'clean' }));
      } catch (error) {
        const managementRedirectTarget = {
          [PLUGIN_ID]: {
            app: 'management',
            path: `opensearch-dashboards/objects/savedVisBuilder/${visualizationIdFromUrl}`,
          },
        };

        try {
          if (error instanceof SavedObjectNotFound) {
            redirectWhenMissing({
              history,
              navigateToApp,
              toastNotifications,
              basePath,
              mapping: managementRedirectTarget,
            })(error);
          }
          if (error instanceof InvalidJSONProperty) {
            toastNotification(error.message);
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : '';
          toastNotification(message);
          history.replace(EDIT_PATH);
        }
      }
    };

    loadSavedVisBuilderVis();
  }, [dispatch, services, visualizationIdFromUrl]);

  return savedVisState;
};

async function getSavedVisBuilderVis(
  savedVisBuilderLoader: VisBuilderServices['savedVisBuilderLoader'],
  visBuilderVisId?: string
) {
  const savedVisBuilderVis = await savedVisBuilderLoader.get(visBuilderVisId);

  return savedVisBuilderVis;
}
