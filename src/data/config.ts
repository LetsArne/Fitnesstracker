export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

/** Firebase ist optional: ohne Konfiguration bleibt alles lokal auf dem Gerät. */
export const firebaseEnabled = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain)
