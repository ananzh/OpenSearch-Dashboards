/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { TypedUseSelectorHook } from 'react-redux';
import {
  AppDispatch,
  RootState,
  MetadataState,
  setIndexPattern as updateIndexPattern,
  useTypedDispatch,
  useTypedSelector,
} from '../../../../../data_explorer/public';
import {
  setState as setEditorState,
  slice as editorSlice,
  EditorState,
  getPreloadedState as getEditorSlicePreloadedState,
} from './editor_slice';
import {
  setState as setStyleState,
  styleSlice,
  StyleState,
  getPreloadedState as getStyleSlicePreloadedState,
} from './style_slice';
import {
  setState as setUIStateState,
  uiStateSlice,
  UIStateState,
  getPreloadedState as getUiStateSlicePreloadedState,
} from './ui_state_slice';
import {
  setState as setVisualizationState,
  slice as visualizationSlice,
  VisualizationState,
  getPreloadedState as getVisualizationSlicePreloadedState,
} from './visualization_slice';

export * from './handlers';
export * from './shared_actions';

export interface VisBuilderRootState extends RootState {
  vbEditor: EditorState;
  vbStyle: StyleState;
  vbUi: UIStateState;
  vbVisualization: VisualizationState;
}

export const useSelector: TypedUseSelectorHook<VisBuilderRootState> = useTypedSelector;
export const useDispatch = useTypedDispatch;
export {
  editorSlice,
  styleSlice,
  uiStateSlice,
  visualizationSlice,
  getEditorSlicePreloadedState,
  getStyleSlicePreloadedState,
  getUiStateSlicePreloadedState,
  getVisualizationSlicePreloadedState,
  EditorState,
  StyleState,
  UIStateState,
  VisualizationState,
  setEditorState,
  setStyleState,
  setVisualizationState,
  setUIStateState,
};
export { updateIndexPattern, AppDispatch, MetadataState };

export type RenderState = Pick<
  VisBuilderRootState,
  'vbStyle' | 'vbUi' | 'vbVisualization' | 'metadata'
>;
