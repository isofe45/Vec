import { NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const CreateBody = z.object({
  name: z.string().min(1).max(60),
  visibility: z.enum(['PRIVATE', 'UNLISTED', 'PUBLIC']).optional(),
})

function makeToken() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 14)
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: false }, { status: 401 })

  const lists = await prisma.list.findMany({
    where: { userId: session.id },
    orderBy: { updatedAt: 'desc' },
    include: { items: { include: { title: true }, orderBy: { addedAt: 'desc' } } },
  })

  return NextResponse.json({ ok: true, lists })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: false }, { status: 401 })

  const json = await req.json().catch(() => null)
  const parsed = CreateBody.safeParse(json)
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })

  const visibility = parsed.data.visibility ?? 'PRIVATE'
  const shareToken = visibility === 'PRIVATE' ? null : makeToken()

  const list = await prisma.list.create({
    data: {
      userId: session.id,
      name: parsed.data.name.trim(),
      visibility,
      shareToken,
    },
    include: { items: { include: { title: true }, orderBy: { addedAt: 'desc' } } },
  })

  return NextResponse.json({ ok: true, list })
}
