import { OrganizationRole } from "@prisma/client";
import { OperationNotAllowedError } from "@hivecfm/types/errors";
import { TSurveyStatus } from "@hivecfm/types/surveys/types";

const ADMIN_TRANSITIONS: Record<string, TSurveyStatus[]> = {
  draft: ["inProgress", "underReview"],
  underReview: ["inProgress", "draft"],
  inProgress: ["paused", "completed"],
  paused: ["inProgress", "completed"],
  completed: [],
};

const MEMBER_TRANSITIONS: Record<string, TSurveyStatus[]> = {
  draft: ["underReview"],
  underReview: [],
  inProgress: [],
  paused: [],
  completed: [],
};

export const isAdminRole = (role: OrganizationRole): boolean => role === "owner" || role === "manager";

export const validateStatusTransition = (
  currentStatus: TSurveyStatus,
  newStatus: TSurveyStatus,
  role: OrganizationRole
): void => {
  const transitions = isAdminRole(role) ? ADMIN_TRANSITIONS : MEMBER_TRANSITIONS;
  const allowed = transitions[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new OperationNotAllowedError(
      `Cannot transition from "${currentStatus}" to "${newStatus}" with role "${role}"`
    );
  }
};
