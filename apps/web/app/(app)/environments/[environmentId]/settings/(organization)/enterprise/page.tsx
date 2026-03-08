import { CheckIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { OrganizationSettingsNavbar } from "@/app/(app)/environments/[environmentId]/settings/(organization)/components/OrganizationSettingsNavbar";
import { IS_FORMBRICKS_CLOUD } from "@/lib/constants";
import { getOrganizationByEnvironmentId } from "@/lib/organization/service";
import { getLicenseStatus } from "@/lib/tenant/license";
import { getTranslate } from "@/lingodotdev/server";
import { getEnterpriseLicense } from "@/modules/ee/license-check/lib/license";
import { getEnvironmentAuth } from "@/modules/environments/lib/utils";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { OfflineLicenseActivator } from "./offline-license-activator";

const Page = async (props) => {
  const params = await props.params;
  const t = await getTranslate();
  if (IS_FORMBRICKS_CLOUD) {
    return notFound();
  }

  const { isMember, currentUserMembership } = await getEnvironmentAuth(params.environmentId);

  const isPricingDisabled = isMember;

  if (isPricingDisabled) {
    return notFound();
  }

  const { active: isEnterpriseEdition } = await getEnterpriseLicense();

  const organization = await getOrganizationByEnvironmentId(params.environmentId);
  const licenseStatus = organization ? await getLicenseStatus(organization.id) : null;

  const paidFeatures = [
    {
      title: t("environments.settings.billing.remove_branding"),
      comingSoon: false,
      onRequest: false,
    },
    {
      title: t("environments.settings.enterprise.sso"),
      comingSoon: false,
      onRequest: false,
    },
    {
      title: t("environments.workspace.languages.multi_language_surveys"),
      comingSoon: false,
      onRequest: false,
    },
    {
      title: t("environments.settings.enterprise.organization_roles"),
      comingSoon: false,
      onRequest: false,
    },
    {
      title: t("environments.settings.enterprise.teams"),
      comingSoon: false,
      onRequest: false,
    },
    {
      title: t("environments.settings.enterprise.contacts_and_segments"),
      comingSoon: false,
      onRequest: false,
    },
    {
      title: t("environments.settings.enterprise.audit_logs"),
      comingSoon: false,
      onRequest: true,
    },
    {
      title: t("environments.settings.enterprise.saml_sso"),
      comingSoon: false,
      onRequest: true,
    },
    {
      title: t("environments.settings.enterprise.service_level_agreement"),
      comingSoon: false,
      onRequest: true,
    },
    {
      title: t("environments.settings.enterprise.soc2_hipaa_iso_27001_compliance_check"),
      comingSoon: false,
      onRequest: true,
    },
  ];

  return (
    <PageContentWrapper>
      <PageHeader pageTitle={t("environments.settings.general.organization_settings")}>
        <OrganizationSettingsNavbar
          environmentId={params.environmentId}
          isFormbricksCloud={IS_FORMBRICKS_CLOUD}
          membershipRole={currentUserMembership?.role}
          activeId="enterprise"
        />
      </PageHeader>
      {isEnterpriseEdition ? (
        <div className="space-y-6">
          <div className="mt-8 max-w-4xl rounded-lg border border-slate-300 bg-slate-100 shadow-sm">
            <div className="space-y-4 p-8">
              <div className="flex items-center gap-x-2">
                <div className="rounded-full border border-green-300 bg-green-100 p-0.5 dark:bg-green-800">
                  <CheckIcon className="h-5 w-5 p-0.5 text-green-500 dark:text-green-400" />
                </div>
                <p className="text-slate-800">
                  {t(
                    "environments.settings.enterprise.your_enterprise_license_is_active_all_features_unlocked"
                  )}
                </p>
              </div>
            </div>
          </div>

          {licenseStatus && (
            <div className="max-w-4xl space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Remaining Responses</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {Math.max(
                      0,
                      licenseStatus.maxCompletedResponses - licenseStatus.usage.completedResponsesThisYear
                    ).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {licenseStatus.usage.completedResponsesThisYear.toLocaleString()} /{" "}
                    {licenseStatus.maxCompletedResponses.toLocaleString()} used this year
                  </p>
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${
                        licenseStatus.usage.completedResponsesThisYear / licenseStatus.maxCompletedResponses >
                        0.9
                          ? "bg-red-500"
                          : licenseStatus.usage.completedResponsesThisYear /
                                licenseStatus.maxCompletedResponses >
                              0.7
                            ? "bg-amber-500"
                            : "bg-teal-500"
                      }`}
                      style={{
                        width: `${Math.min(100, (licenseStatus.usage.completedResponsesThisYear / licenseStatus.maxCompletedResponses) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Users</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {licenseStatus.usage.currentUsers} / {licenseStatus.maxUsers}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {Math.max(0, licenseStatus.maxUsers - licenseStatus.usage.currentUsers)} seats remaining
                  </p>
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${
                        licenseStatus.usage.currentUsers / licenseStatus.maxUsers > 0.9
                          ? "bg-red-500"
                          : licenseStatus.usage.currentUsers / licenseStatus.maxUsers > 0.7
                            ? "bg-amber-500"
                            : "bg-teal-500"
                      }`}
                      style={{
                        width: `${Math.min(100, (licenseStatus.usage.currentUsers / licenseStatus.maxUsers) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Expires</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {new Date(licenseStatus.validUntil).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {(() => {
                      const days = Math.ceil(
                        (new Date(licenseStatus.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      );
                      return days > 0 ? `${days} days remaining` : "Expired";
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-4xl">
            <OfflineLicenseActivator organizationId={organization!.id} />
          </div>
        </div>
      ) : (
        <div>
          <div className="relative isolate mt-8 overflow-hidden rounded-lg bg-slate-900 px-3 pt-8 shadow-2xl sm:px-8 md:pt-12 lg:flex lg:gap-x-10 lg:px-12 lg:pt-0">
            <svg
              viewBox="0 0 1024 1024"
              className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-y-1/2 [mask-image:radial-gradient(closest-side,white,transparent)] sm:left-full sm:-ml-80 lg:left-1/2 lg:ml-0 lg:-translate-x-1/2 lg:translate-y-0"
              aria-hidden="true">
              <circle
                cx={512}
                cy={512}
                r={512}
                fill="url(#759c1415-0410-454c-8f7c-9a820de03641)"
                fillOpacity="0.7"
              />
              <defs>
                <radialGradient id="759c1415-0410-454c-8f7c-9a820de03641">
                  <stop stopColor="#00E6CA" />
                  <stop offset={0} stopColor="#00C4B8" />
                </radialGradient>
              </defs>
            </svg>
            <div className="mx-auto text-center lg:mx-0 lg:flex-auto lg:py-16 lg:text-left">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                {t("environments.settings.enterprise.unlock_the_full_power_of_formbricks_free_for_30_days")}
              </h2>
              <p className="text-md mt-6 leading-8 text-slate-300">
                {t("environments.settings.enterprise.keep_full_control_over_your_data_privacy_and_security")}
                <br />
                {t(
                  "environments.settings.enterprise.get_an_enterprise_license_to_get_access_to_all_features"
                )}
              </p>
            </div>
          </div>
          <div className="mt-8 rounded-lg border border-slate-300 bg-slate-100 shadow-sm">
            <div className="p-8">
              <h2 className="mr-2 inline-flex text-2xl font-bold text-slate-700">
                {t("environments.settings.enterprise.enterprise_features")}
              </h2>
              <ul className="my-4 space-y-4">
                {paidFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <div className="rounded-full border border-green-300 bg-green-100 p-0.5 dark:bg-green-800">
                      <CheckIcon className="h-5 w-5 p-0.5 text-green-500 dark:text-green-400" />
                    </div>
                    <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">{feature.title}</span>
                    {feature.comingSoon && (
                      <span className="mx-2 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700 dark:bg-slate-700 dark:text-teal-500">
                        {t("environments.settings.enterprise.coming_soon")}
                      </span>
                    )}
                    {feature.onRequest && (
                      <span className="mx-2 rounded-full bg-violet-100 px-3 py-1 text-xs text-violet-700 dark:bg-slate-700 dark:text-teal-500">
                        {t("environments.settings.enterprise.on_request")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {organization && <OfflineLicenseActivator organizationId={organization.id} />}
            </div>
          </div>
        </div>
      )}
    </PageContentWrapper>
  );
};

export default Page;
