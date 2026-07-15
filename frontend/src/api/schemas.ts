import { z } from 'zod';

export const VariationSchema = z.object({
  id: z.number(),
  generation_id: z.number(),
  image_path: z.string(),
  seed: z.number(),
  created_at: z.string(),
});

export const GenerationStatusSchema = z.enum(['pending', 'analyzed', 'completed', 'failed', 'failed_analysis']);

export const GenerationOutSchema = z.object({
  id: z.number(),
  original_image_path: z.string(),
  room_type_detected: z.string().nullable(),
  room_confidence: z.number().nullable(),
  style: z.string(),
  redesign_prompt: z.string(),
  prompt_version: z.string().nullable(),
  analysis_json: z.string().nullable(),
  parent_generation_id: z.number().nullable(),
  provider: z.string().nullable(),
  provider_version: z.string().nullable(),
  model_used: z.string(),
  model_version: z.string().nullable(),
  status: GenerationStatusSchema,
  error: z.string().nullable(),
  processing_time_sec: z.number(),
  selected_variation_id: z.number().nullable(),
  created_at: z.string(),
  variations: z.array(VariationSchema),
});

export const AnalyzeResponseSchema = z.object({
  analysis_id: z.number(),
  analysis_confidence: z.number().optional(),
  room_type: z.string(),
  movable_objects: z.array(z.object({
    item: z.string(),
    description: z.string(),
    price_min: z.number().nullable().optional(),
    price_max: z.number().nullable().optional(),
    purchase_status: z.enum(['keep_existing', 'new_purchase', 'optional_upgrade']).optional(),
    dimensions: z.string().optional(),
    confidence: z.enum(['Low', 'Medium', 'High']).optional(),
  })).optional(),
  built_in_objects: z.array(z.object({
    item: z.string(),
    description: z.string(),
    price_min: z.number().nullable().optional(),
    price_max: z.number().nullable().optional(),
    purchase_status: z.enum(['keep_existing', 'new_purchase', 'optional_upgrade']).optional(),
    dimensions: z.string().optional(),
    confidence: z.enum(['Low', 'Medium', 'High']).optional(),
  })).optional(),
  furniture: z.array(z.object({
    item: z.string(),
    description: z.string(),
    estimated_price_range: z.string(),
  })),
  estimated_dimensions: z.object({
    width_ft: z.number(),
    length_ft: z.number(),
    confidence: z.enum(['low', 'medium', 'high']),
  }),
  layout_notes: z.string(),
  color_palette: z.array(z.object({ name: z.string(), hex: z.string() })),
  lighting_suggestions: z.string(),
  estimated_budget_range: z.string(),
  style_explanation: z.string(),
  redesign_prompt: z.string(),
});

export const StyleOptionSchema = z.object({
  id: z.string(),
  furniture: z.array(z.string()),
  palette: z.array(z.string()),
  budget_tag: z.enum(['Budget', 'Mid', 'Premium']),
  reason_template: z.string(),
});

export const AppConfigSchema = z.object({
  max_upload_mb: z.number(),
  allowed_types: z.array(z.string()),
});

export const HealthStatusSchema = z.object({
  status: z.string(),
  providers: z.object({ gemini: z.boolean(), replicate: z.boolean() }),
});
