import { ExternalLinkIcon } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { getTranslate } from "@/lingodotdev/server";
import { Button } from "@/modules/ui/components/button";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { ChannelConfigEmbed } from "./components/ChannelConfigEmbed";

const GENESYS_ADAPTER_URL = process.env.NEXT_PUBLIC_GENESYS_ADAPTER_URL || "https://hivecfm.xcai.io";

export const metadata: Metadata = {
  title: "Integrations",
};

interface IntegrationsPageProps {
  params: Promise<{
    environmentId: string;
  }>;
}

export const IntegrationsPage = async (_props: IntegrationsPageProps) => {
  const t = await getTranslate();

  const IntegrationsButtons = () => {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" asChild>
          <Link href={`${GENESYS_ADAPTER_URL}/admin/`} target="_blank" rel="noopener noreferrer">
            Open in New Tab
            <ExternalLinkIcon className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  };

  return (
    <PageContentWrapper>
      <PageHeader pageTitle={t("common.integrations") || "Integrations"} cta={<IntegrationsButtons />} />
      <div className="h-[calc(100vh-200px)] min-h-[600px]">
        <ChannelConfigEmbed title="Channel Configuration" height="100%" />
      </div>
    </PageContentWrapper>
  );
};
