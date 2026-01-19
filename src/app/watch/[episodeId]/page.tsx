import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import Player from '@/components/Player'
import { getSession } from '@/lib/auth'

export default async function WatchPage({ params }: { params: { episodeId: string } }) {
  const session = await getSession()
  const episode = await prisma.episode.findUnique({
    where: { id: params.episodeId },
    include: {
      title: true,
      season: true,
      streams: true,
      subtitles: true,
    },
  })
  if (!episode) return notFound()

  const initialProgress = session
    ? await prisma.userProgress.findUnique({
        where: { userId_episodeId: { userId: session.id, episodeId: episode.id } },
      })
    : null

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <div className="mt-6 mb-4">
        <Link href={`/title/${episode.titleId}`} className="text-sm text-white/60 hover:text-white">
          ← {episode.title.name}
        </Link>
        <div className="mt-2 text-lg font-semibold">
          {episode.season ? `${episode.season.name} • ` : ''}{episode.number ? `الحلقة ${episode.number} • ` : ''}{episode.name}
        </div>
      </div>

      <Player
        episodeId={episode.id}
        titleId={episode.titleId}
        sources={episode.streams.map((s) => ({
          id: s.id,
          label: s.label,
          url: s.url,
          kind: s.kind,
          bandwidth: s.bandwidth ?? undefined,
          width: s.width ?? undefined,
          height: s.height ?? undefined,
        }))}
        subtitles={episode.subtitles.map((t) => ({
          id: t.id,
          language: t.language,
          label: t.label,
          url: t.url,
        }))}
        initialPositionSec={initialProgress?.positionSec ?? null}
        isAuthed={!!session}
      />

      <div className="mt-6 rounded-2xl border border-stroke bg-panel p-4">
        <div className="text-sm font-semibold">نصائح سريعة</div>
        <ul className="mt-2 text-xs text-white/70 space-y-1">
          <li>مسافة: تشغيل/إيقاف</li>
          <li>← →: تقديم/ترجيع 5 ثواني</li>
          <li>f: ملء الشاشة • m: كتم</li>
          <li>c: إظهار/إخفاء الترجمة</li>
        </ul>
      </div>
    </div>
  )
}
