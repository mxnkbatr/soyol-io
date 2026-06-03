'use client';

import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useUser } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export const usePushNotifications = () => {
    const { isSignedIn } = useUser();

    const registerToken = useCallback(async (token: string) => {
        try {
            await fetch('/api/notifications/register-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    platform: Capacitor.getPlatform(), // 'ios', 'android', or 'web'
                }),
            });
        } catch (error) {
            console.error('FCM: Token registration failed:', error);
        }
    }, []);

    useEffect(() => {
        // Only initialize push notifications when user is signed in
        if (!isSignedIn) return;

        let cleanupFn: (() => void) | undefined;

        const initPush = async () => {
            // NATIVE BRANCH (iOS/Android)
            if (Capacitor.isNativePlatform()) {
                const { PushNotifications } = await import('@capacitor/push-notifications');

                try {
                    // 1. Request push notification permission
                    let permStatus = await PushNotifications.checkPermissions();
                    
                    if (permStatus.receive === 'prompt') {
                        permStatus = await PushNotifications.requestPermissions();
                    }

                    if (permStatus.receive !== 'granted') {
                        console.warn('FCM: Push notification permission not granted');
                        return;
                    }

                    // 2. Register with FCM/APNs
                    await PushNotifications.register();

                    // 3. Listen for FCM token (registration)
                    const registrationListener = await PushNotifications.addListener('registration', (token) => {
                        console.log('FCM: Native Token received:', token.value);
                        registerToken(token.value);
                    });

                    // 4. Handle foreground notifications
                    const receivedListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
                        console.log('FCM: Foreground notification:', notification);
                        
                        // Sync notification state globally
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new Event('sync-notifications'));
                        }

                        // Show UI toast for foreground message
                        toast(
                            `${notification.title}\n${notification.body}`,
                            {
                                icon: '🔔',
                                duration: 5000,
                                style: {
                                    borderRadius: '16px',
                                    background: '#1C1C1E',
                                    color: '#fff',
                                    fontSize: '14px',
                                },
                            }
                        );
                    });

                    // 5. Handle notification tap (action performed)
                    const actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
                        console.log('FCM: Notification action performed:', action);
                        
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new Event('sync-notifications'));
                        }

                        // Navigate if URL is provided in data
                        const url = action.notification.data?.url;
                        if (url) {
                            window.location.href = url;
                        }
                    });

                    // Handle registration errors
                    const errorListener = await PushNotifications.addListener('registrationError', (err) => {
                        console.error('FCM: Registration error:', err);
                    });

                    cleanupFn = () => {
                        registrationListener.remove();
                        receivedListener.remove();
                        actionListener.remove();
                        errorListener.remove();
                    };
                } catch (error) {
                    console.error('FCM: Native initialization failed:', error);
                }
            } 
            // WEB BRANCH
            else {
                try {
                    const { getWebPushToken } = await import('@/lib/firebaseClient');
                    const token = await getWebPushToken();
                    if (token) {
                        registerToken(token);
                    }
                } catch (error) {
                    console.error('FCM: Web push initialization failed:', error);
                }
            }
        };

        initPush();

        return () => {
            if (cleanupFn) cleanupFn();
        };
    }, [isSignedIn, registerToken]);
};
