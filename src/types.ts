export type AttendanceStatus = 'PRESENT' | 'LATE' | 'LEAVE' | 'SICK' | 'ABSENT';

export interface SystemSettings {
  systemName: string;
  schoolName: string;
  adminPin: string;
  userPin: string;
  maxStudentsLimit?: number;
  isUnlimitedQuota?: boolean;
  academicHeadName?: string;
  directorName?: string;
}

export interface Classroom {
  id: string; // Auto-generated
  subjectName: string;
  roomName: string;
  teacherName: string;
  subjectGroup?: string; // กลุ่มสาระการเรียนรู้
}

export interface Student {
  id: string;
  classId: string;
  no: number; // เลขที่
  studentId?: string; // รหัสประจำตัว (ไม่บังคับ)
  fullName: string; // ชื่อ-นามสกุล
}

export interface AttendanceRecord {
  classId: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  status: AttendanceStatus;
}

export interface Assignment {
  id: string;
  classId: string;
  name: string;
  maxScore: number;
}

export interface ScoreRecord {
  classId: string;
  assignmentId: string;
  studentId: string;
  score: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export type UserRole = 'ADMIN' | 'USER' | 'NONE';

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';
export type PeriodNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface SchedulePeriodTimes {
  period1: string;
  period2: string;
  period3: string;
  period4: string;
  lunch: string;
  period5: string;
  period6: string;
  lunchLabel?: string;
}

export interface ScheduleEntry {
  day: DayOfWeek;
  period: PeriodNumber;
  classroomId?: string;
  subjectName: string;
  roomName?: string;
  teacherName?: string;
  subjectGroup?: string;
  note?: string;
}

export interface TeachingSchedule {
  times: SchedulePeriodTimes;
  entries: ScheduleEntry[];
}

export interface AppData {
  settings: SystemSettings;
  classrooms: Classroom[];
  students: Student[];
  attendance: AttendanceRecord[];
  assignments: Assignment[];
  scores: ScoreRecord[];
  schedule?: TeachingSchedule;
}
