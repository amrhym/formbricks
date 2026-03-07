import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AuthorizationError } from "@hivecfm/types/errors";
import { LicenseBlockedPage } from "@/app/(app)/environments/[environmentId]/components/LicenseBlockedPage";
import { hasUserEnvironmentAccess } from "@/lib/environment/auth";
import { getOrganizationByEnvironmentId } from "@/lib/organization/service";
import { checkLicenseValid } from "@/lib/tenant/license-enforcement";
import { authOptions } from "@/modules/auth/lib/authOptions";

const OnboardingLayout = async (props) => {
  const params = await props.params;

  const { children } = props;

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return redirect(`/auth/login`);
  }

  const isAuthorized = await hasUserEnvironmentAccess(session.user.id, params.environmentId);
  if (!isAuthorized) {
    throw new AuthorizationError("User is not authorized to access this environment");
  }

  // Block access when tenant license is invalid
  const organization = await getOrganizationByEnvironmentId(params.environmentId);
  if (organization) {
    const licenseCheck = await checkLicenseValid(organization.id);
    if (!licenseCheck.valid) {
      return <LicenseBlockedPage reason={licenseCheck.reason} />;
    }
  }

  return <div className="flex-1 bg-slate-50">{children}</div>;
};

export default OnboardingLayout;
