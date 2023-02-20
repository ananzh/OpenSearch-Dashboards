/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { PluginInitializerContext } from '../../../core/public';
import { VisBuilderPlugin } from './plugin';
import { PublicContract } from '@osd/utility-types';
import { VisBuilderEmbeddableFactoryDefinition, VisBuilderEmbeddable } from './embeddable';

// This exports static code and TypeScript types,
// as well as, OpenSearch Dashboards Platform `plugin()` initializer.
export function plugin(initializerContext: PluginInitializerContext) {
  return new VisBuilderPlugin(initializerContext);
}
export { VisBuilderServices, VisBuilderPluginStartDependencies, VisBuilderStart } from './types';
export type VisBuilderEmbeddableFactoryContract = PublicContract<VisBuilderEmbeddableFactoryDefinition>;
export type VisBuilderEmbeddableContract = PublicContract<VisBuilderEmbeddable>;
