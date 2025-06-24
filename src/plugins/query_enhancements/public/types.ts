/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-expect-error TS6192 TODO(ts-error): fixme
import { CoreSetup, CoreStart } from 'opensearch-dashboards/public';
import { DataSourcePluginStart } from 'src/plugins/data_source/public';
import { UiActionsStart } from 'src/plugins/ui_actions/public';
import { BehaviorSubject } from 'rxjs';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../data/public';
import { MetricsRecorderSetup } from '../../metrics_recorder/public';

export interface QueryEnhancementsPluginSetup {
  isQuerySummaryCollapsed$: BehaviorSubject<boolean>;
  resultSummaryEnabled$: BehaviorSubject<boolean>;
  isSummaryAgentAvailable$: BehaviorSubject<boolean>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface QueryEnhancementsPluginStart {}

export interface QueryEnhancementsPluginSetupDependencies {
  data: DataPublicPluginSetup;
  metricsRecorder?: MetricsRecorderSetup;
}

export interface QueryEnhancementsPluginStartDependencies {
  data: DataPublicPluginStart;
  dataSource?: DataSourcePluginStart;
  uiActions: UiActionsStart;
}

export interface Connection {
  dataSource: {
    id: string;
    title: string;
    endpoint?: string;
    installedPlugins?: string[];
    auth?: any;
  };
}
