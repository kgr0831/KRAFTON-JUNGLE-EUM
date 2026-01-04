-- Migration: Add source_lang column to voice_records table
-- Date: 2026-01-05
-- Description: Track the original language of the speaker for STT transcripts

-- Add source_lang column
ALTER TABLE voice_records
ADD COLUMN IF NOT EXISTS source_lang VARCHAR(10);

-- Add comment for documentation
COMMENT ON COLUMN voice_records.source_lang IS 'Source language of the speaker (ko, en, ja, zh)';

-- Optional: Add index for language-based queries
-- CREATE INDEX IF NOT EXISTS idx_voice_records_source_lang ON voice_records(source_lang);
