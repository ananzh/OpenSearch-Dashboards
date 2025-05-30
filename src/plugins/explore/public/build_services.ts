/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoreStart, PluginInitializerContext } from 'opensearch-dashboards/public';
import { SavedObjectOpenSearchDashboardsServices } from 'src/plugins/saved_objects/public';
import { Storage } from '../../opensearch_dashboards_utils/public';

import { ExploreStartDependencies, ExploreServices } from './types';
import { createSavedExploreLoader, SavedExplore } from './saved_explore';
import { getHistory } from './application/legacy/discover/opensearch_dashboards_services';
import { TabRegistryService } from './services/tab_registry/tab_registry_service';

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
    filterManager: plugins.data.query.filterManager,
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
    timefilter: plugins.data.query.timefilter.timefilter,
    toastNotifications: core.notifications.toasts,
    uiSettings: core.uiSettings,
    visualizations: plugins.visualizations,
    storage,
    uiActions: plugins.uiActions,
    tabRegistry,
    overlays: core.overlays,
  };
}
