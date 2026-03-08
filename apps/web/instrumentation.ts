import * as Sentry from "@sentry/nextjs";
import { IS_PRODUCTION, PROMETHEUS_ENABLED, SENTRY_DSN } from "@/lib/constants";

export const onRequestError = Sentry.captureRequestError;

export const register = async () => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (PROMETHEUS_ENABLED) {
      await import("./instrumentation-node");
    }
    // Auto-activate offline license from env var if configured
    if (process.env.HIVECFM_OFFLINE_LICENSE_TOKEN) {
      const { tryAutoActivateFromEnv } = await import("./lib/tenant/offline-license");
      await tryAutoActivateFromEnv();
    }
  }
  if (process.env.NEXT_RUNTIME === "nodejs" && IS_PRODUCTION && SENTRY_DSN) {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge" && IS_PRODUCTION && SENTRY_DSN) {
    await import("./sentry.edge.config");
  }
};
