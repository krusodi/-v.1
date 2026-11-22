import { useState, useMemo, FormEvent } from 'react';
import {
  AppData,
  DayOfWeek,
  PeriodNumber,
  ScheduleEntry,
  SchedulePeriodTimes,
  TeachingSchedule,
} from '../types';
import { SUBJECT_GROUPS, getGroupStyle } from './ClassroomsTab';
import {
  CalendarDays,
  Clock,
  Edit2,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  X,
  Check,
  Utensils,
  Lock,
  BookOpen,
} from 'lucide-react';

export const DEFAULT_SCHEDULE_TIMES: SchedulePeriodTimes = {
  period1: '08:30 - 09:20',
  period2: '09:20 - 10:10',
  period3: '10:10 - 11:00',
  period4: '11:00 - 11:50',
  lunch: '11:50 - 12:50',
  period5: '12:50 - 13:40',
  period6: '13:40 - 14:30',
  lunchLabel: 'พักกลางวัน',
};

export const DEFAULT_SCHEDULE: TeachingSchedule = {
  times: { ...DEFAULT_SCHEDULE_TIMES },
  entries: [],
};

const DAYS: { key: DayOfWeek; label: string; short: string; jsDay: number; accent: string }[] = [
  { key: 'MON', label: 'วันจันทร์', short: 'จ.', jsDay: 1, accent: 'bg-amber-50/70 text-amber-900' },
  { key: 'TUE', label: 'วันอังคาร', short: 'อ.', jsDay: 2, accent: 'bg-pink-50/70 text-pink-900' },
  { key: 'WED', label: 'วันพุธ', short: 'พ.', jsDay: 3, accent: 'bg-emerald-50/70 text-emerald-900' },
  { key: 'THU', label: 'วันพฤหัสบดี', short: 'พฤ.', jsDay: 4, accent: 'bg-orange-50/70 text-orange-900' },
  { key: 'FRI', label: 'วันศุกร์', short: 'ศ.', jsDay: 5, accent: 'bg-sky-50/70 text-sky-900' },
];

type TimeFieldKey = keyof Omit<SchedulePeriodTimes, 'lunchLabel'>;

const PERIOD_COLUMNS: {
  type: 'PERIOD' | 'LUNCH';
  period?: PeriodNumber;
  timeKey: TimeFieldKey;
  title: string;
}[] = [
  { type: 'PERIOD', period: 1, timeKey: 'period1', title: 'คาบที่ 1' },
  { type: 'PERIOD', period: 2, timeKey: 'period2', title: 'คาบที่ 2' },
  { type: 'PERIOD', period: 3, timeKey: 'period3', title: 'คาบที่ 3' },
  { type: 'PERIOD', period: 4, timeKey: 'period4', title: 'คาบที่ 4' },
  { type: 'LUNCH', timeKey: 'lunch', title: 'พักกลางวัน' },
  { type: 'PERIOD', period: 5, timeKey: 'period5', title: 'คาบที่ 5' },
  { type: 'PERIOD', period: 6, timeKey: 'period6', title: 'คาบที่ 6' },
];

interface ScheduleTabProps {
  appData: AppData;
  isAdmin: boolean;
  onUpdateSchedule: (schedule: TeachingSchedule) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function ScheduleTab({
  appData,
  isAdmin,
  onUpdateSchedule,
  addToast,
}: ScheduleTabProps) {
  const schedule: TeachingSchedule = useMemo(() => {
    return {
      times: {
        ...DEFAULT_SCHEDULE_TIMES,
        ...(appData.schedule?.times || {}),
      },
      entries: appData.schedule?.entries || [],
    };
  }, [appData.schedule]);

  // Highlight today's day if Mon-Fri
  const todayJsDay = new Date().getDay();

  // Edit Times Modal State
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [draftTimes, setDraftTimes] = useState<SchedulePeriodTimes>({ ...schedule.times });

  // Edit Slot Modal State
  const [editingSlot, setEditingSlot] = useState<{ day: DayOfWeek; period: PeriodNumber } | null>(null);
  const [slotClassroomId, setSlotClassroomId] = useState<string>('');
  const [slotSubjectName, setSlotSubjectName] = useState('');
  const [slotRoomName, setSlotRoomName] = useState('');
  const [slotTeacherName, setSlotTeacherName] = useState('');
  const [slotSubjectGroup, setSlotSubjectGroup] = useState('อื่นๆ / กิจกรรมพัฒนาผู้เรียน');
  const [slotNote, setSlotNote] = useState('');

  // Quick map for lookup
  const entryMap = useMemo(() => {
    const map: Record<string, ScheduleEntry> = {};
    schedule.entries.forEach((entry) => {
      map[`${entry.day}-${entry.period}`] = entry;
    });
    return map;
  }, [schedule.entries]);

  const totalAssignedPeriods = schedule.entries.length;
  const totalSlots = 5 * 6;
  const emptyPeriods = Math.max(0, totalSlots - totalAssignedPeriods);

  // Open Time Editor
  const handleOpenTimeModal = () => {
    if (!isAdmin) {
      addToast('สิทธิ์ผู้ใช้งานทั่วไป (User): ดูข้อมูลได้อย่างเดียว ไม่สามารถแก้ไขเวลาได้', 'error');
      return;
    }
    setDraftTimes({ ...schedule.times });
    setIsTimeModalOpen(true);
  };

  // Parse "08:30 - 09:20" into [start, end]
  const splitTimeRange = (range: string): [string, string] => {
    const parts = range.split('-').map((s) => s.trim());
    return [parts[0] || '', parts[1] || ''];
  };

  const updateDraftTimePart = (key: TimeFieldKey, partIndex: 0 | 1, value: string) => {
    const [start, end] = splitTimeRange(draftTimes[key]);
    const nextStart = partIndex === 0 ? value : start;
    const nextEnd = partIndex === 1 ? value : end;
    setDraftTimes((prev) => ({
      ...prev,
      [key]: `${nextStart} - ${nextEnd}`,
    }));
  };

  const handleSaveTimes = (e: FormEvent) => {
    e.preventDefault();
    const requiredKeys: { key: TimeFieldKey; label: string }[] = [
      { key: 'period1', label: 'คาบที่ 1' },
      { key: 'period2', label: 'คาบที่ 2' },
      { key: 'period3', label: 'คาบที่ 3' },
      { key: 'period4', label: 'คาบที่ 4' },
      { key: 'lunch', label: 'พักกลางวัน' },
      { key: 'period5', label: 'คาบที่ 5' },
      { key: 'period6', label: 'คาบที่ 6' },
    ];

    for (const item of requiredKeys) {
      const [s, en] = splitTimeRange(draftTimes[item.key]);
      if (!s || !en) {
        addToast(`กรุณาระบุเวลาเริ่มและสิ้นสุดสำหรับ "${item.label}" ให้ครบถ้วน`, 'error');
        return;
      }
    }

    onUpdateSchedule({
      ...schedule,
      times: {
        ...draftTimes,
        lunchLabel: (draftTimes.lunchLabel || 'พักกลางวัน').trim() || 'พักกลางวัน',
      },
    });
    setIsTimeModalOpen(false);
    addToast('บันทึกเวลาเรียนคาบที่ 1-6 และพักกลางวันเรียบร้อยแล้ว', 'success');
  };

  const handleResetDefaultTimes = () => {
    setDraftTimes({ ...DEFAULT_SCHEDULE_TIMES });
  };

  // Open Cell Slot Editor
  const handleOpenSlotModal = (day: DayOfWeek, period: PeriodNumber) => {
    if (!isAdmin) {
      addToast('สิทธิ์ผู้ใช้งานทั่วไป (User): ดูข้อมูลได้อย่างเดียว ไม่สามารถแก้ไขตารางสอนได้', 'error');
      return;
    }

    const existing = entryMap[`${day}-${period}`];
    if (existing) {
      setSlotClassroomId(existing.classroomId || '');
      setSlotSubjectName(existing.subjectName || '');
      setSlotRoomName(existing.roomName || '');
      setSlotTeacherName(existing.teacherName || '');
      setSlotSubjectGroup(existing.subjectGroup || 'อื่นๆ / กิจกรรมพัฒนาผู้เรียน');
      setSlotNote(existing.note || '');
    } else {
      setSlotClassroomId('');
      setSlotSubjectName('');
      setSlotRoomName('');
      setSlotTeacherName('');
      setSlotSubjectGroup('อื่นๆ / กิจกรรมพัฒนาผู้เรียน');
      setSlotNote('');
    }
    setEditingSlot({ day, period });
  };

  const handleSelectClassroom = (classroomId: string) => {
    setSlotClassroomId(classroomId);
    if (!classroomId) return;
    const cls = appData.classrooms.find((c) => c.id === classroomId);
    if (cls) {
      setSlotSubjectName(cls.subjectName);
      setSlotRoomName(cls.roomName);
      setSlotTeacherName(cls.teacherName);
      setSlotSubjectGroup(cls.subjectGroup || 'อื่นๆ / กิจกรรมพัฒนาผู้เรียน');
    }
  };

  const handleSaveSlot = (e: FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    if (!slotSubjectName.trim()) {
      addToast('กรุณากรอกชื่อวิชาหรือกิจกรรม', 'error');
      return;
    }

    const newEntry: ScheduleEntry = {
      day: editingSlot.day,
      period: editingSlot.period,
      classroomId: slotClassroomId || undefined,
      subjectName: slotSubjectName.trim(),
      roomName: slotRoomName.trim() || undefined,
      teacherName: slotTeacherName.trim() || undefined,
      subjectGroup: slotSubjectGroup,
      note: slotNote.trim() || undefined,
    };

    const filtered = schedule.entries.filter(
      (item) => !(item.day === editingSlot.day && item.period === editingSlot.period)
    );

    onUpdateSchedule({
      ...schedule,
      entries: [...filtered, newEntry],
    });
    setEditingSlot(null);
    addToast('บันทึกคาบสอนเรียบร้อยแล้ว', 'success');
  };

  const handleClearSlot = () => {
    if (!editingSlot) return;
    const filtered = schedule.entries.filter(
      (item) => !(item.day === editingSlot.day && item.period === editingSlot.period)
    );
    onUpdateSchedule({
      ...schedule,
      entries: filtered,
    });
    setEditingSlot(null);
    addToast('ล้างข้อมูลคาบสอนนี้เรียบร้อยแล้ว', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  const editingDayInfo = editingSlot ? DAYS.find((d) => d.key === editingSlot.day) : null;
  const editingTimeKey: TimeFieldKey | null = editingSlot
    ? (`period${editingSlot.period}` as TimeFieldKey)
    : null;
  const hasExistingInModal = editingSlot
    ? Boolean(entryMap[`${editingSlot.day}-${editingSlot.period}`])
    : false;

  return (
    <div className="space-y-6 font-sans">
      {/* Control Header Bar (Hidden during print) */}
      <div className="print:hidden bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600 shrink-0" />
            <h2 className="text-lg font-display font-bold text-slate-900">
              ตารางสอนประจำสัปดาห์ (จันทร์ - ศุกร์)
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>{appData.settings.schoolName}</span>
            <span aria-hidden="true">·</span>
            <span>จำนวน 6 คาบ (คาบ 1-4 / พักกลางวัน / คาบ 5-6)</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums font-medium text-slate-700">
              มีคาบสอน {totalAssignedPeriods} คาบ / ว่าง {emptyPeriods} คาบ
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenTimeModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <Clock className="w-4 h-4" />
              <span>แก้ไขเวลา คาบ 1-6 / พักกลางวัน</span>
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>พิมพ์ตารางสอน</span>
          </button>
        </div>
      </div>

      {/* Read-only notice for User role */}
      {!isAdmin && (
        <div className="print:hidden bg-amber-50/80 border border-amber-200/80 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs font-medium text-amber-800">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>สิทธิ์ผู้ใช้งานทั่วไป (User): ดูข้อมูลตารางสอนได้อย่างเดียว ไม่สามารถแก้ไขเวลาหรือคาบสอนได้</span>
        </div>
      )}

      {/* Printable Formal School Header (Visible on Print) */}
      <div className="hidden print:block text-center space-y-1 pb-4 border-b border-slate-300">
        <h2 className="text-lg font-bold text-slate-900">ตารางสอนประจำสัปดาห์ (วันจันทร์ - วันศุกร์)</h2>
        <p className="text-xs font-semibold text-slate-700">
          {appData.settings.schoolName} · {appData.settings.systemName}
        </p>
      </div>

      {/* Main Timetable Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-slate-800 print:rounded-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[920px] text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 print:bg-slate-100 print:border-slate-800">
                <th className="py-3.5 px-3 text-left font-bold text-slate-700 border-r border-slate-200 w-32 min-w-[116px] print:border-slate-800">
                  <div>วัน / คาบ</div>
                  <div className="text-[11px] font-normal text-slate-400 mt-0.5">จันทร์ - ศุกร์</div>
                </th>

                {PERIOD_COLUMNS.map((col) => {
                  const isLunch = col.type === 'LUNCH';
                  const displayTitle = isLunch
                    ? schedule.times.lunchLabel || 'พักกลางวัน'
                    : col.title;
                  const timeValue = schedule.times[col.timeKey];

                  return (
                    <th
                      key={col.timeKey}
                      className={`py-3 px-2 text-center border-r last:border-r-0 border-slate-200 print:border-slate-800 align-top ${
                        isLunch
                          ? 'bg-amber-50/70 text-amber-900 w-28 min-w-[104px]'
                          : 'text-slate-800 min-w-[128px]'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1 font-bold text-xs sm:text-[13px]">
                        {isLunch && <Utensils className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                        <span>{displayTitle}</span>
                      </div>

                      <div className="mt-1 flex items-center justify-center gap-1">
                        <span
                          className={`text-[11px] font-mono tabular-nums font-medium ${
                            isLunch ? 'text-amber-700' : 'text-slate-500'
                          }`}
                        >
                          {timeValue}
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={handleOpenTimeModal}
                            title={`แก้ไขเวลา ${displayTitle}`}
                            className="print:hidden p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 print:divide-slate-800">
              {DAYS.map((day, rowIdx) => {
                const isToday = todayJsDay === day.jsDay;

                return (
                  <tr key={day.key} className="group/row">
                    {/* Day Label Column */}
                    <td
                      className={`py-3 px-3 border-r border-slate-200 print:border-slate-800 align-middle font-bold ${day.accent} print:bg-slate-50`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs sm:text-[13px] whitespace-nowrap">{day.label}</span>
                        {isToday && (
                          <span className="print:hidden text-[10px] font-semibold text-indigo-700">
                            วันนี้
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Period 1..4, Lunch (rowSpan=5 on row 0), Period 5..6 */}
                    {PERIOD_COLUMNS.map((col) => {
                      if (col.type === 'LUNCH') {
                        if (rowIdx !== 0) return null;
                        return (
                          <td
                            key="lunch-break"
                            rowSpan={5}
                            className="border-r border-slate-200 print:border-slate-800 bg-amber-50/40 text-center align-middle px-2 py-4 select-none"
                          >
                            <div className="flex flex-col items-center justify-center gap-2 text-amber-800">
                              <Utensils className="w-5 h-5 text-amber-600" />
                              <span className="font-bold text-xs tracking-wide">
                                {schedule.times.lunchLabel || 'พักกลางวัน'}
                              </span>
                              <span className="text-[11px] font-mono tabular-nums text-amber-700/90">
                                {schedule.times.lunch}
                              </span>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={handleOpenTimeModal}
                                  className="print:hidden mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white border border-amber-200 text-amber-800 text-[11px] font-semibold transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>แก้เวลา</span>
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      }

                      const periodNum = col.period!;
                      const entry = entryMap[`${day.key}-${periodNum}`];
                      const groupStyle = entry ? getGroupStyle(entry.subjectGroup) : null;

                      return (
                        <td
                          key={`${day.key}-${periodNum}`}
                          className={`p-1.5 sm:p-2 border-r last:border-r-0 border-slate-200 print:border-slate-800 align-top h-24 transition-colors ${
                            isAdmin ? 'hover:bg-slate-50/80' : ''
                          }`}
                        >
                          {entry ? (
                            <div
                              onClick={() => isAdmin && handleOpenSlotModal(day.key, periodNum)}
                              role={isAdmin ? 'button' : undefined}
                              tabIndex={isAdmin ? 0 : undefined}
                              onKeyDown={(e) => {
                                if (isAdmin && (e.key === 'Enter' || e.key === ' ')) {
                                  e.preventDefault();
                                  handleOpenSlotModal(day.key, periodNum);
                                }
                              }}
                              className={`h-full min-h-[78px] rounded-xl p-2.5 border border-slate-200/80 bg-gradient-to-br ${
                                groupStyle?.gradient || 'from-slate-50 to-white'
                              } flex flex-col justify-between gap-1 text-left transition-all ${
                                isAdmin
                                  ? 'cursor-pointer hover:border-indigo-300 hover:shadow-xs group/cell'
                                  : ''
                              } print:border-0 print:bg-none print:p-1`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-start justify-between gap-1">
                                  <span className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                                    {entry.subjectName}
                                  </span>
                                  {isAdmin && (
                                    <Edit2 className="print:hidden w-3 h-3 text-slate-400 opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0 mt-0.5" />
                                  )}
                                </div>
                                {entry.roomName && (
                                  <div className="text-[11px] font-semibold text-indigo-700">
                                    ห้อง {entry.roomName}
                                  </div>
                                )}
                              </div>

                              {(entry.note || entry.teacherName) && (
                                <div className="text-[10px] text-slate-500 truncate pt-1 border-t border-slate-200/50">
                                  {entry.note || entry.teacherName}
                                </div>
                              )}
                            </div>
                          ) : isAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleOpenSlotModal(day.key, periodNum)}
                              className="print:hidden w-full h-full min-h-[78px] rounded-xl border border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-400 hover:text-indigo-600 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer group/empty"
                            >
                              <Plus className="w-4 h-4 opacity-50 group-hover/empty:opacity-100" />
                              <span className="text-[11px] font-medium">เพิ่มวิชา</span>
                            </button>
                          ) : (
                            <div className="w-full h-full min-h-[78px] flex items-center justify-center text-slate-300 text-xs">
                              ว่าง
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Signature Block */}
      <div className="hidden print:grid grid-cols-3 gap-6 pt-10 text-xs text-slate-700 text-center">
        <div className="space-y-10">
          <p className="font-semibold">ลงชื่อ ............................................. ครูผู้สอน</p>
          <p>(&nbsp;.............................................&nbsp;)</p>
        </div>
        <div className="space-y-10">
          <p className="font-semibold">ลงชื่อ ............................................. ผู้รับรอง</p>
          <p>(&nbsp;{appData.settings.academicHeadName || '.............................................'}&nbsp;)</p>
          <p className="text-slate-500">หัวหน้าฝ่ายวิชาการ</p>
        </div>
        <div className="space-y-10">
          <p className="font-semibold">ลงชื่อ ............................................. ผู้รับรอง</p>
          <p>(&nbsp;{appData.settings.directorName || '.............................................'}&nbsp;)</p>
          <p className="text-slate-500">ผู้อำนวยการสถานศึกษา</p>
        </div>
      </div>

      {/* MODAL 1: EDIT PERIOD TIMES (คาบที่ 1-6 และ พักกลางวัน) */}
      {isTimeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-display font-bold text-slate-900">
                    แก้ไขเวลาเรียน (คาบที่ 1-6 และ พักกลางวัน)
                  </h3>
                  <p className="text-xs text-slate-500">กำหนดเวลาเริ่มต้น - สิ้นสุดของแต่ละคาบเรียน</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTimeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTimes} className="p-6 space-y-3 max-h-[75vh] overflow-y-auto">
              {PERIOD_COLUMNS.map((col) => {
                const [startVal, endVal] = splitTimeRange(draftTimes[col.timeKey]);
                const isLunch = col.type === 'LUNCH';

                return (
                  <div
                    key={col.timeKey}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      isLunch
                        ? 'bg-amber-50/60 border-amber-200/80'
                        : 'bg-slate-50/60 border-slate-200/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-[130px]">
                      {isLunch ? (
                        <Utensils className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                      {isLunch ? (
                        <input
                          type="text"
                          value={draftTimes.lunchLabel ?? 'พักกลางวัน'}
                          onChange={(e) =>
                            setDraftTimes((prev) => ({ ...prev, lunchLabel: e.target.value }))
                          }
                          placeholder="พักกลางวัน"
                          className="w-28 px-2 py-1 rounded-lg border border-amber-200 bg-white text-xs font-bold text-amber-900 focus:outline-none focus:border-amber-500"
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-800">{col.title}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={5}
                        value={startVal}
                        onChange={(e) => updateDraftTimePart(col.timeKey, 0, e.target.value)}
                        placeholder="08:30"
                        className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-center font-mono tabular-nums text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                        required
                      />
                      <span className="text-slate-400 font-bold text-xs">-</span>
                      <input
                        type="text"
                        maxLength={5}
                        value={endVal}
                        onChange={(e) => updateDraftTimePart(col.timeKey, 1, e.target.value)}
                        placeholder="09:20"
                        className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-center font-mono tabular-nums text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>
                );
              })}

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleResetDefaultTimes}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ค่าเริ่มต้น</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTimeModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>บันทึกเวลา</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT SCHEDULE SLOT (DAY & PERIOD) */}
      {editingSlot && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-display font-bold text-slate-900">
                  กำหนดรายวิชาสอน
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {editingDayInfo?.label} · คาบที่ {editingSlot.period}
                  {editingTimeKey && (
                    <span className="font-mono tabular-nums ml-1.5 text-indigo-600">
                      ({schedule.times[editingTimeKey]})
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="p-6 space-y-4">
              {appData.classrooms.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    เลือกจากชั้นเรียนที่มีอยู่ (กรอกให้อัตโนมัติ)
                  </label>
                  <select
                    value={slotClassroomId}
                    onChange={(e) => handleSelectClassroom(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/70 text-slate-800 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">-- กำหนดเอง หรือเลือกชั้นเรียน --</option>
                    {appData.classrooms.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.subjectName} (ห้อง {cls.roomName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  ชื่อวิชา / กิจกรรม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={slotSubjectName}
                  onChange={(e) => setSlotSubjectName(e.target.value)}
                  placeholder="เช่น คณิตศาสตร์พื้นฐาน, กิจกรรมโฮมรูม"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    ห้องเรียน / ชั้น
                  </label>
                  <input
                    type="text"
                    value={slotRoomName}
                    onChange={(e) => setSlotRoomName(e.target.value)}
                    placeholder="เช่น ม.1/1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    หมายเหตุ / ห้องปฏิบัติการ
                  </label>
                  <input
                    type="text"
                    value={slotNote}
                    onChange={(e) => setSlotNote(e.target.value)}
                    placeholder="เช่น ห้อง Lab 1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  กลุ่มสาระการเรียนรู้ (สีประจำวิชา)
                </label>
                <select
                  value={slotSubjectGroup}
                  onChange={(e) => setSlotSubjectGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50 text-slate-800 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {SUBJECT_GROUPS.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {hasExistingInModal ? (
                  <button
                    type="button"
                    onClick={handleClearSlot}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ล้างคาบนี้</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSlot(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>บันทึกคาบสอน</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
