// Типы соответствуют таблицам из supabase/schema.sql

export type UUID = string;

export interface CaseRecord {
  id: UUID;
  title: string;
  price: number;
  intro_text: string;
  start_location_id: UUID | null;
  is_published: boolean;
}

export interface LocationRecord {
  id: UUID;
  case_id: UUID;
  name: string;
  image_url: string | null;
  reveal_trigger_id: UUID | null;
}

export interface CharacterRecord {
  id: UUID;
  case_id: UUID;
  location_id: UUID | null;
  name: string;
  portrait_url: string | null;
  is_expert: boolean;
  specialization: string | null;
}

export interface EvidenceRecord {
  id: UUID;
  case_id: UUID;
  name: string;
  image_url: string | null;
  description: string | null;
}

export interface DialogueTopic {
  id: UUID;
  character_id: UUID;
  topic_type: "evidence" | "character";
  topic_ref_id: UUID;
}

export interface DialogueResponse {
  id: UUID;
  topic_id: UUID;
  response_text: string;
  reveals: {
    locations: UUID[];
    characters: UUID[];
    evidence: UUID[];
  };
}

export interface AccusationQuestion {
  id: UUID;
  case_id: UUID;
  question_text: string;
  required_evidence_ids: UUID[];
  order_index: number;
}

export interface GameSession {
  id: UUID;
  purchase_id: UUID;
  current_location_id: UUID | null;
  elapsed_minutes: number;
  status: "in_progress" | "finished";
  score: number | null;
}

export interface SessionState {
  session_id: UUID;
  discovered_locations: UUID[];
  discovered_characters: UUID[];
  discovered_evidence: UUID[];
  collected_evidence: UUID[];
}

/** То, что отдаём на фронтенд для отрисовки текущей локации — уже отфильтровано по discovered_*. */
export interface LocationView {
  session: GameSession;
  location: LocationRecord;
  charactersHere: CharacterRecord[];
  expertsAvailable: CharacterRecord[];
  evidenceHere: EvidenceRecord[];
}
