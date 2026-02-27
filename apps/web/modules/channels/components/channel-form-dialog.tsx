"use client";

import { MessageSquareIcon, MicIcon, PhoneIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  type TChannel,
  type TChannelConfig,
  type TChannelType,
  getDefaultChannelConfig,
} from "@hivecfm/types/channel";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { createChannelAction, updateChannelAction } from "@/modules/channels/actions";
import { Button } from "@/modules/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/ui/components/dialog";
import { Input } from "@/modules/ui/components/input";
import { Label } from "@/modules/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/ui/components/select";
import { Switch } from "@/modules/ui/components/switch";

type WizardStep = "type" | "provider" | "config" | "review";

const CHANNEL_TYPES: Array<{
  type: TChannelType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    type: "whatsapp",
    label: "WhatsApp",
    description: "Collect feedback via WhatsApp messaging",
    icon: <MessageSquareIcon className="h-6 w-6" />,
    color: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  },
  {
    type: "sms",
    label: "SMS",
    description: "Send surveys via text messages",
    icon: <PhoneIcon className="h-6 w-6" />,
    color: "bg-cyan-50 text-cyan-600 ring-cyan-200",
  },
  {
    type: "voice",
    label: "Voice (IVR)",
    description: "Interactive voice response surveys",
    icon: <MicIcon className="h-6 w-6" />,
    color: "bg-orange-50 text-orange-600 ring-orange-200",
  },
];

const PROVIDERS: Record<string, Array<{ value: string; label: string }>> = {
  whatsapp: [
    { value: "meta", label: "Meta (Cloud API)" },
    { value: "twilio", label: "Twilio" },
    { value: "messagebird", label: "MessageBird" },
  ],
  sms: [
    { value: "twilio", label: "Twilio" },
    { value: "vonage", label: "Vonage" },
    { value: "messagebird", label: "MessageBird" },
  ],
  voice: [
    { value: "mrcp", label: "MRCP (Default)" },
    { value: "polly", label: "Amazon Polly" },
    { value: "google", label: "Google TTS" },
  ],
};

interface ChannelFormDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  environmentId: string;
  channel?: TChannel;
}

export const ChannelFormDialog = ({ open, setOpen, environmentId, channel }: ChannelFormDialogProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const isEditing = !!channel;

  const [step, setStep] = useState<WizardStep>(isEditing ? "config" : "type");
  const [saving, setSaving] = useState(false);

  // Form state
  const [channelType, setChannelType] = useState<TChannelType | null>(channel?.type ?? null);
  const [channelName, setChannelName] = useState(channel?.name ?? "");
  const [description, setDescription] = useState(channel?.description ?? "");
  const [config, setConfig] = useState<TChannelConfig | null>((channel?.config as TChannelConfig) ?? null);

  const resetForm = () => {
    setStep("type");
    setChannelType(null);
    setChannelName("");
    setDescription("");
    setConfig(null);
  };

  const handleClose = () => {
    setOpen(false);
    if (!isEditing) {
      resetForm();
    }
  };

  const handleTypeSelect = (type: TChannelType) => {
    setChannelType(type);
    const defaultConfig = getDefaultChannelConfig(type);
    setConfig(defaultConfig);
    if (!channelName) {
      const typeLabel = CHANNEL_TYPES.find((ct) => ct.type === type)?.label ?? type;
      setChannelName(`${typeLabel} Channel`);
    }
    setStep("provider");
  };

  const handleProviderSelect = (provider: string) => {
    if (!config) return;
    if (config.type === "whatsapp") {
      setConfig({ ...config, provider: provider as "meta" | "twilio" | "messagebird" });
    } else if (config.type === "sms") {
      setConfig({ ...config, provider: provider as "twilio" | "vonage" | "messagebird" });
    } else if (config.type === "voice") {
      setConfig({ ...config, ttsEngine: provider as "mrcp" | "polly" | "google" });
    }
    setStep("config");
  };

  const handleSave = async () => {
    if (!channelType || !config) return;
    setSaving(true);

    try {
      if (isEditing && channel) {
        const result = await updateChannelAction({
          channelId: channel.id,
          channelData: {
            name: channelName,
            description: description || null,
            config,
          },
        });
        if (result?.data) {
          toast.success("Channel updated successfully");
          handleClose();
          router.refresh();
        } else {
          const errorMessage = getFormattedErrorMessage(result);
          toast.error(errorMessage || "Failed to update channel");
        }
      } else {
        const result = await createChannelAction({
          environmentId,
          channelData: {
            name: channelName,
            type: channelType,
            description: description || undefined,
            config,
          },
        });
        if (result?.data) {
          toast.success("Channel created successfully");
          handleClose();
          resetForm();
          router.refresh();
        } else {
          const errorMessage = getFormattedErrorMessage(result);
          toast.error(errorMessage || "Failed to create channel");
        }
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const getCurrentProvider = (): string => {
    if (!config) return "";
    if (config.type === "whatsapp") return config.provider ?? "meta";
    if (config.type === "sms") return config.provider ?? "twilio";
    if (config.type === "voice") return config.ttsEngine ?? "mrcp";
    return "";
  };

  const getStepTitle = (): string => {
    if (isEditing) return `Edit ${channelName}`;
    switch (step) {
      case "type":
        return "Select Channel Type";
      case "provider":
        return "Select Provider";
      case "config":
        return "Configure Channel";
      case "review":
        return "Review & Save";
      default:
        return "New Channel";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent width="wide">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
          <DialogDescription>
            {step === "type" && "Choose the type of channel you want to create."}
            {step === "provider" && "Select a provider for your channel."}
            {step === "config" && "Enter the configuration details for your channel."}
            {step === "review" && "Review your channel configuration before saving."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {/* Step 1: Channel Type Selection */}
          {step === "type" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {CHANNEL_TYPES.map((ct) => (
                <button
                  key={ct.type}
                  type="button"
                  onClick={() => handleTypeSelect(ct.type)}
                  className={`flex flex-col items-center gap-3 rounded-lg border-2 p-6 text-center transition-all hover:shadow-md ${
                    channelType === ct.type
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}>
                  <div className={`rounded-full p-3 ${ct.color}`}>{ct.icon}</div>
                  <div>
                    <p className="font-medium text-slate-900">{ct.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{ct.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Provider Selection */}
          {step === "provider" && channelType && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {PROVIDERS[channelType]?.map((provider) => (
                  <button
                    key={provider.value}
                    type="button"
                    onClick={() => handleProviderSelect(provider.value)}
                    className={`rounded-lg border-2 p-4 text-center transition-all hover:shadow-md ${
                      getCurrentProvider() === provider.value
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}>
                    <p className="font-medium text-slate-900">{provider.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Configuration Form */}
          {step === "config" && config && (
            <div className="space-y-6">
              {/* Common fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="channelName">Channel Name</Label>
                  <Input
                    id="channelName"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="My WhatsApp Channel"
                  />
                </div>
                <div>
                  <Label htmlFor="channelDescription">Description (optional)</Label>
                  <Input
                    id="channelDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this channel"
                  />
                </div>
              </div>

              <hr className="border-slate-200" />

              {/* WhatsApp Config */}
              {config.type === "whatsapp" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-slate-700">WhatsApp Configuration</h3>
                  <div>
                    <Label htmlFor="provider">Provider</Label>
                    <Select
                      value={config.provider}
                      onValueChange={(val) =>
                        setConfig({ ...config, provider: val as "meta" | "twilio" | "messagebird" })
                      }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.whatsapp.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                    <Input
                      id="phoneNumberId"
                      value={config.phoneNumberId ?? ""}
                      onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                      placeholder="e.g. 1234567890"
                    />
                  </div>
                  <div>
                    <Label htmlFor="businessAccountId">Business Account ID</Label>
                    <Input
                      id="businessAccountId"
                      value={config.businessAccountId ?? ""}
                      onChange={(e) => setConfig({ ...config, businessAccountId: e.target.value })}
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  <div>
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      value={config.templateName ?? ""}
                      onChange={(e) => setConfig({ ...config, templateName: e.target.value })}
                      placeholder="e.g. survey_template"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sessionWindow">Session Window (hours)</Label>
                    <Input
                      id="sessionWindow"
                      type="number"
                      min={1}
                      max={72}
                      value={config.sessionWindowHours}
                      onChange={(e) =>
                        setConfig({ ...config, sessionWindowHours: parseInt(e.target.value) || 24 })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="waWelcome">Welcome Message</Label>
                    <Input
                      id="waWelcome"
                      value={config.welcomeMessage ?? ""}
                      onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                      placeholder="Hello! We'd love your feedback..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="waThankYou">Thank You Message</Label>
                    <Input
                      id="waThankYou"
                      value={config.thankYouMessage ?? ""}
                      onChange={(e) => setConfig({ ...config, thankYouMessage: e.target.value })}
                      placeholder="Thank you for your feedback!"
                    />
                  </div>
                </div>
              )}

              {/* SMS Config */}
              {config.type === "sms" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-slate-700">SMS Configuration</h3>
                  <div>
                    <Label htmlFor="smsProvider">Provider</Label>
                    <Select
                      value={config.provider}
                      onValueChange={(val) =>
                        setConfig({ ...config, provider: val as "twilio" | "vonage" | "messagebird" })
                      }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.sms.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="senderId">Sender ID / Number</Label>
                    <Input
                      id="senderId"
                      value={config.senderId ?? ""}
                      onChange={(e) => setConfig({ ...config, senderId: e.target.value })}
                      placeholder="e.g. +1234567890 or MySenderID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxMessageLength">Max Message Length</Label>
                    <Input
                      id="maxMessageLength"
                      type="number"
                      min={70}
                      max={1600}
                      value={config.maxMessageLength}
                      onChange={(e) =>
                        setConfig({ ...config, maxMessageLength: parseInt(e.target.value) || 160 })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="smsWelcome">Welcome Message</Label>
                    <Input
                      id="smsWelcome"
                      value={config.welcomeMessage ?? ""}
                      onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                      placeholder="Hello! We'd love your feedback..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="smsThankYou">Thank You Message</Label>
                    <Input
                      id="smsThankYou"
                      value={config.thankYouMessage ?? ""}
                      onChange={(e) => setConfig({ ...config, thankYouMessage: e.target.value })}
                      placeholder="Thank you for your feedback!"
                    />
                  </div>
                </div>
              )}

              {/* Voice Config */}
              {config.type === "voice" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-slate-700">Voice (IVR) Configuration</h3>
                  <div>
                    <Label htmlFor="ttsEngine">TTS Engine</Label>
                    <Select
                      value={config.ttsEngine}
                      onValueChange={(val) =>
                        setConfig({ ...config, ttsEngine: val as "mrcp" | "polly" | "google" })
                      }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.voice.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="defaultVoice">Default Voice</Label>
                    <Input
                      id="defaultVoice"
                      value={config.defaultVoice}
                      onChange={(e) => setConfig({ ...config, defaultVoice: e.target.value })}
                      placeholder="en-US-Standard-A"
                    />
                  </div>
                  <div>
                    <Label htmlFor="defaultLanguage">Default Language</Label>
                    <Input
                      id="defaultLanguage"
                      value={config.defaultLanguage}
                      onChange={(e) => setConfig({ ...config, defaultLanguage: e.target.value })}
                      placeholder="en-US"
                    />
                  </div>
                  <div>
                    <Label htmlFor="inputTimeout">Input Timeout (seconds)</Label>
                    <Input
                      id="inputTimeout"
                      type="number"
                      min={3}
                      max={30}
                      value={config.inputTimeout}
                      onChange={(e) => setConfig({ ...config, inputTimeout: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxRetries">Max Retries</Label>
                    <Input
                      id="maxRetries"
                      type="number"
                      min={1}
                      max={5}
                      value={config.maxRetries}
                      onChange={(e) => setConfig({ ...config, maxRetries: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="bargeinEnabled"
                      checked={config.bargeinEnabled}
                      onCheckedChange={(checked) => setConfig({ ...config, bargeinEnabled: checked })}
                    />
                    <Label htmlFor="bargeinEnabled">Allow Barge-in (caller can interrupt TTS)</Label>
                  </div>
                  <div>
                    <Label htmlFor="voiceWelcome">Welcome Message (TTS)</Label>
                    <Input
                      id="voiceWelcome"
                      value={config.welcomeMessage ?? ""}
                      onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                      placeholder="Welcome to our survey. Please listen carefully..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="voiceThankYou">Thank You Message (TTS)</Label>
                    <Input
                      id="voiceThankYou"
                      value={config.thankYouMessage ?? ""}
                      onChange={(e) => setConfig({ ...config, thankYouMessage: e.target.value })}
                      placeholder="Thank you for completing our survey. Goodbye."
                    />
                  </div>
                  <div>
                    <Label htmlFor="voiceError">Error Message (TTS)</Label>
                    <Input
                      id="voiceError"
                      value={config.errorMessage ?? ""}
                      onChange={(e) => setConfig({ ...config, errorMessage: e.target.value })}
                      placeholder="Sorry, I didn't understand. Please try again."
                    />
                  </div>
                  <div>
                    <Label htmlFor="audioBaseUrl">Audio Base URL (optional)</Label>
                    <Input
                      id="audioBaseUrl"
                      value={config.audioBaseUrl ?? ""}
                      onChange={(e) => setConfig({ ...config, audioBaseUrl: e.target.value })}
                      placeholder="https://audio.example.com/"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === "review" && config && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-slate-500">Name</dt>
                    <dd className="text-sm text-slate-900">{channelName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-slate-500">Type</dt>
                    <dd className="text-sm text-slate-900 capitalize">{channelType}</dd>
                  </div>
                  {description && (
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-slate-500">Description</dt>
                      <dd className="text-sm text-slate-900">{description}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-slate-500">Provider / Engine</dt>
                    <dd className="text-sm text-slate-900">
                      {config.type === "whatsapp" && config.provider}
                      {config.type === "sms" && config.provider}
                      {config.type === "voice" && config.ttsEngine}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {/* Back button */}
          {!isEditing && step !== "type" && (
            <Button
              variant="secondary"
              onClick={() => {
                if (step === "provider") setStep("type");
                else if (step === "config") setStep("provider");
                else if (step === "review") setStep("config");
              }}>
              Back
            </Button>
          )}

          {/* Cancel */}
          <Button variant="secondary" onClick={handleClose}>
            {t("common.cancel")}
          </Button>

          {/* Next / Save */}
          {step === "config" && !isEditing && (
            <Button onClick={() => setStep("review")} disabled={!channelName.trim()}>
              Review
            </Button>
          )}

          {(step === "review" || isEditing) && (
            <Button onClick={handleSave} loading={saving} disabled={!channelName.trim()}>
              {isEditing ? "Save Changes" : "Create Channel"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
