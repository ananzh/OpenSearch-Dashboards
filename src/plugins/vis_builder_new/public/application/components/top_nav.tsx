/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useUnmount } from 'react-use';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';
import { getTopNavConfig } from '../utils/get_top_nav_config';
import { VisBuilderViewServices } from '../../types';

import './top_nav.scss';
import { useIndexPattern, useSavedVisBuilderVis } from '../utils/use';
import { useSelector, useDispatch } from '../utils/state_management';
import { setStatus } from '../utils/state_management/editor_slice';
import { useCanSave } from '../utils/use/use_can_save';
import { saveStateToSavedObject } from '../../saved_visualizations/transforms';
import { TopNavMenuData } from '../../../../navigation/public';
import { opensearchFilters, connectStorageToQueryState } from '../../../../data/public';
import { AppMountParameters } from '../../../../../core/public';

export const TopNav = ({
  setHeaderActionMenu,
}: {
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}) => {
  // id will only be set for the edit route
  const { id: visualizationIdFromUrl } = useParams<{ id: string }>();
  const { services } = useOpenSearchDashboards<VisBuilderViewServices>();
  const {
    navigation: {
      ui: { TopNavMenu },
    },
    appName,
  } = services;
  const rootState = useSelector((state) => state);
  const dispatch = useDispatch();

  const saveDisabledReason = useCanSave();
  const savedVisBuilderVis = useSavedVisBuilderVis(visualizationIdFromUrl);
  connectStorageToQueryState(services.data.query, services.osdUrlStateStorage, {
    filters: opensearchFilters.FilterStateStore.APP_STATE,
    query: true,
  });
  const indexPattern = useIndexPattern(services);
  const [config, setConfig] = useState<TopNavMenuData[] | undefined>();
  const originatingApp = useSelector((state) => {
    return state.metadata.originatingApp;
  });

  useEffect(() => {
    const getConfig = () => {
      if (!savedVisBuilderVis || !indexPattern) return;

      return getTopNavConfig(
        {
          visualizationIdFromUrl,
          savedVisBuilderVis: saveStateToSavedObject(savedVisBuilderVis, rootState, indexPattern),
          saveDisabledReason,
          dispatch,
          originatingApp,
        },
        services
      );
    };

    setConfig(getConfig());
  }, [
    rootState,
    savedVisBuilderVis,
    services,
    visualizationIdFromUrl,
    saveDisabledReason,
    dispatch,
    indexPattern,
    originatingApp,
  ]);

  // reset validity before component destroyed
  useUnmount(() => {
    dispatch(setStatus({ status: 'loading' }));
  });

  return (
    <div className="vbTopNav">
      <TopNavMenu
        appName={appName}
        config={config}
        setMenuMountPoint={setHeaderActionMenu}
        indexPatterns={indexPattern ? [indexPattern] : []}
        showDatePicker={!!indexPattern?.timeFieldName ?? true}
        showSearchBar
        showSaveQuery
        useDefaultBehaviors
      />
    </div>
  );
};
