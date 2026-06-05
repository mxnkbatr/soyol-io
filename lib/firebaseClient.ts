import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, Messaging } from "firebase/messaging";

export const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAm9al04s12CCvuGw-a74dKlzcHbL_DWkE",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "soyol-c0a5c.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "soyol-c0a5c",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "soyol-c0a5c.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "56065511032",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:56065511032:web:e0a96996d933390f0c0a5c",
};

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Call this only inside a useEffect (client-side) — never at module level
export async function getWebPushToken(): Promise<string | null> {
    if (typeof window === "undefined") return null;
    
    // If VAPID key is missing, don't even try to avoid cryptic Firebase errors
    if (!VAPID_KEY || VAPID_KEY.startsWith("BDe5S")) {
        console.warn("FCM: Web Push VAPID key is missing or invalid. Push notifications will not work on web.");
        return null;
    }
    
    try {
        const messaging: Messaging = getMessaging(app);
        
        // Pass Firebase config to the service worker via query string
        const params = new URLSearchParams({
            apiKey: firebaseConfig.apiKey || '',
            projectId: firebaseConfig.projectId || '',
            messagingSenderId: firebaseConfig.messagingSenderId || '',
            appId: firebaseConfig.appId || '',
        }).toString();

        // Register and wait for service worker to be ready
        await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params}`);
        const swReg = await navigator.serviceWorker.ready;
        
        const token = await getToken(messaging, { 
            vapidKey: VAPID_KEY, 
            serviceWorkerRegistration: swReg 
        });
        
        return token || null;
    } catch (err) {
        console.error("FCM: Web push token error:", err);
        return null;
    }
}