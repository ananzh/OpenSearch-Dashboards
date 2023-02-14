/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { VisBuilderServices } from '../..';
//import { VisBuilderEmbeddable, createFromSavedObject } from './../../embeddable';

export const getSavedVisBuilderVis = async (
  services: VisBuilderServices,
  visBuilderVisId?: string
) => {
  const { savedVisBuilderLoader, embeddable } = services;
  if (!savedVisBuilderLoader) {
    return {};
  }
  const savedVisBuilderVis = await savedVisBuilderLoader.get(visBuilderVisId);
  //const embeddable_factory =  embeddable.getEmbeddableFactory;
  //const embeddableHandler = embeddable_factory[''];

  //return {embeddableHandler, savedVisBuilderVis};
  return {savedVisBuilderVis};
};
