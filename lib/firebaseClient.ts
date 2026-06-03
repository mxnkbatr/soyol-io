import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, Messaging } from "firebase/messaging";

export const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Call this only inside a useEffect (client-side) — never at module level
export async function getWebPushToken(): Promise<string | null> {
    if (typeof window === "undefined") return null;
    
    try {
        const messaging: Messaging = getMessaging(app);
        
        // Pass Firebase config to the service worker via query string
        const params = new URLSearchParams({
            apiKey: firebaseConfig.apiKey || '',
            projectId: firebaseConfig.projectId || '',
            messagingSenderId: firebaseConfig.messagingSenderId || '',
            appId: firebaseConfig.appId || '',
        }).toString();

        const swReg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params}`);
        const token = await getToken(messaging, { 
            vapidKey: VAPID_KEY, 
            serviceWorkerRegistration: swReg 
        });
        
        return token || null;
    } catch (err) {
        console.error("Web push token error:", err);
        return null;
    }
}