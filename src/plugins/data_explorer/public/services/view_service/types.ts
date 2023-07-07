/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// TODO: Correctly type this file.

interface ViewListItem {
  id: string;
  label: string;
}

export interface ViewMountParameters {
  canvasElement: HTMLDivElement;
  panelElement: HTMLDivElement;
}

export interface ViewDefinition<T = any> {
  readonly id: string;
  readonly title: string;
  readonly ui?: {
    defaults: T;
    reducer: (state: T, action: any) => T;
  };
  readonly mount: (params: ViewMountParameters) => Promise<() => void>;
  readonly defaultPath: string;
  readonly appExtentions: {
    savedObject: {
      docTypes: [string];
      toListItem: (obj: { id: string; title: string }) => ViewListItem;
    };
  };
  readonly shouldShow?: (state: any) => boolean;
}
