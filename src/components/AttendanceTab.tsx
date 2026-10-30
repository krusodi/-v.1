import { useState, useMemo } from 'react';
import { Classroom, Student, AttendanceRecord, AttendanceStatus, AppData } from '../types';
import { Calendar, CheckCircle2, AlertCircle, RefreshCw, Trash2, Check, UserCheck, Search } from 'lucide-react';

interface AttendanceTabProps {
  appData: AppData;
  isLoggedIn: boolean;
  onUpdateAttendance: (classId: string, date: string, studentId: string, status: AttendanceStatus) => void;
  onSetAllPresent: (classId: string, date: string) => void;
  onResetAttendance: (classId: string, date: string) => void;
  onDeleteAttendance: (classId: string, date: string) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

const STATUSES: { value: AttendanceStatus; label: string; short: string; color: string; bg: string; border: string; text: string }[] = [
  { value: 'PRESENT', label: 'มา', short: '✓', color: 'bg-emerald-500', bg: 'bg-emerald-50 hover:bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700' },
  { value: 'LATE', label: 'สาย', short: 'ส', color: 'bg-amber-500', bg: 'bg-amber-50 hover:bg-amber-100', border: 'border-amber-200', text: 'text-amber-700' },
  { value: 'LEAVE', label: 'ลา', short: 'ล', color: 'bg-blue-500', bg: 'bg-blue-50 hover:bg-blue-100', border: 'border-blue-200', text: 'text-blue-700' },
  { value: 'SICK', label: 'ป่วย', short: '🤒', color: 'bg-indigo-500', bg: 'bg-indigo-50 hover:bg-indigo-100', border: 'border-indigo-200', text: 'text-indigo-700' },
  { value: 'ABSENT', label: 'ขาด', short: '✕', color: 'bg-rose-500', bg: 'bg-rose-50 hover:bg-rose-100', border: 'border-rose-200', text: 'text-rose-700' },
];

export default function AttendanceTab({
  appData,
  isLoggedIn,
  onUpdateAttendance,
  onSetAllPresent,
  onResetAttendance,
  onDeleteAttendance,
  addToast,
}: AttendanceTabProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(appData.classrooms[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Return current local date in YYYY-MM-DD
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
    return localISOTime;
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Custom confirmation state
  const [confirmActionType, setConfirmActionType] = useState<'RESET' | 'DELETE' | null>(null);

  // Auto update selected class if current deleted
  if (selectedClassId === '' && appData.classrooms.length > 0) {
    setSelectedClassId(appData.classrooms[0].id);
  }

  const activeClassroom = useMemo(() => {
    return appData.classrooms.find(c => c.id === selectedClassId);
  }, [appData.classrooms, selectedClassId]);

  // Students in selected class
  const classStudents = useMemo(() => {
    return appData.students
      .filter(s => s.classId === selectedClassId)
      .sort((a, b) => a.no - b.no);
  }, [appData.students, selectedClassId]);

  // Filtered by search
  const filteredStudents = useMemo(() => {
    return classStudents.filter(s =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.no.toString().includes(searchQuery)
    );
  }, [classStudents, searchQuery]);

  // Attendance map for quick lookup: { studentId: status }
  const attendanceMap = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    appData.attendance
      .filter(a => a.classId === selectedClassId && a.date === selectedDate)
      .forEach(record => {
        map[record.studentId] = record.status;
      });
    return map;
  }, [appData.attendance, selectedClassId, selectedDate]);

  // Real-time summary counts
  const summary = useMemo(() => {
    const counts = { PRESENT: 0, LATE: 0, LEAVE: 0, SICK: 0, ABSENT: 0, NOT_CHECKED: 0 };
    classStudents.forEach(s => {
      const status = attendanceMap[s.id];
      if (status) {
        counts[status]++;
      } else {
        counts.NOT_CHECKED++;
      }
    });
    return counts;
  }, [classStudents, attendanceMap]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    onUpdateAttendance(selectedClassId, selectedDate, studentId, status);
  };

  const handleSetAllPresent = () => {
    if (classStudents.length === 0) {
      addToast('ไม่มีนักเรียนในชั้นเรียนนี้', 'error');
      return;
    }
    onSetAllPresent(selectedClassId, selectedDate);
    addToast('เช็คชื่อเป็น "มาเรียน" สำหรับทุกคนสำเร็จ', 'success');
  };

  const handleResetToday = () => {
    if (classStudents.length === 0) return;
    setConfirmActionType('RESET');
  };

  const handleDeleteToday = () => {
    if (classStudents.length === 0) return;
    setConfirmActionType('DELETE');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Selector bar */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-600">เช็คชื่อรายวัน</label>
          <h2 className="text-lg font-display font-bold text-slate-800">ลงเวลาเข้าเรียน</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* Select class */}
          <div className="w-full sm:w-64">
            <select
              value={selectedClassId}
              onChange={e => {
                setSelectedClassId(e.target.value);
                setSearchQuery('');
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

          {/* Date Picker */}
          <div className="w-full sm:w-48 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4" />
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50 font-semibold text-slate-700 cursor-pointer transition-all"
            />
          </div>
        </div>
      </div>

      {appData.classrooms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-100/50">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-rose-500 text-sm font-semibold">กรุณาเพิ่มชั้นเรียนในแท็บ "ชั้นเรียน" ก่อน</p>
        </div>
      ) : classStudents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-100/50">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-semibold">ห้องนี้ยังไม่มีนักเรียน กรุณาเพิ่มรายชื่อในแท็บ "นักเรียน" ก่อน</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Real-time Summary Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-6 space-y-5">
              <h3 className="text-base font-display font-bold text-slate-800 border-b border-slate-100 pb-3.5 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                สรุปวันนี้ ({classStudents.length} คน)
              </h3>
              
              <div className="space-y-3">
                {/* Status lists with nice color indicators */}
                <div className="flex items-center justify-between text-xs text-slate-600 bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                  <span className="font-bold text-emerald-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    มาเรียน
                  </span>
                  <span className="font-extrabold text-emerald-800 text-sm">{summary.PRESENT} คน</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 bg-amber-50/70 p-3 rounded-xl border border-amber-100">
                  <span className="font-bold text-amber-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    สาย
                  </span>
                  <span className="font-extrabold text-amber-800 text-sm">{summary.LATE} คน</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 bg-blue-50/70 p-3 rounded-xl border border-blue-100">
                  <span className="font-bold text-blue-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    ลา
                  </span>
                  <span className="font-extrabold text-blue-800 text-sm">{summary.LEAVE} คน</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 bg-indigo-50/70 p-3 rounded-xl border border-indigo-100">
                  <span className="font-bold text-indigo-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    ป่วย
                  </span>
                  <span className="font-extrabold text-indigo-800 text-sm">{summary.SICK} คน</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 bg-rose-50/70 p-3 rounded-xl border border-rose-100">
                  <span className="font-bold text-rose-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    ขาด
                  </span>
                  <span className="font-extrabold text-rose-800 text-sm">{summary.ABSENT} คน</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <span className="font-semibold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                    ยังไม่ได้เช็ค
                  </span>
                  <span className="font-extrabold text-slate-600 text-sm">{summary.NOT_CHECKED} คน</span>
                </div>
              </div>

              {/* Quick operations */}
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <button
                  onClick={handleSetAllPresent}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-indigo-100 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-98 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  มาทั้งหมดวันนี้
                </button>
                <button
                  onClick={handleResetToday}
                  className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  รีเซ็ตวันนี้
                </button>
                <button
                  onClick={handleDeleteToday}
                  className="w-full bg-white hover:bg-rose-50 border border-rose-100 text-rose-700 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  ลบวันนี้ออกจากระบบ
                </button>
              </div>
            </div>
          </div>

          {/* Student attendance list */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-display font-bold text-slate-800">
                    สมุดลงเวลาเข้าเรียน วันที่: {selectedDate}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">กดเลือกสถานะเพื่อเช็คชื่อ หรือบันทึกข้อมูลแบบเรียลไทม์</p>
                </div>

                <div className="relative max-w-xs w-full">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ค้นตามชื่อ/เลขที่..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 bg-slate-50/50 transition-all"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-20">เลขที่</th>
                      <th className="py-3.5 px-4">ชื่อ-นามสกุล</th>
                      <th className="py-3.5 px-4 text-center w-80">สถานะการเข้าเรียน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {filteredStudents.map(std => {
                      const currentStatus = attendanceMap[std.id];
                      return (
                        <tr key={std.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="py-4 px-4 font-bold text-slate-600 font-mono">{std.no}</td>
                          <td className="py-4 px-4 font-semibold text-slate-800">{std.fullName}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                              {STATUSES.map(st => {
                                const isSelected = currentStatus === st.value;
                                return (
                                  <button
                                    key={st.value}
                                    onClick={() => handleStatusChange(std.id, st.value)}
                                    className={`px-2 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 border cursor-pointer select-none ${
                                      isSelected
                                        ? `${st.color} text-white border-transparent scale-105 shadow-md shadow-slate-200`
                                        : `${st.bg} ${st.text} ${st.border}`
                                    }`}
                                  >
                                    <span>{st.short}</span>
                                    <span className="hidden sm:inline">{st.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Reset/Delete Attendance */}
      {confirmActionType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-6 relative animate-scale-up">
            <div className="flex items-center gap-3 text-amber-600">
              <span className={`p-3 rounded-2xl ${confirmActionType === 'DELETE' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                <Trash2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-display font-extrabold text-slate-800">
                  {confirmActionType === 'DELETE' ? 'ยืนยันการลบประวัติการเช็คชื่อ' : 'ยืนยันการล้างข้อมูลเช็คชื่อ'}
                </h3>
                <p className="text-xs text-slate-400 font-semibold">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                {confirmActionType === 'DELETE'
                  ? 'คุณต้องการลบข้อมูลประวัติการเข้าเรียนทั้งหมดของวันนี้ใช่หรือไม่?'
                  : 'คุณต้องการล้างสถานะการเข้าเรียนทั้งหมดของวันนี้ใช่หรือไม่?'}
              </p>
              <p className={`text-xs p-3.5 rounded-2xl font-bold leading-relaxed border ${
                confirmActionType === 'DELETE'
                  ? 'text-rose-600 bg-rose-50/80 border-rose-100'
                  : 'text-amber-700 bg-amber-50/80 border-amber-100'
              }`}>
                {confirmActionType === 'DELETE'
                  ? '⚠️ คำเตือน: ประวัติการเข้าเช็คชื่อทั้งหมดของวันที่เลือกนี้จะถูกลบออกจากฐานข้อมูลอย่างถาวรทันที!'
                  : '⚠️ ข้อมูลเช็คชื่อวันนี้จะเปลี่ยนเป็น "ไม่ได้เช็ค" (Unmarked) ทั้งหมดเพื่อเริ่มเช็คใหม่'}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  if (confirmActionType === 'DELETE') {
                    onDeleteAttendance(selectedClassId, selectedDate);
                    addToast('ลบข้อมูลการเข้าเรียนของวันนี้เรียบร้อยแล้ว', 'success');
                  } else {
                    onResetAttendance(selectedClassId, selectedDate);
                    addToast('ล้างข้อมูลเช็คชื่อเรียบร้อยแล้ว', 'success');
                  }
                  setConfirmActionType(null);
                }}
                className={`flex-1 font-bold py-3 px-4 rounded-xl text-xs transition-all duration-200 active:scale-98 cursor-pointer text-white shadow-md ${
                  confirmActionType === 'DELETE'
                    ? 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-rose-100'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-100'
                }`}
              >
                {confirmActionType === 'DELETE' ? 'ยืนยันการลบถาวร' : 'ยืนยันการล้างข้อมูล'}
              </button>
              <button
                onClick={() => setConfirmActionType(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
