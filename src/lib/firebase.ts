import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Firestore,
  type Timestamp,
} from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function ensureApp(): FirebaseApp {
  if (!config.apiKey) {
    throw new Error('Firebase env vars are not set. See .env.example.');
  }
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(config);
  }
  return app;
}

function ensure(): Auth {
  if (!auth) auth = getAuth(ensureApp());
  return auth;
}

function ensureDb(): Firestore {
  if (!db) db = getFirestore(ensureApp());
  return db;
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(ensure(), provider);
  return result.user;
}

export async function signOut(): Promise<void> {
  await fbSignOut(ensure());
}

export function onUserChange(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(ensure(), cb);
}

export type Comment = {
  id: string;
  postSlug: string;
  parentId: string | null;
  userId: string;
  userName: string;
  text: string;
  createdAt: Timestamp | null;
};

export async function addComment(
  postSlug: string,
  text: string,
  parentId: string | null = null,
): Promise<void> {
  const user = ensure().currentUser;
  if (!user) throw new Error('You must be signed in to comment.');
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Comment is empty.');
  await addDoc(collection(ensureDb(), 'comments'), {
    postSlug,
    parentId,
    userId: user.uid,
    userName: user.displayName || user.email || 'Anonymous',
    text: trimmed,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToComments(
  postSlug: string,
  cb: (comments: Comment[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(
    collection(ensureDb(), 'comments'),
    where('postSlug', '==', postSlug),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Comment, 'id'>) })));
    },
    (err) => {
      console.error('[comments] subscription error:', err);
      onError?.(err);
    },
  );
}
