"use server";

// Re-export the approve/reject actions from the editor module
// so they can be imported from the approval queue context
export { approveSurveyAction, rejectSurveyAction } from "@/modules/survey/editor/actions";
