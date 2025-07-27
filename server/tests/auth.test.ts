import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import type { Server } from 'http'
import { registerRoutes } from '../routes'
import session from 'express-session'

// Mock email service to avoid sending real emails
vi.mock('../emailService', () => ({
  emailService: {
    sendWelcomeEmail: vi.fn().mockResolvedValue({ messageId: 'mocked' }),
    sendPasswordResetEmail: vi.fn().mockResolvedValue({ messageId: 'mocked' }),
    sendSftpWelcomeEmail: vi.fn().mockResolvedValue({ messageId: 'mocked' })
  }
}))

// Simple in-memory session store used to mock connect-pg-simple
class MockStore extends session.Store {
  sessions = new Map<string, any>()
  get(id: string, cb: any) { cb(null, this.sessions.get(id)) }
  set(id: string, sess: any, cb: any) { this.sessions.set(id, sess); cb(null) }
  destroy(id: string, cb: any) { this.sessions.delete(id); cb(null) }
  touch(id: string, sess: any, cb: any) { this.sessions.set(id, sess); cb(null) }
  all(cb: any) { cb(null, Array.from(this.sessions.values())) }
  length(cb: any) { cb(null, this.sessions.size) }
  clear(cb: any) { this.sessions.clear(); cb(null) }
}

vi.mock('connect-pg-simple', () => ({
  default: () => MockStore
}))

// In-memory user store for authentication
vi.mock('../storage', () => {
  const users: any[] = []
  return {
    storage: {
      async getUser(id: string) { return users.find(u => u.id === id) },
      async getUserByEmail(email: string) { return users.find(u => u.email === email) },
      async upsertUser(data: any) {
        const existing = users.find(u => u.id === data.id)
        if (existing) Object.assign(existing, data)
        else users.push({ ...data })
        return data
      },
      async updateUser(id: string, data: any) {
        const user = users.find(u => u.id === id)
        if (user) Object.assign(user, data)
        return user
      }
    }
  }
})

describe('Auth Endpoints', () => {
  let app: express.Application
  let server: Server
  let agent: request.SuperAgentTest

  const credentials = {
    email: 'testuser@example.com',
    password: 'StrongPass123',
    firstName: 'Test',
    lastName: 'User',
    privacyConsent: true
  }

  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = 'test-key'
    process.env.DATABASE_URL = 'postgres://user:pass@localhost/db'
    process.env.SESSION_SECRET = 'secret'

    app = express()
    app.use(express.json())
    server = await registerRoutes(app)
    agent = request.agent(app)
  })

  afterAll(() => {
    server.close()
  })

  it('registers a new user', async () => {
    const res = await agent
      .post('/api/auth/register')
      .send(credentials)
      .expect(201)

    expect(res.body).toHaveProperty('user')
    expect(res.body.user.email).toBe(credentials.email)
    expect(res.body).not.toHaveProperty('error')
  })

  it('logs in with valid credentials', async () => {
    const res = await agent
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200)

    expect(res.body).toHaveProperty('user')
    expect(res.body.user.email).toBe(credentials.email)
    expect(res.body.message).toBe('Login successful')
  })
})
