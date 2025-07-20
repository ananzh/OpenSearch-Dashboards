/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SaveQueryButton } from './save_query';
import { FilterPanelToggle } from './filter_panel_toggle';
import { RecentQueriesButton } from './recent_queries_button';
import { DetectedLanguage } from './detected_language';
import { QueryPanelError } from './query_panel_error';
import './query_panel_footer.scss';

export const QueryPanelFooter = () => {
  return (
    <div className="exploreQueryPanelFooter">
      {/* Left Section */}
      <div className="exploreQueryPanelFooter__left">
        <FilterPanelToggle />
        <div className="exploreQueryPanelFooter__verticalSeparator" />
        <RecentQueriesButton />
        <div className="exploreQueryPanelFooter__verticalSeparator" />
        <SaveQueryButton />
        <div className="exploreQueryPanelFooter__verticalSeparator" />
        <DetectedLanguage />
        <QueryPanelError />
      </div>
    </div>
  );
};
