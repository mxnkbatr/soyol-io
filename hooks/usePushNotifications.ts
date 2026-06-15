'use client';

import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useUser } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { debugPushError, debugPushLog } from '@/lib/pushDebug';

export const usePushNotifications = () => {
    const { isSignedIn } = useUser();
    const permissionGrantedRef = useRef(false);

    const registerToken = useCallback(async (token: string, source = 'device') => {
        if (!token?.trim()) return;
        debugPushLog(`Push token (${source})`, token);

        try {
            const res = await fetch('/api/notifications/register-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    token,
                    platform: Capacitor.getPlatform(),
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                console.error('FCM: Token registration failed:', res.status, body);
                debugPushError(`Сервер token хадгалж чадсангүй (${res.status})`, body);
                return;
            }
            console.log('FCM: Token saved to server successfully');
            debugPushLog('Сервер дээр token амжилттай хадгалагдлаа', token);
        } catch (error) {
            console.error('FCM: Token registration failed:', error);
            debugPushError('Сервер рүү token илгээхэд алдаа', error);
        }
    }, []);

    const getFcmToken = useCallback(async (source: string) => {
        try {
            const { FCM } = await import('@capacitor-community/fcm');
            const fcmResult = await FCM.getToken();
            if (fcmResult.token) {
                console.log(`FCM: ${source} token:`, fcmResult.token);
                await registerToken(fcmResult.token, `fcm-${source}`);
                return fcmResult.token;
            }
            debugPushError('FCM token хоосон байна', source);
        } catch (error) {
            console.error(`FCM: ${source} token fetch failed:`, error);
            debugPushError('FCM token авахад алдаа', error);
        }
        return null;
    }, [registerToken]);

    const ensureNativePermission = useCallback(async () => {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive === 'granted') {
            permissionGrantedRef.current = true;
            debugPushLog('Мэдэгдлийн эрх', 'granted');
            return true;
        }

        console.warn('FCM: Push notification permission not granted');
        debugPushError('Мэдэгдэл авах эрхийг хэрэглэгч зөвшөөрсөнгүй!', permStatus);
        return false;
    }, []);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        ensureNativePermission().catch((error) => {
            console.error('FCM: Permission request failed:', error);
            debugPushError('Эрх асуухад алдаа', error);
        });
    }, [ensureNativePermission]);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        if (isSignedIn) return;
        debugPushLog(
            'Push debug',
            'Эрх зөвшөөрсөн. Token авахын тулд нэвтэрнэ үү.',
        );
    }, [isSignedIn]);

    useEffect(() => {
        if (!isSignedIn) return;

        let cleanupFn: (() => void) | undefined;

        const initPush = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    const { PushNotifications } = await import('@capacitor/push-notifications');

                    const hasPermission =
                        permissionGrantedRef.current || (await ensureNativePermission());
                    if (!hasPermission) {
                        console.warn('FCM: Permission not granted – skipping registration');
                        return;
                    }

                    if (Capacitor.getPlatform() === 'android') {
                        await PushNotifications.createChannel({
                            id: 'soyol_push',
                            name: 'Soyol мэдэгдэл',
                            description: 'Захиалга, хямдрал, өглөө/оройн мэдэгдэл',
                            importance: 5,
                            sound: 'default',
                            vibration: true,
                            visibility: 1,
                        });
                    }

                    const registrationListener = await PushNotifications.addListener(
                        'registration',
                        async (token) => {
                            console.log('FCM: Native device token received:', token.value);
                            debugPushLog('Native push token', token.value);

                            if (Capacitor.getPlatform() === 'ios') {
                                await getFcmToken('ios');
                            } else {
                                await registerToken(token.value, 'android-native');
                                await getFcmToken('android');
                            }
                        },
                    );

                    const receivedListener = await PushNotifications.addListener(
                        'pushNotificationReceived',
                        (notification) => {
                            console.log('FCM: Foreground notification:', notification);

                            if (typeof window !== 'undefined') {
                                window.dispatchEvent(new Event('sync-notifications'));
                            }

                            const url = notification.data?.url;
                            toast(`${notification.title}\n${notification.body}`, {
                                icon: '🔔',
                                duration: 5000,
                                style: {
                                    borderRadius: '16px',
                                    background: '#1C1C1E',
                                    color: '#fff',
                                    fontSize: '14px',
                                    cursor: url ? 'pointer' : 'default',
                                },
                                onClick: url
                                    ? () => {
                                          window.location.href = url;
                                      }
                                    : undefined,
                            });
                        },
                    );

                    const actionListener = await PushNotifications.addListener(
                        'pushNotificationActionPerformed',
                        (action) => {
                            console.log('FCM: Notification action performed:', action);

                            if (typeof window !== 'undefined') {
                                window.dispatchEvent(new Event('sync-notifications'));
                            }

                            const url = action.notification.data?.url;
                            if (url) {
                                window.location.href = url;
                            }
                        },
                    );

                    const errorListener = await PushNotifications.addListener(
                        'registrationError',
                        (err) => {
                            console.error('FCM: Registration error:', err);
                            debugPushError('Push бүртгэлийн алдаа', err);
                        },
                    );

                    await PushNotifications.register();
                    debugPushLog('Push бүртгэл', 'register() дуудагдлаа — token хүлээж байна...');

                    if (Capacitor.getPlatform() === 'ios') {
                        setTimeout(() => {
                            getFcmToken('ios-fallback').catch((err) => {
                                console.error('FCM: iOS fallback token fetch failed:', err);
                            });
                        }, 2500);
                    } else {
                        setTimeout(() => {
                            getFcmToken('android-fallback').catch((err) => {
                                console.error('FCM: Android fallback token fetch failed:', err);
                            });
                        }, 2500);
                    }

                    cleanupFn = () => {
                        registrationListener.remove();
                        receivedListener.remove();
                        actionListener.remove();
                        errorListener.remove();
                    };
                } catch (error) {
                    console.error('FCM: Native initialization failed:', error);
                    debugPushError('Push эхлүүлэхэд алдаа', error);
                }
            } else {
                try {
                    const { getWebPushToken } = await import('@/lib/firebaseClient');
                    const token = await getWebPushToken();
                    if (token) {
                        registerToken(token, 'web');
                    } else {
                        debugPushError('Web push token олдсонгүй', 'VAPID эсвэл permission шалгана уу');
                    }
                } catch (error) {
                    console.error('FCM: Web push initialization failed:', error);
                    debugPushError('Web push алдаа', error);
                }
            }
        };

        initPush();

        return () => {
            if (cleanupFn) cleanupFn();
        };
    }, [isSignedIn, registerToken, ensureNativePermission, getFcmToken]);
};
