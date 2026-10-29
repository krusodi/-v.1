import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const TARGET_FIREBASE_PROJECT = 'data69-school';
export const DEFAULT_SCHOOL_DOC_ID = 'data69-school';

// Safe check to see if we have real firebase configuration
const isFirebasePlaceholder = !firebaseConfig || firebaseConfig.apiKey === 'placeholder' || firebaseConfig.apiKey === '';

let app: any = null;
export let auth: any = null;
let provider: GoogleAuthProvider | null = null;
export let db: Firestore | null = null;

if (!isFirebasePlaceholder) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    // Explicitly target firestoreDatabaseId if configured
    const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId;
    db = firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);
    
    provider = new GoogleAuthProvider();
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

// Critical Constraint: Test connection on boot
export async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.info('Firebase Firestore connection verified for data69-school');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration: client is offline.');
    } else {
      console.info('Firebase connection probe result:', error);
    }
  }
}

if (db) {
  testConnection();
}

// Error Handling Specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((p: any) => ({
        providerId: p.providerId,
        email: p.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Load token from memory or secure session cache
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!auth) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }

  // Restore token from sessionStorage strictly as a secure session cache
  const storedToken = sessionStorage.getItem('g_sheet_token');
  if (storedToken) {
    cachedAccessToken = storedToken;
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // User is authenticated via Firebase
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      cachedAccessToken = null;
      sessionStorage.removeItem('g_sheet_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!auth || !provider) {
    throw new Error('Google Sign-In is not configured. Please complete OAuth Setup.');
  }

  if (isSigningIn) {
    console.warn('Google Sign-In operation is already in progress.');
    return null;
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || '';
    if (token) {
      cachedAccessToken = token;
      sessionStorage.setItem('g_sheet_token', cachedAccessToken);
    }
    return { user: result.user, accessToken: token };
  } catch (error: any) {
    const isCancelledError = 
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/popup-closed-by-user' ||
      error?.message?.includes('cancelled-popup-request') ||
      error?.message?.includes('popup-closed-by-user');

    if (isCancelledError) {
      console.warn('Google Sign-In popup request was cancelled or closed:', error.code || error.message);
      return null;
    }

    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleSignOut = async () => {
  if (auth) {
    await signOut(auth);
  }
  cachedAccessToken = null;
  sessionStorage.removeItem('g_sheet_token');
};

export const isGoogleAuthAvailable = () => {
  return !isFirebasePlaceholder && auth !== null;
};

export const isFirestoreAvailable = () => {
  return db !== null;
};

// --- User Profile helpers ---

export const saveUserProfile = async (user: User, role: 'ADMIN' | 'USER' = 'USER') => {
  if (!db || !user) return;
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      role: role,
      lastLoginAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getUserProfile = async (uid: string) => {
  if (!db) return null;
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

// --- School Data Firebase (Firestore) Persistence for data69-school ---

/**
 * Save school data directly to Firestore /schools/data69-school
 */
export const saveSchoolDataToFirestore = async (
  appData: any,
  schoolId: string = DEFAULT_SCHOOL_DOC_ID,
  user?: User | null
) => {
  if (!db) return false;
  const path = `schools/${schoolId}`;
  try {
    const schoolRef = doc(db, 'schools', schoolId);
    await setDoc(schoolRef, {
      id: schoolId,
      schoolName: appData.settings?.schoolName || 'data69-school',
      appData,
      updatedAt: new Date().toISOString(),
      lastUpdatedBy: user?.displayName || user?.email || 'Teacher',
      ownerEmail: user?.email || '',
      ownerUid: user?.uid || ''
    }, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

/**
 * Fetch school data from Firestore /schools/data69-school
 */
export const getSchoolDataFromFirestore = async (
  schoolId: string = DEFAULT_SCHOOL_DOC_ID
): Promise<{ appData: any; updatedAt?: string; lastUpdatedBy?: string } | null> => {
  if (!db) return null;
  const path = `schools/${schoolId}`;
  try {
    const schoolRef = doc(db, 'schools', schoolId);
    const snap = await getDoc(schoolRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        appData: data.appData,
        updatedAt: data.updatedAt,
        lastUpdatedBy: data.lastUpdatedBy
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

/**
 * Real-time subscription to school data changes in Firestore /schools/data69-school
 */
export const subscribeToSchoolData = (
  schoolId: string = DEFAULT_SCHOOL_DOC_ID,
  onUpdate: (payload: { appData: any; updatedAt: string; lastUpdatedBy: string }) => void
) => {
  if (!db) return () => {};
  const path = `schools/${schoolId}`;
  const schoolRef = doc(db, 'schools', schoolId);
  return onSnapshot(
    schoolRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.appData) {
          onUpdate({
            appData: data.appData,
            updatedAt: data.updatedAt || '',
            lastUpdatedBy: data.lastUpdatedBy || 'Cloud'
          });
        }
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
};
