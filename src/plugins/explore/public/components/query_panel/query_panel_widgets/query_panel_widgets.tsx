/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SaveQueryButton } from './save_query';
import { FilterPanelToggle } from './filter_panel_toggle';
import { RecentQueriesButton } from './recent_queries_button';
import { SelectedLanguage } from './selected_language';
import { QueryPanelError } from './query_panel_error';
import { LanguageToggle } from './language_toggle';
import './query_panel_widgets.scss';

export const QueryPanelWidgets = () => {
  return (
    <div className="exploreQueryPanelWidgets">
      {/* Left Section */}
      <div className="exploreQueryPanelWidgets__left">
        <FilterPanelToggle />
        <div className="exploreQueryPanelWidgets__verticalSeparator" />
        <RecentQueriesButton />
        <div className="exploreQueryPanelWidgets__verticalSeparator" />
        <SaveQueryButton />
        <div className="exploreQueryPanelWidgets__verticalSeparator" />
        {/* TODO: Actions should go here */}
        <QueryPanelError />
        {/* Right Section */}
        <div className="exploreQueryPanelWidgets__right">
          <SelectedLanguage />
          <LanguageToggle />
        </div>
      </div>
    </div>
  );
};
