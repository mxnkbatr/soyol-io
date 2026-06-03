export interface Notification {
    _id?: string;
    userId: string;
    title: string;
    message: string;
    type: 'order' | 'message' | 'system' | 'sale' | 'new_product' | 'product' | 'restock' | 'restock_personal';
    isRead: boolean;
    link?: string;
    createdAt: Date;
}