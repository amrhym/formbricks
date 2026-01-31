import { z } from "zod";
import { ZId } from "@hivecfm/types/common";
import { ZSurveyType } from "@hivecfm/types/surveys/types";

/**
 * Lenient schema for draft survey updates.
 * Validates essential fields for security/functionality but allows incomplete survey data.
 * Full validation (ZSurvey) is enforced when publishing.
 */
export const ZSurveyDraft = z
  .object({
    // Essential fields - strictly validated
    id: ZId,
    status: z.enum(["draft", "underReview"]),
    environmentId: ZId,
    type: ZSurveyType,
    name: z.string().min(1, "Survey name is required"),

    // Required fields for database operations - loosely validated
    blocks: z.array(z.record(z.unknown())).optional(),
    triggers: z.array(z.record(z.unknown())).optional(),
    endings: z.array(z.record(z.unknown())).optional(),
    segment: z.record(z.unknown()).nullable().optional(),

    // Review fields
    reviewNote: z.string().nullable().optional(),
    reviewedBy: z.string().nullable().optional(),
    reviewedAt: z.date().nullable().optional(),
  })
  .passthrough(); // Allow all other fields without validation

export type TSurveyDraft = z.infer<typeof ZSurveyDraft>;
