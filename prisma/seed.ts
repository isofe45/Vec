import { PrismaClient, TitleType, ListVisibility } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Demo user
  const email = 'demo@cinevault.local'
  const existing = await prisma.user.findUnique({ where: { email } })
  const passwordHash = await bcrypt.hash('DemoPass123!', 10)
  const user = existing ?? (await prisma.user.create({
    data: {
      email,
      name: 'Demo User',
      passwordHash,
    },
  }))

  // Titles
  const movie = await prisma.title.upsert({
    where: { id: 'demo_movie' },
    update: {},
    create: {
      id: 'demo_movie',
      type: TitleType.MOVIE,
      name: 'Big Buck Bunny (Demo)',
      overview:
        'فيديو تجريبي مفتوح المصدر لاختبار المشغل فقط. استبدله بمحتوى مرخّص لك.',
      year: 2008,
      genres: 'Animation,Demo',
      posterUrl:
        'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=900&q=80&auto=format&fit=crop',
      backdropUrl:
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&q=80&auto=format&fit=crop',
      featured: true,
    },
  })

  const series = await prisma.title.upsert({
    where: { id: 'demo_series' },
    update: {},
    create: {
      id: 'demo_series',
      type: TitleType.SERIES,
      name: 'City Nights (Demo Series)',
      overview:
        'سلسلة تجريبية لعرض واجهة المواسم والحلقات والقوائم الذكية.',
      year: 2026,
      genres: 'Drama,Demo',
      posterUrl:
        'https://images.unsplash.com/photo-1517602302552-471fe67acf66?w=900&q=80&auto=format&fit=crop',
      backdropUrl:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=80&auto=format&fit=crop',
      featured: true,
    },
  })

  // Movie episode (single)
  const movieEp = await prisma.episode.upsert({
    where: { id: 'demo_movie_ep' },
    update: {},
    create: {
      id: 'demo_movie_ep',
      titleId: movie.id,
      name: movie.name,
      overview: movie.overview,
      durationSec: 596,
      streams: {
        create: [
          {
            label: 'Auto',
            kind: 'hls',
            url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          },
        ],
      },
      subtitles: {
        create: [
          {
            language: 'en',
            label: 'English (Demo)',
            url: '/subtitles/demo-en.vtt',
          },
          {
            language: 'ar',
            label: 'Arabic (Demo)',
            url: '/subtitles/demo-ar.vtt',
          },
        ],
      },
    },
  })

  // Series season + episodes
  const s1 = await prisma.season.upsert({
    where: { titleId_number: { titleId: series.id, number: 1 } },
    update: {},
    create: {
      titleId: series.id,
      number: 1,
      name: 'Season 1',
    },
  })

  for (let i = 1; i <= 6; i++) {
    await prisma.episode.upsert({
      where: { id: `demo_series_s1e${i}` },
      update: {},
      create: {
        id: `demo_series_s1e${i}`,
        titleId: series.id,
        seasonId: s1.id,
        number: i,
        name: `Episode ${i}`,
        overview: 'حلقة تجريبية لعرض ميزات المشغل وتقدم المشاهدة.',
        durationSec: 596,
        streams: {
          create: [
            {
              label: 'Auto',
              kind: 'hls',
              url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            },
          ],
        },
        subtitles: {
          create: [
            {
              language: 'en',
              label: 'English (Demo)',
              url: '/subtitles/demo-en.vtt',
            },
          ],
        },
      },
    })
  }

  // Demo lists
  const watchlist = await prisma.list.upsert({
    where: { id: 'demo_list_watchlist' },
    update: {},
    create: {
      id: 'demo_list_watchlist',
      userId: user.id,
      name: 'Watchlist',
      visibility: ListVisibility.PRIVATE,
      items: {
        create: [{ titleId: movie.id }, { titleId: series.id }],
      },
    },
  })

  await prisma.list.upsert({
    where: { id: 'demo_list_public' },
    update: {},
    create: {
      id: 'demo_list_public',
      userId: user.id,
      name: 'Top Picks (Shareable)',
      visibility: ListVisibility.PUBLIC,
      shareToken: 'top-picks-demo',
      items: {
        create: [{ titleId: movie.id }],
      },
    },
  })

  console.log('Seed complete')
  console.log('Demo login: demo@cinevault.local / DemoPass123!')
  console.log('Public list: /share/top-picks-demo')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
