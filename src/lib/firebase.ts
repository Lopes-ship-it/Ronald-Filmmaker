import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";

/**
 * This project uses Firebase exclusively as its backend: Firebase
 * Authentication (admin login), Cloud Firestore (all content — portfolio
 * projects today, the rest of the admin panel's collections as they ship),
 * Firebase Storage (uploaded videos and thumbnails), and Cloud Functions
 * (server-side video compression — see functions/ and
 * src/lib/videoServerProcessing.ts). No other database or storage provider
 * is used. Cloud Functions requires the Firebase project to be on the
 * Blaze (pay-as-you-go) plan — see functions/README.md for the full
 * deployment/cost story.
 *
 * The config below is hardcoded rather than read from a .env file — a
 * Firebase web app's config (apiKey, authDomain, projectId, appId) is not a
 * secret; it is meant to ship inside the client bundle, and it identifies
 * the project, it does not authorize anything by itself. All real
 * authorization is enforced server-side by firestore.rules and
 * storage.rules (any signed-in Firebase user may write; nothing else can).
 * This also means the site needs no build-time environment configuration —
 * it works the same after a plain `npm run build` on any host, including
 * static shared hosting.
 *
 * To point this project at a different Firebase project, replace the
 * values below with your own (Firebase Console → Project settings → Your
 * apps → SDK setup and configuration).
 */
const firebaseConfig = {
  apiKey: "AIzaSyB-ns3UBNWoQoK8PpOnSn7HQBA7-Z3vI1I",
  authDomain: "ronald-filmmaker.firebaseapp.com",
  projectId: "ronald-filmmaker",
  // Required for Firebase Storage to resolve a default bucket — without it,
  // getStorage() throws "storage/no-default-bucket" the moment an upload is
  // attempted (that was the exact bug reported: uploads reached the form
  // fine, but saving failed at the Storage step). Projects created since
  // October 2024 default to <project-id>.firebasestorage.app; older
  // projects use <project-id>.appspot.com. If uploads still fail with a
  // bucket-not-found error, open Firebase Console → Storage — the exact
  // bucket name is shown at the top as "gs://...") — and paste that value
  // here (without the "gs://" prefix).
  storageBucket: "ronald-filmmaker.firebasestorage.app",
  appId: "1:946226033959:web:4867d47e24a6fa60ad2502",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId,
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let functions: Functions | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  firestore = getFirestore(app);
  storage = getStorage(app);
  // Cloud Functions region must match where functions/firebase.json
  // deploys them (see functions/src/processVideo.ts and
  // regenerateThumbnail.ts, both pinned to "us-central1") — a mismatch
  // here doesn't error, it just calls a function that doesn't exist there
  // and every callable request 404s.
  functions = getFunctions(app, "us-central1");
}

export {
  app as firebaseApp,
  auth as firebaseAuth,
  firestore as firebaseFirestore,
  storage as firebaseStorage,
  functions as firebaseFunctions,
};
