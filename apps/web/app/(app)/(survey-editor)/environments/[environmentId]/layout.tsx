import { redirect } from "next/navigation";
import { LicenseBlockedPage } from "@/app/(app)/environments/[environmentId]/components/LicenseBlockedPage";
import { getEnvironment } from "@/lib/environment/service";
import { checkLicenseValid } from "@/lib/tenant/license-enforcement";
import { environmentIdLayoutChecks } from "@/modules/environments/lib/utils";

const SurveyEditorEnvironmentLayout = async (props) => {
  const params = await props.params;

  const { children } = props;

  const { t, session, user, organization } = await environmentIdLayoutChecks(params.environmentId);

  if (!session) {
    return redirect(`/auth/login`);
  }

  if (!user) {
    throw new Error(t("common.user_not_found"));
  }

  const environment = await getEnvironment(params.environmentId);

  if (!environment) {
    throw new Error(t("common.environment_not_found"));
  }

  // Block access when tenant license is invalid
  if (organization) {
    const licenseCheck = await checkLicenseValid(organization.id);
    if (!licenseCheck.valid) {
      return <LicenseBlockedPage reason={licenseCheck.reason} />;
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="h-full overflow-y-auto bg-slate-50">{children}</div>
    </div>
  );
};

export default SurveyEditorEnvironmentLayout;
