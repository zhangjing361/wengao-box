# Wengao Box

A Chinese-first, client-side **Markdown to editable Word (.docx)** converter.

Paste Markdown → preview → choose a template → download. No account, model API key or document upload. This is a web tool, not an AI writing service or a required agent skill.

[中文说明](README.md) · [Real screenshot](docs/screenshots/desktop.png) · [Sample DOCX](examples/普通文档示例.docx)

## Run

Node.js 22.12+ (24 recommended).

```bash
npm ci
npm run dev
npm test
npm run build
```

The `dist/` directory is a static site. Serve it over HTTP(S), not `file://`. Deployment is manual and no remote repository is preconfigured.

Supports headings, emphasis, three-level lists, pipe tables, quotes and code. Two A4 presets are available. Images are retained as descriptions, links as plain text, HTML as inert text. Math is not converted to Word equations. Preview is not exact Word pagination. System fonts are not embedded.

Content stays in page memory. No persistent autosave, telemetry or runtime CDN. Loading the site still makes ordinary hosting requests. Conversion works offline after initial load, not necessarily after a reload. Limits: 100,000 UTF-16 code units, 500 blocks, 30 table columns and 200 rows including the header. Unsupported features and validation details are documented in the Chinese README.

MIT. Third-party license texts are included in `public/third-party-licenses.txt`. Local tests do not imply all Word/WPS versions have been verified. See `docs/QA.md` for actual results.
