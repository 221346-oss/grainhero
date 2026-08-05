-- Add best_window_size column to ml_model_metadata table
ALTER TABLE ml_model_metadata
    ADD COLUMN IF NOT EXISTS best_window_size INTEGER DEFAULT 10;
