/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TypedUseSelectorHook,
  useDispatch as useReduxDispatch,
  useSelector as useReduxSelector,
} from 'react-redux';
import { RootState } from '../../../../../utils/state_management/store';
import { setDataset } from '../../../../../utils/state_management/slices/query_slice';
import { DiscoverState } from './discover_slice';

export * from './discover_slice';

export interface DiscoverRootState extends RootState {
  logs: DiscoverState;
}

export const useSelector: TypedUseSelectorHook<DiscoverRootState> = useReduxSelector;
export const useDispatch = useReduxDispatch;
export const updateIndexPattern = setDataset;
