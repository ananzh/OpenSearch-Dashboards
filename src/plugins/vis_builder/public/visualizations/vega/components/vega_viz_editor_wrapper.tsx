import React from 'react';
import { useTypedSelector, useTypedDispatch, setStyleState } from '../../../application/utils/state_management';
import { VegaVisEditor as OriginalVegaVisEditor, getDefaultSpec } from '../../../../../vis_type_vega/public';

const VegaVisEditorWrapper = () => {
  const styleState = useTypedSelector((state) => state.style);
  const dispatch = useTypedDispatch();

  if (!styleState.spec) {
    dispatch(setStyleState({ ...styleState, spec: getDefaultSpec() }));
  }

  const setValue = (paramName: string, value: any) => {
    dispatch(setStyleState({ ...styleState, [paramName]: value }));
  };

  return <OriginalVegaVisEditor stateParams={styleState} setValue={setValue} />;
};

export default VegaVisEditorWrapper;
