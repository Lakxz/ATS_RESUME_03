
# ATS Resume Checker - Implementation Plan

## Backend Setup (Supabase + Lovable Cloud)

### Database Tables
- **profiles** - User profile data (name, email, phone, linked to auth.users)
- **user_roles** - Role-based access (admin/user roles, secure enum-based)
- **keywords** - Admin-managed ATS keywords with priority weights
- **resumes** - Uploaded resumes (file reference, job role, user_id)
- **resume_analyses** - ATS scores, matched/missing keywords, suggestions per resume
- **applications** - Application status tracking (pending/selected/rejected)

### Storage
- **resumes** bucket for PDF/DOCX uploads

### Edge Functions
1. **analyze-resume** - Extracts text from uploaded resume, sends to Lovable AI (Gemini) to semantically match against admin keywords, calculates weighted ATS score, returns matched/missing keywords and improvement suggestions
2. **send-notification** - Sends selection/rejection emails via Resend API
3. **chat** (optional) - AI-powered resume improvement suggestions

## Pages & Features

### Auth
- Login/Register pages with role-based routing
- Admin and User roles stored securely in user_roles table

### User Panel
- **Dashboard** - Overview of submitted resumes and scores
- **Upload Resume** - Upload PDF/DOCX, enter name/email/phone/job role
- **Analysis Results** - ATS score (0-100), matched keywords, missing keywords, improvement suggestions
- **Resume Preview** - View uploaded resume in-browser

### Admin Panel
- **Dashboard Analytics** - Total applicants, average ATS score, top candidates, score distribution chart (Recharts)
- **Keyword Management** - CRUD for ATS keywords with priority weights
- **Applicant Management** - View all applicants with resume, score, matched keywords; filter by score; search by name/role
- **Selection Actions** - Mark as Selected/Rejected; triggers automated email via Resend

### Email Notifications
- Congratulations email on selection (job role, next steps)
- Powered by Resend API through edge function

## UI Design
- Clean dashboard layout with sidebar navigation
- Responsive design using Tailwind CSS
- Cards, tables, and charts for data display
- Score displayed as circular progress indicator
