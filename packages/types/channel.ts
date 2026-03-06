import { z } from "zod";
import { TSurveyElementTypeEnum } from "./surveys/elements";

// Integration Method Enum — universal across all channel configs
export const ZIntegrationMethod = z.enum([
  "webJs",
  "iosSdk",
  "androidSdk",
  "reactNativeSdk",
  "flutterSdk",
  "api",
  "meta",
]);
export type TIntegrationMethod = z.infer<typeof ZIntegrationMethod>;

// Channel Type Enum
export const ZChannelType = z.enum(["web", "mobile", "link", "voice", "whatsapp", "sms", "email"]);
export type TChannelType = z.infer<typeof ZChannelType>;

// Type-specific configuration schemas
export const ZWebChannelConfig = z.object({
  type: z.literal("web"),
  integrationMethod: ZIntegrationMethod.optional(),
  widgetPlacement: z.enum(["bottomRight", "bottomLeft", "centerRight"]).default("bottomRight"),
});

export const ZMobileChannelConfig = z.object({
  type: z.literal("mobile"),
  integrationMethod: ZIntegrationMethod.optional(),
  sdkPlatform: z.enum(["ios", "android", "reactNative", "flutter"]).optional(),
});

export const ZLinkChannelConfig = z.object({
  type: z.literal("link"),
  integrationMethod: ZIntegrationMethod.optional(),
  customSlug: z.string().optional(),
});

export const ZVoiceChannelConfig = z.object({
  type: z.literal("voice"),
  integrationMethod: ZIntegrationMethod.optional(),
  ttsEngine: z.enum(["mrcp", "polly", "google"]).default("mrcp"),
  defaultVoice: z.string().default("en-US-Standard-A"),
  defaultLanguage: z.string().default("en-US"),
  inputTimeout: z.number().min(3).max(30).default(5),
  maxRetries: z.number().min(1).max(5).default(3),
  bargeinEnabled: z.boolean().default(true),
  welcomeMessage: z.string().optional(),
  thankYouMessage: z.string().optional(),
  errorMessage: z.string().optional(),
  audioBaseUrl: z.string().optional(),
});

export const ZWhatsAppChannelConfig = z.object({
  type: z.literal("whatsapp"),
  integrationMethod: ZIntegrationMethod.optional(),
  provider: z.enum(["meta", "twilio", "messagebird"]).default("meta"),
  phoneNumberId: z.string().optional(),
  businessAccountId: z.string().optional(),
  templateName: z.string().optional(),
  sessionWindowHours: z.number().min(1).max(72).default(24),
  welcomeMessage: z.string().optional(),
  thankYouMessage: z.string().optional(),
});

export const ZSmsChannelConfig = z.object({
  type: z.literal("sms"),
  integrationMethod: ZIntegrationMethod.optional(),
  provider: z.enum(["twilio", "vonage", "messagebird"]).default("twilio"),
  senderId: z.string().optional(),
  maxMessageLength: z.number().min(70).max(1600).default(160),
  welcomeMessage: z.string().optional(),
  thankYouMessage: z.string().optional(),
});

export const ZEmailChannelConfig = z.object({
  type: z.literal("email"),
  integrationMethod: ZIntegrationMethod.optional(),
  fromName: z.string().optional(),
  replyTo: z.string().email().optional(),
});

// Discriminated union for channel config
export const ZChannelConfig = z.discriminatedUnion("type", [
  ZWebChannelConfig,
  ZMobileChannelConfig,
  ZLinkChannelConfig,
  ZVoiceChannelConfig,
  ZWhatsAppChannelConfig,
  ZSmsChannelConfig,
  ZEmailChannelConfig,
]);

export type TChannelConfig = z.infer<typeof ZChannelConfig>;

// Full Channel schema
export const ZChannel = z.object({
  id: z.string().cuid2(),
  createdAt: z.date(),
  updatedAt: z.date(),
  name: z.string().min(1).max(100),
  type: ZChannelType,
  description: z.string().nullable(),
  environmentId: z.string().cuid2(),
  config: ZChannelConfig,
});

export type TChannel = z.infer<typeof ZChannel>;

// Create input
export const ZChannelCreateInput = z.object({
  name: z.string().min(1).max(100),
  type: ZChannelType,
  description: z.string().optional(),
  config: ZChannelConfig.optional(),
});

export type TChannelCreateInput = z.infer<typeof ZChannelCreateInput>;

// Update input
export const ZChannelUpdateInput = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  config: ZChannelConfig.optional(),
});

export type TChannelUpdateInput = z.infer<typeof ZChannelUpdateInput>;

// Voice channel compatible element types
// These are question types that can be answered via DTMF keypad input
export const VOICE_COMPATIBLE_ELEMENT_TYPES: TSurveyElementTypeEnum[] = [
  TSurveyElementTypeEnum.NPS, // 0-10 keypad input
  TSurveyElementTypeEnum.Rating, // 1-5 or 1-10 keypad input
  TSurveyElementTypeEnum.MultipleChoiceSingle, // max 9 options, mapped to digits 1-9
  TSurveyElementTypeEnum.CTA, // press 1 to continue
];

// Max options for multiple choice in voice channel (DTMF digits 1-9)
export const VOICE_MAX_MULTIPLE_CHOICE_OPTIONS = 9;

// Messaging channel compatible element types
// These are question types that work in text-based messaging (WhatsApp, SMS)
export const MESSAGING_COMPATIBLE_ELEMENT_TYPES: TSurveyElementTypeEnum[] = [
  TSurveyElementTypeEnum.NPS,
  TSurveyElementTypeEnum.Rating,
  TSurveyElementTypeEnum.MultipleChoiceSingle,
  TSurveyElementTypeEnum.MultipleChoiceMulti,
  TSurveyElementTypeEnum.OpenText,
  TSurveyElementTypeEnum.CTA,
  TSurveyElementTypeEnum.Consent,
];

/**
 * Check if a survey element type is compatible with voice (IVR) channels.
 * Voice channels only support question types that can be answered via DTMF keypad.
 */
export const isElementVoiceCompatible = (elementType: TSurveyElementTypeEnum): boolean => {
  return VOICE_COMPATIBLE_ELEMENT_TYPES.includes(elementType);
};

/**
 * Check if a survey element type is compatible with messaging channels (WhatsApp, SMS).
 * Messaging channels only support text-compatible question types.
 */
export const isElementMessagingCompatible = (elementType: TSurveyElementTypeEnum): boolean => {
  return MESSAGING_COMPATIBLE_ELEMENT_TYPES.includes(elementType);
};

/**
 * Check if a channel type is a messaging channel (WhatsApp or SMS).
 */
export const isMessagingChannelType = (channelType: string): boolean => {
  return channelType === "whatsapp" || channelType === "sms";
};

/**
 * Recommended integration methods per channel type (UI hints, not enforced).
 */
export const RECOMMENDED_INTEGRATIONS: Record<TChannelType, TIntegrationMethod[]> = {
  web: ["webJs", "api"],
  mobile: ["iosSdk", "androidSdk", "reactNativeSdk", "flutterSdk"],
  link: ["api"],
  voice: ["api"],
  whatsapp: ["meta", "api"],
  sms: ["api"],
  email: ["api"],
};

/**
 * Get the default config for a given channel type.
 */
export const getDefaultChannelConfig = (type: TChannelType): TChannelConfig => {
  switch (type) {
    case "web":
      return { type: "web", widgetPlacement: "bottomRight" };
    case "mobile":
      return { type: "mobile" };
    case "link":
      return { type: "link" };
    case "voice":
      return {
        type: "voice",
        ttsEngine: "mrcp",
        defaultVoice: "en-US-Standard-A",
        defaultLanguage: "en-US",
        inputTimeout: 5,
        maxRetries: 3,
        bargeinEnabled: true,
      };
    case "whatsapp":
      return {
        type: "whatsapp",
        provider: "meta",
        sessionWindowHours: 24,
      };
    case "sms":
      return {
        type: "sms",
        provider: "twilio",
        maxMessageLength: 160,
      };
    case "email":
      return {
        type: "email",
      };
  }
};

/**
 * Maps a channel type to the legacy survey type for backward compatibility.
 */
export const channelTypeToSurveyType = (channelType: TChannelType): "link" | "app" | "voice" => {
  switch (channelType) {
    case "web":
    case "mobile":
      return "app";
    case "voice":
      return "voice";
    case "link":
    case "whatsapp":
    case "sms":
    case "email":
      return "link";
  }
};
