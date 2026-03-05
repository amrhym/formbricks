"use client";

import { MoreVertical, SendIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TCampaignWithRelations } from "@hivecfm/types/campaign";
import { cn } from "@/lib/cn";
import { DeleteDialog } from "@/modules/ui/components/delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/modules/ui/components/dropdown-menu";

interface CampaignDropdownMenuProps {
  campaign: TCampaignWithRelations;
  onSend: (campaign: TCampaignWithRelations) => void;
  onDelete: (campaignId: string) => void;
  isDeleting: boolean;
  disabled?: boolean;
}

export const CampaignDropdownMenu = ({
  campaign,
  onSend,
  onDelete,
  isDeleting,
  disabled,
}: CampaignDropdownMenuProps) => {
  const { t } = useTranslation();
  const [isDropDownOpen, setIsDropDownOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const canSend = campaign.status === "draft" || campaign.status === "scheduled";

  return (
    <>
      <DropdownMenu open={isDropDownOpen} onOpenChange={setIsDropDownOpen}>
        <DropdownMenuTrigger className="z-10" asChild disabled={disabled}>
          <div
            className={cn(
              "rounded-lg border bg-white p-2",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-slate-50"
            )}>
            <span className="sr-only">{t("environments.surveys.open_options")}</span>
            <MoreVertical className="h-4 w-4" aria-hidden="true" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="inline-block w-auto min-w-max">
          <DropdownMenuGroup>
            {canSend && (
              <DropdownMenuItem>
                <button
                  type="button"
                  className="flex w-full items-center"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsDropDownOpen(false);
                    onSend(campaign);
                  }}>
                  <SendIcon className="mr-2 h-4 w-4" />
                  {t("environments.campaigns.send_campaign")}
                </button>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <button
                type="button"
                className="flex w-full items-center"
                onClick={(e) => {
                  e.preventDefault();
                  setIsDropDownOpen(false);
                  setDeleteDialogOpen(true);
                }}>
                <TrashIcon className="mr-2 h-4 w-4" />
                {t("common.delete")}
              </button>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteDialog
        deleteWhat="Campaign"
        open={isDeleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        onDelete={() => onDelete(campaign.id)}
        text="Are you sure you want to delete this campaign? This action cannot be undone."
        isDeleting={isDeleting}
      />
    </>
  );
};
