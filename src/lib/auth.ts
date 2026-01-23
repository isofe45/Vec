import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const COOKIE_NAME = 'cinevault_session'

function getSecret() {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET is missing')
  return new TextEncoder().encode(s)
}

export type SessionUser = {
  id: string
  email: string
  name: string
}

async function getPrisma() {
  const { prisma } = await import('./prisma')
  return prisma
}

export async function signUp(data: { email: string; name: string; password: string }) {
  const email = data.email.trim().toLowerCase()
  const name = data.name.trim()
  const password = data.password

  const prisma = await getPrisma()
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    return { ok: false, error: 'Email already registered' as const }
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
    select: { id: true, email: true, name: true },
  })

  await createSession(user)
  return { ok: true, user }
}

export async function signIn(data: { email: string; password: string }) {
  const email = data.email.trim().toLowerCase()
  const prisma = await getPrisma()
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return { ok: false, error: 'Invalid email or password' as const }

  const ok = await bcrypt.compare(data.password, user.passwordHash)
  if (!ok) return { ok: false, error: 'Invalid email or password' as const }

  const safe = { id: user.id, email: user.email, name: user.name }
  await createSession(safe)
  return { ok: true, user: safe }
}

export async function signOut() {
  const jar = await cookies()
  jar.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

async function createSession(user: SessionUser) {
  const token = await new SignJWT({ sub: user.id, email: user.email, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())

  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getSecret())
    const id = String(payload.sub || '')
    const email = String(payload.email || '')
    const name = String(payload.name || '')
    if (!id || !email) return null
    return { id, email, name }
  } catch {
    return null
  }
}
