import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, AppMountParameters } from 'opensearch-dashboards/public';
import { RegisterApp } from './register_app';
import { JsonDisplay } from '../components/json_display';
import { RegisterApiService } from '../services/api';
 
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

export const renderJsonApp = (
  core: CoreStart,
  { element }: AppMountParameters
) => {
  const api = new RegisterApiService(core.http);
  ReactDOM.render(
    React.createElement(JsonDisplay, { api }),
    element
  );
  
  return () => ReactDOM.unmountComponentAtNode(element);
};