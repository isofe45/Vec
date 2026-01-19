import { NextResponse } from 'next/server'
import { z } from 'zod'
import { signUp } from '@/lib/auth'

const Schema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(40),
  password: z.string().min(8).max(128),
})

export async function POST(req: Request) {
  const fd = await req.formData()
  const raw = {
    email: String(fd.get('email') || ''),
    name: String(fd.get('name') || ''),
    password: String(fd.get('password') || ''),
  }
  const parsed = Schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.redirect(new URL(`/signup?error=invalid`, req.url))
  }

  const res = await signUp(parsed.data)
  if (!res.ok) {
    return NextResponse.redirect(new URL(`/signup?error=${encodeURIComponent(res.error)}`, req.url))
  }

  return NextResponse.redirect(new URL('/', req.url))
}
