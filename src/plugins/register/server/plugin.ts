import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from 'opensearch-dashboards/server';
import { RegisterServerPluginSetup, RegisterServerPluginStart } from './types';
import { defineRoutes } from './routes';

export class RegisterServerPlugin
  implements Plugin<RegisterServerPluginSetup, RegisterServerPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('register: Setup');
    
    const router = core.http.createRouter();
    defineRoutes(router, this.logger);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('register: Started');
    return {};
  }

  public stop() {}
}