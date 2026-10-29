import React, { useState, useEffect, FormEvent } from 'react';
import { 
  AppData, 
  UserRole, 
  Toast, 
  Classroom, 
  Student, 
  AttendanceStatus, 
  Assignment, 
  SystemSettings 
} from './types';
import ClassroomsTab from './components/ClassroomsTab';
import StudentsTab from './components/StudentsTab';
import AttendanceTab from './components/AttendanceTab';
import GradingTab from './components/GradingTab';
import ReportsTab from './components/ReportsTab';
import ManagementTab from './components/ManagementTab';

import { 
  initAuth, 
  googleSignIn, 
  googleSignOut, 
  isGoogleAuthAvailable,
  isFirestoreAvailable,
  saveSchoolDataToFirestore,
  getSchoolDataFromFirestore,
  subscribeToSchoolData,
  saveUserProfile,
  TARGET_FIREBASE_PROJECT,
  DEFAULT_SCHOOL_DOC_ID
} from './utils/firebase';

import { 
  Users, 
  BookOpen, 
  CheckSquare, 
  Award, 
  FileSpreadsheet, 
  Settings as SettingsIcon, 
  LogOut, 
  Cloud, 
  CloudLightning, 
  CloudOff, 
  Lock, 
  X, 
  Eye, 
  EyeOff,
  Sparkles,
  RefreshCw,
  Check,
  ShieldCheck,
  HelpCircle,
  Link2,
  Copy,
  Info,
  ExternalLink,
  AlertTriangle,
  Upload
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'classroom_system_data';

const DEFAULT_DATA: AppData = {
  settings: {
    systemName: "ระบบบริหารจัดการชั้นเรียนออนไลน์อัตโนมัติ",
    schoolName: "โรงเรียนตัวอย่างสารสนเทศ",
    adminPin: "1234",
    userPin: "0000",
    maxStudentsLimit: 999,
    isUnlimitedQuota: true,
    academicHeadName: "",
    directorName: "",
  },
  classrooms: [],
  students: [],
  attendance: [],
  assignments: [],
  scores: [],
};

export default function App() {
  // Global App Data
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure defaults if keys missing
        return {
          ...DEFAULT_DATA,
          ...parsed,
          settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) }
        };
      } catch (e) {
        return DEFAULT_DATA;
      }
    }
    return DEFAULT_DATA;
  });

  // Auth States
  const [role, setRole] = useState<UserRole>('NONE');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Tab State
  const [currentTab, setCurrentTab] = useState<'classrooms' | 'students' | 'attendance' | 'grading' | 'reports' | 'management'>('classrooms');

  // Toasts Notification State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Google / Firebase Auth & Cloud Sync States
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [googleAuthReady, setGoogleAuthReady] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  const [isInIframe, setIsInIframe] = useState(() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  });

  const dataRef = React.useRef<AppData>(data);
  const isRemoteUpdateRef = React.useRef<boolean>(false);
  const isInitialCloudCheckDoneRef = React.useRef<boolean>(false);
  const hasPendingUserChangeRef = React.useRef<boolean>(false);

  // Initialize Toasts Dismiss timer
  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Check Google Auth availability
  useEffect(() => {
    setGoogleAuthReady(isGoogleAuthAvailable());
  }, []);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Real-time multi-device synchronization listener for Firestore data69-school
  useEffect(() => {
    if (!isFirestoreAvailable()) {
      setRealtimeStatus('disconnected');
      return;
    }

    setRealtimeStatus('connecting');

    const unsubscribe = subscribeToSchoolData(
      TARGET_FIREBASE_PROJECT,
      ({ appData, updatedAt, lastUpdatedBy, exists, isFromRemoteDevice }) => {
        setRealtimeStatus('connected');

        // First snapshot received from Firestore
        if (!isInitialCloudCheckDoneRef.current) {
          isInitialCloudCheckDoneRef.current = true;
          if (exists && appData) {
            // Hydrate local state from Firestore to prevent empty device overwriting cloud
            isRemoteUpdateRef.current = true;
            setData({
              ...DEFAULT_DATA,
              ...appData,
              settings: { ...DEFAULT_DATA.settings, ...(appData.settings || {}) }
            });
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appData));
            if (updatedAt) {
              try {
                const dateObj = new Date(updatedAt);
                setLastSyncTime(dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
              } catch (e) {
                const now = new Date();
                setLastSyncTime(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
              }
            }
            setTimeout(() => {
              isRemoteUpdateRef.current = false;
            }, 300);
            return;
          } else {
            // Firestore document doesn't exist yet on cloud.
            // If local device has existing classrooms or students, save to initialize the school doc
            if (dataRef.current.classrooms.length > 0 || dataRef.current.students.length > 0) {
              saveSchoolDataToFirestore(dataRef.current, TARGET_FIREBASE_PROJECT, googleUser);
            }
            return;
          }
        }

        if (!appData) return;

        // Prevent infinite loop: only update if remote data differs from local state
        const currentDataStr = JSON.stringify(dataRef.current);
        const incomingDataStr = JSON.stringify(appData);

        if (currentDataStr !== incomingDataStr) {
          isRemoteUpdateRef.current = true;
          setData({
            ...DEFAULT_DATA,
            ...appData,
            settings: { ...DEFAULT_DATA.settings, ...(appData.settings || {}) }
          });
          localStorage.setItem(LOCAL_STORAGE_KEY, incomingDataStr);

          if (updatedAt) {
            try {
              const dateObj = new Date(updatedAt);
              setLastSyncTime(dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            } catch (e) {
              const now = new Date();
              setLastSyncTime(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            }
          }

          // Show feedback if the update came from another connected device
          if (isFromRemoteDevice) {
            addToast(`ซิงค์ข้อมูลล่าสุดจากอุปกรณ์อื่นเรียบร้อย (${lastUpdatedBy})`, 'success');
          }

          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 300);
        }
      },
      (error) => {
        console.warn('Real-time connection error:', error);
        setRealtimeStatus('disconnected');
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Initialize Firebase Auth / Restore Session
  useEffect(() => {
    if (!googleAuthReady) return;

    const unsubscribe = initAuth(
      async (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        const now = new Date();
        setLastSyncTime(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [googleAuthReady]);

  // Immediate Auto-Save to Local Storage and Firestore whenever local data state changes
  useEffect(() => {
    // Write to browser Local Storage instantly
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));

    let firebaseSchoolSyncTimeout: any = null;

    // Only sync if the change was initiated by the user on this device,
    // after initial cloud check is completed, and NOT from a remote snapshot
    if (hasPendingUserChangeRef.current && !isRemoteUpdateRef.current && isInitialCloudCheckDoneRef.current) {
      if (isFirestoreAvailable()) {
        firebaseSchoolSyncTimeout = setTimeout(async () => {
          try {
            hasPendingUserChangeRef.current = false;
            await saveSchoolDataToFirestore(data, TARGET_FIREBASE_PROJECT, googleUser);
            const now = new Date();
            setLastSyncTime(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          } catch (err) {
            console.warn("Firestore data69-school auto-save:", err);
          }
        }, 200);
      }
    }

    return () => {
      if (firebaseSchoolSyncTimeout) clearTimeout(firebaseSchoolSyncTimeout);
    };
  }, [data, googleUser]);

  // Manual Firebase actions
  const handleSaveToFirebase = async () => {
    try {
      setIsSyncing(true);
      await saveSchoolDataToFirestore(data, TARGET_FIREBASE_PROJECT, googleUser);
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      addToast(`บันทึกข้อมูลไปยังฐานข้อมูล Firebase (${TARGET_FIREBASE_PROJECT}) สำเร็จแล้ว!`, 'success');
    } catch (err) {
      console.error('Save to Firebase error:', err);
      addToast(`ไม่สามารถบันทึกข้อมูลลง Firebase (${TARGET_FIREBASE_PROJECT}) ได้`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromFirebase = async () => {
    try {
      setIsSyncing(true);
      const remote = await getSchoolDataFromFirestore(TARGET_FIREBASE_PROJECT);
      if (remote && remote.appData) {
        isRemoteUpdateRef.current = true;
        setData(remote.appData);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remote.appData));
        const now = new Date();
        setLastSyncTime(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        addToast(`ดึงข้อมูลล่าสุดจาก Firebase (${TARGET_FIREBASE_PROJECT}) สำเร็จแล้ว!`, 'success');
        setTimeout(() => {
          isRemoteUpdateRef.current = false;
        }, 100);
      } else {
        addToast(`ยังไม่มีข้อมูลใน Firebase (${TARGET_FIREBASE_PROJECT})`, 'error');
      }
    } catch (err) {
      console.error('Pull from Firebase error:', err);
      addToast(`เกิดข้อผิดพลาดในการดึงข้อมูลจาก Firebase (${TARGET_FIREBASE_PROJECT})`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Authentication Pin Handler
  const handleLoginSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    setLoginError('');

    const trimmedInput = pinInput.trim();
    if (trimmedInput === data.settings.adminPin) {
      setRole('ADMIN');
      setPinInput('');
      addToast('เข้าสู่ระบบด้วยสิทธิ์ผู้ดูแลระบบ (Admin) สำเร็จ', 'success');
    } else if (trimmedInput === data.settings.userPin) {
      setRole('USER');
      setPinInput('');
      addToast('เข้าสู่ระบบด้วยสิทธิ์ผู้ใช้งานทั่วไป (User) สำเร็จ', 'success');
    } else {
      setLoginError('รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      addToast('เข้าสู่ระบบไม่สำเร็จ รหัสผ่านผิดพลาด', 'error');
    }
  };

  // Google / Gmail Sign In action with Firebase data69-school integration
  const handleGoogleLogin = async () => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);

        // Auto unlock user into role (ADMIN for target user krusodi.ns@gmail.com, or user)
        const userEmail = (result.user.email || '').toLowerCase();
        const nextRole: UserRole = (userEmail === 'krusodi.ns@gmail.com' || role === 'NONE') ? 'ADMIN' : role;
        setRole(nextRole);

        // Save user profile in Firestore
        try {
          await saveUserProfile(result.user, nextRole === 'ADMIN' ? 'ADMIN' : 'USER');
        } catch (e) {
          console.warn("User profile save:", e);
        }

        // Fetch or initialize school data in Firestore for data69-school
        try {
          const remoteSchool = await getSchoolDataFromFirestore(TARGET_FIREBASE_PROJECT);
          if (remoteSchool && remoteSchool.appData && remoteSchool.appData.classrooms) {
            isRemoteUpdateRef.current = true;
            setData(remoteSchool.appData);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remoteSchool.appData));
            addToast(`เข้าสู่ระบบด้วย Gmail (${result.user.email}) สำเร็จ พร้อมโหลดข้อมูลจาก Firebase (${TARGET_FIREBASE_PROJECT}) เรียบร้อยแล้ว`, 'success');
            setTimeout(() => {
              isRemoteUpdateRef.current = false;
            }, 100);
          } else {
            // First time connecting data69-school, save current app state
            await saveSchoolDataToFirestore(data, TARGET_FIREBASE_PROJECT, result.user);
            addToast(`เข้าสู่ระบบด้วย Gmail (${result.user.email}) สำเร็จ พร้อมเชื่อมต่อฐานข้อมูล Firebase (${TARGET_FIREBASE_PROJECT})`, 'success');
          }
        } catch (schoolErr) {
          console.warn("Initial school load error:", schoolErr);
          addToast(`เข้าสู่ระบบด้วย Gmail สำเร็จ`, 'success');
        }
        
        const now = new Date();
        setLastSyncTime(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err: any) {
      const isCancelledError = 
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/popup-closed-by-user' ||
        err?.message?.includes('cancelled-popup-request') ||
        err?.message?.includes('popup-closed-by-user');

      if (isCancelledError) {
        return;
      }

      console.error(err);
      if (isInIframe) {
        addToast('การล็อกอินล้มเหลว: ตรวจพบว่าแอปทำงานใน iFrame กรุณากดปุ่มเปิดในแท็บใหม่ที่มุมขวาบนของเบราว์เซอร์ก่อนล็อกอิน!', 'error');
      } else {
        addToast('การล็อกอินผ่าน Google ล้มเหลว กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต', 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      setGoogleToken(null);
      addToast('ออกจากระบบบัญชี Google เรียบร้อยแล้ว', 'success');
    } catch (err) {
      addToast('เกิดข้อผิดพลาดในการลงชื่อออก', 'error');
    }
  };

  const handleLogout = () => {
    setRole('NONE');
    setPinInput('');
    addToast('ออกจากระบบเรียบร้อย', 'success');
  };

  // STATE UPDATE HELPERS
  const updateData = (newData: AppData) => {
    hasPendingUserChangeRef.current = true;
    setData(newData);
  };

  // Classroom handlers
  const handleAddClassroom = (classroomData: Omit<Classroom, 'id'>) => {
    const newClassroom: Classroom = {
      ...classroomData,
      id: `CLASS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    updateData({
      ...data,
      classrooms: [...data.classrooms, newClassroom]
    });
    addToast(`สร้างชั้นเรียน ${newClassroom.subjectName} สำเร็จ`, 'success');
  };

  const handleUpdateClassroom = (updatedClassroom: Classroom) => {
    updateData({
      ...data,
      classrooms: data.classrooms.map(c => c.id === updatedClassroom.id ? updatedClassroom : c)
    });
    addToast(`แก้ไขชั้นเรียนสำเร็จ`, 'success');
  };

  const handleDeleteClassroom = (classId: string) => {
    updateData({
      ...data,
      classrooms: data.classrooms.filter(c => c.id !== classId),
      students: data.students.filter(s => s.classId !== classId),
      attendance: data.attendance.filter(a => a.classId !== classId),
      assignments: data.assignments.filter(a => a.classId !== classId),
      scores: data.scores.filter(s => s.classId !== classId),
    });
    addToast('ลบข้อมูลห้องเรียนและประวัตินักเรียน คะแนน เช็คชื่อ ทั้งหมดเรียบร้อย', 'success');
  };

  const handleReorderClassrooms = (reorderedClassrooms: Classroom[]) => {
    updateData({
      ...data,
      classrooms: reorderedClassrooms
    });
  };

  // Student handlers
  const handleAddStudent = (studentData: Omit<Student, 'id'>): boolean => {
    const exists = data.students.some(
      s => s.classId === studentData.classId && s.no === studentData.no
    );
    if (exists) {
      addToast(`เลขที่ ${studentData.no} มีชื่อบันทึกในชั้นเรียนนี้อยู่แล้ว`, 'error');
      return false;
    }

    const newStudent: Student = {
      ...studentData,
      id: `STD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    updateData({
      ...data,
      students: [...data.students, newStudent]
    });
    addToast(`เพิ่มนักเรียน ${newStudent.fullName} สำเร็จ`, 'success');
    return true;
  };

  const handleAddStudentsBulk = (classId: string, parsedList: Omit<Student, 'id' | 'classId'>[]) => {
    let added = 0;
    let duplicates = 0;
    const updatedStudents = [...data.students];

    parsedList.forEach(std => {
      const exists = updatedStudents.some(
        s => s.classId === classId && s.no === std.no
      );
      if (exists) {
        duplicates++;
      } else {
        const newStudent: Student = {
          ...std,
          classId,
          id: `STD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        };
        updatedStudents.push(newStudent);
        added++;
      }
    });

    if (added > 0) {
      updateData({
        ...data,
        students: updatedStudents
      });
    }

    return { added, duplicates };
  };

  const handleUpdateStudent = (updatedStudent: Student): boolean => {
    const exists = data.students.some(
      s => s.classId === updatedStudent.classId && s.no === updatedStudent.no && s.id !== updatedStudent.id
    );
    if (exists) {
      addToast(`เลขที่ ${updatedStudent.no} ซ้ำกับนักเรียนท่านอื่นในห้องนี้`, 'error');
      return false;
    }

    updateData({
      ...data,
      students: data.students.map(s => s.id === updatedStudent.id ? updatedStudent : s)
    });
    addToast(`อัปเดตประวัตินักเรียนเรียบร้อย`, 'success');
    return true;
  };

  const handleDeleteStudent = (studentId: string) => {
    updateData({
      ...data,
      students: data.students.filter(s => s.id !== studentId),
      attendance: data.attendance.filter(a => a.studentId !== studentId),
      scores: data.scores.filter(s => s.studentId !== studentId),
    });
    addToast('ลบนักเรียนและคะแนน เช็คชื่อเรียบร้อย', 'success');
  };

  // Attendance handlers
  const handleUpdateAttendance = (classId: string, date: string, studentId: string, status: AttendanceStatus) => {
    const existingIndex = data.attendance.findIndex(
      a => a.classId === classId && a.date === date && a.studentId === studentId
    );

    let updatedAttendance = [...data.attendance];
    if (existingIndex >= 0) {
      updatedAttendance[existingIndex] = { ...updatedAttendance[existingIndex], status };
    } else {
      updatedAttendance.push({ classId, date, studentId, status });
    }

    updateData({
      ...data,
      attendance: updatedAttendance
    });
  };

  const handleSetAllPresent = (classId: string, date: string) => {
    const classStds = data.students.filter(s => s.classId === classId);
    let updatedAttendance = [...data.attendance];

    classStds.forEach(std => {
      const existingIndex = updatedAttendance.findIndex(
        a => a.classId === classId && a.date === date && a.studentId === std.id
      );
      if (existingIndex >= 0) {
        updatedAttendance[existingIndex] = { ...updatedAttendance[existingIndex], status: 'PRESENT' };
      } else {
        updatedAttendance.push({ classId, date, studentId: std.id, status: 'PRESENT' });
      }
    });

    updateData({
      ...data,
      attendance: updatedAttendance
    });
  };

  const handleResetAttendance = (classId: string, date: string) => {
    updateData({
      ...data,
      attendance: data.attendance.filter(a => !(a.classId === classId && a.date === date))
    });
  };

  const handleDeleteAttendance = (classId: string, date: string) => {
    updateData({
      ...data,
      attendance: data.attendance.filter(a => !(a.classId === classId && a.date === date))
    });
  };

  // Assignment & score handlers
  const handleAddAssignment = (assignmentData: Omit<Assignment, 'id'>) => {
    const newAsg: Assignment = {
      ...assignmentData,
      id: `ASG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    updateData({
      ...data,
      assignments: [...data.assignments, newAsg]
    });
    addToast(`สร้างชิ้นงานเก็บคะแนนสำเร็จ`, 'success');
  };

  const handleDeleteAssignment = (id: string) => {
    updateData({
      ...data,
      assignments: data.assignments.filter(a => a.id !== id),
      scores: data.scores.filter(s => s.assignmentId !== id),
    });
  };

  const handleUpdateScore = (classId: string, assignmentId: string, studentId: string, score: number) => {
    const existingIndex = data.scores.findIndex(
      s => s.classId === classId && s.assignmentId === assignmentId && s.studentId === studentId
    );

    let updatedScores = [...data.scores];
    if (existingIndex >= 0) {
      updatedScores[existingIndex] = { ...updatedScores[existingIndex], score };
    } else {
      updatedScores.push({ classId, assignmentId, studentId, score });
    }

    updateData({
      ...data,
      scores: updatedScores
    });
  };

  // Management settings updates
  const handleUpdateSettings = (settings: SystemSettings) => {
    updateData({
      ...data,
      settings,
    });
    addToast('อัปเดตโครงสร้างระบบตั้งค่าเรียบร้อยแล้ว', 'success');
  };

  const handleImportData = (importedData: AppData) => {
    updateData(importedData);
  };

  const handleDeleteAllStudents = () => {
    updateData({
      ...data,
      students: [],
      attendance: [],
      scores: [],
    });
    addToast('ลบข้อมูลนักเรียนประวัติทั้งหมดในระบบเรียบร้อย', 'success');
  };

  const handlePromoteClassrooms = () => {
    const updatedClassrooms = data.classrooms.map(cls => {
      const updatedRoom = cls.roomName.replace(/\d+/, match => {
        const num = parseInt(match, 10);
        return (num + 1).toString();
      });
      return {
        ...cls,
        roomName: updatedRoom,
      };
    });

    updateData({
      ...data,
      classrooms: updatedClassrooms,
    });
    addToast('เลื่อนระดับห้องเรียนสำหรับทุกห้องเสร็จสิ้น ม.1 -> ม.2', 'success');
  };

  // Safe checks
  const isAdmin = role !== 'NONE';

  // LOGIN SCREEN RENDER
  if (role === 'NONE') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md w-full p-8 space-y-6 relative overflow-hidden">
          {/* Accent decoration */}
          <div className="absolute top-0 inset-x-0 h-2 bg-indigo-600"></div>
          
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-xs mb-3">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">{data.settings.systemName}</h1>
            <p className="text-xs text-slate-400 font-medium">กรุณาป้อนรหัสผ่าน (PIN) เพื่อเข้าสู่การจัดการข้อมูล</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                maxLength={10}
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                placeholder="ป้อนรหัส PIN 4 หลัก"
                className="w-full text-center tracking-widest text-lg font-bold font-mono px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {loginError && (
              <p className="text-center text-rose-500 text-xs font-semibold">{loginError}</p>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3 px-4 rounded-2xl text-sm transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Check className="w-4 h-4" />
              เข้าสู่ระบบ
            </button>
          </form>

          {/* OR DIVIDER */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-slate-400 text-[11px] font-bold uppercase tracking-wider">หรือ</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* GMAIL / GOOGLE SIGN IN BUTTON */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSyncing}
              className="w-full bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-bold py-3.5 px-4 rounded-2xl text-xs border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isSyncing ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Gmail (Google Account)'}</span>
            </button>
            <div className={`flex items-center justify-center gap-1.5 text-[10px] font-semibold py-1.5 px-3 rounded-xl border transition-all ${
              realtimeStatus === 'connected'
                ? 'text-emerald-700 bg-emerald-50/90 border-emerald-200/70'
                : 'text-amber-700 bg-amber-50/80 border-amber-200/60'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'
              }`}></span>
              <span>{realtimeStatus === 'connected' ? 'เชื่อมต่อฐานข้อมูล Real-time:' : 'เชื่อมต่อฐานข้อมูล:'} <strong>{TARGET_FIREBASE_PROJECT}</strong></span>
            </div>
          </div>

          {/* Quick PIN Input Keypad (For mobile teachers!) */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <span className="block text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">หรือ แตะเพื่อป้อนรหัสอย่างรวดเร็ว</span>
            
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPinInput(prev => prev + num)}
                  className="py-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200/50 rounded-xl font-bold font-mono text-slate-700 text-sm transition-all shadow-2xs cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPinInput('')}
                className="py-3 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200/50 text-rose-600 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                ล้างคำ
              </button>
              <button
                type="button"
                onClick={() => setPinInput(prev => prev + '0')}
                className="py-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200/50 rounded-xl font-bold font-mono text-slate-700 text-sm transition-all shadow-2xs cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleLoginSubmit()}
                className="py-3 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200/50 text-emerald-600 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                ตกลง
              </button>
            </div>
          </div>

          {/* Role Access Guide */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-1.5 text-xs text-slate-400 font-semibold leading-relaxed">
            <p className="font-bold flex items-center justify-center gap-1.5 text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              คำแนะนำรหัสเข้าใช้งานเริ่มต้น:
            </p>
            <p>สิทธิ์ผู้ดูแล (Admin): <strong className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">1234</strong> (ตั้งค่าแก้ไขได้)</p>
            <p>สิทธิ์ผู้ใช้งาน (User): <strong className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-mono">0000</strong> (เข้าเช็คชื่อได้)</p>
          </div>
        </div>
      </div>
    );
  }

  // MAIN APPLICATION SCREEN
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* HEADER BAR (Hidden during Print) */}
      <div className="print:hidden h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-full"></div>
      <header className="print:hidden bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white rounded-xl shadow-md shadow-indigo-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-display font-bold text-slate-800 line-clamp-1">{data.settings.systemName}</h1>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 line-clamp-1">{data.settings.schoolName}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Real-time Firebase data69-school cloud indicator */}
            <div 
              className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded-xl border font-semibold select-none shadow-3xs transition-all ${
                realtimeStatus === 'connected'
                  ? 'text-emerald-800 bg-emerald-50/90 border-emerald-200/80'
                  : realtimeStatus === 'connecting'
                  ? 'text-amber-800 bg-amber-50/90 border-amber-200/80'
                  : 'text-slate-600 bg-slate-50 border-slate-200'
              }`}
              title={`เชื่อมต่อฐานข้อมูล Firebase Firestore (${TARGET_FIREBASE_PROJECT}) แบบ Real-time สองทาง`}
            >
              <span className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : realtimeStatus === 'connecting'
                  ? 'bg-amber-500 animate-ping'
                  : 'bg-slate-400'
              }`}></span>
              <span>
                {realtimeStatus === 'connected' ? 'Real-time:' : 'Firebase:'} <strong>{TARGET_FIREBASE_PROJECT}</strong>
                {lastSyncTime && (
                  <span className="hidden md:inline font-mono text-[9px] opacity-80 ml-1">({lastSyncTime})</span>
                )}
              </span>
              <button
                type="button"
                onClick={handleSaveToFirebase}
                disabled={isSyncing}
                className="ml-1 p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
                title="บันทึกข้อมูลด่วนลง Firebase"
              >
                <Upload className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handlePullFromFirebase}
                disabled={isSyncing}
                className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
                title="ดึงข้อมูลล่าสุดจาก Firebase"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Google / Gmail Auth */}
            {googleAuthReady && (
              <div className="flex items-center gap-1 sm:gap-2">
                {googleUser ? (
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <span className="hidden lg:inline text-[10px] text-slate-500 font-medium max-w-[140px] truncate" title={googleUser.email || ''}>
                      {googleUser.email || googleUser.displayName}
                    </span>
                    <button
                      onClick={handleGoogleLogout}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 sm:px-2.5 py-1.5 rounded-xl border border-rose-100 transition-all cursor-pointer"
                      title="ออกจากระบบ Gmail"
                    >
                      <span className="hidden sm:inline">ออกจาก Gmail</span>
                      <span className="sm:hidden">ออก</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isSyncing}
                    className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/60 active:bg-slate-200 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer"
                    title="เข้าสู่ระบบด้วย Gmail เพื่อเชื่อมต่อฐานข้อมูล"
                  >
                    <Cloud className="w-3.5 h-3.5 text-sky-500" />
                    <span>เข้าสู่ระบบ Gmail</span>
                  </button>
                )}
              </div>
            )}

            {/* Role Badge Indicator */}
            <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold text-slate-600 border border-slate-200">
              <ShieldCheck className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isAdmin ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{isAdmin ? 'สิทธิ์: ผู้ดูแล (Admin)' : 'สิทธิ์: ทั่วไป (User)'}</span>
              <span className="sm:hidden">{isAdmin ? 'Admin' : 'User'}</span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title="ออกจากระบบแอปพลิเคชัน"
            >
              <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* TABS SELECTOR (Hidden during Print) */}
      <nav className="print:hidden bg-white/90 backdrop-blur-md border-b border-slate-200/50 sticky top-[70px] z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2.5 scrollbar-none">
            <button
              onClick={() => setCurrentTab('classrooms')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-250 cursor-pointer ${
                currentTab === 'classrooms'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-slate-50/50'
              }`}
            >
              <BookOpen className="w-4.5 h-4.5" />
              ชั้นเรียน
            </button>

            <button
              onClick={() => setCurrentTab('students')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-250 cursor-pointer ${
                currentTab === 'students'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-slate-50/50'
              }`}
            >
              <Users className="w-4.5 h-4.5" />
              นักเรียน
            </button>

            <button
              onClick={() => setCurrentTab('attendance')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-250 cursor-pointer ${
                currentTab === 'attendance'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-slate-50/50'
              }`}
            >
              <CheckSquare className="w-4.5 h-4.5" />
              เช็คชื่อ
            </button>

            <button
              onClick={() => setCurrentTab('grading')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-250 cursor-pointer ${
                currentTab === 'grading'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-slate-50/50'
              }`}
            >
              <Award className="w-4.5 h-4.5" />
              คะแนน
            </button>

            <button
              onClick={() => setCurrentTab('reports')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-250 cursor-pointer ${
                currentTab === 'reports'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-slate-50/50'
              }`}
            >
              <FileSpreadsheet className="w-4.5 h-4.5" />
              รายงาน
            </button>

            {isAdmin && (
              <button
                onClick={() => setCurrentTab('management')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-250 cursor-pointer ${
                  currentTab === 'management'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-slate-50/50'
                }`}
              >
                <SettingsIcon className="w-4.5 h-4.5" />
                จัดการข้อมูล
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* MAIN BODY WINDOW */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">


        {currentTab === 'classrooms' && (
          <ClassroomsTab
            appData={data}
            isAdmin={isAdmin}
            onAddClassroom={handleAddClassroom}
            onUpdateClassroom={handleUpdateClassroom}
            onDeleteClassroom={handleDeleteClassroom}
            onReorderClassrooms={handleReorderClassrooms}
            addToast={addToast}
          />
        )}

        {currentTab === 'students' && (
          <StudentsTab
            appData={data}
            isAdmin={isAdmin}
            onAddStudent={handleAddStudent}
            onAddStudentsBulk={handleAddStudentsBulk}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            addToast={addToast}
          />
        )}

        {currentTab === 'attendance' && (
          <AttendanceTab
            appData={data}
            isLoggedIn={role !== 'NONE'}
            onUpdateAttendance={handleUpdateAttendance}
            onSetAllPresent={handleSetAllPresent}
            onResetAttendance={handleResetAttendance}
            onDeleteAttendance={handleDeleteAttendance}
            addToast={addToast}
          />
        )}

        {currentTab === 'grading' && (
          <GradingTab
            appData={data}
            isAdmin={isAdmin}
            onAddAssignment={handleAddAssignment}
            onDeleteAssignment={handleDeleteAssignment}
            onUpdateScore={handleUpdateScore}
            addToast={addToast}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsTab
            appData={data}
            addToast={addToast}
          />
        )}

        {currentTab === 'management' && isAdmin && (
          <ManagementTab
            appData={data}
            googleUser={googleUser}
            isSyncing={isSyncing}
            onGoogleLogin={handleGoogleLogin}
            onGoogleLogout={handleGoogleLogout}
            onSaveToFirebase={handleSaveToFirebase}
            onPullFromFirebase={handlePullFromFirebase}
            firebaseProjectName={TARGET_FIREBASE_PROJECT}
            realtimeStatus={realtimeStatus}
            lastSyncTime={lastSyncTime}
            onUpdateSettings={handleUpdateSettings}
            onImportData={handleImportData}
            onDeleteAllStudents={handleDeleteAllStudents}
            onPromoteClassrooms={handlePromoteClassrooms}
            addToast={addToast}
          />
        )}
      </main>

      {/* FLOAT TOAST NOTIFICATIONS */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50 pointer-events-none max-w-sm w-full">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center justify-between gap-3 pointer-events-auto transform transition-all duration-300 translate-y-0 opacity-100 ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
