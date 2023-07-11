/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { History } from 'history';
import { SavedObject } from 'src/core/types/saved_objects';
import { DiscoverServices } from '../../../build_services';
import { SavedSearch } from '../../../saved_searches';
import { DiscoverCanvasApp } from './discover_canvas_app';
import { fetchIndexPattern, fetchSavedSearch } from './utils/index_pattern_helper';

export interface DiscoverCanvasProps {
  services: DiscoverServices;
  history: History;
}

export const DiscoverCanvas = ({ history, services }: DiscoverCanvasProps) => {
  const {
    core,
    chrome,
    data,
    uiSettings: config,
    toastNotifications,
    http: { basePath },
  } = services;
  const [savedSearch, setSavedSearch] = useState<SavedSearch>();
  const [indexPatternList, setIndexPatternList] = useState<Array<SavedObject<any>>>([]);
  // ToDo: get id from data explorer since it is handling the routing logic
  // Original angular code: const savedSearchId = $route.current.params.id;
  const savedSearchId = '';
  useEffect(() => {
    const fetchData = async () => {
      const indexPatternData = await fetchIndexPattern(data, config);
      setIndexPatternList(indexPatternData.list);

      const savedSearchData = await fetchSavedSearch(
        core,
        basePath,
        history,
        savedSearchId,
        services,
        toastNotifications
      );
      if (savedSearchData && !savedSearchData?.searchSource.getField('index')) {
        savedSearchData.searchSource.setField('index', indexPatternData);
      }
      setSavedSearch(savedSearchData);

      if (savedSearchId) {
        chrome.recentlyAccessed.add(
          savedSearchData.getFullPath(),
          savedSearchData.title,
          savedSearchData.id
        );
      }
    };
    fetchData();
  }, [data, config, core, chrome, toastNotifications, history, savedSearchId, services, basePath]);

  return (
    <DiscoverCanvasApp
      history={history}
      services={services}
      savedSearch={savedSearch}
      indexPatternList={indexPatternList}
    />
  );
};
