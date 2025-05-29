/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChartsPluginStart } from 'src/plugins/charts/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from 'src/plugins/data/public';
import { EmbeddableSetup, EmbeddableStart } from 'src/plugins/embeddable/public';
import { HomePublicPluginSetup } from 'src/plugins/home/public';
import { Start as InspectorPublicPluginStart } from 'src/plugins/inspector/public';
import {
  OpenSearchDashboardsLegacySetup,
  OpenSearchDashboardsLegacyStart,
} from 'src/plugins/opensearch_dashboards_legacy/public';
import { SharePluginSetup, SharePluginStart } from 'src/plugins/share/public';
import { UiActionsSetup, UiActionsStart } from 'src/plugins/ui_actions/public';
import { UrlForwardingSetup, UrlForwardingStart } from 'src/plugins/url_forwarding/public';
import { VisualizationsSetup, VisualizationsStart } from 'src/plugins/visualizations/public';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { ExpressionsStart } from 'src/plugins/expressions/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../navigation/public';
import { SavedExploreLoader } from './saved_explore';

export interface ExplorePluginSetup {
  docViews: {
    addDocView: (docViewSpec: any) => void;
  };
  docViewsLinks: {
    addDocViewLink: (docViewLinkSpec: any) => void;
  };
}

export interface ExplorePluginStart {
  urlGenerator?: any;
  savedSearchLoader: SavedExploreLoader;
  savedExploreLoader: SavedExploreLoader;
}

/**
 * @internal
 */
export interface ExploreSetupDependencies {
  navigation: NavigationStart;
  share?: SharePluginSetup;
  uiActions: UiActionsSetup;
  embeddable: EmbeddableSetup;
  opensearchDashboardsLegacy: OpenSearchDashboardsLegacySetup;
  urlForwarding: UrlForwardingSetup;
  home?: HomePublicPluginSetup;
  visualizations: VisualizationsSetup;
  data: DataPublicPluginSetup;
  usageCollection: UsageCollectionSetup;
}

/**
 * @internal
 */
export interface ExploreStartDependencies {
  uiActions: UiActionsStart;
  expressions: ExpressionsStart;
  embeddable: EmbeddableStart;
  navigation: NavigationStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  share?: SharePluginStart;
  opensearchDashboardsLegacy: OpenSearchDashboardsLegacyStart;
  urlForwarding: UrlForwardingStart;
  inspector: InspectorPublicPluginStart;
  visualizations: VisualizationsStart;
}
