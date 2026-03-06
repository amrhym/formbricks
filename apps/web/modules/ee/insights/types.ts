export interface SearchResult {
  feedback_record_id: string;
  score: number;
  field_label: string;
  value_text: string;
  source_id: string;
  source_name: string;
  submission_id: string;
  collected_at: string;
  sentiment: string;
  sentiment_score: number;
}

export interface SearchFilters {
  sourceId?: string;
  since?: string;
  until?: string;
  minScore?: number;
}

export interface SurveyOption {
  id: string;
  name: string;
}

export type ViewMode = "list" | "grouped" | "timeline";
