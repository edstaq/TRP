
export enum SessionStatus {
  UPCOMING = 'UPCOMING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export interface Student {
  id: string;
  name: string;
  attended: boolean;
  listeningRate: number; // 1-5
  review: string;
}

export interface SessionFile {
  timestamp: string;
  email: string;
  sessionId: string;
  fileName: string;
  uploadFile: string; // Google Drive link
  type: 'Learn Docs' | 'Session Proof';
}

export interface ApiSessionFile {
  "Timestamp": string;
  "Email address": string;
  "Session ID": string;
  "File Name": string;
  "Upload File": string;
  "Type": "Learn Docs" | "Session Proof";
}

export interface SubjectCatalogItem {
  id: string;
  category: string;
  board: string;
  level: string;
  department: string;
  stage: string;
  name: string;
  description: string;
  code: string;
  tags: string[];
  status: string;
  price: number;
  teacherIds: string[];
  label?: string; // Descriptive display label from CSV
}

export interface Session {
  id: string;
  sessionId: string;
  allocationId?: string;
  subject: string;
  className: string;
  startTime: string; // ISO string
  durationMinutes: number;
  status: SessionStatus;
  students: Student[];
  files: SessionFile[];
  topicCovered?: string;
  startedTime?: string;
  endedTime?: string;
}

export interface Availability {
  day: string;
  slots: { id?: string; start: string; end: string }[];
}

export interface TeacherProfile {
  id: string; // TCH ID from CSV
  name: string;
  email: string;
  mobile: string;
  subjects: string[]; // These will be IDs from the catalog
  availability: Availability[];
  status?: 'Active' | 'In-Active';
}

export interface Allocation {
  assignId: string;
  classRoomId: string;
  meetLink: string;
  subjectId: string;
  subjectLabel?: string;
  studentIds: string[];
  studentNames: string[];
  teacherId: string;
  startDate: string;
  sessionsPerDay: number;
  startTime: string;
  endTime: string;
  days: string;
  status: string;
  weekCycle: number;
  isInteractive: boolean;
  endDateReq?: string;
  classCountReq?: string | number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiSession {
  "Session ID": string;
  "Session Temp Id": string;
  "Class Room ID": string;
  "Teacher Assign ID": string;
  "Student ID": string;
  "Subject ID": string;
  "Teacher ID": string;
  "Date": string;
  "Start Time": string;
  "End Time": string;
  "Status": string;
  "Sessions per day": number;
  "Student Limit": number;
  "Subject label": string;
  "Subject name": string;
  "Class link": string;
  "Topic covered": string;
  "Started Time"?: string;
  "Ended Time"?: string;
  "Files": ApiSessionFile[];
}

export interface ApiStudentLog {
  "Timestamp"?: string;
  "Log ID"?: string;
  "Session ID": string;
  "Student ID": string;
  "Student Name"?: string;
  "Status": string;
  "Rating": number | string;
  "Comment": string;
}

export interface StudentLogRequest {
  sessionId: string;
  studentId: string;
  status: string;
  rating: number | string;
  comment: string;
}

export interface ApiStudent {
  "Student ID": string;
  "Student Name": string;
}



