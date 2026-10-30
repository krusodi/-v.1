import { useState, useMemo, FormEvent } from 'react';
import { Classroom, Student, AppData } from '../types';
import { Plus, Trash2, Edit2, Users, FileSpreadsheet, Search, Check, X, AlertTriangle } from 'lucide-react';

interface StudentsTabProps {
  appData: AppData;
  isAdmin: boolean;
  onAddStudent: (student: Omit<Student, 'id'>) => boolean; // returns true if success, false if duplicate
  onAddStudentsBulk: (classId: string, students: Omit<Student, 'id' | 'classId'>[]) => { added: number, duplicates: number };
  onUpdateStudent: (student: Student) => boolean; // returns true if success
  onDeleteStudent: (id: string) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function StudentsTab({
  appData,
  isAdmin,
  onAddStudent,
  onAddStudentsBulk,
  onUpdateStudent,
  onDeleteStudent,
  addToast,
}: StudentsTabProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(appData.classrooms[0]?.id || '');
  
  // Single Add form
  const [studentNo, setStudentNo] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');

  // Bulk Add form
  const [bulkInput, setBulkInput] = useState<string>('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Delete student confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNo, setEditNo] = useState<string>('');
  const [editStudentId, setEditStudentId] = useState<string>('');
  const [editFullName, setEditFullName] = useState<string>('');

  // Auto-update selected class if current one is empty or deleted
  if (selectedClassId === '' && appData.classrooms.length > 0) {
    setSelectedClassId(appData.classrooms[0].id);
  }

  const activeClassroom = useMemo(() => {
    return appData.classrooms.find(c => c.id === selectedClassId);
  }, [appData.classrooms, selectedClassId]);

  // Sorted list of students in selected class
  const classStudents = useMemo(() => {
    return appData.students
      .filter(s => s.classId === selectedClassId)
      .sort((a, b) => a.no - b.no);
  }, [appData.students, selectedClassId]);

  // Filtered by search
  const filteredStudents = useMemo(() => {
    return classStudents.filter(
      s =>
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.no.toString().includes(searchQuery) ||
        (s.studentId && s.studentId.includes(searchQuery))
    );
  }, [classStudents, searchQuery]);

  const handleSingleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) {
      addToast('กรุณาเลือกชั้นเรียนก่อน', 'error');
      return;
    }
    const no = parseInt(studentNo, 10);
    if (isNaN(no) || no <= 0) {
      addToast('เลขที่ต้องเป็นตัวเลขมากกว่า 0', 'error');
      return;
    }
    if (!fullName.trim()) {
      addToast('กรุณากรอกชื่อ-นามสกุล', 'error');
      return;
    }

    const success = onAddStudent({
      classId: selectedClassId,
      no,
      studentId: studentId.trim() || undefined,
      fullName: fullName.trim(),
    });

    if (success) {
      setStudentNo('');
      setStudentId('');
      setFullName('');
    }
  };

  const handleBulkAdd = () => {
    if (!selectedClassId) {
      addToast('กรุณาเลือกชั้นเรียนก่อน', 'error');
      return;
    }
    if (!bulkInput.trim()) {
      addToast('กรุณาวางข้อมูลรายชื่อ', 'error');
      return;
    }

    const lines = bulkInput.split('\n');
    const parsedStudents: Omit<Student, 'id' | 'classId'>[] = [];
    let errorLines = 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return; // skip empty lines

      // Excel paste standard uses Tabs (\t), but we can also split by comma or spaces if necessary
      const parts = trimmed.split('\t');
      
      if (parts.length >= 2) {
        const no = parseInt(parts[0].trim(), 10);
        if (isNaN(no)) {
          errorLines++;
          return;
        }

        if (parts.length === 2) {
          // Format: No - Name
          const name = parts[1].trim();
          if (name) {
            parsedStudents.push({
              no,
              fullName: name,
            });
          } else {
            errorLines++;
          }
        } else if (parts.length >= 3) {
          // Format: No - StudentID - Name
          const sId = parts[1].trim();
          const name = parts[2].trim();
          if (name) {
            parsedStudents.push({
              no,
              studentId: sId || undefined,
              fullName: name,
            });
          } else {
            errorLines++;
          }
        }
      } else {
        // Fallback: try parsing spaces if tab splitting didn't work
        const spaceParts = trimmed.split(/\s+/);
        if (spaceParts.length >= 2) {
          const no = parseInt(spaceParts[0], 10);
          if (!isNaN(no)) {
            const name = spaceParts.slice(1).join(' ').trim();
            parsedStudents.push({
              no,
              fullName: name,
            });
            return;
          }
        }
        errorLines++;
      }
    });

    if (parsedStudents.length === 0) {
      addToast('ไม่พบรูปแบบข้อมูลที่ถูกต้อง กรุณาตรวจสอบการคัดลอกจาก Excel', 'error');
      return;
    }

    const result = onAddStudentsBulk(selectedClassId, parsedStudents);
    
    if (result.added > 0) {
      addToast(`นำเข้าสำเร็จ ${result.added} คน` + (result.duplicates > 0 ? ` (ข้ามเลขที่ซ้ำ ${result.duplicates} คน)` : ''), 'success');
      setBulkInput('');
      setShowBulkModal(false);
    } else if (result.duplicates > 0) {
      addToast(`ไม่พบนร.ที่เพิ่มใหม่ เลขที่ทั้งหมดซ้ำกับที่มีอยู่เดิม (${result.duplicates} เลขที่)`, 'error');
    } else {
      addToast('เกิดข้อผิดพลาดในการนำเข้าข้อมูล', 'error');
    }
  };

  const handleStartEdit = (std: Student) => {
    setEditingId(std.id);
    setEditNo(std.no.toString());
    setEditStudentId(std.studentId || '');
    setEditFullName(std.fullName);
  };

  const handleSaveEdit = (std: Student) => {
    const no = parseInt(editNo, 10);
    if (isNaN(no) || no <= 0) {
      addToast('เลขที่ต้องเป็นตัวเลขมากกว่า 0', 'error');
      return;
    }
    if (!editFullName.trim()) {
      addToast('กรุณากรอกชื่อ-นามสกุล', 'error');
      return;
    }

    const success = onUpdateStudent({
      ...std,
      no,
      studentId: editStudentId.trim() || undefined,
      fullName: editFullName.trim(),
    });

    if (success) {
      setEditingId(null);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDeleteId(id);
    setConfirmDeleteName(name);
  };

  return (
    <div className="space-y-6">
      {/* Dropdown Select Class */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-600">ชั้นเรียน</label>
          <h2 className="text-lg font-display font-bold text-slate-800">จัดการข้อมูลนักเรียน</h2>
        </div>
        <div className="w-full sm:w-72">
          {appData.classrooms.length === 0 ? (
            <p className="text-rose-500 text-sm font-semibold">กรุณาเพิ่มชั้นเรียนในแท็บ "ชั้นเรียน" ก่อน</p>
          ) : (
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
          )}
        </div>
      </div>

      {appData.classrooms.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Add Student Pane (Admin Only) */}
          {isAdmin && (
            <div className="lg:col-span-1 space-y-6">
              {/* Single Add Box */}
              <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-6 md:p-8">
                <h3 className="text-base font-display font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="p-1 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Plus className="w-5 h-5" />
                  </span>
                  เพิ่มนักเรียนเดี่ยว
                </h3>
                <form onSubmit={handleSingleAdd} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">เลขที่</label>
                    <input
                      type="number"
                      value={studentNo}
                      onChange={e => setStudentNo(e.target.value)}
                      placeholder="เช่น 1, 2"
                      required
                      min="1"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 transition-all font-medium text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">รหัสประจำตัว (ไม่บังคับ)</label>
                    <input
                      type="text"
                      value={studentId}
                      onChange={e => setStudentId(e.target.value)}
                      placeholder="เช่น 12345"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 transition-all font-medium text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">ชื่อ-นามสกุล</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="เด็กชายวิชาการ ขยันเรียน"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 transition-all font-medium text-slate-700"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all duration-250 flex items-center justify-center gap-2 shadow-md shadow-indigo-100 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-98 cursor-pointer mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มนักเรียน
                  </button>
                </form>
              </div>

              {/* Bulk Add Button Box */}
              <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-6 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-slate-800">นำเข้าหมู่จาก Excel</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">คัดลอกคอลัมน์จาก Excel แล้ววางข้อมูลด้วยแท็บคั่นได้ทันที สะดวกและรวดเร็ว</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="w-full bg-white hover:bg-slate-50 hover:border-slate-300 border border-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-5 shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  เปิดช่องผู้นำเข้า Excel
                </button>
              </div>
            </div>
          )}

          {/* Student Table Pane */}
          <div className={isAdmin ? "lg:col-span-2 space-y-4" : "col-span-3 space-y-4"}>
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-display font-bold text-slate-800">
                    รายชื่อนักเรียนห้อง {activeClassroom?.roomName}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">เรียงตามเลขที่ • รวมทั้งหมด {classStudents.length} คน</p>
                </div>
                
                <div className="relative max-w-xs w-full">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ค้นตามชื่อ/เลขที่/รหัส..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 bg-slate-50/50 transition-all"
                  />
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">ไม่พบข้อมูลนักเรียนในห้องนี้</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-xs font-semibold">
                        <th className="py-3 px-4 w-16 sm:w-20">เลขที่</th>
                        <th className="py-3 px-4 w-32 hidden sm:table-cell">รหัสประจำตัว</th>
                        <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                        {isAdmin && <th className="py-3 px-4 w-24 text-right">การจัดการ</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                      {filteredStudents.map(std => (
                        <tr key={std.id} className="hover:bg-slate-50/50 transition-colors">
                          {editingId === std.id ? (
                            <>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  value={editNo}
                                  onChange={e => setEditNo(e.target.value)}
                                  className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-indigo-500 text-xs"
                                  min="1"
                                />
                              </td>
                              <td className="py-2 px-3 hidden sm:table-cell">
                                <input
                                  type="text"
                                  value={editStudentId}
                                  onChange={e => setEditStudentId(e.target.value)}
                                  className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-indigo-500 text-xs"
                                  placeholder="รหัส"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={editFullName}
                                    onChange={e => setEditFullName(e.target.value)}
                                    className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-indigo-500 text-xs"
                                    placeholder="ชื่อ-สกุล"
                                  />
                                  <input
                                    type="text"
                                    value={editStudentId}
                                    onChange={e => setEditStudentId(e.target.value)}
                                    className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-indigo-500 text-xs sm:hidden"
                                    placeholder="รหัสประจำตัว"
                                  />
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleSaveEdit(std)}
                                    className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md cursor-pointer"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-3.5 px-4 font-semibold text-slate-600 font-mono">{std.no}</td>
                              <td className="py-3.5 px-4 font-mono text-slate-500 text-xs hidden sm:table-cell">{std.studentId || '-'}</td>
                              <td className="py-3.5 px-4 font-medium text-slate-800">
                                <div>{std.fullName}</div>
                                {std.studentId && (
                                  <div className="text-[10px] font-mono text-slate-400 sm:hidden mt-0.5">
                                    รหัส: {std.studentId}
                                  </div>
                                )}
                              </td>
                              {isAdmin && (
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-0.5">
                                    <button
                                      onClick={() => handleStartEdit(std)}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                                      title="แก้ไขนักเรียน"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(std.id, std.fullName)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer transition-colors"
                                      title="ลบนักเรียน"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal Dialog */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100 relative flex flex-col max-h-[90vh]">
            <button
              onClick={() => setShowBulkModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="flex items-center gap-2 pt-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-800">วางรายชื่อนำเข้าหมู่จาก Excel</h3>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-xs space-y-1">
                <p className="font-semibold flex items-center gap-1.5 mb-1 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  คำแนะนำรูปแบบข้อมูล:
                </p>
                <p>1. ข้อมูลต้องแยกคอลัมน์ด้วย <span className="font-semibold bg-white/80 px-1 py-0.5 rounded border border-amber-300">TAB</span> (เช่น คัดลอกจาก Excel หรือ Google Sheets โดยตรง)</p>
                <p>2. รูปแบบที่รองรับ:</p>
                <ul className="list-disc list-inside pl-2 space-y-0.5 font-mono text-[11px] bg-white/60 p-2 rounded mt-1 border border-amber-200">
                  <li>เลขที่[TAB]รหัสประจำตัว[TAB]ชื่อ-นามสกุล</li>
                  <li>เลขที่[TAB]ชื่อ-นามสกุล (รหัสประจำตัวจะว่าง)</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">วางข้อมูลตรงนี้:</label>
                <textarea
                  value={bulkInput}
                  onChange={e => setBulkInput(e.target.value)}
                  placeholder="เช่น:&#10;1&#9;10001&#9;เด็กชายสมบัติ มีทอง&#10;2&#9;10002&#9;เด็กหญิงสมรัก สุขใจ&#10;3&#9;เด็กชายกิตติ มีชัย (กรณีไม่มีรหัส)"
                  className="w-full h-64 px-4 py-3 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleBulkAdd}
                className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                นำเข้าข้อมูลทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Student Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-6 relative animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-display font-extrabold text-slate-800">ยืนยันการลบลบข้อมูลนักเรียน</h3>
                <p className="text-xs text-slate-400 font-semibold">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                คุณแน่ใจหรือไม่ที่จะลบข้อมูลของ <strong className="text-slate-900 font-bold">"{confirmDeleteName}"</strong>?
              </p>
              <p className="text-xs text-rose-600 bg-rose-50/80 border border-rose-100 p-3.5 rounded-2xl font-bold leading-relaxed">
                ⚠️ คำเตือน: ข้อมูลนักเรียน ประวัติเช็คชื่อทั้งหมด และบันทึกคะแนนเก็บสะสมทั้งหมดของนักเรียนคนนี้จะถูกลบอย่างถาวรทันที!
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  onDeleteStudent(confirmDeleteId);
                  setConfirmDeleteId(null);
                  setConfirmDeleteName('');
                }}
                className="flex-1 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all duration-200 shadow-md shadow-rose-100 active:scale-98 cursor-pointer"
              >
                ยืนยันการลบถาวร
              </button>
              <button
                onClick={() => {
                  setConfirmDeleteId(null);
                  setConfirmDeleteName('');
                }}
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
