import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../index';

// ── Mock D1 ────────────────────────────────────────────────────────────
const createMockD1 = () => ({
  prepare: vi.fn(() => ({
    bind: vi.fn(() => ({
      all: vi.fn(() => ({ results: [] })),
      first: vi.fn(() => null),
      run: vi.fn(() => ({ success: true })),
    })),
    all: vi.fn(() => ({ results: [] })),
    first: vi.fn(() => null),
    run: vi.fn(() => ({ success: true })),
  })),
  batch: vi.fn(() => []),
  exec: vi.fn(),
  dump: vi.fn(),
});

const createMockR2 = () => ({
  put: vi.fn(),
  get: vi.fn(() => null),
  delete: vi.fn(),
  list: vi.fn(() => ({ objects: [] })),
  head: vi.fn(() => null),
});

const mockEnv = {
  DB: createMockD1(),
  R2_BUCKET: createMockR2(),
  BETTER_AUTH_SECRET: 'test-secret',
  AUTH_SERVICE_URL: 'http://localhost:3001',
  ENVIRONMENT: 'local' as const,
  INTERNAL_GATEWAY_KEY: 'test-key',
  SERVICE_API_KEY_AUTH: 'svc-auth-key',
  SERVICE_API_KEY_ORGANIZATION: 'svc-org-key',
  SERVICE_API_KEY_BILLING: 'svc-billing-key',
};

describe('core-user-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.DB = createMockD1();
    mockEnv.R2_BUCKET = createMockR2();
  });

  // ── Root / Hello World ────────────────────────────────────────────
  describe('GET /', () => {
    it('returns 200 with hello message', async () => {
      const res = await app.request('/', {}, mockEnv);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('text', 'Hello Hono!');
    });
  });

  // ── Health Check ──────────────────────────────────────────────────
  describe('GET /health', () => {
    it('returns 200 with healthy status', async () => {
      const res = await app.request('/health', {}, mockEnv);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('status', 'healthy');
      expect(body).toHaveProperty('timestamp');
    });
  });

  // ── Internal Key Auth ─────────────────────────────────────────────
  describe('X-Internal-Key middleware', () => {
    it('returns 401 when X-Internal-Key is missing', async () => {
      const res = await app.request('/api/v1/users/check-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: [] }),
      }, mockEnv);
      expect(res.status).toBe(401);
    });

    it('returns 401 when X-Internal-Key is wrong', async () => {
      const res = await app.request('/api/v1/users/check-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': 'wrong-key',
        },
        body: JSON.stringify({ emails: [] }),
      }, mockEnv);
      expect(res.status).toBe(401);
    });

    it('returns 503 when INTERNAL_GATEWAY_KEY is not configured', async () => {
      const envWithoutKey = { ...mockEnv, INTERNAL_GATEWAY_KEY: undefined };
      const res = await app.request('/api/v1/users/check-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': 'test-key',
        },
        body: JSON.stringify({ emails: [] }),
      }, envWithoutKey);
      expect(res.status).toBe(503);
    });
  });

  // ── POST /api/v1/user-builders ────────────────────────────────────
  describe('POST /api/v1/user-builders', () => {
    it('returns 201 with builder id when valid service key provided', async () => {
      const res = await app.request('/api/v1/user-builders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': 'test-key',
          'X-Service-API-Key': 'svc-auth-key',
        },
        body: JSON.stringify({}),
      }, mockEnv);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty('id');
    });

    it('returns 401 without service API key', async () => {
      const res = await app.request('/api/v1/user-builders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': 'test-key',
        },
        body: JSON.stringify({}),
      }, mockEnv);
      expect(res.status).toBe(401);
    });
  });

  // ── POST /api/v1/users/check-emails ──────────────────────────────
  describe('POST /api/v1/users/check-emails', () => {
    it('returns existing emails (empty list)', async () => {
      const res = await app.request('/api/v1/users/check-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': 'test-key',
        },
        body: JSON.stringify({ emails: ['test@example.com'] }),
      }, mockEnv);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('existingEmails');
    });
  });

  // ── GET /api/v1/users/by-auth-id/:authId ─────────────────────────
  describe('GET /api/v1/users/by-auth-id/:authId', () => {
    it('returns 404 when user not found', async () => {
      const res = await app.request(
        '/api/v1/users/by-auth-id/non-existent-auth-id',
        {
          headers: {
            'X-Internal-Key': 'test-key',
          },
        },
        mockEnv
      );
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toHaveProperty('error', 'User not found');
    });

    it('returns 401 without auth', async () => {
      const envWithoutInternalKey = { ...mockEnv, INTERNAL_GATEWAY_KEY: 'test-key' };
      const res = await app.request(
        '/api/v1/users/by-auth-id/some-auth-id',
        {
          // No X-Internal-Key, no Authorization, no X-Service-API-Key
        },
        envWithoutInternalKey
      );
      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/v1/users/:id (JWT-protected) ────────────────────────
  describe('GET /api/v1/users/:id', () => {
    it('returns 401 without JWT token', async () => {
      // TODO: add JWT mock
      const res = await app.request(
        '/api/v1/users/some-user-id',
        {
          headers: {
            'X-Internal-Key': 'test-key',
          },
        },
        mockEnv
      );
      // JWT middleware should reject unauthenticated requests
      expect(res.status).toBe(401);
    });
  });

  // ── Not Found ─────────────────────────────────────────────────────
  describe('Not found handler', () => {
    it('returns 404 for unknown routes', async () => {
      const res = await app.request('/does-not-exist', {}, mockEnv);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toHaveProperty('error', 'Not Found');
    });
  });
});
