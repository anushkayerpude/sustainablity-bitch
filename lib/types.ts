export type Role = 'student' | 'teacher';

export interface User {
  id: string;
  personal_id: string; // e.g. 2023-CS-042 or PROF-CS-01
  name: string;
  email: string;
  role: Role;
  department: string;
  semester?: number;
  batch?: string;
  avatar?: string;
}

export interface Subject {
  id: string;
  code: string;
  title: string;
  department: string;
  semester: number;
  teacher_id: string;
  teacher_name?: string;
}

export interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  is_hidden?: boolean;
  explanation?: string;
}

export interface SimultaneousProof {
  session_code: string;
  lab_room: string;
  joined_at: string;
  submission_time?: string;
  run_count: number;
  keystrokes: number;
  live_verified: boolean;
  verification_hash?: string;
  tamper_proof_seal?: string;
  ip_simulated?: string;
  teacher_signed_by?: string;
  teacher_signed_at?: string;
}

export interface Practical {
  id: string;
  subject_id: string;
  subject_code?: string;
  subject_title?: string;
  exp_number: number;
  title: string;
  aim: string;
  theory: string;
  algorithm: string;
  supported_languages: string[];
  default_language: string;
  starter_codes: Record<string, string>;
  test_cases: TestCase[];
  max_marks: number;
  due_date: string;
  created_at: string;
  
  // Dynamic fields from student submission
  submission_status?: 'not_started' | 'draft' | 'in_progress' | 'submitted' | 'verified' | 'rejected';
  submission?: Submission;
  has_active_session?: boolean;
  active_session?: LiveSession;
  simultaneous_proof?: SimultaneousProof | null;
  marks_obtained?: number | null;
  teacher_remarks?: string | null;
  teacher_signature?: string | null;
  verified_at?: string | null;
  submitted_language?: string;
  submitted_updated_at?: string;
}

export interface Submission {
  id: string;
  practical_id: string;
  student_id: string;
  student_personal_id: string;
  student_name?: string;
  session_id: string | null;
  session_code?: string;
  language: string;
  code: string;
  last_output: string | null;
  test_results: any[] | null;
  status: 'draft' | 'in_progress' | 'submitted' | 'verified' | 'rejected';
  simultaneous_proof: SimultaneousProof | null;
  marks_obtained: number | null;
  max_marks: number;
  teacher_remarks: string | null;
  teacher_signature: string | null;
  verified_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface LiveSession {
  id: string;
  session_code: string;
  subject_id: string;
  subject_title?: string;
  subject_code?: string;
  teacher_id: string;
  teacher_name?: string;
  lab_room: string;
  batch: string;
  active_practical_id: string;
  practical_title?: string;
  start_time: string;
  end_time: string;
  status: 'active' | 'ended';
  created_at: string;
  students_connected?: number;
}

export interface LiveTelemetry {
  student_id: string;
  student_personal_id?: string;
  student_name?: string;
  session_id: string;
  practical_id: string;
  current_language: string;
  keystrokes_count: number;
  run_count: number;
  tests_passed: number;
  tests_total: number;
  status_label: string;
  last_heartbeat: string;
}

export interface Assignment {
  id: string;
  subject_id: string;
  subject_title?: string;
  subject_code?: string;
  title: string;
  description: string;
  category: 'Coding Problem' | 'System Design' | 'Theory & Analysis';
  due_date: string;
  max_marks: number;
  supported_languages: string[];
  starter_code?: string;
  test_cases?: TestCase[];
  created_at: string;

  // Student specific
  submission_status?: 'pending' | 'submitted' | 'graded';
  submission?: AssignmentSubmission;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  student_personal_id: string;
  code?: string;
  notes?: string;
  status: 'pending' | 'submitted' | 'graded';
  marks: number | null;
  feedback?: string;
  submitted_at: string;
}
