import * as React from 'react';

interface OrderConfirmationEmailProps {
    order: {
        id: string;
        items: any[];
        totalPrice: number | string;
        fullName: string;
        address: string;
        city: string;
    };
}

export const OrderConfirmationEmail: React.FC<Readonly<OrderConfirmationEmailProps>> = ({
    order,
}) => (
    <div style={{
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
        backgroundColor: '#ffffff',
        padding: '40px 20px',
        color: '#1a1a1a'
    }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', border: '1px solid #f0f0f0', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#FF4500', padding: '30px', textAlign: 'center' }}>
                <h1 style={{ color: '#ffffff', margin: 0, fontSize: '24px', fontWeight: '900' }}>Soyol Video Shop</h1>
            </div>

            <div style={{ padding: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 20px' }}>Захиалга баталгаажлаа! 🎉</h2>
                <p style={{ color: '#666', fontSize: '14px', margin: '0 0 30px' }}>
                    Сайн байна уу, {order.fullName}. Таны захиалгыг бид амжилттай хүлээн авлаа.
                </p>

                <div style={{ backgroundColor: '#f9f9f9', borderRadius: '12px', padding: '20px', marginBottom: '30px' }}>
                    <p style={{ margin: '0 0 5px', fontSize: '12px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>Захиалгын дугаар</p>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>#{order.id.slice(-6).toUpperCase()}</p>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Захиалгын бараанууд</h3>
                {order.items.map((item, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                        <span>{item.productName || item.name} x {item.quantity}</span>
                        <span style={{ fontWeight: 'bold' }}>{Number(item.price * item.quantity).toLocaleString()}₮</span>
                    </div>
                ))}

                <div style={{ borderTop: '2px solid #FF4500', marginTop: '20px', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '900' }}>
                    <span>Нийт дүн:</span>
                    <span style={{ color: '#FF4500' }}>{Number(order.totalPrice).toLocaleString()}₮</span>
                </div>

                <div style={{ marginTop: '40px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 10px', color: '#666' }}>Хүргэлтийн хаяг</h3>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                        {order.city}<br />
                        {order.address}
                    </p>
                </div>

                <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '1px solid #eee', fontSize: '12px', color: '#999', textAlign: 'center' }}>
                    <p>Хэрэв танд асуулт байвал бидэнтэй холбогдоорой.</p>
                    <p>Утас: 77-181818 | Email: info@soyolvideoshop.mn</p>
                </div>
            </div>
        </div>
    </div>
);
