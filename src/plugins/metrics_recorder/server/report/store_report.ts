import { ReportSchemaType } from './schema';
import { MetricsRecorder, RecordCountOption } from '../types';
import { OpenSearchDashboardsRequest } from 'src/core/server';

export async function storeReport(
  metricsRecorder: MetricsRecorder,
  report: ReportSchemaType,
  req: OpenSearchDashboardsRequest
) {
  const uiStatsMetrics = report.uiStatsMetrics ? Object.entries(report.uiStatsMetrics) : [];
  const timestamp = new Date();
  let metrics: RecordCountOption[] = [];
  uiStatsMetrics.forEach(([key, metric]) => {
    const { appName, eventName, stats } = metric;
    metrics.push({
      appName,
      metricName: eventName,
      count: stats.sum,
      timestamp,
      attributes: {
        applicationId: req.headers['x-amzn-aosd-app-id'] as string || ''
      }
    });
  });
  if (metrics.length > 0) {
    metricsRecorder.recordCount(metrics);
  }
}
