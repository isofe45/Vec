'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

type Title = { id: string; name: string; type: 'MOVIE' | 'SERIES' }

type ListItem = { titleId: string; title: { id: string; name: string; posterUrl?: string | null } }

type List = {
  id: string
  name: string
  visibility: 'PRIVATE' | 'UNLISTED' | 'PUBLIC'
  shareToken: string | null
  items: ListItem[]
}

export default function ListsManager(props: { initialLists: List[]; titles: Title[] }) {
  const [lists, setLists] = useState<List[]>(props.initialLists)
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createVis, setCreateVis] = useState<List['visibility']>('PRIVATE')

  const titlesById = useMemo(() => {
    const m = new Map<string, Title>()
    props.titles.forEach((t) => m.set(t.id, t))
    return m
  }, [props.titles])

  async function createList() {
    if (!createName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: createName.trim(), visibility: createVis }),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setLists((prev) => [data.list as List, ...prev])
      setCreateName('')
      setCreateVis('PRIVATE')
    } finally {
      setCreating(false)
    }
  }

  async function renameList(id: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const prev = lists
    setLists((ls) => ls.map((l) => (l.id === id ? { ...l, name: trimmed } : l)))
    const res = await fetch(`/api/lists/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    })
    if (!res.ok) setLists(prev)
  }

  async function setVisibility(id: string, visibility: List['visibility']) {
    const prev = lists
    setLists((ls) => ls.map((l) => (l.id === id ? { ...l, visibility } : l)))
    const res = await fetch(`/api/lists/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ visibility }),
    })
    if (!res.ok) setLists(prev)
    else {
      const data = await res.json().catch(() => null)
      if (data?.list) {
        setLists((ls) => ls.map((l) => (l.id === id ? (data.list as List) : l)))
      }
    }
  }

  async function deleteList(id: string) {
    const prev = lists
    setLists((ls) => ls.filter((l) => l.id !== id))
    const res = await fetch(`/api/lists/${id}`, { method: 'DELETE' })
    if (!res.ok) setLists(prev)
  }

  async function addItem(listId: string, titleId: string) {
    const prev = lists
    setLists((ls) => ls.map((l) => {
      if (l.id !== listId) return l
      if (l.items.some((it) => it.titleId === titleId)) return l
      const title = titlesById.get(titleId)
      if (!title) return l
      return { ...l, items: [...l.items, { titleId, title: { id: titleId, name: title.name } }] }
    }))

    const res = await fetch(`/api/lists/${listId}/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ titleId }),
    })

    if (!res.ok) setLists(prev)
    else {
      const data = await res.json().catch(() => null)
      if (data?.list) {
        setLists((ls) => ls.map((l) => (l.id === listId ? (data.list as List) : l)))
      }
    }
  }

  async function removeItem(listId: string, titleId: string) {
    const prev = lists
    setLists((ls) => ls.map((l) => (l.id === listId ? { ...l, items: l.items.filter((it) => it.titleId !== titleId) } : l)))

    const res = await fetch(`/api/lists/${listId}/items`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ titleId }),
    })
    if (!res.ok) setLists(prev)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <div className="mt-6 rounded-3xl border border-stroke bg-panel p-6">
        <div className="text-xl font-bold">القوائم الذكية</div>
        <div className="mt-2 text-sm text-white/70">
          أنشئ قوائمك، اجعلها خاصة أو شاركها، وأضف الأفلام/المسلسلات بسرعة.
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="اسم القائمة (مثلاً: المفضلة)"
            className="rounded-xl border border-stroke bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
          <select
            value={createVis}
            onChange={(e) => setCreateVis(e.target.value as any)}
            className="rounded-xl border border-stroke bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
          >
            <option value="PRIVATE">Private</option>
            <option value="UNLISTED">Unlisted</option>
            <option value="PUBLIC">Public</option>
          </select>
          <button
            disabled={creating}
            onClick={createList}
            className={cn(
              'rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90',
              creating ? 'opacity-60' : ''
            )}
          >
            إنشاء
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {lists.length === 0 ? (
          <div className="rounded-3xl border border-stroke bg-panel p-6 text-white/70">لا توجد قوائم بعد.</div>
        ) : null}

        {lists.map((list) => (
          <div key={list.id} className="rounded-3xl border border-stroke bg-panel p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <input
                  defaultValue={list.name}
                  onBlur={(e) => renameList(list.id, e.target.value)}
                  className="w-full rounded-xl border border-stroke bg-black/20 px-3 py-2 text-base font-semibold outline-none focus:border-white/30"
                />
                <div className="mt-2 text-xs text-white/60">
                  العناصر: {list.items.length} • الخصوصية: {list.visibility}
                  {list.visibility !== 'PRIVATE' && list.shareToken ? (
                    <span className="ml-2">• رابط المشاركة: <a className="underline" href={`/share/${list.shareToken}`}>/share/{list.shareToken}</a></span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={list.visibility}
                  onChange={(e) => setVisibility(list.id, e.target.value as any)}
                  className="rounded-xl border border-stroke bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
                >
                  <option value="PRIVATE">Private</option>
                  <option value="UNLISTED">Unlisted</option>
                  <option value="PUBLIC">Public</option>
                </select>
                <button
                  onClick={() => deleteList(list.id)}
                  className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20"
                >
                  حذف
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <select
                defaultValue=""
                onChange={(e) => {
                  const titleId = e.target.value
                  if (!titleId) return
                  void addItem(list.id, titleId)
                  e.currentTarget.value = ''
                }}
                className="rounded-xl border border-stroke bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
              >
                <option value="">+ إضافة عنوان…</option>
                {props.titles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.type === 'MOVIE' ? 'فيلم' : 'مسلسل'})
                  </option>
                ))}
              </select>
              {list.visibility !== 'PRIVATE' ? (
                <a
                  href={`/share/${list.shareToken || ''}`}
                  className="rounded-xl border border-stroke px-3 py-2 text-sm hover:bg-white/5 text-center"
                >
                  فتح رابط المشاركة
                </a>
              ) : (
                <div className="rounded-xl border border-stroke px-3 py-2 text-sm text-white/50 text-center">
                  اجعلها Public/Unlisted للمشاركة
                </div>
              )}
            </div>

            {list.items.length ? (
              <div className="mt-4 grid gap-2">
                {list.items.map((it) => (
                  <div key={it.titleId} className="flex items-center justify-between rounded-xl border border-stroke bg-black/20 px-3 py-3">
                    <div className="text-sm font-semibold">{it.title.name}</div>
                    <button
                      onClick={() => removeItem(list.id, it.titleId)}
                      className="rounded-xl border border-stroke px-3 py-1 text-xs hover:bg-white/5"
                    >
                      إزالة
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 text-sm text-white/60">لا عناصر بعد.</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
