import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, AppMountParameters } from 'opensearch-dashboards/public';
import { RegisterApp } from './register_app';
 
export const renderApp = (
  core: CoreStart,
  { element }: AppMountParameters
) => {
  ReactDOM.render(
    React.createElement(RegisterApp, { core }),
    element
  );
  
  return () => ReactDOM.unmountComponentAtNode(element);
};