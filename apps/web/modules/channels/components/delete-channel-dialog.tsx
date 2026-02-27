"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { type TChannel } from "@hivecfm/types/channel";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { deleteChannelAction } from "@/modules/channels/actions";
import { DeleteDialog } from "@/modules/ui/components/delete-dialog";

interface DeleteChannelDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  channel: TChannel;
}

export const DeleteChannelDialog = ({ open, setOpen, channel }: DeleteChannelDialogProps) => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteChannelAction({ channelId: channel.id });
      if (result?.data) {
        toast.success("Channel deleted successfully");
        setOpen(false);
        router.refresh();
      } else {
        const errorMessage = getFormattedErrorMessage(result);
        toast.error(errorMessage || "Failed to delete channel");
      }
    } catch (error) {
      toast.error("An error occurred while deleting the channel");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DeleteDialog
      open={open}
      setOpen={setOpen}
      deleteWhat={channel.name}
      onDelete={handleDelete}
      text={`Are you sure you want to delete the channel "${channel.name}"? This action cannot be undone. Any surveys assigned to this channel must be reassigned first.`}
      isDeleting={isDeleting}
    />
  );
};
