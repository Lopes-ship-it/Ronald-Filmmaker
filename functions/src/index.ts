import { initializeApp, getApps } from "firebase-admin/app";

if (getApps().length === 0) {
  initializeApp();
}

export { processVideo } from "./processVideo";
export { regenerateThumbnail } from "./regenerateThumbnail";
export { cleanupOrphanedOriginals } from "./cleanup";
