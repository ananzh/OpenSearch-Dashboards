/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SavedObject } from 'src/core/types/saved_objects';
import { History } from 'history';
import { SearchSource } from 'src/plugins/data/common';
import { DiscoverServices } from '../../../build_services';
import { SavedSearch } from '../../../saved_searches';
import { IndexPatternData } from './utils/index_pattern_helper';

export interface DiscoverCanvasAppProps {
  services: DiscoverServices;
  history: History;
  savedSearch: SavedSearch | undefined;
  indexPatternList: Array<SavedObject<any>>;
}

export const DiscoverCanvasApp = ({
  history,
  services,
  savedSearch,
  indexPatternList,
}: DiscoverCanvasAppProps) => {
  if (savedSearch && savedSearch.searchSource) {
    const ip = (savedSearch.searchSource as SearchSource).getField('index') as IndexPatternData;
    return <div>{ip.loaded.id}</div>;
  }
  return <div>{'DiscoverCanvasApp'}</div>;
};
