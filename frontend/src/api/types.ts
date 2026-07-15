export interface User {
  id: number;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  username: string | null;
  bio: string | null;
  theme_preference: string;
  email_notifications: boolean;
  profile_completed: boolean;
  active_text_provider: string | null;
  active_image_provider: string | null;
  created_at: string;
}

export interface UserUpdate {
  display_name?: string | null;
  username?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  theme_preference?: string | null;
  profile_completed?: boolean | null;
  active_text_provider?: string | null;
  active_image_provider?: string | null;
}

export interface SettingsUpdate {
  theme_preference?: string | null;
  email_notifications?: boolean | null;
}

export interface Variation {
  id: number;
  generation_id: number;
  image_path: string;
  seed: number;
  created_at: string;
}

export type GenerationStatus = 'pending' | 'analyzed' | 'completed' | 'failed' | 'failed_analysis';

export interface GenerationOut {
  id: number;
  original_image_path: string;
  room_type_detected: string | null;
  room_confidence: number | null;
  style: string;
  redesign_prompt: string;
  prompt_version: string | null;
  analysis_json: string | null;
  parent_generation_id: number | null;
  provider: string | null;
  provider_version: string | null;
  model_used: string;
  model_version: string | null;
  status: GenerationStatus;
  error: string | null;
  processing_time_sec: number;
  selected_variation_id: number | null;
  created_at: string;
  variations: Variation[];
}

export interface Project {
    id: number;
    original_image_path: string;
    room_type_detected: string | null;
    style: string;
    created_at: string;
    last_updated_at: string;
    version_count: number;
    latest_generation: GenerationOut;
}

export interface ProjectDetails {
    project: Project;
    timeline: GenerationOut[];
}

export interface FurnitureItem {
  item: string;
  description: string;
  price_min: number;
  price_max: number;
  purchase_status: 'new_purchase' | 'keep_existing' | 'optional_upgrade';
  dimensions?: string;
  confidence?: 'High' | 'Medium' | 'Low';
}

export interface ColorSwatch {
  name: string;
  hex: string;
}

export interface AnalyzeResponse {
  analysis_id: number;
  analysis_confidence?: number;
  room_type: string;
  movable_objects?: FurnitureItem[];
  built_in_objects?: FurnitureItem[];
  furniture?: FurnitureItem[]; // legacy fallback
  estimated_dimensions: { width_ft: number; length_ft: number; confidence: 'low' | 'medium' | 'high' };
  layout_notes: string;
  color_palette: ColorSwatch[];
  lighting_suggestions: string;
  budget_summary: {
    required_purchase_total: { min: number; max: number };
    optional_upgrade_total: { min: number; max: number };
    grand_total: { min: number; max: number };
    items_to_buy_count: number;
    items_kept_count: number;
  };
  style_explanation: string;
  redesign_prompt: string;
  design_rationale?: {
    overview: string;
    observations: string[];
    watch_out: string;
  };
}

export interface StyleOption {
  id: string;
  furniture: string[];
  palette: string[];
  budget_tag: 'Budget' | 'Mid' | 'Premium';
  reason_template: string;
}

export interface CustomizationOptions {
  must_have_furniture?: string[];
  color_preference?: string;
  budget_tier?: 'Budget-Friendly' | 'Mid-Range' | 'Premium';
  lighting_preference?: 'Warm' | 'Cool' | 'Natural daylight';
  room_width_ft?: number;
  room_length_ft?: number;
  avoid?: string[];
  style_override?: string;
}

export interface AppConfig {
  max_upload_mb: number;
  allowed_types: string[];
}

export interface HealthStatus {
  status: string;
  providers: { gemini: boolean; replicate: boolean };
}
