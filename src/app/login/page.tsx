import Link from 'next/link'

const ERROR_MESSAGES: Record<string, string> = {
  invalid: 'تأكد من إدخال البريد الإلكتروني وكلمة المرور بشكل صحيح.',
  bad: 'بيانات الدخول غير صحيحة. حاول مرة أخرى.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>
}) {
  const params = await searchParams
  const errorKey = params?.e ?? ''
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] ?? 'حدث خطأ غير متوقع.' : null

  return (
    <div className="mx-auto flex max-w-6xl justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-stroke bg-panel p-6">
        <div className="text-2xl font-semibold">تسجيل الدخول</div>
        <p className="mt-2 text-sm text-white/70">
          مرحبًا بعودتك! أدخل بياناتك لمتابعة المشاهدة.
        </p>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        <form action="/api/auth/login" method="POST" className="mt-6 space-y-4">
          <label className="block text-sm">
            البريد الإلكتروني
            <input
              name="email"
              type="email"
              required
              className="mt-2 w-full rounded-xl border border-stroke bg-bg px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="you@example.com"
            />
          </label>

          <label className="block text-sm">
            كلمة المرور
            <input
              name="password"
              type="password"
              required
              className="mt-2 w-full rounded-xl border border-stroke bg-bg px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
          >
            دخول
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-white/70">
          لا تملك حسابًا؟{' '}
          <Link href="/signup" className="font-semibold text-white hover:underline">
            إنشاء حساب
          </Link>
        </div>
      </div>
    </div>
  )
}
