/**
 * Integrations Module
 *
 * Provides channel configuration and integration management capabilities.
 * Embeds the HiveCFM Genesys Adapter admin UI for:
 * - Channel overview and status
 * - Provider credentials configuration
 * - Trigger and throttling settings
 * - Message templates
 * - IVR/VXML configuration
 * - Conversation logs
 */

// Page components
export { IntegrationsPage, metadata } from "./page";

// Embed components
export { ChannelConfigEmbed, ChannelConfigFullPage } from "./components/ChannelConfigEmbed";
