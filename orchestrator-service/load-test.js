import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 50 },    // Ramp up to 50 users
    { duration: '20s', target: 200 },  // Ramp up to 200 concurrent users
    { duration: '5s', target: 0 },     // Ramp down
  ],
};

export default function () {
  const url = 'http://localhost:3002/api/test/k6/stresstest';
  
  // Generate random idempotency key and future TTL timestamp
  const randomString = Math.random().toString(36).substring(2, 12);
  const idempotency_key = `key_${__VU}_${__ITER}_${randomString}`;
  const idempotency_ttl = (Date.now() + 24 * 60 * 60 * 1000).toString();

  const payload = JSON.stringify({
    payer_upi_id: `user${Math.floor(Math.random() * 1000)}@paytm`,
    payee_upi_id: 'merchant@ybl',
    amount: Math.floor(Math.random() * 2000) + 100,
    gateway_id: 'gateway_1',
    idempotency_key,
    idempotency_ttl
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);
  
  check(res, {
    'is status 202': (r) => r.status === 202,
  });

  sleep(0.01);
}