import { first } from 'rxjs/operators';
import {
  PluginInitializerContext,
  Logger,
  CoreSetup,
  CoreStart,
  Plugin,
} from 'opensearch-dashboards/server';
import { ConfigType } from './config';
import { setupRoutes } from './routes';
import { MetricsRecorder, MetricsRecorderFactory } from './types';

export interface MetricsRecorderSetup {
  setMetricsRecorderFactory: (factory: MetricsRecorderFactory) => void,
};

export interface MetricsRecorderStart {
  getMetricsRecorder: () => MetricsRecorder;
}

export class MetricsRecorderPlugin implements Plugin<MetricsRecorderSetup, MetricsRecorderStart> {
  private readonly logger: Logger;
  private metricsRecorderFactory?: MetricsRecorderFactory;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup) {
    const config = await this.initializerContext.config
      .create<ConfigType>()
      .pipe(first())
      .toPromise();

    const globalConfig = await this.initializerContext.config.legacy.globalConfig$
      .pipe(first())
      .toPromise();

    const router = core.http.createRouter();
    setupRoutes({
      router,
      logger: this.logger,
      getMetricsRecorder: () => {
        if (!this.metricsRecorderFactory) {
          throw new Error('Metrics recorder factory not set');
        }
        return this.metricsRecorderFactory();
      },
      config: {
        allowAnonymous: core.status.isStatusPageAnonymous(),
        opensearchDashboardsIndex: globalConfig.opensearchDashboards.index,
        opensearchDashboardsVersion: this.initializerContext.env.packageInfo.version,
        server: core.http.getServerInfo(),
        uuid: this.initializerContext.env.instanceUuid,
        batchingInterval: config.record.batchingIntervalInS,
      },
      metrics: core.metrics,
      overallStatus$: core.status.overall$,
    });

    return {
      setMetricsRecorderFactory: (factory: MetricsRecorderFactory) => {
        if (this.metricsRecorderFactory) {
          this.logger.error('Metrics recorder factory is already set');
          return;
        }
        this.metricsRecorderFactory = factory;
      },
    };
  }

  public start({ }: CoreStart) {
    return {
      getMetricsRecorder: () => {
        if (!this.metricsRecorderFactory) {
          throw new Error('Metrics recorder factory not set');
        }
        return this.metricsRecorderFactory();
      },
    }
  }

  public stop() {
    this.logger.debug('Stopping plugin');
  }
}
