export interface Notification {
    _id?: string;
    userId: string;
    title: string;
    message: string;
    type: 'order' | 'message' | 'system' | 'sale' | 'new_product' | 'product' | 'restock' | 'restock_personal' | 'admin_broadcast' | 'greeting_morning' | 'greeting_evening';
    isRead: boolean;
    readBy?: string[];
    link?: string;
    createdAt: Date;
}