import { ObjectId } from 'mongodb';

export interface Address {
    id: string;
    label?: string; // 'Home', 'Work', etc.
    city: string;
    district: string;
    khoroo: string;
    street: string;
    entrance?: string;
    floor?: string;
    door?: string;
    note?: string;
    isDefault: boolean;
}

export interface PushToken {
    token: string;
    platform: string;
    createdAt: Date;
    updatedAt?: Date;
}

export interface NotificationPrefs {
    order: boolean;
    delivery: boolean;
    promo: boolean;
    stock: boolean;
    chat: boolean;
    email: boolean;
}

export interface User {
    _id?: ObjectId;
    phone: string;
    role: 'admin' | 'user' | 'vendor';
    status: 'available' | 'in-call';
    name?: string;
    email?: string;
    image?: string;
    addresses?: Address[];
    pushTokens?: PushToken[];
    notificationPrefs?: NotificationPrefs; // Typed preferences model
    lastSeen?: Date;
    createdAt: Date;
    updatedAt: Date;
}