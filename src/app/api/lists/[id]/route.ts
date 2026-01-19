import { NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const PatchBody = z.object({
  name: z.string().min(1).max(60).optional(),
  visibility: z.enum(['PRIVATE', 'UNLISTED', 'PUBLIC']).optional(),
})

function makeToken() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 14)
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: false }, { status: 401 })

  const current = await prisma.list.findUnique({ where: { id: ctx.params.id } })
  if (!current || current.userId !== session.id) return NextResponse.json({ ok: false }, { status: 404 })

  const json = await req.json().catch(() => null)
  const parsed = PatchBody.safeParse(json)
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })

  const nextVisibility = parsed.data.visibility ?? current.visibility
  const needsToken = nextVisibility !== 'PRIVATE'
  const shareToken = needsToken ? (current.shareToken ?? makeToken()) : null

  const list = await prisma.list.update({
    where: { id: current.id },
    data: {
      name: parsed.data.name ? parsed.data.name.trim() : undefined,
      visibility: parsed.data.visibility ?? undefined,
      shareToken,
    },
    include: { items: { include: { title: true }, orderBy: { addedAt: 'desc' } } },
  })

  return NextResponse.json({ ok: true, list })
}

export async function DELETE(_: Request, ctx: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: false }, { status: 401 })

  const current = await prisma.list.findUnique({ where: { id: ctx.params.id } })
  if (!current || current.userId !== session.id) return NextResponse.json({ ok: false }, { status: 404 })

  await prisma.list.delete({ where: { id: current.id } })
  return NextResponse.json({ ok: true })
}
