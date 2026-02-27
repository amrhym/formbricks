import { Metadata } from "next";
import Link from "next/link";
import { getTranslate } from "@/lingodotdev/server";
import { getEnvironmentAuth } from "@/modules/environments/lib/utils";
import { Button } from "@/modules/ui/components/button";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { ApprovalQueueList } from "./components/approval-queue-list";
import { getSurveysUnderReview } from "./lib/survey";

export const metadata: Metadata = {
  title: "Approval Queue",
};

interface ApprovalQueuePageProps {
  params: Promise<{
    environmentId: string;
  }>;
}

export const ApprovalQueuePage = async ({ params: paramsProps }: ApprovalQueuePageProps) => {
  const params = await paramsProps;
  const t = await getTranslate();
  const { isOwner, isManager, environment } = await getEnvironmentAuth(params.environmentId);

  const isAdmin = isOwner || isManager;

  if (!isAdmin) {
    return (
      <PageContentWrapper>
        <PageHeader pageTitle={t("environments.surveys.approval_queue.title")} />
        <div className="flex h-96 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-500">You do not have permission to view the approval queue.</p>
        </div>
      </PageContentWrapper>
    );
  }

  const surveysUnderReview = await getSurveysUnderReview(environment.id);

  return (
    <PageContentWrapper>
      <PageHeader
        pageTitle={t("environments.surveys.approval_queue.title")}
        cta={
          <Button size="sm" variant="secondary" asChild>
            <Link href={`/environments/${environment.id}/surveys`}>Back to Surveys</Link>
          </Button>
        }
      />
      <ApprovalQueueList surveys={surveysUnderReview} environmentId={environment.id} />
    </PageContentWrapper>
  );
};
