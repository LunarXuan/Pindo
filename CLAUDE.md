# Project Notes

## Commands

```bash
npm run dev
npm run build
npm test
```

The app is built as a static export. The local launcher serves the generated `out/` directory with `server.mjs`.

## Structure

- `app/page.tsx` — Main workspace, mode switching, generation and recognition flows
- `app/focus/page.tsx` — Guided assembly view
- `components/` — Upload, parameter, preview, usage, and export UI
- `lib/engine/` — Image loading, downscaling, matching, cleanup, and chart recognition
- `lib/export/` — PNG chart rendering and download helpers
- `lib/data/palettes/` — Brand palette data

## Notes

- Image processing runs in the browser with Canvas and typed arrays.
- Static export means no API routes or server-side dynamic data.
- Keep build output reproducible with `npm run build`.
