/**
 * Analytics Module
 *
 * Provides embedded analytics dashboard capabilities using Metabase, Superset,
 * and HiveCFM Channel Configuration.
 */

// Page components
export { AnalyticsPage } from "./page";

// Embed components
export { ChannelConfigEmbed, ChannelConfigFullPage } from "./components/ChannelConfigEmbed";
export { MetabaseEmbed, MetabaseFullPage } from "./components/MetabaseEmbed";
export { SupersetEmbed, SupersetFullPage } from "./components/SupersetEmbed";

// Utilities
export {
  generateMetabaseToken,
  getMetabaseDashboardUrl,
  getMetabaseQuestionUrl,
  getMetabaseBaseUrl,
} from "./lib/metabase";
