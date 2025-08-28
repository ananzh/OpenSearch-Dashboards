import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from 'opensearch-dashboards/public';
import { i18n } from '@osd/i18n';
 
export interface RegisterPluginSetup {}
export interface RegisterPluginStart {}
 
export class RegisterPlugin implements Plugin<RegisterPluginSetup, RegisterPluginStart> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}
 
  public setup(core: CoreSetup): RegisterPluginSetup {
    core.application.register({
      id: 'register',
      title: i18n.translate('register.appTitle', {
        defaultMessage: 'AWS Account Registration',
      }),
      appRoute: '/app/register/awsaccount',
      chromeless: true,
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        return renderApp(coreStart, params);
      },
    });
    return {};
  }
 
  public start(core: CoreStart): RegisterPluginStart {
    return {};
  }
 
  public stop() {}
}