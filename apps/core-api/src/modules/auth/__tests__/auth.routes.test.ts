import request from 'supertest';
import { createApp } from '../../../app';

const app = createApp();

describe('Auth Routes Integration (Smoke Tests)', () => {
  it('POST /api/v1/auth/signup should fail validation on weak password', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({
      email: 'invalid-email',
      password: 'short',
      fullName: 'A',
      orgName: 'B',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('POST /api/v1/auth/login should fail validation on empty fields', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/forgot-password should accept valid email format', async () => {
    // Should return 200 generic message regardless of email presence
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'someuser@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toContain('If that email address exists');
  });
});
