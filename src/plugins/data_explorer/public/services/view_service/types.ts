/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Slice } from '@reduxjs/toolkit';
import { LazyExoticComponent } from 'react';
import { AppMountParameters } from '../../../../../core/public';

interface ViewListItem {
  id: string;
  label: string;
}

export type ViewProps = AppMountParameters;

export interface ViewDefinition<T = any> {
  readonly id: string;
  readonly title: string;
  readonly ui?: {
    defaults: T | (() => T) | (() => Promise<T>);
    slices: Slice[];
  };
  readonly Canvas: LazyExoticComponent<(props: ViewProps) => React.ReactElement>;
  readonly Panel: LazyExoticComponent<(props: ViewProps) => React.ReactElement>;
  readonly Context: LazyExoticComponent<
    (props: React.PropsWithChildren<ViewProps>) => React.ReactElement
  >;
  readonly defaultPath: string;
  readonly appExtentions: {
    savedObject: {
      docTypes: [string];
      toListItem: (obj: { id: string; title: string }) => ViewListItem;
    };
  };
  readonly shouldShow?: (state: any) => boolean;
}
