import { TFunction } from "i18next";
import { TProjectConfigChannel, TProjectConfigIndustry } from "@hivecfm/types/project";
import { TTemplateRole } from "@hivecfm/types/templates";

export const getChannelMapping = (t: TFunction): { value: TProjectConfigChannel; label: string }[] => [
  { value: "website", label: t("common.website_survey") },
  { value: "app", label: t("common.app_survey") },
  { value: "link", label: t("common.link_survey") },
  { value: "voice", label: t("common.voice_survey", "Voice (IVR)") },
  { value: "whatsapp", label: t("common.whatsapp_survey", "WhatsApp") },
  { value: "sms", label: t("common.sms_survey", "SMS") },
];

export const getIndustryMapping = (t: TFunction): { value: TProjectConfigIndustry; label: string }[] => [
  { value: "eCommerce", label: t("common.e_commerce") },
  { value: "saas", label: t("common.saas") },
  { value: "banking", label: t("common.banking", "Banking") },
  { value: "telecom", label: t("common.telecom", "Telecom") },
  { value: "other", label: t("common.other") },
];

export const getRoleMapping = (t: TFunction): { value: TTemplateRole; label: string }[] => [
  { value: "productManager", label: t("common.product_manager") },
  { value: "customerSuccess", label: t("common.customer_success") },
  { value: "marketing", label: t("common.marketing") },
  { value: "sales", label: t("common.sales") },
  { value: "peopleManager", label: t("common.people_manager") },
];
