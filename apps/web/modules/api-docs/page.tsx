import { ExternalLinkIcon } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { getTranslate } from "@/lingodotdev/server";
import { Button } from "@/modules/ui/components/button";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { ApiDocsContent } from "./components/ApiDocsContent";

export const metadata: Metadata = {
  title: "API Documentation",
};

interface ApiDocsPageProps {
  params: Promise<{
    environmentId: string;
  }>;
}

export const ApiDocsPage = async (_props: ApiDocsPageProps) => {
  const t = await getTranslate();

  const ApiDocsButtons = () => {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" asChild>
          <Link href="https://github.com/formbricks/formbricks" target="_blank" rel="noopener noreferrer">
            GitHub
            <ExternalLinkIcon className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  };

  return (
    <PageContentWrapper>
      <PageHeader pageTitle={t("common.api_docs") || "API Documentation"} cta={<ApiDocsButtons />} />
      <ApiDocsContent />
    </PageContentWrapper>
  );
};
