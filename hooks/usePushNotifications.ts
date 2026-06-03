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
                    platform: Capacitor.getPlatform(), // Returns 'web' on web, 'ios'/'android' on native
                }),
            });
        } catch (error) {
            console.error('FCM: Token registration failed:', error);
        }
    }, []);

    useEffect(() => {
        // Only run when user is signed in
        if (!isSignedIn) return;

        const initPush = async () => {
            // NATIVE BRANCH (iOS/Android)
            if (Capacitor.isNativePlatform()) {
                const { PushNotifications } = await import('@capacitor/push-notifications');

                // Check permissions
                let permStatus = await PushNotifications.checkPermissions();

                if (permStatus.receive === 'prompt') {
                    permStatus = await PushNotifications.requestPermissions();
                }

                if (permStatus.receive !== 'granted') {
                    console.warn('FCM: Push permission not granted');
                    return;
                }

                // Register with FCM
                await PushNotifications.register();

                // Listeners
                const registrationListener = await PushNotifications.addListener('registration', (token) => {
                    console.log('FCM: Native Token received:', token.value);
                    registerToken(token.value);
                });

                const errorListener = await PushNotifications.addListener('registrationError', (err) => {
                    console.error('FCM: Registration error:', err);
                });

                // Foreground notification — show a toast
                const receivedListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
                    console.log('FCM: Foreground notification:', notification);
                    const title = notification.title || 'Мэдэгдэл';
                    const body = notification.body || '';
                    
                    // Dispatch event to sync notification count instantly
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new Event('sync-notifications'));
                    }

                    toast(
                        `${title}\n${body}`,
                        {
                            icon: '🔔',
                            duration: 4000,
                            style: {
                                borderRadius: '16px',
                                background: '#1C1C1E',
                                color: '#fff',
                                fontSize: '13px',
                                fontWeight: '600',
                                padding: '12px 16px',
                                maxWidth: '340px',
                            },
                        }
                    );
                });

                // Tap on notification — deep link
                const actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
                    console.log('FCM: Action performed:', action);
                    
                    // Dispatch event to sync notification count instantly
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new Event('sync-notifications'));
                    }

                    const url = action.notification.data?.url;
                    if (url) {
                        window.location.href = url;
                    }
                });

                return () => {
                    registrationListener.remove();
                    errorListener.remove();
                    receivedListener.remove();
                    actionListener.remove();
                };
            } 
            // WEB BRANCH
            else {
                try {
                    // Dynamically import so Firebase messaging doesn't bloat the native app scope
                    const { getWebPushToken } = await import('@/lib/firebaseClient');
                    const token = await getWebPushToken();
                    if (token) {
                        console.log('FCM: Web Token received:', token);
                        registerToken(token);
                    }
                } catch (error) {
                    console.error('FCM: Web push initialization failed:', error);
                }
            }
        };

        let cleanupFn: (() => void) | undefined;
        let cancelled = false;

        initPush().then((fn) => {
            if (typeof fn === 'function') {
                if (!cancelled) {
                    cleanupFn = fn;
                } else {
                    // Safety check: if unmounted before resolving, clean up listeners immediately
                    fn();
                }
            }
        });

        return () => {
            cancelled = true;
            if (cleanupFn) {
                cleanupFn();
            }
        };
    }, [isSignedIn, registerToken]);
};