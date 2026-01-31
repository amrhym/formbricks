"use client";

import {
  GlobeIcon,
  LinkIcon,
  MessageCircleIcon,
  MessageSquareIcon,
  MonitorSmartphoneIcon,
  PhoneIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

export type ChannelSelection = "web" | "mobile" | "link" | "voice" | "whatsapp" | "sms" | null;

interface ChannelSelectorProps {
  selectedChannel: ChannelSelection;
  onChannelSelect: (channel: ChannelSelection) => void;
}

const channelOptions: {
  value: ChannelSelection;
  icon: typeof GlobeIcon;
  labelKey: string;
  fallbackLabel: string;
  descKey: string;
  fallbackDesc: string;
  accentColor: string;
  activeRing: string;
}[] = [
  {
    value: "web",
    icon: GlobeIcon,
    labelKey: "common.web",
    fallbackLabel: "Web",
    descKey: "common.channel_web_desc",
    fallbackDesc: "Website widget",
    accentColor: "text-blue-600",
    activeRing: "ring-blue-500 border-blue-500 bg-blue-50",
  },
  {
    value: "mobile",
    icon: MonitorSmartphoneIcon,
    labelKey: "common.mobile",
    fallbackLabel: "Mobile",
    descKey: "common.channel_mobile_desc",
    fallbackDesc: "Mobile SDK",
    accentColor: "text-green-600",
    activeRing: "ring-green-500 border-green-500 bg-green-50",
  },
  {
    value: "link",
    icon: LinkIcon,
    labelKey: "common.link",
    fallbackLabel: "Link",
    descKey: "common.channel_link_desc",
    fallbackDesc: "Link survey",
    accentColor: "text-purple-600",
    activeRing: "ring-purple-500 border-purple-500 bg-purple-50",
  },
  {
    value: "voice",
    icon: PhoneIcon,
    labelKey: "common.voice",
    fallbackLabel: "Voice",
    descKey: "common.channel_voice_desc",
    fallbackDesc: "IVR / Phone",
    accentColor: "text-orange-600",
    activeRing: "ring-orange-500 border-orange-500 bg-orange-50",
  },
  {
    value: "whatsapp",
    icon: MessageCircleIcon,
    labelKey: "common.whatsapp",
    fallbackLabel: "WhatsApp",
    descKey: "common.channel_whatsapp_desc",
    fallbackDesc: "WhatsApp messaging",
    accentColor: "text-emerald-600",
    activeRing: "ring-emerald-500 border-emerald-500 bg-emerald-50",
  },
  {
    value: "sms",
    icon: MessageSquareIcon,
    labelKey: "common.sms",
    fallbackLabel: "SMS",
    descKey: "common.channel_sms_desc",
    fallbackDesc: "Text message",
    accentColor: "text-cyan-600",
    activeRing: "ring-cyan-500 border-cyan-500 bg-cyan-50",
  },
];

export const ChannelSelector = ({ selectedChannel, onChannelSelect }: ChannelSelectorProps) => {
  const { t } = useTranslation();

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          {t("environments.surveys.templates.select_channel", "Select Channel")}
        </h3>
        {selectedChannel && (
          <button
            type="button"
            onClick={() => onChannelSelect(null)}
            className="text-xs text-slate-500 hover:text-slate-700">
            {t("common.clear", "Clear")}
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {channelOptions.map((option) => {
          const Icon = option.icon;
          const isActive = selectedChannel === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChannelSelect(isActive ? null : option.value)}
              className={cn(
                "flex flex-col items-center rounded-lg border-2 px-3 py-4 transition-all duration-150",
                isActive
                  ? `${option.activeRing} ring-1`
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              )}>
              <Icon className={cn("mb-2 h-6 w-6", isActive ? option.accentColor : "text-slate-400")} />
              <span className={cn("text-sm font-medium", isActive ? "text-slate-900" : "text-slate-600")}>
                {t(option.labelKey, option.fallbackLabel)}
              </span>
              <span className="mt-0.5 text-[11px] text-slate-400">
                {t(option.descKey, option.fallbackDesc)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
