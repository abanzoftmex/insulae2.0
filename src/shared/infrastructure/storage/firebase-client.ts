"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

type CondoAssetKind =
  | "condominium-logo"
  | "condominium-image"
  | "footer-logo"
  | "privacy-pdf"
  | "project-document"
  | "notification-image"
  | "notification-pdf"
  | "ticket-response-image"
  | "ticket-response-pdf";

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
