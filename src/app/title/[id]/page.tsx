import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function TitlePage({ params }: { params: { id: string } }) {
  const title = await prisma.title.findUnique({
    where: { id: params.id },
    include: {
      seasons: { orderBy: { number: 'asc' }, include: { episodes: { orderBy: { number: 'asc' } } } },
      episodes: { where: { seasonId: null }, orderBy: { createdAt: 'asc' } },
    },
  })

  if (!title) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-white/70">غير موجود</div>
    )
  }

  const movieEpisode = title.type === 'MOVIE'
    ? await prisma.episode.findFirst({ where: { titleId: title.id }, orderBy: { createdAt: 'asc' } })
    : null

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <div className="mt-6 overflow-hidden rounded-3xl border border-stroke bg-panel">
        <div className="relative h-[340px]">
          {title.backdropUrl ? (
            <Image src={title.backdropUrl} alt={title.name} fill className="object-cover opacity-70" priority />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex flex-col gap-3">
              <div className="text-2xl font-bold">{title.name}</div>
              <div className="text-sm text-white/70 max-w-3xl">{title.overview}</div>
              <div className="text-xs text-white/60">{title.year ?? ''} • {title.genres}</div>

              <div className="flex flex-wrap gap-2">
                {title.type === 'MOVIE' && movieEpisode ? (
                  <Link
                    href={`/watch/${movieEpisode.id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
                  >
                    تشغيل
                  </Link>
                ) : null}
                <Link
                  href="/lists"
                  className="inline-flex items-center justify-center rounded-xl border border-stroke px-4 py-2 text-sm font-semibold hover:bg-white/5"
                >
                  أضف لقائمة
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {title.type === 'SERIES' ? (
        <div className="mt-8 space-y-8">
          {title.seasons.map((s) => (
            <div key={s.id} className="rounded-2xl border border-stroke bg-panel p-4">
              <div className="mb-3 text-sm font-semibold">{s.name}</div>
              <div className="grid gap-2">
                {s.episodes.map((ep) => (
                  <Link
                    key={ep.id}
                    href={`/watch/${ep.id}`}
                    className="flex items-center justify-between rounded-xl border border-stroke bg-black/20 px-3 py-3 hover:bg-white/5"
                  >
                    <div>
                      <div className="text-sm font-semibold">الحلقة {ep.number}: {ep.name}</div>
                      <div className="text-xs text-white/60 line-clamp-1">{ep.overview ?? ''}</div>
                    </div>
                    <div className="text-xs text-white/50">▶</div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
