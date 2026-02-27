"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { OrganizationRole } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { ZId } from "@hivecfm/types/common";
import { TOrganizationRole, ZOrganizationRole } from "@hivecfm/types/memberships";
import { ZUserName, ZUserPassword } from "@hivecfm/types/user";
import { AddMemberRole } from "@/modules/ee/role-management/components/add-member-role";
import { TOrganizationTeam } from "@/modules/ee/teams/team-list/types/team";
import { Alert, AlertDescription } from "@/modules/ui/components/alert";
import { Button } from "@/modules/ui/components/button";
import { FormError, FormField, FormItem, FormLabel } from "@/modules/ui/components/form";
import { Input } from "@/modules/ui/components/input";
import { Label } from "@/modules/ui/components/label";
import { MultiSelect } from "@/modules/ui/components/multi-select";
import { Small } from "@/modules/ui/components/typography";

interface CreateMemberTabProps {
  setOpen: (v: boolean) => void;
  onSubmit: (data: {
    name: string;
    email: string;
    password: string;
    role: TOrganizationRole;
    teamIds: string[];
  }) => void;
  teams: TOrganizationTeam[];
  isAccessControlAllowed: boolean;
  isFormbricksCloud: boolean;
  environmentId: string;
  membershipRole?: TOrganizationRole;
  showTeamAdminRestrictions: boolean;
}

export const CreateMemberTab = ({
  setOpen,
  onSubmit,
  teams,
  isAccessControlAllowed,
  isFormbricksCloud,
  environmentId,
  membershipRole,
  showTeamAdminRestrictions,
}: CreateMemberTabProps) => {
  const ZFormSchema = z.object({
    name: ZUserName,
    email: z.string().min(1, { message: "Email is required" }).email({ message: "Invalid email" }),
    password: ZUserPassword,
    role: ZOrganizationRole,
    teamIds: showTeamAdminRestrictions
      ? z.array(ZId).min(1, { message: "Team admins must select at least one team" })
      : z.array(ZId),
  });

  const router = useRouter();

  type TFormData = z.infer<typeof ZFormSchema>;
  const { t } = useTranslation();

  let defaultRole: TOrganizationRole = "owner";
  if (showTeamAdminRestrictions || isAccessControlAllowed) {
    defaultRole = "member";
  }

  const form = useForm<TFormData>({
    resolver: zodResolver(ZFormSchema),
    defaultValues: {
      role: defaultRole,
      teamIds: [],
    },
  });

  const {
    register,
    getValues,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { isSubmitting, errors },
  } = form;

  const submitEventClass = async () => {
    const data = getValues();
    data.role = data.role || OrganizationRole.owner;
    onSubmit(data);
    router.refresh();
    setOpen(false);
    reset();
  };

  const teamOptions = teams.map((team) => ({
    label: team.name,
    value: team.id,
  }));

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(submitEventClass)} className="flex flex-col gap-6">
        <div className="flex flex-col space-y-2">
          <Label htmlFor="createMemberNameInput">{t("common.full_name")}</Label>
          <Input
            id="createMemberNameInput"
            placeholder="e.g. Bob"
            {...register("name", { required: true, validate: (value) => value.trim() !== "" })}
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col space-y-2">
          <Label htmlFor="createMemberEmailInput">{t("common.email")}</Label>
          <Input
            id="createMemberEmailInput"
            type="email"
            placeholder="e.g. bob@work.com"
            {...register("email", { required: true })}
          />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
        </div>
        <div className="flex flex-col space-y-2">
          <Label htmlFor="createMemberPasswordInput">{t("common.password")}</Label>
          <Input
            id="createMemberPasswordInput"
            type="password"
            placeholder="Min. 8 characters"
            {...register("password", { required: true })}
          />
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
        </div>
        <div>
          {showTeamAdminRestrictions ? (
            <div className="flex flex-col space-y-2">
              <Label htmlFor="createMemberRoleSelect">
                {t("environments.settings.teams.organization_role")}
              </Label>
              <Input value={t("environments.settings.teams.member")} disabled />
            </div>
          ) : (
            <>
              <AddMemberRole
                control={control as any}
                isAccessControlAllowed={isAccessControlAllowed}
                isFormbricksCloud={isFormbricksCloud}
                membershipRole={membershipRole}
              />
              {watch("role") === "member" && (
                <Alert className="mt-2" variant="info">
                  <AlertDescription>
                    {t("environments.settings.teams.member_role_info_message")}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        {isAccessControlAllowed && (
          <>
            <FormField
              control={control}
              name="teamIds"
              render={({ field }) => (
                <FormItem className="flex flex-col space-y-2">
                  <FormLabel>{t("common.add_to_team")} </FormLabel>
                  <div className="space-y-2">
                    <MultiSelect
                      value={field.value}
                      options={teamOptions}
                      placeholder={t("environments.settings.teams.team_select_placeholder")}
                      disabled={!teamOptions.length}
                      onChange={(val) => field.onChange(val)}
                    />
                    {!teamOptions.length && (
                      <Small className="font-normal text-amber-600">
                        {t("environments.settings.teams.create_first_team_message")}
                      </Small>
                    )}
                  </div>
                  <FormError>{errors.teamIds?.message}</FormError>
                </FormItem>
              )}
            />
            <div className="flex flex-col space-y-2">
              <Label htmlFor="createMemberTeamRoleInput">{t("common.team_role")}</Label>
              <Input value={t("environments.settings.teams.contributor")} disabled />
            </div>
          </>
        )}

        {!isAccessControlAllowed && (
          <Alert>
            <AlertDescription className="flex">
              {t("environments.settings.teams.upgrade_plan_notice_message")}
              <Link
                className="ml-1 underline"
                target="_blank"
                href={isFormbricksCloud ? `/environments/${environmentId}/settings/billing` : "#"}>
                {t("common.start_free_trial")}
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-end justify-end gap-x-2">
          <Button
            size="default"
            type="button"
            variant="secondary"
            onClick={() => {
              setOpen(false);
            }}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" size="default" loading={isSubmitting}>
            {t("environments.settings.teams.create_member")}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};
