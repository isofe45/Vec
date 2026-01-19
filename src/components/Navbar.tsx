import Link from 'next/link'
import { getSession } from '@/lib/auth'

export default async function Navbar() {
  const session = await getSession()

  return (
    <header className="sticky top-0 z-50 border-b border-stroke bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-white/10 border border-stroke grid place-items-center">
            <span className="text-sm font-semibold">CV</span>
          </div>
          <span className="text-lg font-semibold tracking-wide">CineVault</span>
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          <Link href="/" className="px-3 py-2 rounded-xl hover:bg-white/5">الرئيسية</Link>
          <Link href="/lists" className="px-3 py-2 rounded-xl hover:bg-white/5">قوائمي</Link>
          {session ? (
            <form action="/api/auth/logout" method="POST">
              <button className="px-3 py-2 rounded-xl border border-stroke hover:bg-white/5">
                تسجيل الخروج ({session.name})
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-3 py-2 rounded-xl border border-stroke hover:bg-white/5">
                دخول
              </Link>
              <Link href="/signup" className="px-3 py-2 rounded-xl bg-white text-black hover:opacity-90">
                إنشاء حساب
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
