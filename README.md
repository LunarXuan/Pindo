**English** | [简体中文](README.zh-CN.md)

# Pindo — Fuse Bead Pattern Generator

Pindo is a local-first tool for turning photos, illustrations, and pixel art into numbered fuse-bead patterns. It can also recognize existing unlabeled bead charts and add grid, color-code, and usage information.

All image processing runs in the browser. Pindo does not upload source images to an application server.

[Try Pindo online](https://pindo.vercel.app)

## Features

- **Image to pattern** — Convert photos, illustrations, or pixel art into bead charts.
- **Pattern recognition** — Recognize unlabeled charts with or without a visible grid.
- **Color-code highlighting** — Inspect and highlight individual bead colors in a chart.
- **Eight brand palettes** — MARD, Hama, Perler, Artkal S, COCO, Manman, Panpan, and Mixiaowo.
- **Flexible rendering** — Choose a creative mode, dithering strategy, palette limit, and image adjustments.
- **Palette filters** — Include or exclude color series and individual color codes.
- **Bead-based sizing** — Set width and height in beads and optionally lock the aspect ratio.
- **Usage statistics** — View the required color codes and bead quantities.
- **PNG export** — Save a chart with its grid, color codes, and usage legend.
- **Bilingual UI** — Simplified Chinese and English.
- **Local and portable** — Static web build, PWA assets, Windows launcher, and a Capacitor Android path.

## Privacy model

Uploaded images are decoded and processed with browser Canvas APIs and typed arrays. The application has no image-upload API or application backend. When self-hosting, the selected static host still serves the application assets as usual.

## Quick start

### Windows launcher

Clone or download the repository, then double-click `启动 Pindo.cmd`. On the first launch, the script installs locked dependencies, builds the static application, and opens the local server.

### Development server

```powershell
npm ci
npm run dev
```

Open <http://localhost:3000>.

### Production-like local build

```powershell
npm ci
npm run build
node server.mjs --open
```

The static export is generated in `out/` and served only on `127.0.0.1` by default.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Build the static export in `out/` |
| `npm test` | Run the Vitest test suite |
| `npm run lint` | Run ESLint |
| `npm run android:sync` | Build and sync web assets to Capacitor Android |
| `npm run android:open` | Open the Android project in Android Studio |

## Android packaging

Capacitor configuration is included with application ID `com.pindo.app` and web directory `out`. Generate the Android project locally on first use, then sync and open it:

```powershell
npm run android:add
npm run android:sync
npm run android:open
```

See [ANDROID.md](ANDROID.md) for details. Android signing keys such as `pindo-release.jks` are sensitive and must not be committed.

## Technology

- Next.js 16 static export, React 19, and TypeScript
- Tailwind CSS 4 and shadcn/ui
- Browser Canvas and typed arrays for image processing
- Vitest for algorithm tests
- Capacitor 8 for the Android packaging path
- jsPDF and Canvas-based export modules

## Project structure

```text
├── app/                  # Main workspace and focus-mode pages
├── components/           # Upload, parameters, preview, usage, and export UI
├── lib/
│   ├── engine/           # Scaling, matching, cleanup, and chart recognition
│   ├── export/           # PNG and PDF export modules
│   ├── data/palettes/    # Compiled brand palette data
│   ├── i18n/             # Chinese and English UI strings
│   └── native/           # Native bridge definitions
├── public/               # PWA manifest, service worker, icons, and static assets
├── scripts/              # Palette and icon generation scripts
└── server.mjs            # Dependency-free local static server
```

## Contributing

Issues and pull requests are welcome. For behavior changes, include or update relevant tests and verify the static build. Treat changes to dependencies, launch scripts, local file serving, and native bridges as security-sensitive.
