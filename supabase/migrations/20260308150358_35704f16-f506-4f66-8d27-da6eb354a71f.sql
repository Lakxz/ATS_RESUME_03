-- Add new stages to application_status enum
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'shortlisted' AFTER 'pending';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'interview' AFTER 'shortlisted';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'offer' AFTER 'interview';