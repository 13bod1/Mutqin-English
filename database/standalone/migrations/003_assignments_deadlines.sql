-- ============================================================================
-- Project: Mr. Adel Mostafa EdTech Platform (Project Key: AG)
-- Jira Subtask: AG-14 (DB-05: DDL Migration 003 - Assignments, Countdown
--               Deadlines & Moodle-like Submissions)
-- Parent Story: AG-9 (Database Elements & Relational Persistence Layer)
-- SRS Alignment: Section 5.2 (Assignments & Homework Evaluation - P3),
--                UC-02 (Submit Homework & View Evaluation), & Section 10
-- Target Engine: PostgreSQL 15+ / 16+
-- Migration ID: 003_assignments_deadlines (UP Migration)
-- ============================================================================

BEGIN;

-- Zero-downtime migration safety timeouts
SET lock_timeout = '5s';
SET statement_timeout = '30s';
SET client_encoding = 'UTF8';

-- ============================================================================
-- 1. Prerequisite Extensions & Utility Trigger Function
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Custom Domain ENUM Types (Assignment & Submission Life Cycle)
-- ============================================================================
-- SRS Section 5.2 & Section 10: Moodle-Style Homework Submission Status Lifecycle
--   * submitted : File uploaded successfully by student before deadline; pending evaluation
--   * graded    : Evaluated by teacher or teaching assistant with score and feedback
--   * late      : Uploaded after deadline_at cutoff timestamp; flagged for late grading policy
--   * rejected  : Rejected by grader due to corrupt file, wrong format, or academic dishonesty
CREATE TYPE submission_status_enum AS ENUM (
    'submitted',
    'graded',
    'late',
    'rejected'
);

COMMENT ON TYPE submission_status_enum IS 'Lifecycle states for homework submissions: submitted (pending), graded, late, or rejected (SRS Sec 5.2 & 10).';

-- ============================================================================
-- 3. Table: assignments (منظومة الواجبات والتكليفات والعد التنازلي)
-- ============================================================================
-- SRS Section 5.2 & Section 10:
--   * Attached directly to recorded/live lectures (ON DELETE CASCADE)
--   * Strict deadline_at with server-side countdown synchronization
--   * Teacher PDF worksheet attachment URL for student download
--   * Positive max_score (> 0) and non-negative points_reward (>= 0) for gamification
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    instructions TEXT,
    pdf_attachment_url VARCHAR(1024),
    deadline_at TIMESTAMPTZ NOT NULL,
    max_score NUMERIC(6, 2) NOT NULL DEFAULT 100.00,
    points_reward INTEGER NOT NULL DEFAULT 15,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_assignment_title_not_empty CHECK (char_length(trim(title)) > 0),
    CONSTRAINT check_assignment_max_score CHECK (max_score > 0.00),
    CONSTRAINT check_assignment_points_reward CHECK (points_reward >= 0),
    CONSTRAINT check_assignment_pdf_attachment_url CHECK (
        pdf_attachment_url IS NULL OR char_length(trim(pdf_attachment_url)) > 0
    )
);

COMMENT ON TABLE assignments IS 'Coursework assignments and homework sheets with synchronized countdown deadlines and gamification rewards (SRS Sec 5.2 & 10).';
COMMENT ON COLUMN assignments.lecture_id IS 'Cascading foreign key to lectures(id); deleting a lecture removes its associated assignments.';
COMMENT ON COLUMN assignments.title IS 'Human-readable assignment title (e.g., Homework Sheet 03 - Past Perfect & Relative Clauses).';
COMMENT ON COLUMN assignments.instructions IS 'Detailed homework guidelines, submission rules, and rubrics authored by the teacher.';
COMMENT ON COLUMN assignments.pdf_attachment_url IS 'Cloudflare R2 / S3 storage URL for the downloadable homework worksheet PDF.';
COMMENT ON COLUMN assignments.deadline_at IS 'Strict cutoff timestamp driving the student countdown timer and late submission detection.';
COMMENT ON COLUMN assignments.max_score IS 'Maximum attainable grade points for this assignment (strictly > 0).';
COMMENT ON COLUMN assignments.points_reward IS 'Gamification points awarded to the student upon successful on-time submission/passing (>= 0).';
COMMENT ON COLUMN assignments.is_published IS 'Visibility flag; allows teachers to draft assignments before opening submissions to students.';

CREATE TRIGGER trg_assignments_updated_at
BEFORE UPDATE ON assignments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- ============================================================================
-- 4. Table: assignment_submissions (تسليمات الطلاب ونظام التصحيح الشبيه بمودل)
-- ============================================================================
-- SRS Section 5.2 & Section 10:
--   * Exactly ONE submission per student per assignment: UNIQUE(assignment_id, student_id)
--   * File MIME restricted to PDF, JPG, and PNG documents
--   * Server-side late submission flag (is_late) based on deadline_at comparison
--   * Teacher feedback, score awarded, and assistant grader FK linkage
CREATE TABLE assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_url VARCHAR(1024) NOT NULL,
    file_mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_late BOOLEAN NOT NULL DEFAULT false,
    score_awarded NUMERIC(6, 2),
    status submission_status_enum NOT NULL DEFAULT 'submitted',
    teacher_feedback TEXT,
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_assignment_student_submission UNIQUE (assignment_id, student_id),
    CONSTRAINT check_submission_file_mime_type CHECK (
        file_mime_type IN ('application/pdf', 'image/jpeg', 'image/png')
    ),
    CONSTRAINT check_submission_file_url_not_empty CHECK (char_length(trim(file_url)) > 0),
    CONSTRAINT check_submission_file_size CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
    CONSTRAINT check_submission_score_awarded CHECK (score_awarded IS NULL OR score_awarded >= 0.00),
    CONSTRAINT check_submission_grading_timeline CHECK (graded_at IS NULL OR graded_at >= submitted_at)
);

COMMENT ON TABLE assignment_submissions IS 'Moodle-like student homework submissions supporting PDF/JPG/PNG files, grading workflows, and late-submission flags (SRS Sec 5.2 & 10).';
COMMENT ON COLUMN assignment_submissions.assignment_id IS 'Cascading foreign key to assignments(id); purges submissions if assignment is removed.';
COMMENT ON COLUMN assignment_submissions.student_id IS 'Cascading foreign key to users(id); student author of the submission.';
COMMENT ON COLUMN assignment_submissions.file_url IS 'Secure Cloudflare R2 / S3 pre-signed URL for the uploaded solution file.';
COMMENT ON COLUMN assignment_submissions.file_mime_type IS 'Enforced MIME type whitelist: application/pdf, image/jpeg, image/png.';
COMMENT ON COLUMN assignment_submissions.file_size_bytes IS 'Optional file payload size in bytes for audit and quota monitoring.';
COMMENT ON COLUMN assignment_submissions.submitted_at IS 'Server timestamp when the student confirmed submission.';
COMMENT ON COLUMN assignment_submissions.is_late IS 'Boolean flag computed against assignment deadline_at (true if submitted_at > deadline_at).';
COMMENT ON COLUMN assignment_submissions.score_awarded IS 'Graded numerical score (0 <= score_awarded <= assignment.max_score).';
COMMENT ON COLUMN assignment_submissions.status IS 'Submission lifecycle status: submitted, graded, late, or rejected.';
COMMENT ON COLUMN assignment_submissions.teacher_feedback IS 'Pedagogical qualitative feedback, corrections, or notes from the teacher/assistant.';
COMMENT ON COLUMN assignment_submissions.graded_by IS 'Foreign key to users(id) for the teacher or assistant who graded this work (ON DELETE SET NULL).';
COMMENT ON COLUMN assignment_submissions.graded_at IS 'Timestamp when grade and feedback were recorded.';

CREATE TRIGGER trg_assignment_submissions_updated_at
BEFORE UPDATE ON assignment_submissions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- ============================================================================
-- 5. Trigger Function: Submission Validation, Countdown & Grade Synchronization
-- ============================================================================
-- Automates Moodle-like business rules:
--   1. Rejects score_awarded exceeding the assignment max_score
--   2. Detects countdown deadline expiration and automatically marks is_late = true
--   3. Promotes status to 'late' if un-evaluated and submitted past deadline
--   4. Sets graded_at and advances status to 'graded' when a score is awarded
CREATE OR REPLACE FUNCTION trg_fn_process_assignment_submission()
RETURNS TRIGGER AS $$
DECLARE
    v_deadline TIMESTAMPTZ;
    v_max_score NUMERIC(6, 2);
BEGIN
    -- Retrieve parent assignment constraints
    SELECT deadline_at, max_score
    INTO v_deadline, v_max_score
    FROM assignments
    WHERE id = NEW.assignment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Assignment % does not exist.', NEW.assignment_id;
    END IF;

    -- 1. Validate score upper boundary against assignment max_score
    IF NEW.score_awarded IS NOT NULL AND NEW.score_awarded > v_max_score THEN
        RAISE EXCEPTION 'Awarded score (%) exceeds assignment max_score (%).', NEW.score_awarded, v_max_score;
    END IF;

    -- 2. Countdown Deadline Synchronization & Automatic Late Flagging
    IF NEW.submitted_at > v_deadline THEN
        NEW.is_late := true;
        IF NEW.status = 'submitted' THEN
            NEW.status := 'late';
        END IF;
    END IF;

    -- 3. Automatic Grading Lifecycle Synchronization
    IF NEW.score_awarded IS NOT NULL THEN
        IF NEW.graded_at IS NULL THEN
            NEW.graded_at := CURRENT_TIMESTAMP;
        END IF;
        IF NEW.status IN ('submitted', 'late') THEN
            NEW.status := 'graded';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assignment_submissions_process
BEFORE INSERT OR UPDATE ON assignment_submissions
FOR EACH ROW
EXECUTE FUNCTION trg_fn_process_assignment_submission();

-- ============================================================================
-- 6. Foundational Performance & Query Indexes (SRS Section 10 & AG-18 Alignment)
-- ============================================================================
-- Foreign key lookup indexes
CREATE INDEX idx_assignments_lecture_id ON assignments(lecture_id);
CREATE INDEX idx_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON assignment_submissions(student_id);

-- Deadline & Countdown query optimization:
-- Fast lookup for active assignments with impending deadlines for dashboard countdown timers
CREATE INDEX idx_assignments_deadline_at ON assignments(deadline_at);
CREATE INDEX idx_assignments_published_deadline ON assignments(is_published, deadline_at) WHERE is_published = true;

-- Grading queue & status filtering indexes:
-- Facilitates assistant review queues (e.g. SELECT * FROM assignment_submissions WHERE status = 'submitted')
CREATE INDEX idx_submissions_status ON assignment_submissions(status);
CREATE INDEX idx_submissions_late ON assignment_submissions(is_late) WHERE is_late = true;
CREATE INDEX idx_submissions_graded_by ON assignment_submissions(graded_by) WHERE graded_by IS NOT NULL;

COMMIT;
