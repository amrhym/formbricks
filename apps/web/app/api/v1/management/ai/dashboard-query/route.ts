import { NextRequest } from "next/server";
import { z } from "zod";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { isAIConfigured } from "@/lib/ai/client";
import { generateDashboardQuery } from "@/lib/ai/dashboard-assistant";
import { getOrganizationsByUserId } from "@/lib/organization/service";
import { getServerSession } from "@/modules/auth/lib/authOptions";

const ZDashboardQueryInput = z.object({
  query: z.string().min(3).max(500),
  organizationId: z.string().optional(),
});

export const POST = async (req: NextRequest) => {
  const session = await getServerSession();
  if (!session?.user) {
    return responses.notAuthenticatedResponse();
  }

  if (!isAIConfigured()) {
    return responses.badRequestResponse("AI is not configured. Set KIMI_API_KEY environment variable.");
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return responses.badRequestResponse("Invalid JSON");
  }

  const validation = ZDashboardQueryInput.safeParse(body);
  if (!validation.success) {
    return responses.badRequestResponse("Invalid input", transformErrorToDetails(validation.error));
  }

  // Get organization ID
  let organizationId = validation.data.organizationId;
  if (!organizationId) {
    const orgs = await getOrganizationsByUserId(session.user.id);
    if (orgs.length === 0) {
      return responses.badRequestResponse("No organization found");
    }
    organizationId = orgs[0].id;
  }

  try {
    const result = await generateDashboardQuery({
      userQuery: validation.data.query,
      organizationId,
    });

    if (!result) {
      return responses.badRequestResponse("Could not generate query");
    }

    return responses.successResponse({ result });
  } catch (error: any) {
    return responses.internalServerErrorResponse(error.message);
  }
};
