import { useState, useMemo, useRef } from 'react';
import { Classroom, Student, Assignment, ScoreRecord, AttendanceRecord, AppData } from '../types';
import { Printer, Search, Download, ClipboardList, TrendingUp, Calendar, FileText, AlertCircle, Sparkles } from 'lucide-react';

interface ReportsTabProps {
  appData: AppData;
  addToast: (message: string, type: 'success' | 'error') => void;
}

type ReportType = 'SCORES' | 'ATTENDANCE' | 'ABSENCES_LEAVES' | 'STUDENT_HISTORY';

export default function ReportsTab({ appData, addToast }: ReportsTabProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(appData.classrooms[0]?.id || '');
  const [reportType, setReportType] = useState<ReportType>('SCORES');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  // Extract unique months (YYYY-MM) in selected classroom's attendance records
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    appData.attendance
      .filter(a => a.classId === selectedClassId)
      .forEach(record => {
        if (record.date && record.date.length >= 7) {
          monthsSet.add(record.date.substring(0, 7)); // "YYYY-MM"
        }
      });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [appData.attendance, selectedClassId]);

  const formatThaiMonthYear = (yearMonthStr: string) => {
    if (!yearMonthStr || yearMonthStr === 'ALL') return '';
    const [yearStr, monthStr] = yearMonthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `${thaiMonths[month - 1]} ${year + 543}`;
  };

  // Auto update selected class if current deleted
  if (selectedClassId === '' && appData.classrooms.length > 0) {
    setSelectedClassId(appData.classrooms[0].id);
  }

  // Active Class
  const activeClassroom = useMemo(() => {
    return appData.classrooms.find(c => c.id === selectedClassId);
  }, [appData.classrooms, selectedClassId]);

  // Students in selected class
  const classStudents = useMemo(() => {
    return appData.students
      .filter(s => s.classId === selectedClassId)
      .sort((a, b) => a.no - b.no);
  }, [appData.students, selectedClassId]);

  // Filtered students by search (used for main reports)
  const filteredStudents = useMemo(() => {
    return classStudents.filter(s =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.no.toString().includes(searchQuery)
    );
  }, [classStudents, searchQuery]);

  // Assignments in selected class
  const classAssignments = useMemo(() => {
    return appData.assignments.filter(a => a.classId === selectedClassId);
  }, [appData.assignments, selectedClassId]);

  // Sum of maximum possible scores for the class
  const totalMaxScore = useMemo(() => {
    return classAssignments.reduce((sum, a) => sum + a.maxScore, 0);
  }, [classAssignments]);

  // Auto select first student if current selected student is empty or not in class
  const activeStudent = useMemo(() => {
    let student = classStudents.find(s => s.id === selectedStudentId);
    if (!student && classStudents.length > 0) {
      student = classStudents[0];
    }
    return student;
  }, [classStudents, selectedStudentId]);

  // 1. DATA PREPARATION: SCORES REPORT
  const scoresReportData = useMemo(() => {
    return filteredStudents.map(std => {
      // Find all scores of this student
      const studentScores: Record<string, number> = {};
      let totalScore = 0;

      classAssignments.forEach(asg => {
        const record = appData.scores.find(
          s => s.classId === selectedClassId && s.assignmentId === asg.id && s.studentId === std.id
        );
        const score = record ? record.score : 0;
        studentScores[asg.id] = score;
        totalScore += score;
      });

      const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
      
      // Auto Grading:
      // ≥80% = ดี
      // ≥60% = พอใจ
      // ≥40% = ปานกลาง
      // <40% = ไม่ผ่าน
      let grade = 'ไม่ผ่าน';
      let gradeColor = 'text-rose-600 bg-rose-50 border-rose-200';
      
      if (percentage >= 80) {
        grade = 'ดี';
        gradeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      } else if (percentage >= 60) {
        grade = 'พอใจ';
        gradeColor = 'text-amber-700 bg-amber-50 border-amber-200';
      } else if (percentage >= 40) {
        grade = 'ปานกลาง';
        gradeColor = 'text-blue-700 bg-blue-50 border-blue-200';
      }

      return {
        student: std,
        scores: studentScores,
        total: totalScore,
        percentage: Math.round(percentage * 100) / 100,
        grade,
        gradeColor,
      };
    });
  }, [filteredStudents, classAssignments, appData.scores, selectedClassId, totalMaxScore]);

  // 2. DATA PREPARATION: ATTENDANCE REPORT
  const attendanceReportData = useMemo(() => {
    return filteredStudents.map(std => {
      let records = appData.attendance.filter(
        a => a.classId === selectedClassId && a.studentId === std.id
      );

      if (selectedMonth !== 'ALL') {
        records = records.filter(r => r.date.startsWith(selectedMonth));
      }

      const present = records.filter(r => r.status === 'PRESENT').length;
      const late = records.filter(r => r.status === 'LATE').length;
      const leave = records.filter(r => r.status === 'LEAVE').length;
      const sick = records.filter(r => r.status === 'SICK').length;
      const absent = records.filter(r => r.status === 'ABSENT').length;
      const totalDays = records.length;

      // Thai School attendance formula:
      // Attendance score = (Present + Late*0.5 + Leave*0.8 + Sick*1.0) / Total checked days?
      // Simple formula requested: %มาเรียน = (มาเรียน / วันที่เช็คชื่อทั้งหมด) * 100
      // Let's use: (Present + Late + Leave + Sick) or strictly (Present / total)
      // Usually, "มา", "สาย", "ลา", "ป่วย" are calculated as present or excused.
      // Let's compute strictly on presence: (Present + Late*0.5) / totalDays * 100,
      // But the prompt states: "%มาเรียน"
      // Let's make it simple and standard: Present / totalDays * 100. Or (totalDays - absent) / totalDays * 100
      // Let's use (totalDays - absent) / totalDays * 100 since Leave/Sick are excused, or let's use:
      // (Present) / totalDays * 100
      const percentAttendance = totalDays > 0 ? (present / totalDays) * 100 : 100;

      return {
        student: std,
        present,
        late,
        leave,
        sick,
        absent,
        total: totalDays,
        percentage: Math.round(percentAttendance * 10) / 10,
      };
    });
  }, [filteredStudents, appData.attendance, selectedClassId, selectedMonth]);

  // 3. DATA PREPARATION: ABSENCES / LEAVES LIST
  const absencesLeavesData = useMemo(() => {
    // Get all records with LATE, LEAVE, SICK, ABSENT status for this class
    const logs: { student: Student; date: string; status: string; statusLabel: string; statusColor: string }[] = [];

    let filteredRecords = appData.attendance.filter(a => a.classId === selectedClassId && a.status !== 'PRESENT');

    if (selectedMonth !== 'ALL') {
      filteredRecords = filteredRecords.filter(r => r.date.startsWith(selectedMonth));
    }

    filteredRecords.forEach(record => {
      const student = classStudents.find(s => s.id === record.studentId);
      if (student) {
        // Filter by search query if applicable
        const matchesSearch =
          student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.no.toString().includes(searchQuery);

        if (!searchQuery || matchesSearch) {
          let label = 'ขาดเรียน';
          let color = 'text-rose-600 bg-rose-50 border-rose-100';

          if (record.status === 'LATE') {
            label = 'สาย';
            color = 'text-amber-600 bg-amber-50 border-amber-100';
          } else if (record.status === 'LEAVE') {
            label = 'ลากิจ';
            color = 'text-blue-600 bg-blue-50 border-blue-100';
          } else if (record.status === 'SICK') {
            label = 'ลาป่วย';
            color = 'text-indigo-600 bg-indigo-50 border-indigo-100';
          }

          logs.push({
            student,
            date: record.date,
            status: record.status,
            statusLabel: label,
            statusColor: color,
          });
        }
      }
    });

    // Sort chronologically (latest date first)
    return logs.sort((a, b) => b.date.localeCompare(a.date));
  }, [appData.attendance, selectedClassId, classStudents, searchQuery, selectedMonth]);

  // 4. DATA PREPARATION: INDIVIDUAL STUDENT HISTORY
  const studentHistoryData = useMemo(() => {
    if (!activeStudent) return [];

    let filteredRecords = appData.attendance.filter(
      a => a.classId === selectedClassId && a.studentId === activeStudent.id
    );

    if (selectedMonth !== 'ALL') {
      filteredRecords = filteredRecords.filter(r => r.date.startsWith(selectedMonth));
    }

    return filteredRecords
      .filter(record => record.status === 'ABSENT' || record.status === 'SICK')
      .map(record => {
        let label = 'ขาดเรียน';
        let color = 'text-rose-600 bg-rose-50 border-rose-100';

        if (record.status === 'SICK') {
          label = 'ลาป่วย';
          color = 'text-indigo-600 bg-indigo-50 border-indigo-100';
        }

        return {
          date: record.date,
          status: record.status,
          label,
          color,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // latest first
  }, [appData.attendance, selectedClassId, activeStudent, selectedMonth]);

  // Trigger standard page print with clean print margins/styles
  const handlePrint = () => {
    window.print();
  };

  const formattedPrintDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  return (
    <div className="space-y-6 font-sans">
      {/* Control Panel (Hidden during Print via CSS `@media print`) */}
      <div className="print:hidden bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-600">รายงานสารสนเทศ</label>
          <h2 className="text-lg font-display font-bold text-slate-800">ออกรายงานและพิมพ์ (A4)</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* Class select */}
          <div className="w-full sm:w-64">
            <select
              value={selectedClassId}
              onChange={e => {
                setSelectedClassId(e.target.value);
                setSearchQuery('');
                setSelectedStudentId('');
                setSelectedMonth('ALL');
              }}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-base md:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50 font-semibold text-slate-700 cursor-pointer transition-all"
            >
              {appData.classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.subjectName} ({c.roomName})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {appData.classrooms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-100/50 print:hidden">
          <p className="text-rose-500 text-sm font-semibold">กรุณาเพิ่มชั้นเรียนในแท็บ "ชั้นเรียน" ก่อน</p>
        </div>
      ) : classStudents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-100/50 print:hidden">
          <p className="text-slate-500 text-sm font-semibold">ห้องนี้ยังไม่มีนักเรียน กรุณาเพิ่มรายชื่อนักเรียนก่อน</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tab Selector & Print Options (Hidden during Print) */}
          <div className="print:hidden bg-white rounded-3xl border border-slate-200/60 p-5 md:p-6 shadow-xl shadow-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                onClick={() => setReportType('SCORES')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  reportType === 'SCORES'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-100 scale-102'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline-block mr-1.5" />
                คะแนน
              </button>
              <button
                onClick={() => setReportType('ATTENDANCE')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  reportType === 'ATTENDANCE'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-100 scale-102'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <ClipboardList className="w-4 h-4 inline-block mr-1.5" />
                มาเรียน
              </button>
              <button
                onClick={() => setReportType('ABSENCES_LEAVES')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  reportType === 'ABSENCES_LEAVES'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-100 scale-102'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <AlertCircle className="w-4 h-4 inline-block mr-1.5" />
                ขาด/ลา
              </button>
              <button
                onClick={() => setReportType('STUDENT_HISTORY')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  reportType === 'STUDENT_HISTORY'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-100 scale-102'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <Calendar className="w-4 h-4 inline-block mr-1.5" />
                สรุปขาดเรียน
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
              {/* Search filter for general reports */}
              {reportType !== 'STUDENT_HISTORY' && (
                <div className="relative w-full sm:w-56">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ค้นตามชื่อ/เลขที่..."
                    className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 text-base sm:text-xs focus:outline-none focus:border-indigo-500 bg-slate-50/50 transition-all"
                  />
                </div>
              )}

              {/* Student Dropdown selector for Individual Student History */}
              {reportType === 'STUDENT_HISTORY' && (
                <select
                  value={selectedStudentId || (classStudents[0]?.id || '')}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full sm:w-56 px-3 py-2 rounded-xl border border-slate-200 text-base sm:text-xs focus:outline-none focus:border-indigo-500 bg-slate-50 font-bold text-slate-700 cursor-pointer transition-all"
                >
                  {classStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      เลขที่ {s.no} - {s.fullName}
                    </option>
                  ))}
                </select>
              )}

              {/* Month selector for attendance-related reports */}
              {reportType !== 'SCORES' && (
                <div className="w-full sm:w-48">
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base sm:text-xs font-bold focus:outline-none focus:border-indigo-500 bg-slate-50 text-slate-700 cursor-pointer transition-all"
                  >
                    <option value="ALL">🗓️ ทุกเดือน (ทั้งหมด)</option>
                    {availableMonths.map(m => (
                      <option key={m} value={m}>
                        {formatThaiMonthYear(m)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Print Action Button */}
              <button
                onClick={handlePrint}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-emerald-100 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-98 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                พิมพ์รายงาน A4
              </button>
            </div>
          </div>

          {/* MAIN PRINTABLE CONTAINER */}
          {/* Standard layout with screen view + custom print-only layout overrides */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-100/50 p-8 md:p-10 max-w-4xl mx-auto print:shadow-none print:border-0 print:p-0">
            
            {/* Report Header (Stylized, matches requested A4 Header specs) */}
            <div className="text-center space-y-2 border-b-2 border-slate-800 pb-5 mb-6 text-slate-800">
              <h1 className="text-xl font-bold tracking-tight">
                {appData.settings.systemName || 'ระบบบริหารจัดการข้อมูลนักเรียน'}
              </h1>
              <h2 className="text-base font-semibold">
                {appData.settings.schoolName || 'โรงเรียนตัวอย่างวิทยา'}
              </h2>
              
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs font-semibold text-slate-600 pt-1">
                <span><strong>วิชา:</strong> {activeClassroom?.subjectName}</span>
                <span><strong>ชั้นเรียน:</strong> ห้อง {activeClassroom?.roomName}</span>
                <span><strong>ผู้สอน:</strong> {activeClassroom?.teacherName}</span>
                <span><strong>วันที่พิมพ์:</strong> {formattedPrintDate}</span>
              </div>

              <div className="inline-block mt-2 font-bold px-4 py-1 text-xs bg-slate-100 text-slate-800 rounded-full border border-slate-200 uppercase tracking-wide print:bg-transparent print:border-slate-400">
                {reportType === 'SCORES' && 'สรุปคะแนนเก็บ'}
                {reportType === 'ATTENDANCE' && `การเข้าเรียนภาพรวม ${selectedMonth === 'ALL' ? '(ทั้งหมด)' : `ประจำเดือน ${formatThaiMonthYear(selectedMonth)}`}`}
                {reportType === 'ABSENCES_LEAVES' && `สถิติ ขาด/ลา ${selectedMonth === 'ALL' ? '(ทั้งหมด)' : `ประจำเดือน ${formatThaiMonthYear(selectedMonth)}`}`}
                {reportType === 'STUDENT_HISTORY' && `สรุปวันที่ ขาด,ลา,สาย: ${activeStudent?.fullName || ''} ${selectedMonth === 'ALL' ? '(ทั้งหมด)' : `ประจำเดือน ${formatThaiMonthYear(selectedMonth)}`}`}
              </div>
            </div>

            {/* REPORT BODY */}

            {/* 1. Scores Report Table */}
            {reportType === 'SCORES' && (
              <div className="space-y-4">
                {classAssignments.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    ไม่มีคะแนนเก็บในห้องนี้ กรุณาเพิ่มชิ้นงานและกรอกคะแนนก่อน
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-800 rounded-md print:border-slate-800">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-800">
                          <th className="py-2 px-2.5 border-r border-slate-800 text-center w-12">เลขที่</th>
                          <th className="py-2 px-3 border-r border-slate-800 min-w-[120px]">ชื่อ-นามสกุล</th>
                          {classAssignments.map(asg => (
                            <th key={asg.id} className="py-2 px-1.5 border-r border-slate-800 text-center">
                              <div className="line-clamp-1" title={asg.name}>{asg.name}</div>
                              <div className="text-[9px] font-normal font-mono text-slate-500">({asg.maxScore})</div>
                            </th>
                          ))}
                          <th className="py-2 px-2 border-r border-slate-800 text-center font-bold w-16">รวม ({totalMaxScore})</th>
                          <th className="py-2 px-2 border-r border-slate-800 text-center font-bold w-12">%</th>
                          <th className="py-2 px-2 text-center font-bold w-16">เกรด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-400">
                        {scoresReportData.map((row, idx) => (
                          <tr key={row.student.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors`}>
                            <td className="py-2 px-1.5 border-r border-slate-300 text-center font-semibold font-mono">{row.student.no}</td>
                            <td className="py-2 px-3 border-r border-slate-300 font-semibold text-slate-900">{row.student.fullName}</td>
                            {classAssignments.map(asg => (
                              <td key={asg.id} className="py-2 px-1.5 border-r border-slate-300 text-center font-mono">
                                {row.scores[asg.id] !== undefined ? row.scores[asg.id] : 0}
                              </td>
                            ))}
                            <td className="py-2 px-2 border-r border-slate-300 text-center font-bold font-mono">{row.total}</td>
                            <td className="py-2 px-2 border-r border-slate-300 text-center font-semibold font-mono">{row.percentage}%</td>
                            <td className="py-2 px-2 text-center">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${row.gradeColor}`}>
                                {row.grade}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 2. Attendance Summary Report Table */}
            {reportType === 'ATTENDANCE' && (
              <div className="overflow-x-auto border border-slate-800 rounded-md">
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-800">
                      <th className="py-2 px-3 border-r border-slate-800 text-center w-12">เลขที่</th>
                      <th className="py-2 px-4 border-r border-slate-800 min-w-[150px]">ชื่อ-นามสกุล</th>
                      <th className="py-2 px-2 border-r border-slate-800 text-center text-emerald-800 bg-emerald-50/50 w-16">มา (✓)</th>
                      <th className="py-2 px-2 border-r border-slate-800 text-center text-amber-800 bg-amber-50/50 w-16">สาย (ส)</th>
                      <th className="py-2 px-2 border-r border-slate-800 text-center text-blue-800 bg-blue-50/50 w-16">ลา (ล)</th>
                      <th className="py-2 px-2 border-r border-slate-800 text-center text-indigo-800 bg-indigo-50/50 w-16">ป่วย (🤒)</th>
                      <th className="py-2 px-2 border-r border-slate-800 text-center text-rose-800 bg-rose-50/50 w-16">ขาด (✕)</th>
                      <th className="py-2 px-2 border-r border-slate-800 text-center font-bold w-16">รวมเช็ค</th>
                      <th className="py-2 px-3 text-center font-bold bg-indigo-50 text-indigo-800 w-20">% มาเรียน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-400">
                    {attendanceReportData.map((row, idx) => (
                      <tr key={row.student.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors`}>
                        <td className="py-2.5 px-2.5 border-r border-slate-300 text-center font-bold font-mono text-slate-500">{row.student.no}</td>
                        <td className="py-2.5 px-4 border-r border-slate-300 font-semibold text-slate-900">{row.student.fullName}</td>
                        <td className="py-2.5 px-2 border-r border-slate-300 text-center font-mono font-bold text-emerald-600">{row.present}</td>
                        <td className="py-2.5 px-2 border-r border-slate-300 text-center font-mono font-bold text-amber-600">{row.late}</td>
                        <td className="py-2.5 px-2 border-r border-slate-300 text-center font-mono font-bold text-blue-600">{row.leave}</td>
                        <td className="py-2.5 px-2 border-r border-slate-300 text-center font-mono font-bold text-indigo-600">{row.sick}</td>
                        <td className="py-2.5 px-2 border-r border-slate-300 text-center font-mono font-bold text-rose-600">{row.absent}</td>
                        <td className="py-2.5 px-2 border-r border-slate-300 text-center font-mono text-slate-500 font-semibold">{row.total}</td>
                        <td className="py-2.5 px-3 text-center font-bold font-mono text-indigo-700 bg-indigo-50/20">{row.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. Absences & Leaves Log List */}
            {reportType === 'ABSENCES_LEAVES' && (
              <div className="space-y-4">
                {absencesLeavesData.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl text-slate-400">
                    ไม่มีบันทึกข้อมูลการ ขาด/ลา ในชั้นเรียนนี้
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-800 rounded-md">
                    <table className="w-full text-left border-collapse text-xs font-sans">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-800">
                          <th className="py-2 px-3 border-r border-slate-800 text-center w-12">เลขที่</th>
                          <th className="py-2 px-4 border-r border-slate-800 min-w-[150px]">ชื่อ-นามสกุล</th>
                          <th className="py-2 px-4 border-r border-slate-800 text-center w-36">วันที่บันทึก</th>
                          <th className="py-2 px-4 text-center w-32">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-400">
                        {absencesLeavesData.map((row, idx) => (
                          <tr key={`${row.student.id}-${row.date}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="py-2.5 px-2.5 border-r border-slate-300 text-center font-bold font-mono text-slate-500">{row.student.no}</td>
                            <td className="py-2.5 px-4 border-r border-slate-300 font-semibold text-slate-900">{row.student.fullName}</td>
                            <td className="py-2.5 px-4 border-r border-slate-300 text-center font-semibold font-mono text-slate-600">{row.date}</td>
                            <td className="py-2.5 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${row.statusColor}`}>
                                {row.statusLabel}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 4. Individual Student History (สรุปขาดเรียน) */}
            {reportType === 'STUDENT_HISTORY' && (
              <div className="space-y-4">
                {!activeStudent ? (
                  <div className="text-center py-10 text-slate-400 text-sm">ไม่พบประวัตินักเรียน</div>
                ) : (
                  <div className="space-y-6">
                    {/* Student Mini Profile info card */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex flex-wrap justify-between items-center gap-4 print:bg-transparent print:border-slate-400 print:border-t print:border-b print:rounded-none">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider">โปรไฟล์นักเรียน</span>
                        <h4 className="text-base font-bold text-slate-800">{activeStudent.fullName}</h4>
                        <p className="text-xs text-slate-500 font-medium">เลขที่ {activeStudent.no} • รหัสประจำตัว: {activeStudent.studentId || '-'}</p>
                      </div>

                      {/* Display attendance metrics of this single student */}
                      {(() => {
                        const stdRow = attendanceReportData.find(r => r.student.id === activeStudent.id);
                        if (!stdRow) return null;
                        return (
                          <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
                            <span className="text-center bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-mono print:border-slate-400">ขาดเรียน: <strong className="text-rose-600 font-bold">{stdRow.absent}</strong> วัน</span>
                            <span className="text-center bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-mono print:border-slate-400">ลาป่วย: <strong className="text-indigo-600 font-bold">{stdRow.sick}</strong> วัน</span>
                            <span className="text-center bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-mono print:border-slate-400">มาเรียน: <strong className="text-emerald-600 font-bold">{stdRow.present}</strong>/{stdRow.total} วัน</span>
                            <span className="text-center bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-mono print:border-slate-400">เปอร์เซ็นต์เข้าเรียน: <strong className="text-indigo-600 font-bold">{stdRow.percentage}%</strong></span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Timeline of absences/lates/leaves/sickness */}
                    {studentHistoryData.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-xs">
                        นักเรียนคนนี้ไม่มีประวัติการขาดเรียนหรือลาป่วยในรอบระยะเวลาที่เลือก
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-800 rounded-md">
                        <table className="w-full text-left border-collapse text-xs font-sans">
                          <thead>
                            <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-800">
                              <th className="py-2 px-4 border-r border-slate-800 text-center w-16">ลำดับ</th>
                              <th className="py-2 px-4 border-r border-slate-800 text-center w-48">วันที่ลงบันทึก</th>
                              <th className="py-2 px-4 text-center">สถานะที่บันทึก</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-400">
                            {studentHistoryData.map((row, idx) => (
                              <tr key={row.date} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="py-2.5 px-4 border-r border-slate-300 text-center font-bold font-mono text-slate-500">{idx + 1}</td>
                                <td className="py-2.5 px-4 border-r border-slate-300 text-center font-semibold font-mono text-slate-700">{row.date}</td>
                                <td className="py-2.5 px-4 text-center">
                                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${row.color}`}>
                                    {row.label}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PRINTABLE SIGNATURE SECTION (A4 Report Guideline) */}
            <div className="mt-8 sm:mt-12 pt-8 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-6 text-xs text-slate-700 text-center print:border-slate-800">
              <div className="space-y-12">
                <p className="font-semibold">ลงชื่อ ............................................................ ครูผู้สอนประจำวิชา</p>
                <p className="font-medium">(&nbsp;{activeClassroom?.teacherName || '............................................................'}&nbsp;)</p>
                <p className="text-slate-500">ตำแหน่ง ครูประจำวิชา</p>
              </div>
              <div className="space-y-12">
                <p className="font-semibold">ลงชื่อ ............................................................ ผู้รับรอง</p>
                <p className="font-medium">(&nbsp;{appData.settings.academicHeadName || '............................................................'}&nbsp;)</p>
                <p className="text-slate-500">ตำแหน่ง หัวหน้าฝ่ายวิชาการ</p>
              </div>
              <div className="space-y-12">
                <p className="font-semibold">ลงชื่อ ............................................................ ผู้รับรอง</p>
                <p className="font-medium">(&nbsp;{appData.settings.directorName || '............................................................'}&nbsp;)</p>
                <p className="text-slate-500">ตำแหน่ง ผู้อำนวยการสถานศึกษา</p>
              </div>
            </div>

            {/* Print Note Info (Hidden during Print) */}
            <div className="print:hidden mt-8 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2.5 text-[11px] text-indigo-700">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>รายงานนี้ถูกจัดทำขึ้นด้วยกระดาษรูปแบบแนวตั้ง A4 ลายเส้นตารางชัดเจนเพื่อการพิมพ์เอกสารและส่งต่อฝ่ายบริหารได้ทันที</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
