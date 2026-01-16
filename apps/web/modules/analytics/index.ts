/**
 * Analytics Module
 *
 * Provides embedded analytics dashboard capabilities using Metabase and Superset.
 */

// Page components
export { AnalyticsPage } from "./page";

// Embed components
export { MetabaseEmbed, MetabaseFullPage } from "./components/MetabaseEmbed";
export { SupersetEmbed, SupersetFullPage } from "./components/SupersetEmbed";

// Utilities
export {
  generateMetabaseToken,
  getMetabaseDashboardUrl,
  getMetabaseQuestionUrl,
  getMetabaseBaseUrl,
} from "./lib/metabase";
