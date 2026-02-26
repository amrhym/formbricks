"use client";

import {
  BarChart3Icon,
  BookOpenIcon,
  ChevronRightIcon,
  Cog,
  LogOutIcon,
  MessageCircle,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  UserCircleIcon,
  UserIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TEnvironment } from "@hivecfm/types/environment";
import { TOrganizationRole } from "@hivecfm/types/memberships";
import { TOrganization } from "@hivecfm/types/organizations";
import { TUser } from "@hivecfm/types/user";
import { NavigationLink } from "@/app/(app)/environments/[environmentId]/components/NavigationLink";
import HiveCFMLogo from "@/images/hivecfm-wordmark.svg";
import { cn } from "@/lib/cn";
import { getAccessFlags } from "@/lib/membership/utils";
import { useSignOut } from "@/modules/auth/hooks/use-sign-out";
import { ProfileAvatar } from "@/modules/ui/components/avatars";
import { Button } from "@/modules/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/modules/ui/components/dropdown-menu";

interface NavigationProps {
  environment: TEnvironment;
  user: TUser;
  organization: TOrganization;
  project: { id: string; name: string };
  isFormbricksCloud: boolean;
  isDevelopment: boolean;
  membershipRole?: TOrganizationRole;
  publicDomain: string;
}

export const MainNavigation = ({
  environment,
  organization,
  user,
  project,
  membershipRole,
  publicDomain,
}: NavigationProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isTextVisible, setIsTextVisible] = useState(true);
  const { signOut: signOutWithAudit } = useSignOut({ id: user.id, email: user.email });

  const { isBilling } = getAccessFlags(membershipRole);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    localStorage.setItem("isMainNavCollapsed", isCollapsed ? "false" : "true");
  };

  useEffect(() => {
    const isCollapsedValueFromLocalStorage = localStorage.getItem("isMainNavCollapsed") === "true";
    setIsCollapsed(isCollapsedValueFromLocalStorage);
  }, []);

  useEffect(() => {
    const toggleTextOpacity = () => {
      setIsTextVisible(isCollapsed);
    };
    const timeoutId = setTimeout(toggleTextOpacity, 150);
    return () => clearTimeout(timeoutId);
  }, [isCollapsed]);

  useEffect(() => {
    // Auto collapse project navbar on org and account settings
    if (pathname?.includes("/settings")) {
      setIsCollapsed(true);
    }
  }, [pathname]);

  const mainNavigation = useMemo(
    () => [
      {
        name: t("common.surveys"),
        href: `/environments/${environment.id}/surveys`,
        icon: MessageCircle,
        isActive: pathname?.includes("/surveys"),
        isHidden: false,
      },
      {
        href: `/environments/${environment.id}/contacts`,
        name: t("common.contacts"),
        icon: UserIcon,
        isActive: pathname?.includes("/contacts") || pathname?.includes("/segments"),
      },
      {
        name: t("common.analytics") || "Analytics",
        href: `/environments/${environment.id}/analytics`,
        icon: BarChart3Icon,
        isActive: pathname?.includes("/analytics"),
      },
      {
        name: t("common.api_docs") || "API Docs",
        href: `/environments/${environment.id}/api-docs`,
        icon: BookOpenIcon,
        isActive: pathname?.includes("/api-docs"),
      },
      {
        name: t("common.configuration"),
        href: `/environments/${environment.id}/workspace/general`,
        icon: Cog,
        isActive: pathname?.includes("/project"),
      },
    ],
    [t, environment.id, pathname]
  );

  const dropdownNavigation = [
    {
      label: t("common.account"),
      href: `/environments/${environment.id}/settings/profile`,
      icon: UserCircleIcon,
    },
  ];

  const mainNavigationLink = `/environments/${environment.id}/${isBilling ? "settings/billing/" : "surveys/"}`;

  return (
    <>
      {project && (
        <aside
          className={cn(
            "z-40 flex flex-col justify-between rounded-r-xl border-r border-slate-200 bg-white pt-3 shadow-md transition-all duration-100",
            isCollapsed ? "w-sidebar-expanded" : "w-sidebar-collapsed"
          )}>
          <div>
            {/* Logo and Toggle */}

            <div className="flex items-center justify-between px-3 pb-4">
              {!isCollapsed && (
                <Link
                  href={mainNavigationLink}
                  className={cn(
                    "flex items-center justify-center transition-opacity duration-100",
                    isTextVisible ? "opacity-0" : "opacity-100"
                  )}>
                  <Image src={HiveCFMLogo} width={160} height={40} alt="HiveCFM" />
                </Link>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className={cn(
                  "rounded-xl bg-slate-50 p-1 text-slate-600 transition-all hover:bg-slate-100 focus:ring-0 focus:ring-transparent focus:outline-none"
                )}>
                {isCollapsed ? (
                  <PanelLeftOpenIcon strokeWidth={1.5} />
                ) : (
                  <PanelLeftCloseIcon strokeWidth={1.5} />
                )}
              </Button>
            </div>

            {/* Main Nav Switch */}
            {!isBilling && (
              <ul>
                {mainNavigation.map(
                  (item) =>
                    !item.isHidden && (
                      <NavigationLink
                        key={item.name}
                        href={item.href}
                        isActive={item.isActive}
                        isCollapsed={isCollapsed}
                        isTextVisible={isTextVisible}
                        linkText={item.name}>
                        <item.icon strokeWidth={1.5} />
                      </NavigationLink>
                    )
                )}
              </ul>
            )}
          </div>

          <div>
            {/* User Switch */}
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  id="userDropdownTrigger"
                  className="w-full rounded-br-xl border-t py-4 transition-colors duration-200 hover:bg-slate-50 focus:outline-none">
                  <div
                    className={cn(
                      "flex cursor-pointer flex-row items-center gap-3",
                      isCollapsed ? "justify-center px-2" : "px-4"
                    )}>
                    <ProfileAvatar userId={user.id} />
                    {!isCollapsed && !isTextVisible && (
                      <>
                        <div
                          className={cn(isTextVisible ? "opacity-0" : "opacity-100", "grow overflow-hidden")}>
                          <p
                            title={user?.email}
                            className={cn(
                              "ph-no-capture ph-no-capture -mb-0.5 truncate text-sm font-bold text-slate-700"
                            )}>
                            {user?.name ? <span>{user?.name}</span> : <span>{user?.email}</span>}
                          </p>
                          <p className="text-sm text-slate-700">{t("common.account")}</p>
                        </div>
                        <ChevronRightIcon
                          className={cn("h-5 w-5 shrink-0 text-slate-700 hover:text-slate-500")}
                        />
                      </>
                    )}
                  </div>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  id="userDropdownInnerContentWrapper"
                  side="right"
                  sideOffset={10}
                  alignOffset={5}
                  align="end">
                  {/* Dropdown Items */}

                  {dropdownNavigation.map((link) => (
                    <Link href={link.href} className="flex w-full items-center" key={link.label}>
                      <DropdownMenuItem>
                        <link.icon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        {link.label}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                  {/* Logout */}
                  <DropdownMenuItem
                    onClick={async () => {
                      const loginUrl = `${publicDomain}/auth/login`;
                      const route = await signOutWithAudit({
                        reason: "user_initiated",
                        redirectUrl: loginUrl,
                        organizationId: organization.id,
                        redirect: false,
                        callbackUrl: loginUrl,
                        clearEnvironmentId: true,
                      });
                      router.push(route?.url || loginUrl); // NOSONAR // We want to check for empty strings
                    }}
                    icon={<LogOutIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />}>
                    {t("common.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </aside>
      )}
    </>
  );
};
