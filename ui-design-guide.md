# UI Design Guide — Video Downloader Web App
### Stack: React + Tailwind CSS + Animated UI (Frontend Only)

> **For AI Agents:** Follow this guide strictly when generating component code. Every section contains design decisions, animation specs, and Tailwind class conventions the agent must respect. Do not deviate from the visual language defined here unless explicitly overridden by the user.
>
> **Scope:** This guide covers the **frontend only**. Do not generate backend code, API routes, server logic, database schemas, or deployment config. All data fetching is done via placeholder functions that the developer will replace with real API calls. Mark every such placeholder clearly with a `// TODO: replace with real API call` comment.

---

## 1. Project Overview

Build a **modern, dark-themed video downloader web app** that feels fast, fluid, and trustworthy. The UI should communicate progress clearly, delight users with subtle motion, and stay accessible across desktop and mobile.

**Frontend responsibilities (in scope):**
- URL input with paste detection and validation
- Platform auto-detection from URL (YouTube, TikTok, Instagram, Twitter/X, etc.)
- Format & quality selector (MP4 720p / 1080p / 4K, MP3, etc.)
- Download progress display (driven by data passed in from outside)
- Download history list (local state only)
- Settings panel (theme toggle, preferred format)

**Out of scope — do NOT generate:**
- API route handlers or server code
- Authentication / session logic
- File system access or storage
- Database queries or ORM models
- Any Node.js / Python / server-side code

**API boundary rule:** Every place the UI needs real data, create a clearly named async stub function at the top of its hook file, marked `// TODO`, that returns plausible mock data after a short `setTimeout`. The rest of the component code should work against that stub as if it were real.

---

## 2. Design Tokens (Tailwind Config Extension)

Add these to `tailwind.config.js` under `theme.extend`:

```js
colors: {
  brand: {
    50:  '#f0f9ff',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
  },
  surface: {
    900: '#0a0a0f',   // page background
    800: '#111118',   // card background
    700: '#1a1a24',   // elevated card / modal
    600: '#24242f',   // input background
    500: '#2e2e3d',   // hover state
  },
  accent: {
    green:  '#22d3a4',
    yellow: '#fbbf24',
    red:    '#f43f5e',
    purple: '#a855f7',
  },
},
keyframes: {
  'fade-up': {
    '0%':   { opacity: '0', transform: 'translateY(16px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  'fade-in': {
    '0%':   { opacity: '0' },
    '100%': { opacity: '1' },
  },
  'fade-out': {
    '0%':   { opacity: '1' },
    '100%': { opacity: '0' },
  },
  'pulse-ring': {
    '0%, 100%': { boxShadow: '0 0 0 0 rgba(14,165,233,0.4)' },
    '50%':      { boxShadow: '0 0 0 8px rgba(14,165,233,0)' },
  },
  'shimmer': {
    '0%':   { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition:  '200% 0' },
  },
  'spin-slow': {
    '0%':   { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
  'progress-glow': {
    '0%, 100%': { opacity: '0.6' },
    '50%':      { opacity: '1' },
  },
  'bounce-in': {
    '0%':   { transform: 'scale(0.85)', opacity: '0' },
    '60%':  { transform: 'scale(1.05)', opacity: '1' },
    '100%': { transform: 'scale(1)' },
  },
  'slide-down': {
    '0%':   { transform: 'translateY(-10px)', opacity: '0' },
    '100%': { transform: 'translateY(0)',     opacity: '1' },
  },
  'wiggle': {
    '0%, 100%': { transform: 'translateX(0)' },
    '20%':      { transform: 'translateX(-6px)' },
    '40%':      { transform: 'translateX(6px)' },
    '60%':      { transform: 'translateX(-4px)' },
    '80%':      { transform: 'translateX(4px)' },
  },
  'slideInRight': {
    '0%':   { transform: 'translateX(100%)' },
    '100%': { transform: 'translateX(0)' },
  },
  'slideOutRight': {
    '0%':   { transform: 'translateX(0)' },
    '100%': { transform: 'translateX(100%)' },
  },
},
animation: {
  'fade-up':       'fade-up 0.4s ease-out both',
  'fade-in':       'fade-in 0.3s ease-out both',
  'fade-out':      'fade-out 0.3s ease-in both',
  'pulse-ring':    'pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite',
  'shimmer':       'shimmer 1.8s linear infinite',
  'spin-slow':     'spin-slow 3s linear infinite',
  'progress-glow': 'progress-glow 1.5s ease-in-out infinite',
  'bounce-in':     'bounce-in 0.45s cubic-bezier(0.175,0.885,0.32,1.275) both',
  'slide-down':    'slide-down 0.3s ease-out both',
  'wiggle':        'wiggle 0.35s ease-in-out both',
  'slideInRight':  'slideInRight 0.35s cubic-bezier(0.32,0.72,0,1) both',
  'slideOutRight': 'slideOutRight 0.3s cubic-bezier(0.32,0.72,0,1) both',
},
```

---

## 3. Typography

| Role            | Tailwind Classes                                    |
|-----------------|-----------------------------------------------------|
| Page title      | `text-3xl font-bold tracking-tight text-white`      |
| Section heading | `text-lg font-semibold text-white`                  |
| Body            | `text-sm text-slate-300`                            |
| Caption / meta  | `text-xs text-slate-500`                            |
| Code / URL      | `font-mono text-sm text-brand-400`                  |

**Font:** Import `Inter` (primary) + `JetBrains Mono` (monospace) via Google Fonts or a local font loader.

---

## 4. Layout

```
+----------------------------------------------------------+
|  Navbar (sticky, glassmorphism)                          |
+----------------------------------------------------------+
|                                                          |
|   Hero / URL Input Section       (max-w-3xl, centered)  |
|                                                          |
|   Platform Badge + Video Preview Card                   |
|                                                          |
|   Format & Quality Selector                             |
|                                                          |
|   Download Progress Bar                                  |
|                                                          |
|   Download History List                                  |
|                                                          |
+----------------------------------------------------------+
|  Footer                                                  |
+----------------------------------------------------------+
```

- **Container:** `max-w-5xl mx-auto px-4 sm:px-6 lg:px-8`
- **Section spacing:** `py-10 space-y-6`
- **Page background:** `bg-surface-900 min-h-screen`

---

## 5. Components

### 5.1 Navbar

```jsx
// Glassmorphism sticky navbar
<nav className="sticky top-0 z-50 backdrop-blur-md bg-surface-900/70 border-b border-white/5 px-6 py-3 flex items-center justify-between">
  <Logo />
  <ThemeToggle />
</nav>
```

- Use `backdrop-blur-md` + semi-transparent background for glass effect.
- Logo: gradient text `bg-gradient-to-r from-brand-400 to-accent-purple bg-clip-text text-transparent`

---

### 5.2 URL Input Bar ⭐ (Primary interaction)

```jsx
<div className="relative group animate-fade-up">
  <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-accent-purple rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
  <div className="relative flex items-center bg-surface-600 rounded-2xl px-4 py-3 gap-3">
    <LinkIcon className="text-slate-400 shrink-0" />
    <input
      placeholder="Paste video URL here..."
      className="flex-1 bg-transparent outline-none text-white placeholder:text-slate-500 font-mono text-sm"
    />
    <PasteButton />
    <FetchButton />  {/* triggers onFetch() prop — does NOT call an API itself */}
  </div>
</div>
```

**Behaviour animations:**
- On focus → outer glow opacity increases (`transition-opacity duration-300`)
- On paste detection → input briefly glows `ring-2 ring-brand-400/60` + `animate-pulse-ring`
- Clear button fades in when input has content (`animate-fade-in`)

**FetchButton / Download button states:**

| State      | Classes                                                      |
|------------|--------------------------------------------------------------|
| Idle       | `bg-brand-500 hover:bg-brand-600 text-white rounded-xl px-5 py-2 font-semibold transition-all duration-200 hover:scale-105 active:scale-95` |
| Loading    | `bg-brand-700 cursor-wait` + spinner icon `animate-spin`     |
| Success    | `bg-accent-green` + checkmark icon `animate-bounce-in`       |
| Error      | `bg-accent-red` + `animate-wiggle`                           |

**Platform detection** is done purely client-side via regex on the URL string — no network call:

```ts
// src/hooks/usePlatformDetect.ts
function detectPlatform(url: string): Platform {
  if (/youtube\.com|youtu\.be/i.test(url))  return 'youtube'
  if (/tiktok\.com/i.test(url))             return 'tiktok'
  if (/instagram\.com/i.test(url))          return 'instagram'
  if (/twitter\.com|x\.com/i.test(url))     return 'twitter'
  if (/facebook\.com|fb\.com/i.test(url))   return 'facebook'
  if (url.startsWith('http'))               return 'other'
  return null
}
```

---

### 5.3 Platform Badge

Auto-detected platform displayed below the input:

```jsx
<div className="flex items-center gap-2 animate-slide-down">
  <PlatformIcon className="w-5 h-5" />
  <span className="text-sm font-medium text-slate-300">YouTube detected</span>
  <span className="text-xs text-accent-green bg-accent-green/10 px-2 py-0.5 rounded-full">Supported</span>
</div>
```

Platform icon colors:
- YouTube → `text-red-500`
- TikTok → `text-[#69C9D0]`
- Instagram → `text-pink-500`
- Twitter/X → `text-slate-200`
- Facebook → `text-blue-500`

---

### 5.4 Video Preview Card

```jsx
<div className="bg-surface-800 rounded-2xl overflow-hidden border border-white/5 animate-fade-up shadow-xl">
  {/* Thumbnail */}
  <div className="relative aspect-video bg-surface-700">
    <img src={thumbnail} className="w-full h-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
    <DurationBadge className="absolute bottom-2 right-2" />
  </div>
  {/* Meta */}
  <div className="p-4 space-y-1">
    <h3 className="text-white font-semibold text-sm line-clamp-2">{title}</h3>
    <p className="text-xs text-slate-500">{channel} · {views} views</p>
  </div>
</div>
```

**Skeleton loading state** (shown while `metaLoading === true`):
```jsx
<div
  className="rounded-2xl h-48 bg-gradient-to-r from-surface-700 via-surface-600 to-surface-700 animate-shimmer"
  style={{ backgroundSize: '200% 100%' }}
/>
```

**Data shape the component expects (props — filled by parent from API stub):**
```ts
interface VideoMeta {
  title:     string
  channel:   string
  views:     string   // formatted, e.g. "1.2M"
  duration:  string   // formatted, e.g. "10:34"
  thumbnail: string   // absolute URL
}
```

---

### 5.5 Format & Quality Selector

Use a **pill tab group** with an animated sliding indicator:

```jsx
<div className="relative flex bg-surface-700 rounded-xl p-1 gap-1">
  {/* Animated active pill — position driven by useLayoutEffect measuring tab elements */}
  <div
    className="absolute top-1 bottom-1 bg-brand-500 rounded-lg transition-all duration-300 ease-out"
    style={{ left: activeLeft, width: activeWidth }}
  />
  {options.map(opt => (
    <button
      key={opt.value}
      className="relative z-10 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200
                 data-[active=true]:text-white data-[active=false]:text-slate-400 hover:text-white"
    >
      {opt.label}
    </button>
  ))}
</div>
```

Quality options grid:

```jsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
  {qualities.map(q => (
    <button className="group bg-surface-700 hover:bg-surface-500 border border-white/5
                       hover:border-brand-500/50 rounded-xl p-3 text-center
                       transition-all duration-200 hover:scale-105 active:scale-95">
      <p className="text-white font-bold">{q.label}</p>
      <p className="text-xs text-slate-500 group-hover:text-brand-400 transition-colors">{q.size}</p>
    </button>
  ))}
</div>
```

The selected format and quality are lifted to the parent via `onFormatChange` / `onQualityChange` props. No network calls inside this component.

---

### 5.6 Download Progress Bar ⭐

This component is **display-only** — it renders whatever state is passed in as props. It does not start, pause, or cancel downloads itself.

```jsx
// Props shape
interface DownloadState {
  status:  'idle' | 'downloading' | 'completed' | 'error' | 'paused'
  percent: number      // 0–100
  speed:   string      // e.g. "2.4 MB/s" — pass empty string when not applicable
  eta:     string      // e.g. "12s" — pass "—" when not applicable
  filename?: string    // shown on completion
}
```

```jsx
<div className="space-y-2 animate-fade-up">
  {/* Header row */}
  <div className="flex justify-between text-xs text-slate-400">
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-brand-400 animate-progress-glow" />
      Downloading...
    </span>
    <span>{percent}%</span>
  </div>

  {/* Track */}
  <div
    role="progressbar"
    aria-valuenow={percent}
    aria-valuemin={0}
    aria-valuemax={100}
    className="h-2 bg-surface-600 rounded-full overflow-hidden"
  >
    <div
      className="h-full bg-gradient-to-r from-brand-500 to-accent-purple rounded-full
                 transition-[width] duration-300 ease-out relative overflow-hidden"
      style={{ width: `${percent}%` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
                      animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
    </div>
  </div>

  {/* Stats row */}
  <div className="flex justify-between text-xs text-slate-500">
    <span>{speed}</span>
    <span>{eta} remaining</span>
  </div>
</div>
```

**Status visual mapping:**

| `status`      | Bar color                                        | Dot color          | Extra                            |
|---------------|--------------------------------------------------|--------------------|----------------------------------|
| `downloading` | `bg-gradient-to-r from-brand-500 to-accent-purple` | `bg-brand-400 animate-progress-glow` | shimmer overlay on bar |
| `completed`   | `bg-accent-green`                                | `bg-accent-green`  | checkmark `animate-bounce-in`    |
| `error`       | `bg-accent-red`                                  | `bg-accent-red`    | bar `animate-wiggle`             |
| `paused`      | `bg-accent-yellow`                               | `bg-accent-yellow` | shimmer removed                  |

---

### 5.7 Download History List

State lives in `useState` in the parent hook — this component only renders and calls `onClear`.

```jsx
<section className="space-y-3">
  <h2 className="text-lg font-semibold text-white">Recent Downloads</h2>
  <div className="space-y-2">
    {history.map((item, i) => (
      <div
        key={item.id}
        className="flex items-center gap-3 bg-surface-800 hover:bg-surface-700
                   rounded-xl p-3 border border-white/5 transition-all duration-200
                   animate-fade-up cursor-pointer group"
        style={{ animationDelay: `${i * 60}ms` }}
      >
        <img src={item.thumbnail} className="w-14 h-10 object-cover rounded-lg shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">{item.title}</p>
          <p className="text-xs text-slate-500">{item.format} · {item.size} · {item.date}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>
    ))}
  </div>
</section>
```

**HistoryItem shape:**
```ts
interface HistoryItem {
  id:        string
  title:     string
  thumbnail: string
  format:    string   // e.g. "MP4"
  quality:   string   // e.g. "1080p"
  size:      string   // e.g. "45 MB"
  date:      string   // formatted date string
  status:    'completed' | 'failed' | 'pending'
}
```

**StatusBadge variants:**

| Status      | Classes                                                    |
|-------------|------------------------------------------------------------|
| `completed` | `text-accent-green bg-accent-green/10 px-2 py-0.5 rounded-full text-xs` |
| `failed`    | `text-accent-red bg-accent-red/10 ...`                     |
| `pending`   | `text-accent-yellow bg-accent-yellow/10 ...`               |

---

### 5.8 Toast Notifications

```jsx
// Container — fixed, accessible
<div aria-live="polite" className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end">
  {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={removeToast} />)}
</div>

// Individual toast
<div className="flex items-center gap-3 bg-surface-700 border border-white/10
                rounded-xl px-4 py-3 shadow-2xl animate-bounce-in
                min-w-[280px] max-w-sm">
  <ToastIcon type={type} />
  <div>
    <p className="text-sm font-medium text-white">{title}</p>
    <p className="text-xs text-slate-400">{message}</p>
  </div>
  <CloseButton className="ml-auto text-slate-500 hover:text-white" />
</div>
```

Auto-dismiss after 4 seconds via `setTimeout` in `useToast` hook. Toast types: `success | error | info | warning`.

---

### 5.9 Settings Panel (Side Drawer)

```jsx
// Overlay
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in" onClick={onClose} />

// Drawer — CSS transition, not keyframe, so it can reverse on close
<aside
  className={`fixed top-0 right-0 h-full w-80 bg-surface-800 border-l border-white/5
              z-50 shadow-2xl p-6 transition-transform duration-300
              ease-[cubic-bezier(0.32,0.72,0,1)]
              ${open ? 'translate-x-0' : 'translate-x-full'}`}
>
  ...
</aside>
```

Settings stored in `useState` locally — no persistence required from this guide. If the developer wants `localStorage`, they add it themselves.

---

## 6. Hook Architecture (Frontend State Only)

```
useDownload(addToast)
│
├── url, setUrl                  // controlled input
├── platform                     // derived from url via detectPlatform()
├── videoMeta / metaLoading      // filled by apiFetchMeta() stub ← TODO
├── format / quality             // user selections
├── downloadState                // filled by apiStartDownload() stub ← TODO
├── history                      // useState array, append on completion
├── handleFetch()                // calls apiFetchMeta stub
├── handleDownload()             // calls apiStartDownload stub
└── clearHistory()
```

**Stub pattern — always use this shape:**
```ts
// ─── REPLACE with real API call ───────────────────────────────────────────
async function apiFetchMeta(url: string): Promise<VideoMeta> {
  // TODO: replace with real API call
  // e.g. const res = await fetch('/api/meta', { method: 'POST', body: JSON.stringify({ url }) })
  //      return res.json()
  await new Promise(r => setTimeout(r, 1200))      // simulate network delay
  return { title: 'Sample Title', channel: 'Channel', views: '1.2M', duration: '10:34', thumbnail: '' }
}
// ──────────────────────────────────────────────────────────────────────────
```

---

## 7. Motion Principles

| Principle          | Rule                                                              |
|--------------------|-------------------------------------------------------------------|
| **Purposeful**     | Every animation communicates state or guides attention            |
| **Snappy**         | Most transitions 200–400ms; nothing over 600ms                    |
| **Easing**         | `ease-out` for entrances, `ease-in` for exits, spring for delight |
| **Stagger**        | List items stagger by 60ms delay increments                       |
| **Reduce motion**  | Wrap all keyframe animations in `@media (prefers-reduced-motion: no-preference)` — fallback to instant |

### Animation Usage Table

| Animation       | When to use                                  |
|-----------------|----------------------------------------------|
| `fade-up`       | Cards / sections entering the viewport       |
| `fade-in`       | Overlays, badges, tooltips                   |
| `bounce-in`     | Success states, modals, toasts               |
| `slide-down`    | Dropdown menus, revealed sub-sections        |
| `shimmer`       | Skeleton loaders, progress bar overlay       |
| `pulse-ring`    | Active input focus ring, live indicator dot  |
| `spin-slow`     | Loading spinner on fetch operations          |
| `progress-glow` | Blinking status dot on active downloads      |
| `wiggle`        | Error state on buttons and progress bar      |

---

## 8. Responsiveness

| Breakpoint | Behaviour                                              |
|------------|--------------------------------------------------------|
| `sm` 640px | Single-column layout; quality grid 2-col               |
| `md` 768px | Video preview side-by-side with format selector        |
| `lg` 1024px| Full sidebar history panel available                   |

- URL input is always full-width.
- History list collapses to icon-only actions on mobile.
- Settings drawer becomes a bottom sheet on small screens.

---

## 9. Accessibility

- All interactive elements have visible `focus-visible:ring-2 focus-visible:ring-brand-400` outlines.
- Color is never the sole indicator — pair color with icon/text.
- Progress bar includes `role="progressbar" aria-valuenow aria-valuemin aria-valuemax`.
- Use `aria-live="polite"` on the toast region.
- Icon-only buttons must have `aria-label`.

---

## 10. File & Folder Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Skeleton.tsx
│   │   └── Toast.tsx
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── SettingsDrawer.tsx
│   └── features/
│       ├── UrlInputBar.tsx
│       ├── VideoPreviewCard.tsx
│       ├── FormatSelector.tsx
│       ├── DownloadProgress.tsx    ← display only, no API calls
│       └── DownloadHistory.tsx     ← display only, no API calls
├── hooks/
│   ├── useDownload.ts              ← contains all TODO stubs
│   ├── usePlatformDetect.ts        ← pure regex, no network
│   └── useToast.ts
└── app/
    └── page.tsx (or App.tsx)
```

---

## 11. Quick-Start Checklist for AI Agent

- [ ] Extend `tailwind.config.js` with all tokens from Section 2
- [ ] Import Inter + JetBrains Mono fonts in `index.css`
- [ ] Set `bg-surface-900` on `<body>` and enable dark mode (`darkMode: 'class'`)
- [ ] Build `UrlInputBar` first — it is the hero component
- [ ] Every data-fetching function must be a clearly marked `// TODO` stub in `useDownload.ts`
- [ ] `DownloadProgress` and `DownloadHistory` are **pure display** components — no fetch/axios/etc. inside
- [ ] `detectPlatform()` is a pure regex function — no network call
- [ ] Apply `animate-fade-up` with staggered delays on each major section
- [ ] Use skeleton loaders (`animate-shimmer`) for all async loading states
- [ ] Implement `@media (prefers-reduced-motion: reduce)` guard in `index.css`
- [ ] Ensure all buttons have `transition-all duration-200 hover:scale-105 active:scale-95`
- [ ] Add `backdrop-blur-md` glass effect to Navbar and modal overlays
- [ ] Test at 375px (iPhone SE), 768px (iPad), 1280px (Desktop)

---

*End of guide. Frontend only. Keep it dark, keep it smooth, keep it brand-blue.*
