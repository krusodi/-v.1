import { useState, useMemo, FormEvent } from 'react';
import { Classroom, Student, Assignment, ScoreRecord, AppData } from '../types';
import { Plus, Trash2, Check, Search, Percent, X, Award, ChevronLeft, ChevronRight } from 'lucide-react';

interface GradingTabProps {
  appData: AppData;
  isAdmin: boolean;
  onAddAssignment: (assignment: Omit<Assignment, 'id'>) => void;
  onDeleteAssignment: (id: string) => void;
  onUpdateScore: (classId: string, assignmentId: string, studentId: string, score: number) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function GradingTab({
  appData,
  isAdmin,
  onAddAssignment,
  onDeleteAssignment,
  onUpdateScore,
  addToast,
}: GradingTabProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(appData.classrooms[0]?.id || '');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  
  // New Assignment fields
  const [assignmentName, setAssignmentName] = useState('');
  const [maxScore, setMaxScore] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>('');

  // Auto update selected class if current deleted
  if (selectedClassId === '' && appData.classrooms.length > 0) {
    setSelectedClassId(appData.classrooms[0].id);
    setSelectedAssignmentId('');
  }

  // Active class
  const activeClassroom = useMemo(() => {
    return appData.classrooms.find(c => c.id === selectedClassId);
  }, [appData.classrooms, selectedClassId]);

  // Students in selected class
  const classStudents = useMemo(() => {
    return appData.students
      .filter(s => s.classId === selectedClassId)
      .sort((a, b) => a.no - b.no);
  }, [appData.students, selectedClassId]);

  // Assignments in selected class
  const classAssignments = useMemo(() => {
    return appData.assignments.filter(a => a.classId === selectedClassId);
  }, [appData.assignments, selectedClassId]);

  // Handle selected assignment fallback
  const activeAssignment = useMemo(() => {
    let active = classAssignments.find(a => a.id === selectedAssignmentId);
    if (!active && classAssignments.length > 0) {
      active = classAssignments[0];
    }
    return active;
  }, [classAssignments, selectedAssignmentId]);

  // Score map for quick lookup: { studentId: score }
  const scoreMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (activeAssignment) {
      appData.scores
        .filter(s => s.classId === selectedClassId && s.assignmentId === activeAssignment.id)
        .forEach(record => {
          map[record.studentId] = record.score;
        });
    }
    return map;
  }, [appData.scores, selectedClassId, activeAssignment]);

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    return classStudents.filter(s =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.no.toString().includes(searchQuery)
    );
  }, [classStudents, searchQuery]);

  const handleAddAssignmentSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) {
      addToast('กรุณาเลือกชั้นเรียนก่อน', 'error');
      return;
    }
    if (!assignmentName.trim()) {
      addToast('กรุณากรอกชื่อชิ้นงาน', 'error');
      return;
    }
    const maxVal = parseFloat(maxScore);
    if (isNaN(maxVal) || maxVal <= 0) {
      addToast('คะแนนเต็มต้องมากกว่า 0', 'error');
      return;
    }

    onAddAssignment({
      classId: selectedClassId,
      name: assignmentName.trim(),
      maxScore: maxVal,
    });

    setAssignmentName('');
    setMaxScore('');
    setShowAddModal(false);
  };

  const handleDeleteAssignment = (id: string, name: string) => {
    setConfirmDeleteId(id);
    setConfirmDeleteName(name);
  };

  const handleScoreChange = (studentId: string, valueStr: string, maxScoreVal: number) => {
    if (valueStr === '') {
      onUpdateScore(selectedClassId, activeAssignment!.id, studentId, 0);
      return;
    }

    const val = parseFloat(valueStr);
    if (isNaN(val)) return;

    if (val < 0) {
      addToast('คะแนนต้องไม่ต่ำกว่า 0', 'error');
      return;
    }

    if (val > maxScoreVal) {
      addToast(`คะแนนต้องไม่เกินคะแนนเต็ม (${maxScoreVal})`, 'error');
      // clamp to max
      onUpdateScore(selectedClassId, activeAssignment!.id, studentId, maxScoreVal);
      return;
    }

    onUpdateScore(selectedClassId, activeAssignment!.id, studentId, val);
  };

  const adjustScore = (studentId: string, currentScore: number, amount: number, maxScoreVal: number) => {
    const newScore = Math.max(0, Math.min(maxScoreVal, currentScore + amount));
    // round to 2 decimals
    const rounded = Math.round(newScore * 100) / 100;
    onUpdateScore(selectedClassId, activeAssignment!.id, studentId, rounded);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Selector box */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-600">คะแนนเก็บสะสม</label>
          <h2 className="text-lg font-display font-bold text-slate-800">จัดการข้อมูลคะแนน</h2>
        </div>
        
        <div className="w-full sm:w-72">
          {appData.classrooms.length === 0 ? (
            <p className="text-rose-500 text-sm font-semibold">กรุณาเพิ่มชั้นเรียนก่อน</p>
          ) : (
            <select
              value={selectedClassId}
              onChange={e => {
                setSelectedClassId(e.target.value);
                setSelectedAssignmentId('');
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
        <div className="space-y-6">
          {/* Assignment Tab Strip */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-6 md:p-8 shadow-xl shadow-slate-100/80 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                ชิ้นงาน / งานที่มอบหมาย ({classAssignments.length})
              </h3>

              {isAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มชิ้นงานใหม่
                </button>
              )}
            </div>

            {classAssignments.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                <p className="text-slate-400 text-sm font-medium">ยังไม่มีการเพิ่มชิ้นงานในวิชานี้</p>
                {isAdmin && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-3 text-indigo-600 hover:text-indigo-800 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> เพิ่มชิ้นงานแรก
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                {classAssignments.map(asg => {
                  const isSelected = activeAssignment?.id === asg.id;
                  return (
                    <div
                      key={asg.id}
                      onClick={() => setSelectedAssignmentId(asg.id)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100 scale-[1.02]'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <span>{asg.name}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-500'}`}>
                        {asg.maxScore} คะแนน
                      </span>
                      {isAdmin && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteAssignment(asg.id, asg.name);
                          }}
                          className={`p-1 rounded-lg transition-colors ${
                            isSelected ? 'hover:bg-indigo-700 text-indigo-200 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-rose-600'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Score Input Matrix */}
          {activeAssignment && (
            <div className="bg-white rounded-3xl border border-slate-200/60 p-6 md:p-8 shadow-xl shadow-slate-100/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-display font-bold text-slate-800">
                    กรอกคะแนนชิ้นงาน: <span className="text-indigo-600">{activeAssignment.name}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    คะแนนเต็ม: <strong className="text-slate-600 font-mono font-bold">{activeAssignment.maxScore}</strong> คะแนน • ตรวจสอบคะแนนไม่ให้เกินคะแนนเต็มอัตโนมัติ
                  </p>
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

              {filteredStudents.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-slate-400 text-sm font-medium">ไม่พบรายชื่อนักเรียนตามที่ค้นหา</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-2xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider">
                        <th className="py-3.5 px-4 w-16 sm:w-20">เลขที่</th>
                        <th className="py-3.5 px-4">ชื่อ-นามสกุล</th>
                        <th className="py-3.5 px-4 text-center w-64 hidden sm:table-cell">สัดส่วน / เปอร์เซ็นต์</th>
                        <th className="py-3.5 px-4 text-right w-52 sm:w-80">ป้อนคะแนน (เต็ม {activeAssignment.maxScore})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                      {filteredStudents.map(std => {
                        const currentScore = scoreMap[std.id] || 0;
                        const percent = activeAssignment.maxScore > 0 
                          ? Math.round((currentScore / activeAssignment.maxScore) * 100) 
                          : 0;
                        
                        return (
                          <tr key={std.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-4 px-4 font-bold text-slate-600 font-mono">{std.no}</td>
                            <td className="py-4 px-4 font-semibold text-slate-800">{std.fullName}</td>
                            <td className="py-4 px-4 text-center hidden sm:table-cell">
                              <div className="flex items-center justify-center gap-2.5">
                                <div className="w-24 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-150"
                                    style={{ width: `${Math.min(100, percent)}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-mono text-slate-500 font-bold w-10 text-right">{percent}%</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                {/* Plus/Minus Action buttons */}
                                <div className="hidden md:flex border border-slate-200 rounded-xl overflow-hidden shadow-2xs select-none">
                                  <button
                                    onClick={() => adjustScore(std.id, currentScore, -1, activeAssignment.maxScore)}
                                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold text-xs cursor-pointer border-r border-slate-200 transition-colors"
                                    title="-1 คะแนน"
                                  >
                                    -1
                                  </button>
                                  <button
                                    onClick={() => adjustScore(std.id, currentScore, -0.5, activeAssignment.maxScore)}
                                    className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 text-[10px] font-bold cursor-pointer border-r border-slate-200 transition-colors"
                                    title="-0.5 คะแนน"
                                  >
                                    -0.5
                                  </button>
                                  <button
                                    onClick={() => adjustScore(std.id, currentScore, 0.5, activeAssignment.maxScore)}
                                    className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 text-[10px] font-bold cursor-pointer border-r border-slate-200 transition-colors"
                                    title="+0.5 คะแนน"
                                  >
                                    +0.5
                                  </button>
                                  <button
                                    onClick={() => adjustScore(std.id, currentScore, 1, activeAssignment.maxScore)}
                                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold text-xs cursor-pointer transition-colors"
                                    title="+1 คะแนน"
                                  >
                                    +1
                                  </button>
                                </div>

                                {/* Direct Input */}
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="any"
                                    value={scoreMap[std.id] !== undefined ? scoreMap[std.id] : ''}
                                    onChange={e => handleScoreChange(std.id, e.target.value, activeAssignment.maxScore)}
                                    className="w-16 sm:w-20 px-2 sm:px-3 py-1.5 border border-slate-200 rounded-xl text-right font-bold text-slate-800 font-mono focus:outline-none focus:border-indigo-500 bg-slate-50/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="0"
                                    min="0"
                                    max={activeAssignment.maxScore}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Assignment Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 md:p-8 shadow-2xl border border-slate-200/40 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            
            <form onSubmit={handleAddAssignmentSubmit} className="space-y-5 pt-2">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Award className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-display font-bold text-slate-800">เพิ่มชิ้นงานใหม่</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">ชื่อชิ้นงาน / รายการเก็บคะแนน</label>
                <input
                  type="text"
                  value={assignmentName}
                  onChange={e => setAssignmentName(e.target.value)}
                  placeholder="เช่น สอบกลางภาค, งานประดิษฐ์"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 transition-all font-medium text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">คะแนนเต็ม</label>
                <input
                  type="number"
                  step="any"
                  value={maxScore}
                  onChange={e => setMaxScore(e.target.value)}
                  placeholder="เช่น 10, 20, 100"
                  required
                  min="0.1"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 font-mono font-semibold text-slate-700"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer font-bold transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-md shadow-indigo-100 hover:shadow-lg cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-4 h-4" /> สร้างชิ้นงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Assignment Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-6 relative animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-display font-extrabold text-slate-800">ยืนยันการลบชิ้นงาน</h3>
                <p className="text-xs text-slate-400 font-semibold">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                คุณแน่ใจหรือไม่ที่จะลบชิ้นงาน <strong className="text-slate-900 font-bold">"{confirmDeleteName}"</strong>?
              </p>
              <p className="text-xs text-rose-600 bg-rose-50/80 border border-rose-100 p-3.5 rounded-2xl font-bold leading-relaxed">
                ⚠️ คำเตือน: การลบชิ้นงานนี้จะทำให้บันทึกคะแนนเก็บสะสมทั้งหมดของนักเรียนทุกคนภายใต้ชิ้นงานนี้ถูกลบอย่างถาวรทันที!
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  onDeleteAssignment(confirmDeleteId);
                  if (selectedAssignmentId === confirmDeleteId) {
                    setSelectedAssignmentId('');
                  }
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
