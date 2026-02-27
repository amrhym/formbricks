"use client";

import { MessageSquareIcon, MicIcon, PencilIcon, PhoneIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { type TChannel } from "@hivecfm/types/channel";
import { Badge } from "@/modules/ui/components/badge";
import { Button } from "@/modules/ui/components/button";
import { ChannelFormDialog } from "./channel-form-dialog";
import { DeleteChannelDialog } from "./delete-channel-dialog";

const CHANNEL_TYPE_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; badgeType: "success" | "warning" | "error" }
> = {
  whatsapp: {
    label: "WhatsApp",
    icon: <MessageSquareIcon className="h-5 w-5" />,
    color: "bg-emerald-50 text-emerald-600",
    badgeType: "success",
  },
  sms: {
    label: "SMS",
    icon: <PhoneIcon className="h-5 w-5" />,
    color: "bg-cyan-50 text-cyan-600",
    badgeType: "warning",
  },
  voice: {
    label: "Voice (IVR)",
    icon: <MicIcon className="h-5 w-5" />,
    color: "bg-orange-50 text-orange-600",
    badgeType: "error",
  },
  web: {
    label: "Web",
    icon: <MessageSquareIcon className="h-5 w-5" />,
    color: "bg-blue-50 text-blue-600",
    badgeType: "success",
  },
  mobile: {
    label: "Mobile",
    icon: <PhoneIcon className="h-5 w-5" />,
    color: "bg-green-50 text-green-600",
    badgeType: "success",
  },
  link: {
    label: "Link",
    icon: <MessageSquareIcon className="h-5 w-5" />,
    color: "bg-purple-50 text-purple-600",
    badgeType: "success",
  },
};

function getProviderLabel(channel: TChannel): string {
  const config = channel.config as Record<string, any>;
  if (config?.provider) return config.provider;
  if (config?.ttsEngine) return config.ttsEngine;
  return "-";
}

interface ChannelListProps {
  channels: TChannel[];
  environmentId: string;
  isReadOnly: boolean;
}

export const ChannelList = ({ channels, environmentId, isReadOnly }: ChannelListProps) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<TChannel | null>(null);
  const [deletingChannel, setDeletingChannel] = useState<TChannel | null>(null);

  // Filter to show only whatsapp, sms, voice channels in the configurable section
  const configurableChannels = channels.filter((c) => ["whatsapp", "sms", "voice"].includes(c.type));

  return (
    <div className="space-y-6">
      {/* Channel Grid */}
      {configurableChannels.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-12">
          <PhoneIcon className="h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-medium text-slate-700">No channels configured</h3>
          <p className="mt-2 text-sm text-slate-500">
            Create a WhatsApp, SMS, or Voice channel to collect feedback.
          </p>
          {!isReadOnly && (
            <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Channel
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {configurableChannels.map((channel) => {
            const meta = CHANNEL_TYPE_META[channel.type] ?? CHANNEL_TYPE_META.web;
            return (
              <div
                key={channel.id}
                className="group relative rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${meta.color}`}>{meta.icon}</div>
                    <div>
                      <h3 className="font-medium text-slate-900">{channel.name}</h3>
                      <p className="text-sm text-slate-500">{channel.description || "No description"}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Badge size="normal" type={meta.badgeType} text={meta.label} />
                  <span className="text-xs text-slate-400 capitalize">{getProviderLabel(channel)}</span>
                </div>

                {/* Actions */}
                {!isReadOnly && (
                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                    <Button variant="secondary" size="sm" onClick={() => setEditingChannel(channel)}>
                      <PencilIcon className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setDeletingChannel(channel)}>
                      <TrashIcon className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add new card */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setCreateDialogOpen(true)}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-5 text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-500">
              <PlusIcon className="h-8 w-8" />
              <span className="mt-2 text-sm font-medium">Add Channel</span>
            </button>
          )}
        </div>
      )}

      {/* Create dialog */}
      <ChannelFormDialog
        open={createDialogOpen}
        setOpen={setCreateDialogOpen}
        environmentId={environmentId}
      />

      {/* Edit dialog */}
      {editingChannel && (
        <ChannelFormDialog
          open={!!editingChannel}
          setOpen={(open) => {
            if (!open) setEditingChannel(null);
          }}
          environmentId={environmentId}
          channel={editingChannel}
        />
      )}

      {/* Delete dialog */}
      {deletingChannel && (
        <DeleteChannelDialog
          open={!!deletingChannel}
          setOpen={(open) => {
            if (!open) setDeletingChannel(null);
          }}
          channel={deletingChannel}
        />
      )}
    </div>
  );
};
