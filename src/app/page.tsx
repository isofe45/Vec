import Link from 'next/link'
import Image from 'next/image'
import SectionRow from '@/components/SectionRow'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export default async function HomePage() {
  const session = await getSession()

  const featured = await prisma.title.findMany({
    where: { featured: true },
    orderBy: { updatedAt: 'desc' },
    take: 6,
  })

  const movies = await prisma.title.findMany({
    where: { type: 'MOVIE' },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  })

  const series = await prisma.title.findMany({
    where: { type: 'SERIES' },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  })

  const continueWatching = session
    ? await prisma.userProgress.findMany({
        where: { userId: session.id },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: {
          episode: {
            include: {
              title: true,
            },
          },
        },
      })
    : []

  const hero = featured[0]

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      {hero ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-stroke bg-panel">
          <div className="relative h-[340px]">
            {hero.backdropUrl ? (
              <Image
                src={hero.backdropUrl}
                alt={hero.name}
                fill
                className="object-cover opacity-70"
                priority
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex flex-col gap-3">
                <div className="text-2xl font-bold">{hero.name}</div>
                <div className="max-w-2xl text-sm text-white/70 line-clamp-2">{hero.overview}</div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/title/${hero.id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
                  >
                    مشاهدة الآن
                  </Link>
                  <Link
                    href="/lists"
                    className="inline-flex items-center justify-center rounded-xl border border-stroke px-4 py-2 text-sm font-semibold hover:bg-white/5"
                  >
                    قوائمي
                  </Link>
                </div>
                {!session ? (
                  <div className="text-xs text-white/60">
                    سجّل دخولك لتفعيل: حفظ تقدم المشاهدة + القوائم الذكية + المشاركة.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <SectionRow
        title="مُختارات"
        items={featured.map((t) => ({
          id: t.id,
          name: t.name,
          year: t.year,
          posterUrl: t.posterUrl,
          meta: t.genres,
        }))}
      />

      <SectionRow
        title="أكمل المشاهدة"
        items={continueWatching.map((p) => ({
          id: p.episode.title.id,
          name: p.episode.title.name,
          year: p.episode.title.year,
          posterUrl: p.episode.title.posterUrl,
          meta: `عند ${formatTime(p.positionSec)}`,
        }))}
      />

      <SectionRow
        title="أفلام"
        items={movies.map((t) => ({
          id: t.id,
          name: t.name,
          year: t.year,
          posterUrl: t.posterUrl,
          meta: t.genres,
        }))}
      />

      <SectionRow
        title="مسلسلات"
        items={series.map((t) => ({
          id: t.id,
          name: t.name,
          year: t.year,
          posterUrl: t.posterUrl,
          meta: t.genres,
        }))}
      />
    </div>
  )
}

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
  return `${m}:${String(r).padStart(2, '0')}`
}
