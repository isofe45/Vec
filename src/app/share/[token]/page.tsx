import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function SharePage({ params }: { params: { token: string } }) {
  const list = await prisma.list.findUnique({
    where: { shareToken: params.token },
    include: { items: { include: { title: true }, orderBy: { addedAt: 'desc' } } },
  })

  if (!list || list.visibility === 'PRIVATE') {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-white/70">
        الرابط غير صالح أو القائمة خاصة.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <div className="mt-6 rounded-3xl border border-stroke bg-panel p-6">
        <div className="text-2xl font-bold">{list.name}</div>
        <div className="mt-2 text-sm text-white/60">
          {list.visibility === 'PUBLIC' ? 'قائمة عامة' : 'قائمة غير مدرجة'} • العناصر: {list.items.length}
        </div>
        <div className="mt-4">
          <Link href="/" className="text-sm underline">العودة للرئيسية</Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {list.items.map((it) => (
          <Link
            key={it.titleId}
            href={`/title/${it.titleId}`}
            className="rounded-2xl border border-stroke bg-panel p-4 hover:bg-white/5"
          >
            <div className="text-sm font-semibold">{it.title.name}</div>
            <div className="mt-1 text-xs text-white/60">{it.title.year ?? ''} • {it.title.genres}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
