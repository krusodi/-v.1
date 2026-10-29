import { useState, useEffect, FormEvent } from 'react';
import { AppData, SystemSettings } from '../types';
import { Settings, BarChart3, Download, Upload, Trash2, ArrowUpCircle, AlertTriangle, Check, ShieldCheck, HelpCircle, ExternalLink, RefreshCw, Cloud, Sparkles } from 'lucide-react';

interface ManagementTabProps {
  appData: AppData;
  googleUser: any;
  isSyncing: boolean;
  onGoogleLogin: () => Promise<void>;
  onGoogleLogout: () => Promise<void>;
  onSaveToFirebase?: () => Promise<void>;
  onPullFromFirebase?: () => Promise<void>;
  firebaseProjectName?: string;
  onUpdateSettings: (settings: SystemSettings) => void;
  onImportData: (data: AppData) => void;
  onDeleteAllStudents: () => void;
  onPromoteClassrooms: () => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function ManagementTab({
  appData,
  googleUser,
  isSyncing,
  onGoogleLogin,
  onGoogleLogout,
  onSaveToFirebase,
  onPullFromFirebase,
  firebaseProjectName = 'data69-school',
  onUpdateSettings,
  onImportData,
  onDeleteAllStudents,
  onPromoteClassrooms,
  addToast,
}: ManagementTabProps) {
  // Settings Form State
  const [systemName, setSystemName] = useState(appData.settings.systemName);
  const [schoolName, setSchoolName] = useState(appData.settings.schoolName);
  const [adminPin, setAdminPin] = useState(appData.settings.adminPin);
  const [userPin, setUserPin] = useState(appData.settings.userPin);
  const [maxStudentsLimit, setMaxStudentsLimit] = useState(appData.settings.maxStudentsLimit ?? 999);
  const [isUnlimitedQuota, setIsUnlimitedQuota] = useState(appData.settings.isUnlimitedQuota ?? true);
  const [academicHeadName, setAcademicHeadName] = useState(appData.settings.academicHeadName ?? '');
  const [directorName, setDirectorName] = useState(appData.settings.directorName ?? '');

  // Sync inputs with parent settings changes
  useEffect(() => {
    setSystemName(appData.settings.systemName);
    setSchoolName(appData.settings.schoolName);
    setAdminPin(appData.settings.adminPin);
    setUserPin(appData.settings.userPin);
    setMaxStudentsLimit(appData.settings.maxStudentsLimit ?? 999);
    setIsUnlimitedQuota(appData.settings.isUnlimitedQuota ?? true);
    setAcademicHeadName(appData.settings.academicHeadName ?? '');
    setDirectorName(appData.settings.directorName ?? '');
  }, [appData.settings]);

  // Backup file upload state
  const [pastedJson, setPastedJson] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);

  // Custom multi-step action confirmation states
  const [confirmAction, setConfirmAction] = useState<'DELETE_ALL_STUDENTS' | 'PROMOTE_CLASSROOMS' | null>(null);
  const [confirmStep, setConfirmStep] = useState<number>(1);

  // Stats calculation
  const totalClassrooms = appData.classrooms.length;
  const totalStudents = appData.students.length;
  const totalAttendance = appData.attendance.length;
  const totalScores = appData.scores.length;

  const handleSettingsSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!systemName.trim() || !schoolName.trim() || !adminPin.trim() || !userPin.trim()) {
      addToast('กรุณากรอกข้อมูลตั้งค่าให้ครบถ้วน', 'error');
      return;
    }

    if (adminPin.length < 4 || userPin.length < 4) {
      addToast('รหัส PIN ต้องมีอย่างน้อย 4 ตัวอักษร', 'error');
      return;
    }

    onUpdateSettings({
      systemName: systemName.trim(),
      schoolName: schoolName.trim(),
      adminPin: adminPin.trim(),
      userPin: userPin.trim(),
      maxStudentsLimit,
      isUnlimitedQuota,
      academicHeadName: academicHeadName.trim(),
      directorName: directorName.trim(),
    });
  };

  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify(appData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `classroom_backup_${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      addToast('ส่งออกข้อมูลสำรองเสร็จสิ้น', 'success');
    } catch (err) {
      addToast('ไม่สามารถส่งออกข้อมูลได้', 'error');
    }
  };

  const handleImportJSON = () => {
    if (!pastedJson.trim()) {
      addToast('กรุณากรอกหรือวางโค้ดข้อมูลสำรอง', 'error');
      return;
    }

    try {
      const parsed = JSON.parse(pastedJson);
      
      // Basic structure validation
      if (
        parsed.settings &&
        Array.isArray(parsed.classrooms) &&
        Array.isArray(parsed.students) &&
        Array.isArray(parsed.attendance) &&
        Array.isArray(parsed.assignments) &&
        Array.isArray(parsed.scores)
      ) {
        onImportData(parsed);
        setPastedJson('');
        setShowImportArea(false);
        // Refresh local inputs to match imported settings
        setSystemName(parsed.settings.systemName);
        setSchoolName(parsed.settings.schoolName);
        setAdminPin(parsed.settings.adminPin);
        setUserPin(parsed.settings.userPin);
        setAcademicHeadName(parsed.settings.academicHeadName ?? '');
        setDirectorName(parsed.settings.directorName ?? '');
      } else {
        addToast('โครงสร้างไฟล์ JSON ไม่ถูกต้องสำหรับแอปนี้', 'error');
      }
    } catch (err) {
      addToast('รูปแบบโค้ด JSON ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง', 'error');
    }
  };

  const handleDeleteAllStudents = () => {
    setConfirmAction('DELETE_ALL_STUDENTS');
    setConfirmStep(1);
  };

  const handlePromoteClassrooms = () => {
    setConfirmAction('PROMOTE_CLASSROOMS');
    setConfirmStep(1);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Overview stats panel */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-6 md:p-8">
        <h3 className="text-base font-display font-bold text-slate-800 mb-5 flex items-center gap-2">
          <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <BarChart3 className="w-5 h-5" />
          </span>
          ภาพรวมสถิติระบบ
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 text-center shadow-2xs">
            <span className="block text-xs text-slate-400 font-bold mb-1">จำนวนชั้นเรียน</span>
            <span className="text-xl font-extrabold font-mono text-slate-700">{totalClassrooms} ห้อง</span>
          </div>

          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 text-center shadow-2xs">
            <span className="block text-xs text-slate-400 font-bold mb-1">นักเรียนทั้งหมด</span>
            <span className="text-xl font-extrabold font-mono text-slate-700">{totalStudents} คน</span>
          </div>

          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 text-center shadow-2xs">
            <span className="block text-xs text-slate-400 font-bold mb-1">รายการเช็คชื่อ</span>
            <span className="text-xl font-extrabold font-mono text-slate-700">{totalAttendance} แถว</span>
          </div>

          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 text-center shadow-2xs">
            <span className="block text-xs text-slate-400 font-bold mb-1">รายการป้อนคะแนน</span>
            <span className="text-xl font-extrabold font-mono text-slate-700">{totalScores} รายการ</span>
          </div>
        </div>

        {/* Capacity Warning Bar */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="flex justify-between items-center text-xs text-slate-500 font-bold mb-2">
            <span>โควตาพื้นที่ฐานข้อมูลนักเรียน</span>
            {appData.settings.isUnlimitedQuota ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                ใช้งานจริง {totalStudents} คน / ไม่จำกัด (Unlimited)
              </span>
            ) : (
              <span className={totalStudents >= (appData.settings.maxStudentsLimit ?? 999) * 0.9 ? "text-rose-600 font-bold" : "text-slate-600 font-bold"}>
                {totalStudents} / {appData.settings.maxStudentsLimit ?? 999} คน
              </span>
            )}
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            {appData.settings.isUnlimitedQuota ? (
              <div 
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 transition-all duration-300"
                style={{ width: "100%" }}
              ></div>
            ) : (
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  totalStudents >= (appData.settings.maxStudentsLimit ?? 999) * 0.9 ? 'bg-rose-500' : totalStudents >= (appData.settings.maxStudentsLimit ?? 999) * 0.75 ? 'bg-amber-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(100, (totalStudents / (appData.settings.maxStudentsLimit ?? 999)) * 100)}%` }}
              ></div>
            )}
          </div>
          {appData.settings.isUnlimitedQuota ? (
            <div className="mt-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>เปิดใช้งานโควตาฐานข้อมูลระบบคลาวด์แบบไม่จำกัด (Unlimited Database Space) ร่วมกับ Firebase Firestore เรียบร้อยแล้ว</span>
            </div>
          ) : (
            totalStudents >= (appData.settings.maxStudentsLimit ?? 999) * 0.9 && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>แจ้งเตือน: จำนวนนักเรียนใกล้เต็มจำนวนจำกัด ({appData.settings.maxStudentsLimit ?? 999} คน) คุณสามารถเปิดใช้งานโควตาไม่จำกัดได้ที่การตั้งค่าระบบด้านล่าง</span>
              </div>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* System settings form */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-6 md:p-8">
          <h3 className="text-base font-display font-bold text-slate-800 mb-5 flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Settings className="w-5 h-5" />
            </span>
            ตั้งค่าระบบแอปพลิเคชัน
          </h3>

          <form onSubmit={handleSettingsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">ชื่อระบบ (หัวรายงาน)</label>
              <input
                type="text"
                value={systemName}
                onChange={e => setSystemName(e.target.value)}
                placeholder="เช่น ระบบบริหารจัดการชั้นเรียนออนไลน์"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 font-medium transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">ชื่อโรงเรียน / สถาบัน</label>
              <input
                type="text"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                placeholder="เช่น โรงเรียนสามัญศึกษา"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 font-medium transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">ชื่อหัวหน้าฝ่ายวิชาการ</label>
                <input
                  type="text"
                  value={academicHeadName}
                  onChange={e => setAcademicHeadName(e.target.value)}
                  placeholder="เช่น นายรักเรียน ดีเด่น"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">ชื่อผู้อำนวยการสถานศึกษา</label>
                <input
                  type="text"
                  value={directorName}
                  onChange={e => setDirectorName(e.target.value)}
                  placeholder="เช่น นางสาวใจดี พัฒนา"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 font-medium transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">รหัส PIN ผู้ดูแล (Admin)</label>
                <input
                  type="text"
                  maxLength={10}
                  value={adminPin}
                  onChange={e => setAdminPin(e.target.value)}
                  placeholder="รหัสผ่าน Admin"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 font-mono font-bold text-center transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">รหัส PIN ทั่วไป (User)</label>
                <input
                  type="text"
                  maxLength={10}
                  value={userPin}
                  onChange={e => setUserPin(e.target.value)}
                  placeholder="รหัสผ่านผู้ใช้งาน"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 font-mono font-bold text-center transition-all"
                />
              </div>
            </div>

            {/* Student Quota Configuration */}
            <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-700">โควตาแบบไม่จำกัด (Unlimited Quota)</label>
                  <span className="text-[10px] text-slate-400">ปลดล็อคข้อจำกัดพื้นที่เก็บข้อมูลนักเรียน 100%</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUnlimitedQuota}
                    onChange={(e) => setIsUnlimitedQuota(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {!isUnlimitedQuota && (
                <div className="pt-2 border-t border-slate-100/60">
                  <label className="block text-xs font-semibold text-slate-500 mb-2">จำนวนจำกัดนักเรียนสูงสุด (คน)</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={10}
                      max={100000}
                      value={maxStudentsLimit}
                      onChange={(e) => setMaxStudentsLimit(Number(e.target.value))}
                      className="flex-1 min-w-[80px] px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 bg-white text-slate-700 font-semibold transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setMaxStudentsLimit(prev => prev + 500)}
                      className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 font-bold rounded-lg text-[10px] transition-colors shrink-0 cursor-pointer"
                    >
                      +500 คน
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaxStudentsLimit(prev => prev + 1000)}
                      className="px-2.5 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-100 text-teal-600 font-bold rounded-lg text-[10px] transition-colors shrink-0 cursor-pointer"
                    >
                      +1000 คน
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    คุณสามารถกดเพิ่มทีละ 500 หรือ 1,000 คน ได้ตามความต้องการใช้งานของโรงเรียน
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-indigo-100 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-98 cursor-pointer mt-4"
            >
              <Check className="w-4 h-4" />
              บันทึกการตั้งค่าทันที
            </button>
          </form>
        </div>

        {/* Data backup and bulk management actions */}
        <div className="space-y-6">
          {/* Firebase Cloud Database (data69-school) Box */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-display font-bold text-slate-800 flex items-center gap-2">
                <span className="p-1.5 bg-amber-50 text-amber-600 rounded-xl">
                  <Cloud className="w-5 h-5 text-amber-500" />
                </span>
                ฐานข้อมูลคลาวด์ Firebase Firestore
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                ออนไลน์
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium mb-4 leading-relaxed">
              ระบบเชื่อมต่อฐานข้อมูล <strong>{firebaseProjectName}</strong> ผ่าน Firebase Firestore โดยตรง ข้อมูลห้องเรียน นักเรียน การเช็คชื่อ และคะแนนทั้งหมดจะได้รับการจัดเก็บไว้อย่างปลอดภัยบนคลาวด์
            </p>

            <div className="p-3.5 bg-amber-50/60 border border-amber-100/80 rounded-2xl space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">ชื่อโปรเจกต์ Firebase:</span>
                <span className="font-mono font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md">{firebaseProjectName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">คอลเลกชันที่จัดเก็บ:</span>
                <span className="font-mono text-slate-600 font-medium bg-white px-2 py-0.5 rounded-md border border-amber-100/60">schools/{firebaseProjectName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">สถานะบัญชี Gmail:</span>
                <span className="font-semibold text-slate-700">
                  {googleUser ? (googleUser.email || googleUser.displayName) : 'เข้าสู่ระบบแล้ว (สิทธิ์ใช้งานพร้อมซิงค์)'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onSaveToFirebase}
                disabled={isSyncing}
                className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-amber-200 disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>บันทึกไป Firebase</span>
              </button>

              <button
                type="button"
                onClick={onPullFromFirebase}
                disabled={isSyncing}
                className="bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-slate-700 hover:text-amber-800 font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-amber-600" />
                <span>ดึงข้อมูลล่าสุด</span>
              </button>
            </div>
          </div>

          {/* Export / Import Box */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200/60 p-6 md:p-8">
            <h3 className="text-base font-display font-bold text-slate-800 mb-5 flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Download className="w-5 h-5" />
              </span>
              การสำรองและกู้คืนข้อมูล (JSON)
            </h3>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleExportJSON}
                className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                ดาวน์โหลด JSON สำรอง
              </button>

              <button
                onClick={() => setShowImportArea(!showImportArea)}
                className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                นำเข้ากู้คืน JSON
              </button>
            </div>

            {showImportArea && (
              <div className="mt-4 space-y-3 pt-4 border-t border-slate-100 transition-all">
                <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                  * วางข้อความ JSON สำรองที่คุณได้เคยดาวน์โหลดเก็บไว้ เพื่อแทนที่ฐานข้อมูลปัจจุบัน
                </p>
                <textarea
                  value={pastedJson}
                  onChange={e => setPastedJson(e.target.value)}
                  placeholder='วางข้อมูล JSON ตรงนี้ (โครงสร้าง: {"settings": ..., "classrooms": ...})'
                  className="w-full h-32 px-4 py-3 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50 transition-all"
                />
                <button
                  onClick={handleImportJSON}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-50"
                >
                  <Check className="w-4 h-4" /> ยืนยันการนำเข้า (แทนที่ข้อมูลเดิม)
                </button>
              </div>
            )}
          </div>

          {/* Bulk destruction actions */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-rose-200/60 p-6 md:p-8">
            <h3 className="text-base font-display font-bold text-rose-800 mb-5 flex items-center gap-2">
              <span className="p-1.5 bg-rose-50 text-rose-600 rounded-xl">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </span>
              การดำเนินการหมู่เชิงลึก
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handlePromoteClassrooms}
                className="bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 text-slate-700 hover:text-indigo-800 font-bold py-4 px-4 rounded-2xl text-xs transition-all flex flex-col items-center justify-center text-center gap-2.5 cursor-pointer shadow-2xs hover:shadow-xs"
              >
                <ArrowUpCircle className="w-5 h-5 text-indigo-600" />
                <span>เลื่อนระดับชั้นปี +1</span>
                <span className="text-[9px] font-semibold text-slate-400">บวกระดับห้อง ม.1/1 -&gt; ม.2/1</span>
              </button>

              <button
                onClick={handleDeleteAllStudents}
                className="bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 text-slate-700 hover:text-rose-800 font-bold py-4 px-4 rounded-2xl text-xs transition-all flex flex-col items-center justify-center text-center gap-2.5 cursor-pointer shadow-2xs hover:shadow-xs"
              >
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>ลบนักเรียนทั้งหมด</span>
                <span className="text-[9px] font-semibold text-slate-400">ลบรายชื่อและเกรดทุกห้องเรียน</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-step Custom Confirmation Modal for Administrative Actions */}
      {confirmAction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-6 relative animate-scale-up">
            
            {/* Header section based on action */}
            <div className="flex items-center gap-3">
              {confirmAction === 'DELETE_ALL_STUDENTS' ? (
                <span className="p-3 bg-rose-50 text-rose-600 rounded-2xl shrink-0">
                  <Trash2 className="w-6 h-6 animate-pulse" />
                </span>
              ) : (
                <span className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
                  <ArrowUpCircle className="w-6 h-6 animate-bounce" style={{ animationDuration: '2s' }} />
                </span>
              )}
              <div>
                <h3 className="text-lg font-display font-extrabold text-slate-800">
                  {confirmAction === 'DELETE_ALL_STUDENTS' ? 'ระบบทำลายข้อมูลนักเรียนทั้งหมด' : 'ระบบเลื่อนชั้นเรียนระดับชั้นเรียน'}
                </h3>
                <p className="text-xs text-slate-400 font-semibold">ขั้นตอนยืนยันความปลอดภัย {confirmStep} จาก 2</p>
              </div>
            </div>

            {/* Step 1 of DELETE_ALL_STUDENTS */}
            {confirmAction === 'DELETE_ALL_STUDENTS' && confirmStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                  ⚠️ คำเตือนด่วน: คุณต้องการสั่งลบข้อมูลนักเรียนทั้งหมดในระบบใช่หรือไม่?
                </p>
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-3.5 rounded-2xl font-semibold leading-relaxed">
                  การดำเนินการนี้จะลบรายชื่อนักเรียนในทุกชั้นเรียน ประวัติการเช็คชื่อเข้าชั้นเรียน และผลบันทึกคะแนนสอบ/ชิ้นงานทั้งหมดทันที ข้อมูลจะไม่สามารถกู้กลับคืนมาได้อีก!
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setConfirmStep(2)}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    ยืนยัน, ไปขั้นตอนถัดไป
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 of DELETE_ALL_STUDENTS */}
            {confirmAction === 'DELETE_ALL_STUDENTS' && confirmStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-700 leading-relaxed font-bold">
                  🛑 ยืนยันความต้องการลบอีกครั้งเป็นครั้งสุดท้าย:
                </p>
                <p className="text-xs text-rose-700 bg-rose-100/60 border border-rose-200 p-4 rounded-2xl font-extrabold leading-relaxed">
                  กรุณาตรวจสอบให้แน่ใจ หากคุณกด "ยืนยันการทำลายข้อมูลทั้งหมดถาวร" ข้อมูลรายชื่อนักเรียน การเข้าเรียน และผลคะแนนสะสมทั้งหมดจะถูกลบเกลี้ยงจากเบราว์เซอร์นี้ (และบนคลาวด์ Firebase หากเปิดซิงค์ไว้)
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      onDeleteAllStudents();
                      setConfirmAction(null);
                    }}
                    className="flex-1 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all duration-200 shadow-md shadow-red-100 active:scale-98 cursor-pointer"
                  >
                    ยืนยันการทำลายข้อมูลทั้งหมดถาวร
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}

            {/* Step 1 of PROMOTE_CLASSROOMS */}
            {confirmAction === 'PROMOTE_CLASSROOMS' && confirmStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                  📈 คุณต้องการเลื่อนระดับชั้นเรียนขึ้น 1 ระดับชั้น (+1) ใช่หรือไม่?
                </p>
                <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 p-3.5 rounded-2xl font-medium leading-relaxed">
                  ระบบจะค้นหาตัวเลขแรกในชื่อชั้นเรียนแล้วบวกเพิ่มขึ้น 1 ระดับชั้นให้โดยอัตโนมัติ สำหรับทุกห้องเรียนในระบบทันที
                  <br /><br />
                  <strong>ตัวอย่างเช่น:</strong>
                  <br />• ม.1/1 ➡️ ม.2/1
                  <br />• ป.5 ➡️ ป.6
                  <br />• Grade 1 ➡️ Grade 2
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setConfirmStep(2)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    ยืนยัน, ไปขั้นตอนถัดไป
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 of PROMOTE_CLASSROOMS */}
            {confirmAction === 'PROMOTE_CLASSROOMS' && confirmStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-700 leading-relaxed font-bold">
                  🎯 ยืนยันการดำเนินการเลื่อนระดับชั้นเรียน (+1):
                </p>
                <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl font-medium leading-relaxed">
                  การดำเนินการนี้จะทำการเปลี่ยนชื่อห้องเรียนทุกห้องทันทีด้วยการเพิ่มชั้นปี เหมาะสำหรับช่วงเปิดเทอมปีการศึกษาใหม่ที่ต้องการเลื่อนชั้นนักเรียนเดิมขึ้นไป
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      onPromoteClassrooms();
                      setConfirmAction(null);
                    }}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all duration-200 shadow-md shadow-indigo-100 active:scale-98 cursor-pointer"
                  >
                    ยืนยันและดำเนินการทันที
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
