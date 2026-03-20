import { NextRequest, NextResponse } from "next/server";
import { TIntegrationGenesysCloud } from "@hivecfm/types/integration/genesys-cloud";
import { getIntegrationByType } from "@/lib/integration/service";

export async function GET(req: NextRequest) {
  const environmentId = req.nextUrl.searchParams.get("environmentId");
  const surveyId = req.nextUrl.searchParams.get("surveyId");

  if (!environmentId) {
    return NextResponse.json({ error: "environmentId required" }, { status: 400 });
  }

  try {
    const integration = (await getIntegrationByType(
      environmentId,
      "genesysCloud"
    )) as TIntegrationGenesysCloud | null;

    if (!integration?.config?.data) {
      return NextResponse.json({ mappings: [] });
    }

    let mappings = integration.config.data as any[];

    // Filter by surveyId if provided (prompt names contain the survey ID)
    if (surveyId) {
      const surveyPrefix = `hivecfm_${surveyId}`.replace(/[^a-zA-Z0-9_]/g, "_");
      mappings = mappings.filter((m: any) => m.promptName?.startsWith(surveyPrefix));
    }

    return NextResponse.json({ mappings });
  } catch {
    return NextResponse.json({ mappings: [] });
  }
}
