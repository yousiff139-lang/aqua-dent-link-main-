-- Add X-Ray Analysis Support to Medical Documents
-- This migration adds fields to track X-ray classification and analysis results

-- Add new columns to medical_documents table
ALTER TABLE medical_documents 
ADD COLUMN IF NOT EXISTS is_xray BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS xray_format TEXT CHECK (xray_format IN ('DCM', 'PNG', 'JPEG', 'DICOM', NULL)),
ADD COLUMN IF NOT EXISTS xray_analysis_result JSONB,
ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed', 'not_xray'));

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_medical_documents_is_xray ON medical_documents(is_xray);
CREATE INDEX IF NOT EXISTS idx_medical_documents_analysis_status ON medical_documents(analysis_status);
CREATE INDEX IF NOT EXISTS idx_medical_documents_analyzed_at ON medical_documents(analyzed_at);

-- Add comments for documentation
COMMENT ON COLUMN medical_documents.is_xray IS 'Whether this document is classified as an X-ray image';
COMMENT ON COLUMN medical_documents.xray_format IS 'Format of the X-ray file (DCM/DICOM, PNG, JPEG)';
COMMENT ON COLUMN medical_documents.xray_analysis_result IS 'JSON result from AI analysis containing detections, confidence scores, etc.';
COMMENT ON COLUMN medical_documents.analyzed_at IS 'Timestamp when the X-ray was analyzed by AI';
COMMENT ON COLUMN medical_documents.analysis_status IS 'Current status of X-ray analysis: pending, analyzing, completed, failed, or not_xray';

-- Create function to update analysis timestamp
CREATE OR REPLACE FUNCTION update_xray_analyzed_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.analysis_status = 'completed' AND OLD.analysis_status != 'completed' THEN
        NEW.analyzed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update analyzed_at timestamp
DROP TRIGGER IF EXISTS update_xray_analyzed_timestamp_trigger ON medical_documents;
CREATE TRIGGER update_xray_analyzed_timestamp_trigger
    BEFORE UPDATE ON medical_documents
    FOR EACH ROW 
    WHEN (NEW.analysis_status = 'completed')
    EXECUTE FUNCTION update_xray_analyzed_timestamp();

-- Grant necessary permissions
GRANT SELECT, UPDATE ON medical_documents TO authenticated;
