import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const Body = z.object({
  episodeId: z.string().min(1),
  positionSec: z.number().int().min(0),
  durationSec: z.number().int().min(0).nullable().optional(),
})

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: false }, { status: 401 })

  const url = new URL(req.url)
  const episodeId = url.searchParams.get('episodeId')
  if (!episodeId) return NextResponse.json({ ok: false }, { status: 400 })

  const row = await prisma.userProgress.findUnique({
    where: { userId_episodeId: { userId: session.id, episodeId } },
  })

  return NextResponse.json({ ok: true, progress: row })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: false }, { status: 401 })

  const json = await req.json().catch(() => null)
  const parsed = Body.safeParse(json)
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })

  const { episodeId, positionSec, durationSec } = parsed.data

  await prisma.userProgress.upsert({
    where: { userId_episodeId: { userId: session.id, episodeId } },
    update: { positionSec, durationSec: durationSec ?? undefined },
    create: {
      userId: session.id,
      episodeId,
      positionSec,
      durationSec: durationSec ?? undefined,
    },
  })

  return NextResponse.json({ ok: true })
}
