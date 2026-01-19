import TitleCard from './TitleCard'

export type SectionItem = {
  id: string
  name: string
  year?: number | null
  posterUrl?: string | null
  meta?: string
}

export default function SectionRow({ title, items }: { title: string; items: SectionItem[] }) {
  if (!items?.length) return null

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((it) => (
          <TitleCard key={it.id} {...it} />
        ))}
      </div>
    </section>
  )
}
