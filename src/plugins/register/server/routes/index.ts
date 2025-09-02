import { IRouter, Logger } from 'opensearch-dashboards/server';
import { iamCredentialsRoute } from './iam_credentials';
import { opensearchApplicationRoute } from './opensearch_application';
import { saasInstanceRoute } from './saas_instance';

export function defineRoutes(router: IRouter, logger: Logger) {
  iamCredentialsRoute(router, logger);
  opensearchApplicationRoute(router, logger);
  saasInstanceRoute(router, logger);
}