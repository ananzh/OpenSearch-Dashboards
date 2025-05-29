/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { History } from 'history';
import {
  Capabilities,
  ChromeStart,
  CoreStart,
  DocLinksStart,
  ToastsStart,
  IUiSettingsClient,
  PluginInitializerContext,
} from 'opensearch-dashboards/public';
import { IndexPatternsContract, DataPublicPluginStart } from 'src/plugins/data/public';
import { Start as InspectorPublicPluginStart } from 'src/plugins/inspector/public';
import { SharePluginStart } from 'src/plugins/share/public';
import { ChartsPluginStart } from 'src/plugins/charts/public';
import { UiActionsStart } from 'src/plugins/ui_actions/public';
import { VisualizationsStart } from 'src/plugins/visualizations/public';
import { SavedObjectOpenSearchDashboardsServices } from 'src/plugins/saved_objects/public';
import { OpenSearchDashboardsLegacyStart } from '../../opensearch_dashboards_legacy/public';
import { UrlForwardingStart } from '../../url_forwarding/public';
import { NavigationPublicPluginStart } from '../../navigation/public';
import { Storage } from '../../opensearch_dashboards_utils/public';

import { ExploreStartDependencies } from './types';
import { createSavedExploreLoader, SavedExplore } from './saved_explore';
import { getHistory } from './application/legacy/discover/opensearch_dashboards_services';
import { TabRegistryService } from './services/tab_registry/tab_registry_service';

export interface ExploreServices {
  addBasePath: (path: string) => string;
  capabilities: Capabilities;
  chrome: ChromeStart;
  core: CoreStart;
  data: DataPublicPluginStart;
  docLinks: DocLinksStart;
  history: () => History;
  theme: ChartsPluginStart['theme'];
  indexPatterns: IndexPatternsContract;
  inspector: InspectorPublicPluginStart;
  metadata: { branch: string };
  navigation: NavigationPublicPluginStart;
  share?: SharePluginStart;
  opensearchDashboardsLegacy: OpenSearchDashboardsLegacyStart;
  urlForwarding: UrlForwardingStart;
  toastNotifications: ToastsStart;
  getSavedExploreById: (id?: string) => Promise<SavedExplore>;
  getSavedExploreUrlById: (id: string) => Promise<string>;
  uiSettings: IUiSettingsClient;
  visualizations: VisualizationsStart;
  storage: Storage;
  uiActions: UiActionsStart;
  tabRegistry: TabRegistryService;
  // Note: We don't include filterManager and timefilter since explore uses Redux
}

export function buildServices(
  core: CoreStart,
  plugins: ExploreStartDependencies,
  context: PluginInitializerContext,
  tabRegistry: TabRegistryService
): ExploreServices {
  const services: SavedObjectOpenSearchDashboardsServices = {
    savedObjectsClient: core.savedObjects.client,
    indexPatterns: plugins.data.indexPatterns,
    search: plugins.data.search,
    chrome: core.chrome,
    overlays: core.overlays,
  };
  const savedObjectService = createSavedExploreLoader(services);
  const storage = new Storage(localStorage);

  return {
    addBasePath: core.http.basePath.prepend,
    capabilities: core.application.capabilities,
    chrome: core.chrome,
    core,
    data: plugins.data,
    docLinks: core.docLinks,
    theme: plugins.charts.theme,
    getSavedExploreById: async (id?: string) => savedObjectService.get(id),
    getSavedExploreUrlById: async (id: string) => savedObjectService.urlFor(id),
    history: getHistory,
    indexPatterns: plugins.data.indexPatterns,
    inspector: plugins.inspector,
    metadata: {
      branch: context.env.packageInfo.branch,
    },
    navigation: plugins.navigation,
    share: plugins.share,
    opensearchDashboardsLegacy: plugins.opensearchDashboardsLegacy,
    urlForwarding: plugins.urlForwarding,
    toastNotifications: core.notifications.toasts,
    uiSettings: core.uiSettings,
    visualizations: plugins.visualizations,
    storage,
    uiActions: plugins.uiActions,
    tabRegistry,
  };
}
