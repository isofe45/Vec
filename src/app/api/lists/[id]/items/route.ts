import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const Body = z.object({
  titleId: z.string().min(1),
})

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: false }, { status: 401 })

  const list = await prisma.list.findUnique({ where: { id: ctx.params.id } })
  if (!list || list.userId !== session.id) return NextResponse.json({ ok: false }, { status: 404 })

  const json = await req.json().catch(() => null)
  const parsed = Body.safeParse(json)
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })

  // ignore duplicates
  await prisma.listItem
    .create({ data: { listId: list.id, titleId: parsed.data.titleId } })
    .catch(() => {})

  const updated = await prisma.list.findUnique({
    where: { id: list.id },
    include: { items: { include: { title: true }, orderBy: { addedAt: 'desc' } } },
  })

  return NextResponse.json({ ok: true, list: updated })
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: false }, { status: 401 })

  const list = await prisma.list.findUnique({ where: { id: ctx.params.id } })
  if (!list || list.userId !== session.id) return NextResponse.json({ ok: false }, { status: 404 })

  const json = await req.json().catch(() => null)
  const parsed = Body.safeParse(json)
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })

  await prisma.listItem
    .delete({
      where: {
        listId_titleId: {
          listId: list.id,
          titleId: parsed.data.titleId,
        },
      },
    })
    .catch(() => {})

  const updated = await prisma.list.findUnique({
    where: { id: list.id },
    include: { items: { include: { title: true }, orderBy: { addedAt: 'desc' } } },
  })

  return NextResponse.json({ ok: true, list: updated })
}
