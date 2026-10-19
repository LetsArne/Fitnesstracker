// Firebase-Web-Konfiguration. Diese Werte sind nicht geheim (stehen bei jeder
// Firebase-Web-App im ausgelieferten Code); geschützt werden die Daten durch firestore.rules.
// Umgebungsvariablen (VITE_FIREBASE_*) haben Vorrang, z. B. für ein Testprojekt.
export const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) || 'AIzaSyANa5s0BTMc36n3dmrplDf4X1eKz2ZGpIQ',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || 'fitnestracker-55d85.firebaseapp.com',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) || 'fitnestracker-55d85',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined) || '1:857012663248:web:d534c58964cf5ce6b13fd5',
}

/** Firebase ist optional: ohne Konfiguration bleibt alles lokal auf dem Gerät. */
export const firebaseEnabled = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain)
