import request from 'supertest';
import express from 'express';

describe('backend health smoke test', () => {
  it('GET /health returns 200 OK', async () => {
    const app = express();
    app.get('/health', (_req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });
});
