-- Migration: Create voice_records table
-- Date: 2026-01-05
-- Description: STT/Translation records for meetings

-- Create voice_records table
CREATE TABLE IF NOT EXISTS voice_records (
    id BIGSERIAL PRIMARY KEY,
    meeting_id BIGINT NOT NULL,
    speaker_id BIGINT,
    speaker_name VARCHAR(100),
    original TEXT NOT NULL,
    translated TEXT,
    source_lang VARCHAR(10),
    target_lang VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraint
    CONSTRAINT fk_voice_records_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES meetings(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_voice_records_speaker
        FOREIGN KEY (speaker_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_voice_records_meeting_id ON voice_records(meeting_id);
CREATE INDEX IF NOT EXISTS idx_voice_records_created_at ON voice_records(created_at);
CREATE INDEX IF NOT EXISTS idx_voice_records_speaker_id ON voice_records(speaker_id);

-- Add comment for documentation
COMMENT ON TABLE voice_records IS 'STT transcription and translation records for meetings';
COMMENT ON COLUMN voice_records.original IS 'Original STT transcription text';
COMMENT ON COLUMN voice_records.translated IS 'Translated text (if applicable)';
COMMENT ON COLUMN voice_records.source_lang IS 'Source language of the speaker (ko, en, ja, zh)';
COMMENT ON COLUMN voice_records.target_lang IS 'Target translation language';
