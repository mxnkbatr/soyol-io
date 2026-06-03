import * as React from 'react';

interface OrderStatusUpdateEmailProps {
    order: {
        id: string;
        fullName: string;
    };
    newStatus: 'confirmed' | 'delivered' | 'pending' | 'cancelled';
    deliveryEstimate?: string;
}

export const OrderStatusUpdateEmail: React.FC<Readonly<OrderStatusUpdateEmailProps>> = ({
    order,
    newStatus,
    deliveryEstimate,
}) => {
    const statusConfig = {
        confirmed: {
            title: 'Таны захиалга баталгаажлаа ✅',
            message: 'Таны төлбөр баталгаажиж, бид захиалгыг бэлтгэж эхэллээ.',
            color: '#FF4500'
        },
        delivered: {
            title: 'Захиалга хүргэгдлээ 🚚',
            message: 'Таны захиалга заасан хаягт хүргэгдсэн байна. Соёл Видео Шопыг сонгосон танд баярлалаа!',
            color: '#10b981'
        },
        pending: {
            title: 'Захиалга хүлээгдэж байна',
            message: 'Таны захиалга хүлээгдэж байна.',
            color: '#f59e0b'
        },
        cancelled: {
            title: 'Захиалга цуцлагдлаа',
            message: 'Таны захиалга цуцлагдсан байна.',
            color: '#ef4444'
        }
    };

    const config = statusConfig[newStatus] || statusConfig.pending;

    return (
        <div style={{
            fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
            backgroundColor: '#ffffff',
            padding: '40px 20px',
            color: '#1a1a1a'
        }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', border: '1px solid #f0f0f0', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: config.color, padding: '30px', textAlign: 'center' }}>
                    <h1 style={{ color: '#ffffff', margin: 0, fontSize: '24px', fontWeight: '900' }}>Soyol Video Shop</h1>
                </div>

                <div style={{ padding: '40px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 20px', color: config.color }}>{config.title}</h2>
                    <p style={{ color: '#666', fontSize: '14px', margin: '0 0 30px' }}>
                        Сайн байна уу, {order.fullName}. {config.message}
                    </p>

                    <div style={{ backgroundColor: '#f9f9f9', borderRadius: '12px', padding: '20px', marginBottom: '30px' }}>
                        <p style={{ margin: '0 0 5px', fontSize: '12px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>Захиалгын дугаар</p>
                        <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>#{order.id.slice(-6).toUpperCase()}</p>
                    </div>

                    {deliveryEstimate && newStatus === 'confirmed' && (
                        <div style={{ borderLeft: `4px solid ${config.color}`, padding: '15px 20px', backgroundColor: '#fef3eb', marginBottom: '30px' }}>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>🚚 Хүргэлтийн хугацаа: {deliveryEstimate}</p>
                        </div>
                    )}

                    <div style={{ marginTop: '40px', textAlign: 'center' }}>
                        <a href={`https://soyolvideoshop.mn/orders/${order.id}`} style={{
                            display: 'inline-block',
                            backgroundColor: '#1a1a1a',
                            color: '#ffffff',
                            padding: '14px 30px',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            fontSize: '14px'
                        }}>Захиалга харах</a>
                    </div>

                    <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '1px solid #eee', fontSize: '12px', color: '#999', textAlign: 'center' }}>
                        <p>Утас: 77-181818 | Email: info@soyolvideoshop.mn</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
