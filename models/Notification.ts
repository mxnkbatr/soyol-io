export interface Notification {
    _id?: string;
    userId: string;
    title: string;
    message: string;
    type: 'order' | 'message' | 'system' | 'sale' | 'new_product';
    isRead: boolean;
    link?: string;
    createdAt: Date;
}