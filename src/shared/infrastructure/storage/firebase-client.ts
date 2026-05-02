"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDownloadURL, getStorage, ref, uploadBytes, deleteObject } from "firebase/storage";

type CondoAssetKind =
  | "condominium-logo"
  | "condominium-image"
  | "footer-logo"
  | "privacy-pdf"
  | "project-document"
  | "notification-image"
  | "notification-pdf"
  | "ticket-response-image"
  | "ticket-response-pdf"
  | "income-receipt"
  | "expense-receipt"
  | "announcement-pdf";

function getRequiredClientEnv(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`Missing Firebase config variable: ${name}`);
  }

  return normalized;
}

const firebaseApiKey = getRequiredClientEnv(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  "NEXT_PUBLIC_FIREBASE_API_KEY",
);
const firebaseProjectId = getRequiredClientEnv(
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
);
const firebaseStorageBucket = getRequiredClientEnv(
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
);
const firebaseAppId = getRequiredClientEnv(
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  "NEXT_PUBLIC_FIREBASE_APP_ID",
);
const firebaseMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim();
const firebaseAuthDomainCandidate = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();

const firebaseAuthDomain = (() => {
  if (!firebaseAuthDomainCandidate || firebaseAuthDomainCandidate.includes("AIza")) {
    return `${firebaseProjectId}.firebaseapp.com`;
  }

  return firebaseAuthDomainCandidate;
})();

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: firebaseAuthDomain,
  projectId: firebaseProjectId,
  storageBucket: firebaseStorageBucket,
  messagingSenderId: firebaseMessagingSenderId || undefined,
  appId: firebaseAppId,
};

function getFirebaseApp() {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function getClientAuth() {
  return getAuth(getFirebaseApp());
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .toLowerCase();
}

export async function uploadCondominiumAsset(input: {
  file: File;
  condominiumSlug: string;
  projectId: string;
  kind: CondoAssetKind;
}): Promise<{ url: string; fullPath: string }> {
  const app = getFirebaseApp();
  const storage = getStorage(app);
  const safeName = sanitizeFileName(input.file.name);
  const filePath = [
    "condominiums",
    input.condominiumSlug,
    "projects",
    input.projectId,
    input.kind,
    `${Date.now()}-${safeName}`,
  ].join("/");

  const objectRef = ref(storage, filePath);
  await uploadBytes(objectRef, input.file, {
    contentType: input.file.type || undefined,
  });

  const url = await getDownloadURL(objectRef);
  return { url, fullPath: filePath };
}

/**
 * Delete an asset from Firebase Storage using its download URL.
 * Extracts the storage path from the URL and calls deleteObject.
 * Silently ignores errors (file may already be deleted).
 */
export async function deleteCondominiumAsset(downloadUrl: string): Promise<void> {
  try {
    const app = getFirebaseApp();
    const storage = getStorage(app);

    // Firebase download URLs look like:
    // https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH%2Ffile.pdf?alt=media&token=...
    // We need to extract PATH/file.pdf from the URL-encoded 'o/' segment
    const urlObj = new URL(downloadUrl);
    const pathSegment = urlObj.pathname.split("/o/")[1];
    if (!pathSegment) return;
    const storagePath = decodeURIComponent(pathSegment);

    const objectRef = ref(storage, storagePath);
    await deleteObject(objectRef);
  } catch (err) {
    // Silently ignore — file may already be deleted or URL malformed
    console.warn("Failed to delete Firebase Storage asset:", err);
  }
}
