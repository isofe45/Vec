import { NextResponse } from 'next/server'
import { z } from 'zod'
import { signIn } from '@/lib/auth'

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
})

export async function POST(req: Request) {
  const fd = await req.formData()
  const raw = {
    email: String(fd.get('email') || ''),
    password: String(fd.get('password') || ''),
  }
  const parsed = Schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.redirect(new URL('/login?e=invalid', req.url))
  }

  const res = await signIn(parsed.data)
  if (!res.ok) {
    return NextResponse.redirect(new URL('/login?e=bad', req.url))
  }
  return NextResponse.redirect(new URL('/', req.url))
}
