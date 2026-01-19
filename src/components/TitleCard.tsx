import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export default function TitleCard(props: {
  id: string
  name: string
  year?: number | null
  posterUrl?: string | null
  meta?: string
  className?: string
}) {
  return (
    <Link
      href={`/title/${props.id}`}
      className={cn(
        'group block w-40 shrink-0',
        props.className
      )}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-stroke bg-white/5">
        {props.posterUrl ? (
          <Image
            src={props.posterUrl}
            alt={props.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-white/40 text-xs">No poster</div>
        )}
      </div>
      <div className="mt-2">
        <div className="line-clamp-1 text-sm font-semibold">{props.name}</div>
        <div className="text-xs text-white/60">
          {props.meta ?? (props.year ? String(props.year) : '')}
        </div>
      </div>
    </Link>
  )
}
