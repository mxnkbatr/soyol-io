'use client';

import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useUser } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export const usePushNotifications = () => {
    const { isSignedIn } = useUser();
    const permissionGrantedRef = useRef(false);

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

    // ──────────────────────────────────────────────────────────────────────────
    // EFFECT 1: Ask for permission immediately on native (no login required)
    // This ensures iOS shows the permission dialog on first app launch.
    // ──────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const requestPermission = async () => {
            try {
                const { PushNotifications } = await import('@capacitor/push-notifications');
                let permStatus = await PushNotifications.checkPermissions();

                if (permStatus.receive === 'prompt') {
                    permStatus = await PushNotifications.requestPermissions();
                }

                if (permStatus.receive === 'granted') {
                    permissionGrantedRef.current = true;
                } else {
                    console.warn('FCM: Push notification permission not granted');
                }
            } catch (error) {
                console.error('FCM: Permission request failed:', error);
            }
        };

        requestPermission();
    }, []); // runs once on mount

    // ──────────────────────────────────────────────────────────────────────────
    // EFFECT 2: Register FCM/APNs token & attach listeners (requires sign-in)
    // ──────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isSignedIn) return;

        let cleanupFn: (() => void) | undefined;

        const initPush = async () => {
            // NATIVE BRANCH (iOS / Android)
            if (Capacitor.isNativePlatform()) {
                try {
                    const { PushNotifications } = await import('@capacitor/push-notifications');

                    // Re-check permission in case it was granted after first effect
                    const permStatus = await PushNotifications.checkPermissions();
                    if (permStatus.receive !== 'granted') {
                        console.warn('FCM: Permission not granted – skipping registration');
                        return;
                    }

                    // Register with FCM / APNs
                    await PushNotifications.register();

                    // Token received
                    const registrationListener = await PushNotifications.addListener('registration', async (token) => {
                        console.log('FCM: Native APNs token received:', token.value);
                        
                        if (Capacitor.getPlatform() === 'ios') {
                            try {
                                const { FCM } = await import('@capacitor-community/fcm');
                                const fcmResult = await FCM.getToken();
                                console.log('FCM: Converted iOS FCM token:', fcmResult.token);
                                registerToken(fcmResult.token);
                            } catch (fcmError) {
                                console.error('FCM: Failed to get FCM token via plugin:', fcmError);
                                // Fallback to raw token just in case
                                registerToken(token.value);
                            }
                        } else {
                            // On Android, standard token is already FCM token
                            registerToken(token.value);
                        }
                    });

                    // Foreground notification
                    const receivedListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
                        console.log('FCM: Foreground notification:', notification);

                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new Event('sync-notifications'));
                        }

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

                    // Notification tap
                    const actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
                        console.log('FCM: Notification action performed:', action);

                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new Event('sync-notifications'));
                        }

                        const url = action.notification.data?.url;
                        if (url) {
                            window.location.href = url;
                        }
                    });

                    // Registration error
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
