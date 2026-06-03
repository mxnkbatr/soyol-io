import { POST as CheckoutPOST } from '../app/api/checkout/route';
import { NextRequest } from 'next/server';

// Since the checkout endpoint was deprecated to prevent sync issues and stock-hoarding,
// we verify that calling this endpoint correctly returns a 410 Gone response.

async function testCheckoutDeprecation() {
  console.log('--- Testing Checkout Deprecation ---');

  const req1 = new NextRequest('http://localhost/api/checkout', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ id: '123', quantity: 1 }],
    })
  });

  try {
    const res1 = await CheckoutPOST(req1);
    const data1 = await res1.json();
    
    if (res1.status === 410 && data1.error && data1.error.includes('deprecated')) {
      console.log('✅ Test Passed: Endpoint correctly returns 410 Gone');
    } else {
      console.error('❌ Test Failed: Expected 410 Gone status', data1);
    }
  } catch (error) {
    console.error('❌ Test run error:', error);
  }
}

async function run() {
  await testCheckoutDeprecation();
}

run();