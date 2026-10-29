import { useState, FormEvent } from 'react';
import { Classroom, Student, AppData } from '../types';
import { Plus, Trash2, Edit2, Users, QrCode, Search, Check, X, ArrowUp, ArrowDown, Layers, SortAsc } from 'lucide-react';

export const SUBJECT_GROUPS = [
  { name: 'คณิตศาสตร์', color: 'rose', gradient: 'from-rose-50/50 to-pink-50/10', border: 'border-l-4 border-l-rose-500 border-slate-200/60', text: 'text-rose-700 bg-rose-50 hover:bg-rose-100/50', bullet: 'bg-rose-500' },
  { name: 'วิทยาศาสตร์และเทคโนโลยี', color: 'sky', gradient: 'from-sky-50/50 to-blue-50/10', border: 'border-l-4 border-l-sky-500 border-slate-200/60', text: 'text-sky-700 bg-sky-50 hover:bg-sky-100/50', bullet: 'bg-sky-500' },
  { name: 'ภาษาไทย', color: 'amber', gradient: 'from-amber-50/50 to-orange-50/10', border: 'border-l-4 border-l-amber-500 border-slate-200/60', text: 'text-amber-700 bg-amber-50 hover:bg-amber-100/50', bullet: 'bg-amber-500' },
  { name: 'ภาษาต่างประเทศ', color: 'purple', gradient: 'from-purple-50/50 to-fuchsia-50/10', border: 'border-l-4 border-l-purple-500 border-slate-200/60', text: 'text-purple-700 bg-purple-50 hover:bg-purple-100/50', bullet: 'bg-purple-500' },
  { name: 'สังคมศึกษา ศาสนา และวัฒนธรรม', color: 'emerald', gradient: 'from-emerald-50/50 to-teal-50/10', border: 'border-l-4 border-l-emerald-500 border-slate-200/60', text: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100/50', bullet: 'bg-emerald-500' },
  { name: 'สุขศึกษาและพลศึกษา', color: 'red', gradient: 'from-red-50/50 to-orange-50/10', border: 'border-l-4 border-l-red-500 border-slate-200/60', text: 'text-red-700 bg-red-50 hover:bg-red-100/50', bullet: 'bg-red-500' },
  { name: 'ศิลปะ', color: 'yellow', gradient: 'from-yellow-50/50 to-amber-50/10', border: 'border-l-4 border-l-yellow-500 border-slate-200/60', text: 'text-yellow-700 bg-yellow-50 hover:bg-yellow-100/50', bullet: 'bg-yellow-500' },
  { name: 'การงานอาชีพ', color: 'slate', gradient: 'from-slate-100/30 to-zinc-50/10', border: 'border-l-4 border-l-slate-500 border-slate-200/60', text: 'text-slate-700 bg-slate-50 hover:bg-slate-100/50', bullet: 'bg-slate-500' },
  { name: 'อื่นๆ / กิจกรรมพัฒนาผู้เรียน', color: 'zinc', gradient: 'from-zinc-50/50 to-slate-50/10', border: 'border-l-4 border-l-zinc-400 border-slate-200/60', text: 'text-zinc-600 bg-zinc-50 hover:bg-zinc-100/50', bullet: 'bg-zinc-400' },
];

export const getGroupStyle = (groupName?: string) => {
  const name = groupName || 'อื่นๆ / กิจกรรมพัฒนาผู้เรียน';
  const found = SUBJECT_GROUPS.find(g => g.name === name);
  return found || SUBJECT_GROUPS[SUBJECT_GROUPS.length - 1];
};

interface ClassroomsTabProps {
  appData: AppData;
  isAdmin: boolean;
  onAddClassroom: (classroom: Omit<Classroom, 'id'>) => void;
  onUpdateClassroom: (classroom: Classroom) => void;
  onDeleteClassroom: (id: string) => void;
  onReorderClassrooms?: (classrooms: Classroom[]) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function ClassroomsTab({
  appData,
  isAdmin,
  onAddClassroom,
  onUpdateClassroom,
  onDeleteClassroom,
  onReorderClassrooms,
  addToast,
}: ClassroomsTabProps) {
  const [subjectName, setSubjectName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [subjectGroup, setSubjectGroup] = useState('อื่นๆ / กิจกรรมพัฒนาผู้เรียน');
  const [searchQuery, setSearchQuery] = useState('');
  
  // View mode: custom list (reorderable) vs grouped by learning areas
  const [viewMode, setViewMode] = useState<'custom' | 'grouped'>('custom');
  
  // Edit mode state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editTeacher, setEditTeacher] = useState('');
  const [editSubjectGroup, setEditSubjectGroup] = useState('อื่นๆ / กิจกรรมพัฒนาผู้เรียน');

  // QR Code Modal State
  const [qrClass, setQrClass] = useState<Classroom | null>(null);

  // Delete confirmation modal state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim() || !roomName.trim() || !teacherName.trim()) {
      addToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
      return;
    }
    onAddClassroom({
      subjectName: subjectName.trim(),
      roomName: roomName.trim(),
      teacherName: teacherName.trim(),
      subjectGroup: subjectGroup,
    });
    setSubjectName('');
    setRoomName('');
    setTeacherName('');
    setSubjectGroup('อื่นๆ / กิจกรรมพัฒนาผู้เรียน');
  };

  const handleStartEdit = (cls: Classroom) => {
    setEditingId(cls.id);
    setEditSubject(cls.subjectName);
    setEditRoom(cls.roomName);
    setEditTeacher(cls.teacherName);
    setEditSubjectGroup(cls.subjectGroup || 'อื่นๆ / กิจกรรมพัฒนาผู้เรียน');
  };

  const handleSaveEdit = (id: string) => {
    if (!editSubject.trim() || !editRoom.trim() || !editTeacher.trim()) {
      addToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
      return;
    }
    onUpdateClassroom({
      id,
      subjectName: editSubject.trim(),
      roomName: editRoom.trim(),
      teacherName: editTeacher.trim(),
      subjectGroup: editSubjectGroup,
    });
    setEditingId(null);
  };

  const handleMove = (id: string, direction: 'UP' | 'DOWN') => {
    if (!onReorderClassrooms) return;
    const list = [...appData.classrooms];
    const index = list.findIndex(c => c.id === id);
    if (index === -1) return;

    if (direction === 'UP' && index > 0) {
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
      onReorderClassrooms(list);
      addToast('เลื่อนลำดับห้องเรียนขึ้นเรียบร้อย', 'success');
    } else if (direction === 'DOWN' && index < list.length - 1) {
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
      onReorderClassrooms(list);
      addToast('เลื่อนลำดับห้องเรียนลงเรียบร้อย', 'success');
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDeleteId(id);
    setConfirmDeleteName(name);
  };

  const getStudentCount = (classId: string) => {
    return appData.students.filter(s => s.classId === classId).length;
  };

  const filteredClassrooms = appData.classrooms.filter(
    c =>
      c.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.teacherName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderClassroomCard = (cls: Classroom) => {
    const isFirst = appData.classrooms.findIndex(c => c.id === cls.id) === 0;
    const isLast = appData.classrooms.findIndex(c => c.id === cls.id) === appData.classrooms.length - 1;
    const groupStyle = getGroupStyle(cls.subjectGroup);

    return (
      <div
        key={cls.id}
        className={`bg-gradient-to-br ${groupStyle.gradient} bg-white hover:bg-slate-50/50 border border-slate-100 hover:border-indigo-100 ${groupStyle.border} rounded-3xl p-5.5 shadow-sm hover:shadow-lg hover:shadow-slate-100/50 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden`}
      >
        {/* ID badge */}
        <div className="absolute top-0 right-0 bg-slate-100/80 text-slate-500 text-[9px] font-semibold font-mono px-3 py-1 rounded-bl-xl border-l border-b border-slate-200/40">
          {cls.id}
        </div>

        <div className="space-y-4">
          {editingId === cls.id ? (
            <div className="space-y-3.5 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">ชื่อวิชา</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={e => setEditSubject(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  placeholder="ชื่อวิชา"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">กลุ่มสาระ</label>
                <select
                  value={editSubjectGroup}
                  onChange={e => setEditSubjectGroup(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer font-medium text-slate-700"
                >
                  {SUBJECT_GROUPS.map(g => (
                    <option key={g.name} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">ห้องเรียน / ชั้นปี</label>
                <input
                  type="text"
                  value={editRoom}
                  onChange={e => setEditRoom(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  placeholder="ห้องเรียน"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">ครูผู้สอน</label>
                <input
                  type="text"
                  value={editTeacher}
                  onChange={e => setEditTeacher(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  placeholder="ครูผู้สอน"
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> ยกเลิก
                </button>
                <button
                  onClick={() => handleSaveEdit(cls.id)}
                  className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> บันทึก
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2 pt-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50/80 px-2.5 py-0.5 rounded-lg border border-indigo-100/30">
                    ห้อง {cls.roomName}
                  </span>
                  <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-lg border border-slate-200/10 ${groupStyle.text}`}>
                    {groupStyle.name}
                  </span>
                </div>
                <h3 className="text-base font-display font-black text-slate-800 line-clamp-1 pt-1">{cls.subjectName}</h3>
                <p className="text-xs text-slate-500 font-semibold">ครูผู้สอน: <span className="text-slate-700 font-bold">{cls.teacherName}</span></p>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1.5 font-bold bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
                  <Users className="w-4 h-4 text-indigo-500" />
                  นักเรียน <strong className="text-indigo-600 font-black">{getStudentCount(cls.id)}</strong> คน
                </span>
              </div>
            </>
          )}
        </div>

        {editingId !== cls.id && (
          <div className="flex items-center justify-between border-t border-slate-100/80 mt-5 pt-4">
            <button
              onClick={() => setQrClass(cls)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1.5 hover:bg-indigo-50 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
            >
              <QrCode className="w-4 h-4" />
              QR Code
            </button>

            <div className="flex items-center gap-2">
              {isAdmin && viewMode === 'custom' && !searchQuery.trim() && (
                <div className="flex items-center gap-0.5 bg-slate-100/80 border border-slate-200/40 p-0.5 rounded-xl shadow-xs">
                  <button
                    onClick={() => handleMove(cls.id, 'UP')}
                    disabled={isFirst}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isFirst ? 'text-slate-300 cursor-not-allowed bg-transparent' : 'text-slate-600 hover:text-indigo-600 hover:bg-white hover:shadow-xs'
                    }`}
                    title="เลื่อนขึ้น"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMove(cls.id, 'DOWN')}
                    disabled={isLast}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isLast ? 'text-slate-300 cursor-not-allowed bg-transparent' : 'text-slate-600 hover:text-indigo-600 hover:bg-white hover:shadow-xs'
                    }`}
                    title="เลื่อนลง"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {isAdmin && (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => handleStartEdit(cls)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                    title="แก้ไขชั้นเรียน"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cls.id, cls.subjectName)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                    title="ลบชั้นเรียน"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Add Class Form (Admin Only) */}
      {isAdmin && (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-6 md:p-8">
          <h2 className="text-lg font-display font-bold text-slate-800 mb-5 flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Plus className="w-5 h-5" />
            </span>
            เพิ่มชั้นเรียนใหม่
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">ชื่อวิชา / กลุ่มสาระ</label>
              <input
                type="text"
                value={subjectName}
                onChange={e => setSubjectName(e.target.value)}
                placeholder="เช่น คณิตศาสตร์, ภาษาอังกฤษ"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 transition-all font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">กลุ่มสาระ</label>
              <select
                value={subjectGroup}
                onChange={e => setSubjectGroup(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50 font-semibold text-slate-700 cursor-pointer transition-all"
              >
                {SUBJECT_GROUPS.map(g => (
                  <option key={g.name} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">ห้องเรียน / ชั้นปี</label>
              <input
                type="text"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                placeholder="เช่น ม.1/1, ม.4 ทับ 2"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 transition-all font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">ครูผู้สอน</label>
              <input
                type="text"
                value={teacherName}
                onChange={e => setTeacherName(e.target.value)}
                placeholder="เช่น ครูสมชาย ตั้งใจสอน"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 transition-all font-medium text-slate-700"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-indigo-100 hover:shadow-lg active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              สร้างชั้นเรียน
            </button>
          </form>
        </div>
      )}

      {/* Classroom List & Search */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-display font-bold text-slate-800">รายชื่อชั้นเรียนทั้งหมด ({appData.classrooms.length})</h2>
          <div className="relative max-w-md w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาตามชื่อวิชา, ห้องเรียน, ครูผู้สอน..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50/50 transition-all"
            />
          </div>
        </div>

        {/* Toggle View Options & Quick Info Tip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 border border-slate-100/60 p-4 rounded-2xl mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setViewMode('custom')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'custom'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              <SortAsc className="w-4 h-4" />
              จัดเรียงลำดับเอง (สลับ ⬆️ ⬇️)
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'grouped'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              แยกตามกลุ่มสาระฯ (สีประจำวิชา)
            </button>
          </div>
          
          <div className="text-[11px] text-slate-400 font-semibold leading-relaxed">
            {viewMode === 'custom' 
              ? '💡 แนะนำ: ใช้ปุ่มลูกศร ⬆️ ⬇️ บนการ์ดชั้นเรียนเพื่อเลื่อนปรับเปลี่ยนลำดับการแสดงผลด้วยตนเองได้ทันที' 
              : '💡 ระบบจะจัดกลุ่มห้องเรียนแยกตามสีและประเภทกลุ่มสาระหลัก 8 กลุ่มสาระ เพื่อความสะดวกในการวิเคราะห์ภาพรวม'}
          </div>
        </div>

        {filteredClassrooms.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-semibold">ไม่พบข้อมูลชั้นเรียน</p>
          </div>
        ) : viewMode === 'grouped' ? (
          <div className="space-y-8">
            {(() => {
              const groupsWithClassrooms = SUBJECT_GROUPS.map(group => {
                const classrooms = filteredClassrooms.filter(c => {
                  const cGroup = c.subjectGroup || 'อื่นๆ / กิจกรรมพัฒนาผู้เรียน';
                  return cGroup === group.name;
                });
                return { ...group, classrooms };
              }).filter(g => g.classrooms.length > 0);

              if (groupsWithClassrooms.length === 0) {
                return (
                  <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm font-semibold">ไม่พบข้อมูลชั้นเรียนในกลุ่มนี้</p>
                  </div>
                );
              }

              return groupsWithClassrooms.map(group => (
                <div key={group.name} className="space-y-4 pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-3 h-6 rounded-full ${group.bullet}`} />
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                      {group.name}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {group.classrooms.length} ชั้นเรียน
                      </span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.classrooms.map(cls => renderClassroomCard(cls))}
                  </div>
                </div>
              ));
            })()}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClassrooms.map(cls => renderClassroomCard(cls))}
          </div>
        )}
      </div>

      {/* QR Code Modal Dialog */}
      {qrClass && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 relative">
            <button
              onClick={() => setQrClass(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center space-y-4 pt-2">
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                ห้อง {qrClass.roomName}
              </span>
              <h3 className="text-lg font-bold text-slate-800 mt-1">{qrClass.subjectName}</h3>
              <p className="text-xs text-slate-500">ครูผู้สอน: {qrClass.teacherName}</p>
              
              <div className="bg-slate-50 p-4 rounded-xl inline-block border border-slate-100 my-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrClass.id)}`}
                  alt={`QR Code for ${qrClass.subjectName}`}
                  referrerPolicy="no-referrer"
                  className="w-48 h-48 mx-auto"
                />
              </div>

              <div className="text-[10px] font-mono text-slate-400 bg-slate-50 py-1.5 px-3 rounded-lg">
                ID: {qrClass.id}
              </div>

              <p className="text-xs text-slate-400">ใช้สแกนเพื่อเข้าถึงชั้นเรียนหรือระบุตัวตนในการเช็คชื่อ</p>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Custom Modal for Delete Confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-6 relative animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-display font-extrabold text-slate-800">ยืนยันการลบชั้นเรียน</h3>
                <p className="text-xs text-slate-400 font-semibold">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                คุณแน่ใจหรือไม่ที่จะลบชั้นเรียน <strong className="text-slate-900 font-bold">"{confirmDeleteName}"</strong>?
              </p>
              <p className="text-xs text-rose-600 bg-rose-50/80 border border-rose-100 p-3.5 rounded-2xl font-bold leading-relaxed">
                ⚠️ คำเตือน: การลบห้องเรียนจะทำให้ข้อมูลรายชื่อนักเรียนในห้องนี้ ประวัติการเช็คชื่อ และคะแนนกิจกรรม/ชิ้นงานทั้งหมดในห้องนี้ถูกลบอย่างถาวรทันที!
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  onDeleteClassroom(confirmDeleteId);
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
