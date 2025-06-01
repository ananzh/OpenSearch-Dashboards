/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { AppMountParameters } from 'opensearch-dashboards/public';
import { Query, TimeRange } from '../../../../../../../../data/common';
import {
  useConnectStorageToQueryState,
  opensearchFilters,
  QueryStatus,
  useSyncQueryStateWithUrl,
} from '../../../../../../../../data/public';
import { createOsdUrlStateStorage } from '../../../../../../../../opensearch_dashboards_utils/public';
import { useOpenSearchDashboards } from '../../../../../../../../opensearch_dashboards_react/public';
import { RequestAdapter } from '../../../../../../../../inspector/public';
import { PLUGIN_ID } from '../../../../../../../common';
import { ExploreServices } from '../../../../../../types';
import { IndexPattern } from '../../../opensearch_dashboards_services';
import { getTopNavLinks } from '../../components/top_nav/get_top_nav_links';
import { getRootBreadcrumbs } from '../../helpers/breadcrumbs';
import { useDispatch, setSavedQuery, useSelector } from '../../utils/state_management';

import './discover_canvas.scss';
import { TopNavMenuItemRenderType } from '../../../../../../../../navigation/public';
import { ResultStatus } from '../utils';

export interface TopNavProps {
  opts: {
    setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
    onQuerySubmit: (payload: { dateRange: TimeRange; query?: Query }, isUpdate?: boolean) => void;
    optionalRef?: Record<string, React.RefObject<HTMLDivElement>>;
  };
  showSaveQuery: boolean;
  isEnhancementsEnabled?: boolean;
}

export const TopNav = ({ opts, showSaveQuery, isEnhancementsEnabled }: TopNavProps) => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const dispatch = useDispatch();

  const queryState = useSelector((state: any) => state.query);
  const legacyState = useSelector((state: any) => state.legacy);
  const isLoading = useSelector((state: any) => state.ui.isLoading);
  const error = useSelector((state: any) => state.ui.error);

  // Replace inspectorAdapters
  const inspectorAdapters = useMemo(() => ({ requests: new RequestAdapter() }), []);

  // Replace savedSearch - use legacy state
  const savedSearch = useMemo(() => {
    return legacyState.savedSearch;
  }, [legacyState.savedSearch]);

  // Replace indexPattern - get from query state
  const indexPattern = queryState.dataset;
  const [indexPatterns, setIndexPatterns] = useState<IndexPattern[] | undefined>(undefined);
  const [screenTitle, setScreenTitle] = useState<string>('');
  const [queryStatus, setQueryStatus] = useState<QueryStatus>({ status: ResultStatus.READY });

  const {
    navigation: {
      ui: { TopNavMenu },
    },
    core: {
      application: { getUrlForApp },
    },
    data,
    chrome,
    storage,
    uiSettings,
    history,
  } = services;

  // Create osdUrlStateStorage from storage
  const osdUrlStateStorage = useMemo(() => {
    return createOsdUrlStateStorage({
      useHash: uiSettings.get('state:storeInSessionStorage', false),
      history: history(),
    });
  }, [uiSettings, history]);

  const { startSyncingQueryStateWithUrl } = useSyncQueryStateWithUrl(
    data.query,
    osdUrlStateStorage
  );
  const showActionsInGroup = uiSettings.get('home:useNewHomePage', false);

  const topNavLinks = getTopNavLinks(
    services,
    inspectorAdapters,
    savedSearch || ({} as any), // Provide empty object if savedSearch is null
    startSyncingQueryStateWithUrl,
    isEnhancementsEnabled
  );

  const syncConfig = useMemo(() => {
    return {
      filters: opensearchFilters.FilterStateStore.APP_STATE,
      query: true,
    };
  }, []);

  useConnectStorageToQueryState(services.data.query, osdUrlStateStorage, syncConfig);

  // Replace data$ subscription with Redux state-based queryStatus
  useEffect(() => {
    const status = isLoading
      ? ResultStatus.LOADING
      : error
      ? ResultStatus.ERROR
      : ResultStatus.READY;
    setQueryStatus({ status });
  }, [isLoading, error]);

  useEffect(() => {
    let isMounted = true;
    const initializeDataset = async () => {
      await data.indexPatterns.ensureDefaultIndexPattern();
      const defaultIndexPattern = await data.indexPatterns.getDefault();
      if (!isMounted) return;

      setIndexPatterns(defaultIndexPattern ? [defaultIndexPattern] : undefined);
    };

    initializeDataset();

    return () => {
      isMounted = false;
    };
  }, [data.indexPatterns, data.query]);

  useEffect(() => {
    // Set page title to "Explore" instead of "Discover"
    chrome.docTitle.change('Explore');

    // Set breadcrumbs to show "Explore"
    chrome.setBreadcrumbs([
      {
        text: 'Explore',
        href: '#/',
      },
    ]);
  }, [chrome]);

  useEffect(() => {
    setScreenTitle(
      savedSearch?.title ||
        i18n.translate('explore.discover.savedSearch.newTitle', {
          defaultMessage: 'New search',
        })
    );
  }, [savedSearch?.title]);

  const showDatePicker = useMemo(() => (indexPattern ? indexPattern.isTimeBased() : false), [
    indexPattern,
  ]);

  const updateSavedQueryId = (newSavedQueryId: string | undefined) => {
    dispatch(setSavedQuery(newSavedQueryId));
  };

  const displayToNavLinkInPortal =
    isEnhancementsEnabled && !!opts?.optionalRef?.topLinkRef?.current && !showActionsInGroup;

  return (
    <>
      {displayToNavLinkInPortal &&
        opts.optionalRef?.topLinkRef?.current &&
        createPortal(
          <EuiFlexGroup gutterSize="m">
            {topNavLinks.map((topNavLink, index) => (
              <EuiFlexItem
                grow={false}
                key={('id' in topNavLink ? topNavLink.id : undefined) || index}
              >
                <EuiToolTip
                  position="bottom"
                  content={('label' in topNavLink ? topNavLink.label : undefined) || ''}
                >
                  <EuiButtonIcon
                    onClick={(event: React.MouseEvent) => {
                      if (topNavLink.run) {
                        // Handle different run function signatures
                        if ('checked' in topNavLink) {
                          // TopNavMenuSwitchAction expects (element, checked)
                          const checked =
                            typeof topNavLink.checked === 'function'
                              ? topNavLink.checked()
                              : topNavLink.checked;
                          (topNavLink.run as any)(event.currentTarget as HTMLElement, checked);
                        } else {
                          // TopNavMenuAction or TopNavMenuClickAction expects just (element)
                          (topNavLink.run as any)(event.currentTarget as HTMLElement);
                        }
                      }
                    }}
                    iconType={
                      ('iconType' in topNavLink ? topNavLink.iconType : undefined) || 'apps'
                    }
                    aria-label={
                      ('ariaLabel' in topNavLink ? topNavLink.ariaLabel : undefined) || ''
                    }
                  />
                </EuiToolTip>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>,
          opts.optionalRef.topLinkRef.current
        )}
      <TopNavMenu
        appName={PLUGIN_ID}
        config={topNavLinks}
        showSearchBar={false}
        showDatePicker={false}
        showSaveQuery={showSaveQuery}
        useDefaultBehaviors
        setMenuMountPoint={opts.setHeaderActionMenu}
        indexPatterns={indexPattern ? [indexPattern] : indexPatterns}
        onQuerySubmit={opts.onQuerySubmit}
        savedQueryId={legacyState.savedQuery}
        onSavedQueryIdChange={updateSavedQueryId}
        datasetSelectorRef={opts?.optionalRef?.datasetSelectorRef}
        datePickerRef={opts?.optionalRef?.datePickerRef}
        groupActions={showActionsInGroup}
        screenTitle="Explore"
        queryStatus={queryStatus}
        showQueryBar={true}
      />
    </>
  );
};
