'use client'

import Hls from 'hls.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type Source = {
  id: string
  label: string
  url: string
  kind: string
  bandwidth?: number
  width?: number
  height?: number
}

type Subtitle = {
  id: string
  language: string
  label: string
  url: string
}

type Cue = { start: number; end: number; text: string }

export default function Player(props: {
  episodeId: string
  titleId: string
  sources: Source[]
  subtitles: Subtitle[]
  initialPositionSec: number | null
  isAuthed: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const lastSaveAtRef = useRef<number>(0)
  const hasSeekedRef = useRef<boolean>(false)

  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(0.9)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [bufferedEnd, setBufferedEnd] = useState(0)
  const [showUI, setShowUI] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)

  const [qualityMode, setQualityMode] = useState<'auto' | 'manual'>('auto')
  const [qualityValue, setQualityValue] = useState<string>('auto')
  const [availableQualities, setAvailableQualities] = useState<{ key: string; label: string; hlsLevel?: number; srcId?: string }[]>([
    { key: 'auto', label: 'Auto' },
  ])

  const [subtitleId, setSubtitleId] = useState<string>('off')
  const [subtitleCues, setSubtitleCues] = useState<Cue[]>([])
  const [activeSubtitle, setActiveSubtitle] = useState<string>('')
  const [subSize, setSubSize] = useState(26) // px
  const [subOffset, setSubOffset] = useState(6) // vh

  const primarySource = useMemo(() => props.sources[0], [props.sources])

  // Load persisted player prefs
  useEffect(() => {
    try {
      const v = localStorage.getItem('cv:volume')
      const m = localStorage.getItem('cv:muted')
      const r = localStorage.getItem('cv:rate')
      const sid = localStorage.getItem('cv:subtitle')
      const ss = localStorage.getItem('cv:subSize')
      const so = localStorage.getItem('cv:subOffset')
      if (v) setVolume(clamp(Number(v), 0, 1))
      if (m) setMuted(m === '1')
      if (r) setPlaybackRate(clamp(Number(r), 0.25, 4))
      if (sid) setSubtitleId(sid)
      if (ss) setSubSize(clamp(Number(ss), 14, 60))
      if (so) setSubOffset(clamp(Number(so), 0, 25))
    } catch {
      // ignore
    }
  }, [])

  // Apply audio + rate
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.volume = volume
    v.muted = muted
    v.playbackRate = playbackRate
    try {
      localStorage.setItem('cv:volume', String(volume))
      localStorage.setItem('cv:muted', muted ? '1' : '0')
      localStorage.setItem('cv:rate', String(playbackRate))
    } catch {}
  }, [volume, muted, playbackRate])

  // Setup video source (HLS or direct)
  useEffect(() => {
    const video = videoRef.current
    if (!video || !primarySource) return

    // cleanup
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    setReady(false)
    setShowSettings(false)
    setQualityMode('auto')
    setQualityValue('auto')
    setAvailableQualities([{ key: 'auto', label: 'Auto' }])

    const isHls = primarySource.kind.toLowerCase() === 'hls' || primarySource.url.endsWith('.m3u8')

    if (isHls) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = primarySource.url
      } else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        })
        hlsRef.current = hls
        hls.loadSource(primarySource.url)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const levels = hls.levels
          const uniq = dedupeByKey(levels.map((lvl, idx) => {
            const h = lvl.height || 0
            const w = lvl.width || 0
            const label = h ? `${h}p` : (w ? `${w}w` : `Level ${idx}`)
            return { key: `hls:${idx}`, label, hlsLevel: idx }
          }))
          setAvailableQualities([{ key: 'auto', label: 'Auto' }, ...sortQualities(uniq)])
        })
      } else {
        // last resort
        video.src = primarySource.url
      }
    } else {
      // Multiple MP4 qualities (if provided)
      const mp4s = props.sources
        .filter((s) => s.kind.toLowerCase() !== 'hls')
        .map((s) => ({ key: `src:${s.id}`, label: s.label, srcId: s.id }))

      setAvailableQualities([{ key: 'auto', label: props.sources[0].label || 'Default', srcId: props.sources[0].id }, ...mp4s])
      video.src = primarySource.url
    }

    const onLoaded = () => {
      setDuration(video.duration || 0)
      setReady(true)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
    }
  }, [primarySource, props.sources])

  // Initial seek to stored progress
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const trySeek = () => {
      if (hasSeekedRef.current) return
      if (!isFinite(v.duration) || v.duration <= 0) return

      let target: number | null = props.initialPositionSec

      if (target == null) {
        try {
          const local = localStorage.getItem(`cv:progress:${props.episodeId}`)
          if (local) target = Number(local)
        } catch {}
      }

      if (target != null && target > 1 && target < v.duration - 1) {
        v.currentTime = target
      }
      hasSeekedRef.current = true
    }

    v.addEventListener('loadedmetadata', trySeek)
    return () => v.removeEventListener('loadedmetadata', trySeek)
  }, [props.episodeId, props.initialPositionSec])

  // UI hide timer
  useEffect(() => {
    if (!showUI) return
    const t = window.setTimeout(() => {
      if (playing) setShowUI(false)
    }, 2500)
    return () => window.clearTimeout(t)
  }, [showUI, playing])

  const pingUI = useCallback(() => {
    setShowUI(true)
  }, [])

  // Progress + buffering updates
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onTime = () => {
      const t = v.currentTime || 0
      setCurrent(t)
      setDuration(v.duration || 0)

      const end = getBufferedEnd(v)
      setBufferedEnd(end)

      // subtitles
      if (subtitleCues.length) {
        const cue = findCue(subtitleCues, t)
        setActiveSubtitle(cue ? cue.text : '')
      } else {
        setActiveSubtitle('')
      }

      // Save progress
      maybeSaveProgress(t, v.duration || undefined)
    }

    v.addEventListener('timeupdate', onTime)
    v.addEventListener('progress', onTime)

    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('progress', onTime)
    }
  }, [subtitleCues, props.isAuthed])

  const maybeSaveProgress = useCallback(
    async (pos: number, dur?: number) => {
      const now = Date.now()
      if (now - lastSaveAtRef.current < 15000) return
      lastSaveAtRef.current = now

      const safePos = Math.max(0, Math.floor(pos))
      if (safePos < 1) return

      if (props.isAuthed) {
        try {
          await fetch('/api/progress', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ episodeId: props.episodeId, positionSec: safePos, durationSec: dur ? Math.floor(dur) : null }),
          })
        } catch {
          // ignore
        }
      } else {
        try {
          localStorage.setItem(`cv:progress:${props.episodeId}`, String(safePos))
        } catch {}
      }
    },
    [props.episodeId, props.isAuthed]
  )

  // Save on unload/pause
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const flush = () => {
      void maybeSaveProgress(v.currentTime || 0, v.duration || undefined)
    }

    window.addEventListener('beforeunload', flush)
    v.addEventListener('pause', flush)

    return () => {
      window.removeEventListener('beforeunload', flush)
      v.removeEventListener('pause', flush)
    }
  }, [maybeSaveProgress])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement | null)?.isContentEditable) return

      const v = videoRef.current
      if (!v) return

      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      }
      if (e.key === 'ArrowRight') {
        v.currentTime = Math.min(v.duration || Infinity, (v.currentTime || 0) + 5)
      }
      if (e.key === 'ArrowLeft') {
        v.currentTime = Math.max(0, (v.currentTime || 0) - 5)
      }
      if (e.key.toLowerCase() === 'f') {
        toggleFullscreen()
      }
      if (e.key.toLowerCase() === 'm') {
        setMuted((x) => !x)
      }
      if (e.key.toLowerCase() === 'c') {
        setSubtitleId((cur) => (cur === 'off' ? (props.subtitles[0]?.id ?? 'off') : 'off'))
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props.subtitles])

  // Load subtitles
  useEffect(() => {
    try {
      localStorage.setItem('cv:subtitle', subtitleId)
      localStorage.setItem('cv:subSize', String(subSize))
      localStorage.setItem('cv:subOffset', String(subOffset))
    } catch {}
  }, [subtitleId, subSize, subOffset])

  useEffect(() => {
    if (subtitleId === 'off') {
      setSubtitleCues([])
      return
    }

    const track = props.subtitles.find((s) => s.id === subtitleId)
    if (!track) {
      setSubtitleCues([])
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(track.url)
        const text = await res.text()
        const cues = parseVtt(text)
        if (!cancelled) setSubtitleCues(cues)
      } catch {
        if (!cancelled) setSubtitleCues([])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [subtitleId, props.subtitles])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {})
    } else {
      await el.requestFullscreen().catch(() => {})
    }
  }, [])

  const onSeek = useCallback((value: number) => {
    const v = videoRef.current
    if (!v || !isFinite(v.duration)) return
    v.currentTime = clamp(value, 0, v.duration)
  }, [])

  const onSelectQuality = useCallback((key: string) => {
    setQualityValue(key)

    const v = videoRef.current
    if (!v) return

    // HLS
    if (key === 'auto' && hlsRef.current) {
      hlsRef.current.currentLevel = -1
      setQualityMode('auto')
      return
    }
    if (key.startsWith('hls:') && hlsRef.current) {
      const lvl = Number(key.split(':')[1])
      if (Number.isFinite(lvl)) {
        hlsRef.current.currentLevel = lvl
        setQualityMode('manual')
      }
      return
    }

    // Direct sources
    if (key.startsWith('src:')) {
      const srcId = key.split(':')[1]
      const s = props.sources.find((x) => x.id === srcId)
      if (!s) return
      const t = v.currentTime || 0
      const wasPaused = v.paused
      v.src = s.url
      v.load()
      v.currentTime = t
      if (!wasPaused) void v.play()
      setQualityMode('manual')
    }
  }, [props.sources])

  const rateOptions = [0.5, 1, 1.5, 2]

  return (
    <div
      ref={containerRef}
      onMouseMove={pingUI}
      onClick={() => {
        // click on empty area toggles play
      }}
      className="relative overflow-hidden rounded-3xl border border-stroke bg-black"
    >
      <video
        ref={videoRef}
        className="h-full w-full aspect-video bg-black"
        playsInline
        onClick={(e) => {
          e.stopPropagation()
          togglePlay()
        }}
      />

      {/* Subtitles overlay */}
      {activeSubtitle && subtitleId !== 'off' ? (
        <div
          className="pointer-events-none absolute left-0 right-0 px-4 text-center"
          style={{ bottom: `${subOffset}vh` }}
        >
          <div
            className="inline-block rounded-xl bg-black/60 px-3 py-2 leading-snug text-white"
            style={{ fontSize: `${subSize}px` }}
          >
            {activeSubtitle}
          </div>
        </div>
      ) : null}

      {/* Gradient for UI */}
      <div className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent transition-opacity',
        showUI ? 'opacity-100' : 'opacity-0'
      )} />

      {/* Controls */}
      <div className={cn(
        'absolute inset-x-0 bottom-0 p-4 transition-opacity',
        showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}>
        {/* Progress bar */}
        <div className="mb-3">
          <div className="relative h-2 w-full rounded-full bg-white/20">
            <div
              className="absolute left-0 top-0 h-2 rounded-full bg-white/40"
              style={{ width: duration ? `${(bufferedEnd / duration) * 100}%` : '0%' }}
            />
            <div
              className="absolute left-0 top-0 h-2 rounded-full bg-white"
              style={{ width: duration ? `${(current / duration) * 100}%` : '0%' }}
            />
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={current}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="absolute inset-0 h-2 w-full cursor-pointer opacity-0"
              aria-label="seek"
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-white/70">
            <span>{fmt(current)} / {fmt(duration)}</span>
            {!ready ? <span>Loading…</span> : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              {playing ? 'إيقاف' : 'تشغيل'}
            </button>

            <button
              onClick={() => setMuted((m) => !m)}
              className="rounded-xl border border-stroke px-3 py-2 text-sm hover:bg-white/5"
            >
              {muted ? '🔇' : '🔊'}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value)
                setVolume(v)
                setMuted(v === 0)
              }}
              className="w-24"
              aria-label="volume"
            />

            <button
              onClick={() => setSubtitleId((cur) => (cur === 'off' ? (props.subtitles[0]?.id ?? 'off') : 'off'))}
              className="rounded-xl border border-stroke px-3 py-2 text-sm hover:bg-white/5"
            >
              CC
            </button>

            <button
              onClick={() => setShowSettings((s) => !s)}
              className="rounded-xl border border-stroke px-3 py-2 text-sm hover:bg-white/5"
            >
              ⚙
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="rounded-xl border border-stroke px-3 py-2 text-sm hover:bg-white/5"
            >
              ⛶
            </button>
          </div>
        </div>

        {showSettings ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-stroke bg-panel p-4">
            <div className="grid gap-2">
              <div className="text-xs font-semibold text-white/80">الجودة</div>
              <div className="flex flex-wrap gap-2">
                {availableQualities.map((q) => (
                  <button
                    key={q.key}
                    onClick={() => onSelectQuality(q.key)}
                    className={cn(
                      'rounded-xl border border-stroke px-3 py-2 text-xs hover:bg-white/5',
                      qualityValue === q.key ? 'bg-white text-black border-white' : ''
                    )}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-white/60">
                HLS: المشغل يقرأ الجودات من ملف Master تلقائيًا. MP4: تحتاج رفع مصادر منفصلة لكل جودة.
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-semibold text-white/80">سرعة التشغيل</div>
              <div className="flex flex-wrap gap-2">
                {rateOptions.map((r) => (
                  <button
                    key={r}
                    onClick={() => setPlaybackRate(r)}
                    className={cn(
                      'rounded-xl border border-stroke px-3 py-2 text-xs hover:bg-white/5',
                      playbackRate === r ? 'bg-white text-black border-white' : ''
                    )}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-semibold text-white/80">الترجمة</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSubtitleId('off')}
                  className={cn(
                    'rounded-xl border border-stroke px-3 py-2 text-xs hover:bg-white/5',
                    subtitleId === 'off' ? 'bg-white text-black border-white' : ''
                  )}
                >
                  Off
                </button>
                {props.subtitles.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSubtitleId(s.id)}
                    className={cn(
                      'rounded-xl border border-stroke px-3 py-2 text-xs hover:bg-white/5',
                      subtitleId === s.id ? 'bg-white text-black border-white' : ''
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-[11px] text-white/70">
                  حجم الترجمة: {subSize}px
                  <input
                    type="range"
                    min={14}
                    max={60}
                    step={1}
                    value={subSize}
                    onChange={(e) => setSubSize(Number(e.target.value))}
                  />
                </label>
                <label className="grid gap-1 text-[11px] text-white/70">
                  موضع الترجمة (من الأسفل): {subOffset}vh
                  <input
                    type="range"
                    min={0}
                    max={25}
                    step={1}
                    value={subOffset}
                    onChange={(e) => setSubOffset(Number(e.target.value))}
                  />
                </label>
              </div>
            </div>

            <div className="text-[11px] text-white/60">
              حفظ التقدم: {props.isAuthed ? 'على حسابك' : 'محليًا على جهازك'}.
            </div>
          </div>
        ) : null}
      </div>

      {/* Tap hint */}
      {!showUI ? (
        <button
          onClick={() => setShowUI(true)}
          className="absolute inset-0"
          aria-label="show controls"
        />
      ) : null}
    </div>
  )
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function fmt(sec: number) {
  if (!isFinite(sec)) return '0:00'
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
  return `${m}:${String(r).padStart(2, '0')}`
}

function getBufferedEnd(video: HTMLVideoElement) {
  try {
    const b = video.buffered
    if (!b || b.length === 0) return 0
    // use the range that contains currentTime, else last
    const t = video.currentTime
    for (let i = 0; i < b.length; i++) {
      if (b.start(i) <= t && t <= b.end(i)) return b.end(i)
    }
    return b.end(b.length - 1)
  } catch {
    return 0
  }
}

function sortQualities(items: { key: string; label: string; hlsLevel?: number }[]) {
  return [...items].sort((a, b) => {
    const ah = parseInt(a.label.replace(/\D/g, ''), 10) || 0
    const bh = parseInt(b.label.replace(/\D/g, ''), 10) || 0
    return bh - ah
  })
}

function dedupeByKey<T extends { key: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const it of items) {
    if (seen.has(it.key)) continue
    seen.add(it.key)
    out.push(it)
  }
  return out
}

function parseVtt(vttText: string): Cue[] {
  const lines = vttText
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trimEnd())

  const cues: Cue[] = []
  let i = 0
  // skip header
  if (lines[0]?.startsWith('WEBVTT')) i++

  while (i < lines.length) {
    // skip empty
    while (i < lines.length && lines[i] === '') i++
    if (i >= lines.length) break

    // optional cue identifier
    if (!lines[i].includes('-->') && lines[i + 1]?.includes('-->')) i++

    const timeLine = lines[i]
    if (!timeLine || !timeLine.includes('-->')) {
      i++
      continue
    }

    const [a, b] = timeLine.split('-->').map((s) => s.trim())
    const start = parseTime(a)
    const end = parseTime(b.split(' ')[0])
    i++

    const textLines: string[] = []
    while (i < lines.length && lines[i] !== '') {
      textLines.push(lines[i])
      i++
    }

    const text = textLines.join('\n')
    if (isFinite(start) && isFinite(end) && end > start && text) cues.push({ start, end, text })
  }

  return cues
}

function parseTime(s: string) {
  // 00:00:00.000 or 00:00.000
  const clean = s.trim().replace(/\s.*/, '')
  const parts = clean.split(':')
  if (parts.length === 3) {
    const h = Number(parts[0])
    const m = Number(parts[1])
    const sec = Number(parts[2])
    if ([h, m, sec].some((x) => !isFinite(x))) return NaN
    return h * 3600 + m * 60 + sec
  }
  if (parts.length === 2) {
    const m = Number(parts[0])
    const sec = Number(parts[1])
    if ([m, sec].some((x) => !isFinite(x))) return NaN
    return m * 60 + sec
  }
  return NaN
}

function findCue(cues: Cue[], t: number): Cue | null {
  // binary search
  let lo = 0
  let hi = cues.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const c = cues[mid]
    if (t < c.start) hi = mid - 1
    else if (t > c.end) lo = mid + 1
    else return c
  }
  // might still be close; linear neighborhood
  for (let i = Math.max(0, lo - 2); i < Math.min(cues.length, lo + 2); i++) {
    const c = cues[i]
    if (t >= c.start && t <= c.end) return c
  }
  return null
}
