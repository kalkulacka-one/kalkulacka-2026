import { registerOTel } from '@vercel/otel';

const name = process.env.APPSIGNAL_NAME;
const environment = process.env.APPSIGNAL_ENVIRONMENT;
const pushApiKey = process.env.APPSIGNAL_PUSH_API_KEY;
const revision =
  process.env.VERCEL_GIT_COMMIT_SHA && process.env.VERCEL_GIT_COMMIT_SHA.trim() !== ''
    ? process.env.VERCEL_GIT_COMMIT_SHA
    : 'development';

/**
 * Server-side error and performance monitoring, routed through OpenTelemetry
 * rather than an AppSignal-specific package — `@vercel/otel` has no Next.js
 * version coupling and no native agent to install, it just needs somewhere to
 * send spans. `OTEL_EXPORTER_OTLP_ENDPOINT` (unset here, deployment-specific)
 * is what actually points that at AppSignal's collector; the three `APPSIGNAL_*`
 * vars below only *label* what's sent, so all four have to be present for this
 * to do anything. Missing any one of them and `register()` no-ops — zero env,
 * zero telemetry, same rule as the client-side analytics and monitoring.
 */
export function register() {
  if (name && environment && pushApiKey) {
    registerOTel({
      serviceName: name,
      attributes: {
        'appsignal.config.name': name,
        'appsignal.config.environment': environment,
        'appsignal.config.revision': revision,
        'appsignal.config.language_integration': 'nodejs',
        'appsignal.config.push_api_key': pushApiKey,
        'host.name': 'vercel',
      },
    });
  }
}
