"use client";

import {
  CodeIcon,
  GlobeIcon,
  MonitorSmartphoneIcon,
  ServerIcon,
  SmartphoneIcon,
  TabletSmartphoneIcon,
  ZapIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { RECOMMENDED_INTEGRATIONS, TChannelType, TIntegrationMethod } from "@hivecfm/types/channel";
import { cn } from "@/lib/cn";
import { type ChannelSelection } from "./channel-selector";

interface IntegrationMethodSelectorProps {
  selectedChannel: ChannelSelection;
  selectedMethod: TIntegrationMethod | null;
  onMethodSelect: (method: TIntegrationMethod | null) => void;
}

const integrationMethods: {
  value: TIntegrationMethod;
  icon: typeof GlobeIcon;
  labelKey: string;
  fallbackLabel: string;
  descKey: string;
  fallbackDesc: string;
}[] = [
  {
    value: "webJs",
    icon: GlobeIcon,
    labelKey: "common.integration_web_js",
    fallbackLabel: "Web JS",
    descKey: "common.integration_web_js_desc",
    fallbackDesc: "JavaScript snippet",
  },
  {
    value: "iosSdk",
    icon: SmartphoneIcon,
    labelKey: "common.integration_ios_sdk",
    fallbackLabel: "iOS SDK",
    descKey: "common.integration_ios_sdk_desc",
    fallbackDesc: "Swift / Obj-C",
  },
  {
    value: "androidSdk",
    icon: TabletSmartphoneIcon,
    labelKey: "common.integration_android_sdk",
    fallbackLabel: "Android SDK",
    descKey: "common.integration_android_sdk_desc",
    fallbackDesc: "Kotlin / Java",
  },
  {
    value: "reactNativeSdk",
    icon: MonitorSmartphoneIcon,
    labelKey: "common.integration_react_native_sdk",
    fallbackLabel: "React Native",
    descKey: "common.integration_react_native_sdk_desc",
    fallbackDesc: "Cross-platform",
  },
  {
    value: "flutterSdk",
    icon: CodeIcon,
    labelKey: "common.integration_flutter_sdk",
    fallbackLabel: "Flutter SDK",
    descKey: "common.integration_flutter_sdk_desc",
    fallbackDesc: "Dart SDK",
  },
  {
    value: "api",
    icon: ServerIcon,
    labelKey: "common.integration_api",
    fallbackLabel: "API",
    descKey: "common.integration_api_desc",
    fallbackDesc: "REST API",
  },
  {
    value: "meta",
    icon: ZapIcon,
    labelKey: "common.integration_meta",
    fallbackLabel: "Meta",
    descKey: "common.integration_meta_desc",
    fallbackDesc: "Meta / WhatsApp API",
  },
];

export const IntegrationMethodSelector = ({
  selectedChannel,
  selectedMethod,
  onMethodSelect,
}: IntegrationMethodSelectorProps) => {
  const { t } = useTranslation();

  if (!selectedChannel) return null;

  const recommended = RECOMMENDED_INTEGRATIONS[selectedChannel as TChannelType] ?? [];

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          {t("environments.surveys.templates.select_integration_method", "Integration Method")}
        </h3>
        {selectedMethod && (
          <button
            type="button"
            onClick={() => onMethodSelect(null)}
            className="text-xs text-slate-500 hover:text-slate-700">
            {t("common.clear", "Clear")}
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-4">
        {integrationMethods.map((method) => {
          const Icon = method.icon;
          const isActive = selectedMethod === method.value;
          const isRecommended = recommended.includes(method.value);

          return (
            <button
              key={method.value}
              type="button"
              onClick={() => onMethodSelect(isActive ? null : method.value)}
              className={cn(
                "relative flex flex-col items-center rounded-lg border-2 px-2 py-3 transition-all duration-150",
                isActive
                  ? "border-slate-700 bg-slate-50 ring-1 ring-slate-700"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              )}>
              {isRecommended && (
                <span className="absolute -top-2 right-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                  {t("common.recommended", "Rec.")}
                </span>
              )}
              <Icon className={cn("mb-1.5 h-5 w-5", isActive ? "text-slate-700" : "text-slate-400")} />
              <span className={cn("text-xs font-medium", isActive ? "text-slate-900" : "text-slate-600")}>
                {t(method.labelKey, method.fallbackLabel)}
              </span>
              <span className="mt-0.5 text-[10px] text-slate-400">
                {t(method.descKey, method.fallbackDesc)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
