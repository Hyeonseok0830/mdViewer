import { basename } from 'node:path';

interface TreeNode {
  name: string;
  path: string;
  absPath: string;
  type: 'file' | 'dir';
  children: TreeNode[];
}

export interface HtmlConfig {
  isDir: boolean;
  files: { name: string; relativePath: string; absolutePath: string }[];
  currentPath: string;
  tree?: TreeNode;
}

export function buildHtml(
  filePath: string,
  initialHtml: string,
  frontmatter?: Record<string, unknown>,
  config?: HtmlConfig,
): string {
  const filename = filePath ? basename(filePath) : '';
  const title = (frontmatter?.title as string | undefined) ?? (filename.replace(/\.md$/i, '') || 'MdPad');
  const configJson = JSON.stringify(config ?? { isDir: false, files: [], currentPath: filePath, tree: null });
  const fmJson = JSON.stringify(frontmatter ?? {});

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)} — MdPad</title>
  <link rel="stylesheet" href="/katex/katex.min.css" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── 테마 변수 ─────────────────────────────── */
    :root {
      --bg:#f5f4f1; --fg:#2c2c2c; --border:#e0dedd; --code-bg:#eae9e5;
      --link:#7c3aed; --hdr-bg:#eae9e5; --hdr-fg:#2c2c2c; --muted:#8a8a8a;
      --th-bg:#eae9e5; --sb-bg:#eae9e5; --sb-width:260px;
      --editor-bg:#fafaf9; --editor-fg:#2c2c2c; --accent:#7c3aed;
      --cn:#7c3aed; --ct:#16a34a; --cw:#b45309; --ci:#9333ea; --cc:#dc2626;
    }
    @media (prefers-color-scheme: dark) { :root {
      --bg:#1e1e2e; --fg:#cdd6f4; --border:#313244; --code-bg:#181825;
      --link:#a78bfa; --hdr-bg:#181825; --hdr-fg:#cdd6f4; --muted:#6c7086;
      --th-bg:#313244; --sb-bg:#181825; --editor-bg:#1e1e2e; --editor-fg:#cdd6f4; --accent:#a78bfa;
      --cn:#89b4fa; --ct:#a6e3a1; --cw:#f9e2af; --ci:#a78bfa; --cc:#f38ba8;
    }}
    html[data-theme="light"] {
      --bg:#f5f4f1; --fg:#2c2c2c; --border:#e0dedd; --code-bg:#eae9e5;
      --link:#7c3aed; --hdr-bg:#eae9e5; --hdr-fg:#2c2c2c; --muted:#8a8a8a;
      --th-bg:#eae9e5; --sb-bg:#eae9e5; --editor-bg:#fafaf9; --editor-fg:#2c2c2c; --accent:#7c3aed;
      --cn:#7c3aed; --ct:#16a34a; --cw:#b45309; --ci:#9333ea; --cc:#dc2626;
    }
    html[data-theme="dark"] {
      --bg:#1e1e2e; --fg:#cdd6f4; --border:#313244; --code-bg:#181825;
      --link:#a78bfa; --hdr-bg:#181825; --hdr-fg:#cdd6f4; --muted:#6c7086;
      --th-bg:#313244; --sb-bg:#181825; --editor-bg:#1e1e2e; --editor-fg:#cdd6f4; --accent:#a78bfa;
      --cn:#89b4fa; --ct:#a6e3a1; --cw:#f9e2af; --ci:#a78bfa; --cc:#f38ba8;
    }

    /* ── Shiki 이중 테마 ──────────────────────── */
    .shiki,.shiki span { color:var(--shiki-light);background-color:var(--shiki-light-bg); }
    @media (prefers-color-scheme:dark) { .shiki,.shiki span { color:var(--shiki-dark)!important;background-color:var(--shiki-dark-bg)!important; } }
    html[data-theme="dark"] .shiki,html[data-theme="dark"] .shiki span { color:var(--shiki-dark)!important;background-color:var(--shiki-dark-bg)!important; }
    html[data-theme="light"] .shiki,html[data-theme="light"] .shiki span { color:var(--shiki-light)!important;background-color:var(--shiki-light-bg)!important; }
    .shiki { border:1px solid var(--border);border-radius:6px;padding:16px;overflow-x:auto;margin:16px 0;
             font-family:'SFMono-Regular',Consolas,monospace;font-size:.875em;line-height:1.6; }

    /* ── 레이아웃 ─────────────────────────────── */
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
           font-size:16px;line-height:1.6;color:var(--fg);background:var(--bg);
           display:flex;flex-direction:column;height:100vh;overflow:hidden; }

    /* ── 헤더 ────────────────────────────────── */
    #header { position:relative;z-index:100;background:var(--hdr-bg);color:var(--hdr-fg);
              padding:0 10px;height:40px;display:flex;align-items:center;gap:6px;
              border-bottom:1px solid var(--border);font-size:13px;flex-shrink:0; }
    .logo { font-size:16px;opacity:.35;flex-shrink:0;line-height:1; }
    #filepath { font-family:'SFMono-Regular',Consolas,monospace;font-size:12px;opacity:.8; }
    #modified-dot { color:#f0883e;display:none;margin-left:2px; }
    #mode-btns { display:flex;gap:1px;margin-left:4px; }
    .mode-btn { background:none;border:none;cursor:pointer;color:var(--hdr-fg);
                opacity:.45;padding:3px 9px;border-radius:5px;font-size:12px;line-height:1; }
    .mode-btn:hover { opacity:.8;background:var(--border); }
    .mode-btn.active { opacity:1;background:var(--border); }
    #save-btn { margin-left:4px;background:var(--accent);border:none;color:#fff;cursor:pointer;
                padding:3px 10px;border-radius:5px;font-size:12px;font-weight:600;display:none; }
    #save-btn:hover { opacity:.85; }
    #search-btn, #graph-btn { background:none;border:none;cursor:pointer;color:var(--hdr-fg);
                               opacity:.5;font-size:14px;padding:4px 6px;border-radius:4px; }
    #search-btn:hover, #graph-btn:hover { opacity:.9;background:var(--border); }
    #theme-btn { background:none;border:none;cursor:pointer;color:var(--hdr-fg);
                 opacity:.5;font-size:14px;padding:4px 6px;border-radius:4px; }
    #theme-btn:hover { opacity:.9;background:var(--border); }

    /* ── 메인 영역 ───────────────────────────── */
    #main { display:flex;flex:1;min-height:0; }

    /* ── 사이드바 ────────────────────────────── */
    #sidebar { width:var(--sb-width);flex-shrink:0;background:var(--sb-bg);
               border-right:1px solid var(--border);display:flex;flex-direction:column;
               overflow:hidden; }
    #sidebar-inner { flex:1;overflow-y:auto;padding:8px 0 24px;scrollbar-width:thin; }
    .sb-section { padding:0; }
    .sb-title { display:block;font-size:10px;font-weight:700;text-transform:uppercase;
                letter-spacing:.07em;color:var(--muted);padding:8px 12px 4px; }
    .sb-divider { border:none;border-top:1px solid var(--border);margin:6px 0; }
    .sb-title-row { display:flex;align-items:center;padding:8px 12px 4px; }
    .sb-title-row .sb-title { padding:0;flex:1; }
    .sb-clear-btn { background:none;border:none;cursor:pointer;color:var(--muted);font-size:14px; }
    #newfile-btn { background:none;border:none;cursor:pointer;color:var(--muted);
                   font-size:16px;line-height:1;padding:0 2px;font-weight:300; }
    #newfile-btn:hover { color:var(--fg); }

    /* 폴더 트리 */
    .tree-list { list-style:none;padding:0; }
    .tree-list ul { list-style:none;padding:0; }
    .tree-dir-label { display:flex;align-items:center;gap:4px;padding:3px 8px 3px 12px;
                      cursor:pointer;color:var(--muted);font-size:12px;user-select:none; }
    .tree-dir-label:hover { background:var(--code-bg); }
    .tree-arrow { font-size:9px;transition:transform .15s;display:inline-block;width:12px; }
    .tree-arrow.open { transform:rotate(90deg); }
    .tree-children { display:none; }
    .tree-children.open { display:block; }
    .tree-file { display:flex;align-items:center; }
    .tree-file a { flex:1;display:flex;align-items:center;gap:4px;padding:3px 8px 3px 12px;
                   color:var(--muted);text-decoration:none;font-size:12px;
                   white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0; }
    .tree-file a:hover { color:var(--fg);background:var(--code-bg); }
    .tree-file a.active { color:var(--accent);font-weight:600;background:var(--code-bg); }
    .bookmark-btn { background:none;border:none;cursor:pointer;color:var(--muted);
                    padding:2px 4px;font-size:12px;opacity:0;flex-shrink:0;transition:opacity .15s; }
    .tree-file:hover .bookmark-btn, .bookmark-btn.bookmarked { opacity:1; }
    .bookmark-btn.bookmarked { color:#d29922; }
    .tree-file.tag-hidden { opacity:.25; }

    /* TOC */
    #toc-list { list-style:none;padding:0; }
    #toc-list li a { display:block;padding:3px 12px;color:var(--muted);text-decoration:none;
                     font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                     border-left:2px solid transparent;transition:color .15s,border-color .15s; }
    #toc-list li a:hover { color:var(--fg); }
    #toc-list li a.active { color:var(--accent);border-left-color:var(--accent); }
    #toc-list li.h3 a { padding-left:20px; }
    #toc-list li.h4 a { padding-left:28px; }

    /* Tags */
    #tags-list { display:flex;flex-wrap:wrap;gap:4px;padding:4px 12px 8px; }
    .tag-pill { display:inline-block;padding:2px 8px;border-radius:12px;
                background:var(--code-bg);border:1px solid var(--border);
                font-size:11px;cursor:pointer;color:var(--muted);transition:all .15s; }
    .tag-pill:hover, .tag-pill.active { background:var(--accent);color:#fff;border-color:var(--accent); }
    .tag-pill .tag-count { opacity:.7;margin-left:2px; }

    /* Backlinks */
    #backlinks-list li a { display:block;padding:3px 8px 3px 12px;color:var(--muted);
                            text-decoration:none;font-size:12px;
                            white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    #backlinks-list li a:hover { color:var(--fg);background:var(--code-bg); }

    /* ── 에디터 패널 ──────────────────────────── */
    #editor-panel { display:none;flex-direction:column;flex:1;min-width:0;
                    border-right:1px solid var(--border); }
    #editor { flex:1;width:100%;background:var(--editor-bg);color:var(--editor-fg);
              border:none;outline:none;resize:none;padding:24px;
              font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;
              font-size:14px;line-height:1.7;tab-size:2; }
    #editor-status { padding:4px 12px;font-size:11px;color:var(--muted);
                     border-top:1px solid var(--border);background:var(--code-bg); }

    /* ── 미리보기 패널 ───────────────────────── */
    #preview-panel { flex:1;min-width:0;overflow-y:auto;padding:32px 24px 120px; }
    #preview-inner { max-width:820px;margin:0 auto; }

    /* Frontmatter 카드 */
    #frontmatter { background:var(--code-bg);border:1px solid var(--border);border-radius:8px;
                   padding:10px 16px;margin-bottom:24px;font-size:12px;color:var(--muted);display:none; }
    #frontmatter dl { display:flex;flex-wrap:wrap;gap:2px 20px; }
    #frontmatter dt { font-weight:600;color:var(--fg); }
    #frontmatter dd { margin:0; }

    /* ── Markdown 콘텐츠 ─────────────────────── */
    #markdown h1,#markdown h2,#markdown h3,#markdown h4 {
      margin:24px 0 16px;font-weight:600;line-height:1.25;scroll-margin-top:60px; }
    #markdown h1 { font-size:2em;border-bottom:1px solid var(--border);padding-bottom:8px; }
    #markdown h2 { font-size:1.5em;border-bottom:1px solid var(--border);padding-bottom:6px; }
    #markdown h3 { font-size:1.25em; }
    #markdown p  { margin:16px 0; }
    #markdown a  { color:var(--link);text-decoration:none; }
    #markdown a:hover { text-decoration:underline; }
    #markdown :not(pre)>code { background:var(--code-bg);border:1px solid var(--border);
      border-radius:4px;padding:2px 6px;font-family:'SFMono-Regular',Consolas,monospace;font-size:.875em; }
    #markdown blockquote { border-left:4px solid var(--border);padding:4px 16px;color:var(--muted);margin:16px 0; }
    #markdown table { border-collapse:collapse;width:100%;margin:16px 0;display:block;overflow-x:auto; }
    #markdown th,#markdown td { border:1px solid var(--border);padding:8px 16px;text-align:left; }
    #markdown th { background:var(--th-bg);font-weight:600; }
    #markdown tr:nth-child(even) td { background:var(--code-bg); }
    #markdown ul,#markdown ol { padding-left:28px;margin:16px 0; }
    #markdown li { margin:4px 0; }
    #markdown img { max-width:100%;border-radius:4px; }
    #markdown hr  { border:none;border-top:1px solid var(--border);margin:24px 0; }
    .mermaid { text-align:center;margin:16px 0;overflow-x:auto; }
    .katex-display { overflow-x:auto;margin:16px 0; }

    /* ── Callout ──────────────────────────────── */
    .callout {
      border-left:4px solid var(--cc-color, var(--border));
      border-radius:0 6px 6px 0;
      padding:10px 16px; margin:16px 0;
      background:color-mix(in srgb, var(--cc-color, var(--border)) 8%, var(--bg));
    }
    .callout-title {
      display:flex; align-items:center; gap:6px;
      font-weight:600; font-size:.9em; margin-bottom:6px;
      color:var(--cc-color, var(--fg));
    }
    .callout-icon { font-size:14px; }
    .callout-note, .callout-info { --cc-color:var(--cn); }
    .callout-tip, .callout-success { --cc-color:var(--ct); }
    .callout-warning, .callout-question, .callout-example { --cc-color:var(--cw); }
    .callout-important { --cc-color:var(--ci); }
    .callout-caution, .callout-bug { --cc-color:var(--cc); }

    /* ── Wiki Link ────────────────────────────── */
    .wiki-link { color:var(--accent);text-decoration:none;border-bottom:1px dashed currentColor;opacity:.85; }
    .wiki-link:hover { opacity:1;border-bottom-style:solid; }

    /* ── Embedded Notes (![[file]]) ───────────── */
    .embed-note {
      border:1px solid var(--border); border-radius:8px;
      padding:12px 16px; margin:12px 0;
      background:var(--code-bg); position:relative;
    }
    .embed-note::before {
      content:''; display:block; position:absolute;
      left:0; top:8px; bottom:8px; width:3px;
      background:var(--accent); border-radius:0 2px 2px 0; opacity:.6;
    }
    .embed-note-title {
      font-size:12px; font-weight:600; color:var(--muted);
      margin-bottom:8px; text-transform:uppercase; letter-spacing:.04em;
    }
    .embed-note-body { font-size:.93em; }
    .embed-note-body h1,.embed-note-body h2,.embed-note-body h3 { font-size:1em; margin:.4em 0; }
    .embed-note-loading { color:var(--muted); font-style:italic; font-size:.9em; }

    /* ── Heading Fold ─────────────────────────── */
    .fold-toggle {
      display:inline-block; cursor:pointer; user-select:none;
      font-size:9px; padding:1px 4px; border-radius:3px;
      color:var(--muted); opacity:0; transition:opacity .15s, transform .2s;
      margin-right:4px; vertical-align:middle;
    }
    #markdown h1:hover .fold-toggle, #markdown h2:hover .fold-toggle,
    #markdown h3:hover .fold-toggle, #markdown h4:hover .fold-toggle { opacity:1; }
    .fold-toggle.folded { transform:rotate(-90deg); }
    .folded-content { display:none !important; }

    /* ── Quick Switcher ───────────────────────── */
    #quick-switcher {
      display:none; position:fixed; inset:0; z-index:2000;
      background:rgba(0,0,0,.55); backdrop-filter:blur(4px);
      align-items:flex-start; justify-content:center; padding-top:80px;
    }
    #quick-switcher.open { display:flex; }
    #qs-box {
      background:var(--hdr-bg); border:1px solid var(--border); border-radius:10px;
      width:min(580px,90vw); overflow:hidden;
      box-shadow:0 20px 60px rgba(0,0,0,.5);
    }
    #qs-input {
      width:100%; background:none; border:none; border-bottom:1px solid var(--border);
      color:var(--hdr-fg); font-size:16px; padding:14px 16px; outline:none;
    }
    #qs-results { max-height:360px; overflow-y:auto; }
    .qs-item {
      padding:9px 16px; cursor:pointer; color:var(--hdr-fg); font-size:13px;
      display:flex; align-items:center; gap:8px; border-left:3px solid transparent;
    }
    .qs-item.selected { background:rgba(255,255,255,.1); border-left-color:var(--accent); }
    .qs-item:hover { background:rgba(255,255,255,.07); }
    .qs-name { flex:1; }
    .qs-path { opacity:.4; font-size:11px; text-align:right; max-width:200px;
               overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    #qs-hint { padding:8px 16px; font-size:11px; color:var(--muted);
               border-top:1px solid var(--border); text-align:center; }

    /* ── Full-text Search ─────────────────────── */
    #search-overlay {
      display:none; position:fixed; inset:0; z-index:2000;
      background:rgba(0,0,0,.55); backdrop-filter:blur(4px);
      align-items:flex-start; justify-content:center; padding-top:80px;
    }
    #search-overlay.open { display:flex; }
    #search-box {
      background:var(--hdr-bg); border:1px solid var(--border); border-radius:10px;
      width:min(620px,90vw); overflow:hidden;
      box-shadow:0 20px 60px rgba(0,0,0,.5);
    }
    #search-header { display:flex; align-items:center; border-bottom:1px solid var(--border); }
    #search-input {
      flex:1; background:none; border:none;
      color:var(--hdr-fg); font-size:16px; padding:14px 16px; outline:none;
    }
    #search-close { background:none; border:none; color:var(--muted); font-size:20px;
                    cursor:pointer; padding:0 16px; }
    #search-results { max-height:400px; overflow-y:auto; }
    .sr-item { padding:10px 16px; cursor:pointer; border-left:3px solid transparent; }
    .sr-item:hover { background:rgba(255,255,255,.07); }
    .sr-item.selected { background:rgba(255,255,255,.1); border-left-color:var(--accent); }
    .sr-name { font-size:13px; color:var(--hdr-fg); font-weight:500; margin-bottom:4px; }
    .sr-snippet { font-size:12px; color:var(--muted); line-height:1.5; }
    .sr-highlight { color:var(--accent); font-weight:600; }
    #search-hint { padding:8px 16px; font-size:11px; color:var(--muted);
                   border-top:1px solid var(--border); text-align:center; }

    /* ── Graph View ───────────────────────────── */
    #graph-overlay {
      display:none; position:fixed; inset:0; z-index:2000;
      background:var(--code-bg); flex-direction:column;
    }
    #graph-overlay.open { display:flex; }
    #graph-header {
      display:flex; align-items:center; padding:10px 16px;
      border-bottom:1px solid var(--border); background:var(--hdr-bg); color:var(--hdr-fg);
      flex-shrink:0; gap:8px;
    }
    #graph-canvas { flex:1; width:100%; cursor:grab; }
    #graph-canvas:active { cursor:grabbing; }
    #graph-hint { padding:6px 16px; font-size:11px; color:var(--muted);
                  text-align:center; border-top:1px solid var(--border);
                  display:flex; justify-content:center; gap:16px; }
    #graph-hint span { opacity:.7; }
    #graph-close { background:none; border:none; color:var(--hdr-fg);
                   font-size:20px; cursor:pointer; padding:4px 8px; margin-left:auto; opacity:.7; }
    #graph-close:hover { opacity:1; }
    #graph-legend { display:flex; gap:12px; font-size:11px; align-items:center; opacity:.7; }
    .gleg { display:inline-flex; align-items:center; gap:4px; }
    .gleg-dot { width:8px; height:8px; border-radius:50%; display:inline-block; }

    /* ── Wiki Preview Popup ──────────────────── */
    #wiki-preview-popup {
      display:none; position:fixed; z-index:3000;
      max-width:380px; max-height:300px; overflow:hidden;
      background:var(--bg); color:var(--fg);
      border:1px solid var(--border); border-radius:8px;
      box-shadow:0 8px 32px rgba(0,0,0,.22), 0 2px 8px rgba(0,0,0,.12);
      pointer-events:none;
    }
    #wiki-preview-popup.visible { display:block; }
    #wiki-preview-popup .wp-title {
      font-weight:700; font-size:13px; padding:10px 14px 6px;
      border-bottom:1px solid var(--border); color:var(--fg);
    }
    #wiki-preview-popup .wp-body {
      padding:8px 14px 12px; font-size:12px; line-height:1.6;
      color:var(--muted); overflow:hidden; max-height:240px;
    }
    #wiki-preview-popup .wp-body p { margin:0 0 6px; }
    #wiki-preview-popup .wp-body h1,
    #wiki-preview-popup .wp-body h2,
    #wiki-preview-popup .wp-body h3 { font-size:12px; margin:0 0 4px; color:var(--fg); }

    /* ── Link Autocomplete ───────────────────── */
    #link-autocomplete {
      display:none; position:fixed; z-index:3000;
      background:var(--bg); border:1px solid var(--border); border-radius:6px;
      box-shadow:0 8px 24px rgba(0,0,0,.18); overflow:hidden;
      min-width:220px; max-width:340px;
    }
    #link-autocomplete.visible { display:block; }
    .lac-item {
      padding:7px 12px; cursor:pointer; font-size:13px;
      color:var(--fg); border-left:3px solid transparent;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .lac-item:hover, .lac-item.active { background:rgba(88,166,255,.12); border-left-color:var(--accent); }

    /* ── Graph Filter Buttons ────────────────── */
    .graph-filter-btn {
      background:none; border:1px solid var(--border); cursor:pointer;
      color:var(--hdr-fg); padding:3px 10px; border-radius:5px;
      font-size:12px; opacity:.65; transition:opacity .15s, background .15s;
    }
    .graph-filter-btn:hover { opacity:1; background:rgba(255,255,255,.1); }
    .graph-filter-btn.active { opacity:1; background:var(--accent); border-color:var(--accent); color:#fff; }

    /* ── New File Modal ───────────────────────── */
    #newfile-modal {
      display:none; position:fixed; inset:0; z-index:2000;
      background:rgba(0,0,0,.55); backdrop-filter:blur(4px);
      align-items:center; justify-content:center;
    }
    #newfile-modal.open { display:flex; }
    #newfile-box {
      background:var(--bg); border:1px solid var(--border); border-radius:10px;
      width:min(400px,90vw); padding:20px;
      box-shadow:0 20px 60px rgba(0,0,0,.4);
    }
    #newfile-name, #newfile-dir {
      width:100%; background:var(--code-bg); border:1px solid var(--border);
      color:var(--fg); padding:8px 10px; border-radius:6px; font-size:13px; outline:none;
    }
    #newfile-name:focus, #newfile-dir:focus { border-color:var(--accent); }
    #newfile-cancel { background:var(--code-bg); border:1px solid var(--border);
                      color:var(--fg); cursor:pointer; padding:7px 14px;
                      border-radius:6px; font-size:13px; }
    #newfile-create { background:var(--accent); border:none; color:#fff; cursor:pointer;
                      padding:7px 14px; border-radius:6px; font-size:13px; font-weight:600; }

    /* ── 하단 상태바 ──────────────────────────── */
    #statusbar {
      background:var(--sb-bg);border-top:1px solid var(--border);
      padding:0 12px;height:22px;display:flex;align-items:center;
      gap:8px;font-size:11px;color:var(--muted);flex-shrink:0;z-index:100;
    }
    #wordcount-badge { font-size:10px;opacity:.8; }
    #status { margin-left:auto;display:flex;align-items:center;gap:4px; }
    .dot { width:6px;height:6px;border-radius:50%;background:#a6e3a1;transition:background .3s; }
    .dot.off { background:#f38ba8; }

    /* ── 컨텍스트 메뉴 ────────────────────────── */
    #ctx-menu {
      display:none;position:fixed;z-index:4000;
      background:var(--bg);border:1px solid var(--border);border-radius:7px;
      box-shadow:0 6px 20px rgba(0,0,0,.18);overflow:hidden;min-width:150px;
    }
    #ctx-menu.visible { display:block; }
    .ctx-item {
      padding:7px 14px;cursor:pointer;font-size:13px;color:var(--fg);
      transition:background .1s;user-select:none;
    }
    .ctx-item:hover { background:var(--code-bg); }
    .ctx-sep { border:none;border-top:1px solid var(--border);margin:3px 0; }
    .ctx-danger { color:var(--cc)!important; }

    /* ── 인쇄 ────────────────────────────────── */
    @media print {
      #header,#sidebar,#editor-panel,#statusbar { display:none!important; }
      #preview-panel { overflow:visible;padding:0; }
      body { overflow:visible;height:auto; }
    }
  </style>
</head>
<body>
  <script>
    (function(){var t=localStorage.getItem('mdv-theme');if(t)document.documentElement.setAttribute('data-theme',t);})();
  </script>

  <div id="header">
    <span class="logo">◈</span>
    <span id="header-sep" style="opacity:.3${filename ? '' : ';display:none'}"> / </span>
    <span id="filepath" style="${filename ? '' : 'display:none'}"><span id="filepath-name">${esc(filename)}</span><span id="modified-dot">●</span></span>
    <div id="mode-btns">
      <button class="mode-btn active" id="btn-view"  title="미리보기 (V)" onclick="setMode('view')">미리보기</button>
      <button class="mode-btn"        id="btn-split" title="분할 편집 (S)" onclick="setMode('split')">분할</button>
      <button class="mode-btn"        id="btn-edit"  title="전체 편집 (E)" onclick="setMode('edit')">편집</button>
    </div>
    <button id="save-btn" title="저장 (Ctrl+S)" onclick="saveFile()">저장</button>
    <button id="search-btn" title="전체 검색 (Ctrl+Shift+F)" onclick="openSearch()">🔍</button>
    <button id="graph-btn" title="그래프 뷰" onclick="openGraph()">◉</button>
    <button id="theme-btn" onclick="toggleTheme()">◑</button>
  </div>

  <div id="main">
    <!-- ── 사이드바 ── -->
    <nav id="sidebar">
      <div id="sidebar-inner">
        <!-- 최근 파일 섹션 -->
        <div id="recent-section" class="sb-section" style="display:none">
          <div class="sb-title-row">
            <span class="sb-title">최근 파일</span>
          </div>
          <ul class="tree-list" id="recent-list"></ul>
          <hr class="sb-divider">
        </div>
        <!-- 즐겨찾기 섹션 -->
        <div id="bookmarks-section" class="sb-section" style="display:none">
          <div class="sb-title-row">
            <span class="sb-title">즐겨찾기</span>
          </div>
          <ul class="tree-list" id="bookmarks-list"></ul>
          <hr class="sb-divider">
        </div>
        <!-- 파일 트리 섹션 -->
        <div id="tree-section" class="sb-section" style="display:none">
          <div class="sb-title-row">
            <span class="sb-title">파일</span>
            <button id="newfile-btn" title="새 파일" onclick="openNewFile()">+</button>
          </div>
          <ul class="tree-list" id="tree-root" role="tree"></ul>
          <hr class="sb-divider">
        </div>
        <!-- 태그 섹션 -->
        <div id="tags-section" class="sb-section" style="display:none">
          <div class="sb-title-row">
            <span class="sb-title">태그</span>
            <button class="sb-clear-btn" id="tags-clear-btn" style="display:none" onclick="clearTagFilter()">×</button>
          </div>
          <div id="tags-list"></div>
          <hr class="sb-divider">
        </div>
        <!-- TOC 섹션 -->
        <div id="toc-section" class="sb-section" style="display:none">
          <span class="sb-title">목차</span>
          <ul id="toc-list" role="list"></ul>
        </div>
        <!-- 백링크 섹션 -->
        <div id="backlinks-section" class="sb-section" style="display:none">
          <hr class="sb-divider">
          <span class="sb-title">이 노트를 참조하는 파일</span>
          <ul class="tree-list" id="backlinks-list"></ul>
        </div>
      </div>
    </nav>

    <!-- ── 에디터 패널 ── -->
    <div id="editor-panel">
      <textarea id="editor" spellcheck="false" placeholder="마크다운을 입력하세요..."></textarea>
      <div id="editor-status">Ctrl+S 저장</div>
    </div>

    <!-- ── 미리보기 패널 ── -->
    <div id="preview-panel">
      <div id="preview-inner">
        <div id="frontmatter">${buildFmHtml(frontmatter)}</div>
        <div id="markdown">${
          initialHtml
            ? initialHtml
            : (config?.isDir
                ? '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;gap:12px;color:var(--muted);text-align:center"><div style="font-size:40px">📂</div><div style="font-size:16px;font-weight:500">왼쪽 파일 목록에서 파일을 선택하세요</div><div style="font-size:13px">클릭하면 바로 열립니다</div></div>'
                : '<p style="color:var(--muted);padding:24px 0">렌더링 중...</p>')
        }</div>
      </div>
    </div>
  </div>

  <!-- ── Quick Switcher ── -->
  <div id="quick-switcher" onclick="if(event.target===this)closeQuickSwitcher()">
    <div id="qs-box">
      <input id="qs-input" placeholder="파일 이름으로 검색..." autocomplete="off">
      <div id="qs-results"></div>
      <div id="qs-hint">↑↓ 탐색 · Enter 열기 · Esc 닫기</div>
    </div>
  </div>

  <!-- ── Full-text Search ── -->
  <div id="search-overlay" onclick="if(event.target===this)closeSearch()">
    <div id="search-box">
      <div id="search-header">
        <input id="search-input" placeholder="전체 노트 검색..." autocomplete="off">
        <button id="search-close" onclick="closeSearch()">×</button>
      </div>
      <div id="search-results"></div>
      <div id="search-hint">↑↓ 탐색 · Enter 열기 · Esc 닫기</div>
    </div>
  </div>

  <!-- ── Graph Overlay ── -->
  <div id="graph-overlay">
    <div id="graph-header">
      <span style="font-weight:700;font-size:14px">◉ 노트 그래프</span>
      <span id="graph-stats" style="opacity:.5;font-size:12px"></span>
      <div style="display:flex;gap:4px">
        <button class="graph-filter-btn active" id="graph-filter-all" onclick="setGraphFilter('all')">전체</button>
        <button class="graph-filter-btn" id="graph-filter-local" onclick="setGraphFilter('local')">현재 노트</button>
      </div>
      <div id="graph-legend">
        <span class="gleg"><span class="gleg-dot" style="background:var(--accent)"></span>현재</span>
        <span class="gleg"><span class="gleg-dot" style="background:#58a6ff"></span>연결됨</span>
        <span class="gleg"><span class="gleg-dot" style="background:#8b949e"></span>독립</span>
      </div>
      <button id="graph-close" onclick="closeGraph()">×</button>
    </div>
    <svg id="graph-canvas"></svg>
    <div id="graph-hint">
      <span>🖱 스크롤: 줌</span>
      <span>✋ 드래그: 이동</span>
      <span>👆 노드 클릭: 파일 열기</span>
      <span>Esc: 닫기</span>
    </div>
  </div>

  <!-- ── New File Modal ── -->
  <div id="newfile-modal" onclick="if(event.target===this)closeNewFile()">
    <div id="newfile-box">
      <div style="font-weight:700;margin-bottom:12px">새 파일 만들기</div>
      <div style="margin-bottom:8px;font-size:12px;color:var(--muted)">파일 이름</div>
      <input id="newfile-name" placeholder="파일명 (.md 자동 추가)" autocomplete="off">
      <div style="margin:12px 0 8px;font-size:12px;color:var(--muted)">위치 (선택)</div>
      <select id="newfile-dir"></select>
      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
        <button id="newfile-cancel" onclick="closeNewFile()">취소</button>
        <button id="newfile-create" onclick="createNewFile()">만들기</button>
      </div>
    </div>
  </div>

  <!-- ── Wiki Preview Popup ── -->
  <div id="wiki-preview-popup">
    <div class="wp-title" id="wp-title"></div>
    <div class="wp-body" id="wp-body"></div>
  </div>

  <!-- ── Link Autocomplete ── -->
  <div id="link-autocomplete"></div>

  <!-- ── Context Menu ── -->
  <div id="ctx-menu">
    <div class="ctx-item" id="ctx-open">새 탭으로 열기</div>
    <div class="ctx-item" id="ctx-copy-path">경로 복사</div>
    <div class="ctx-item" id="ctx-copy-rel">상대 경로 복사</div>
    <hr class="ctx-sep">
    <div class="ctx-item" id="ctx-rename">이름 변경</div>
    <hr class="ctx-sep">
    <div class="ctx-item ctx-danger" id="ctx-delete">삭제</div>
  </div>

  <!-- ── Status Bar ── -->
  <div id="statusbar">
    <span id="wordcount-badge"></span>
    <div id="status">
      <span class="dot off" id="dot"></span>
      <span id="status-text">연결 중...</span>
    </div>
  </div>

  <script>
    window.__renderGraph = function(){}; /* d3 로드 후 하단에서 초기화 */
  </script>

  <script id="mdv-config" type="application/json">${configJson}</script>

  <script>
  window.onerror = function(msg, src, line, col, err) {
    var st = document.getElementById('status-text');
    if (st) st.textContent = '스크립트 오류: ' + msg + ' (' + (src||'').split('/').pop() + ':' + line + ')';
    var dot = document.getElementById('dot');
    if (dot) dot.className = 'dot off';
    return false;
  };
  </script>

  <script>
  (function(){
    /* ── 요소 ────────────────────────── */
    var mdEl         = document.getElementById('markdown');
    var fmEl         = document.getElementById('frontmatter');
    var treeRoot     = document.getElementById('tree-root');
    var treeSection  = document.getElementById('tree-section');
    var tocSection   = document.getElementById('toc-section');
    var tocList      = document.getElementById('toc-list');
    var editor       = document.getElementById('editor');
    var editorPanel  = document.getElementById('editor-panel');
    var previewPanel = document.getElementById('preview-panel');
    var modDot       = document.getElementById('modified-dot');
    var saveBtn      = document.getElementById('save-btn');
    var dot          = document.getElementById('dot');
    var statusText   = document.getElementById('status-text');
    var filepath     = document.getElementById('filepath');
    var filepathName = document.getElementById('filepath-name');
    var headerSep    = document.getElementById('header-sep');
    var wordBadge    = document.getElementById('wordcount-badge');
    var bkSection    = document.getElementById('bookmarks-section');
    var bkList       = document.getElementById('bookmarks-list');
    var tagsSection  = document.getElementById('tags-section');
    var tagsList     = document.getElementById('tags-list');
    var tagsClearBtn = document.getElementById('tags-clear-btn');
    var blSection    = document.getElementById('backlinks-section');
    var blList       = document.getElementById('backlinks-list');
    var qsSwitcher   = document.getElementById('quick-switcher');
    var qsInput      = document.getElementById('qs-input');
    var qsResults    = document.getElementById('qs-results');
    var srOverlay    = document.getElementById('search-overlay');
    var srInput      = document.getElementById('search-input');
    var srResults    = document.getElementById('search-results');
    var grOverlay    = document.getElementById('graph-overlay');
    var nfModal      = document.getElementById('newfile-modal');
    var nfName       = document.getElementById('newfile-name');
    var nfDir        = document.getElementById('newfile-dir');

    var cfg          = JSON.parse(document.getElementById('mdv-config').textContent||'{}');
    var currentPath  = cfg.currentPath||'';
    var currentRel   = '';
    var modified     = false;
    var currentMode  = localStorage.getItem('mdv-mode')||'view';
    var retries      = 0, MAX = 10;
    var lastEditTime = 0;
    var previewTimer = null;
    var activeTagFilter = null;
    var tagFilesMap  = {};
    var searchDebounce = null;
    var qsSelected   = -1;
    var srSelected   = -1;

    /* ── 유틸 ────────────────────────── */
    function esc(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    /* ── 모드 관리 ───────────────────── */
    function setMode(mode) {
      currentMode = mode;
      localStorage.setItem('mdv-mode', mode);
      document.getElementById('btn-view').classList.toggle('active', mode==='view');
      document.getElementById('btn-split').classList.toggle('active', mode==='split');
      document.getElementById('btn-edit').classList.toggle('active', mode==='edit');

      if (mode==='view') {
        editorPanel.style.display='none';
        previewPanel.style.display='flex';
        saveBtn.style.display='none';
      } else if (mode==='split') {
        editorPanel.style.display='flex';
        previewPanel.style.display='flex';
        saveBtn.style.display='';
      } else {
        editorPanel.style.display='flex';
        previewPanel.style.display='none';
        saveBtn.style.display='';
      }
      if (mode!=='view' && !editor.value && currentRel) loadEditorContent(currentRel);
    }
    window.setMode = setMode;

    /* ── 키보드 ──────────────────────── */
    document.addEventListener('keydown', function(e) {
      // Ctrl+S 저장
      if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); saveFile(); return; }
      // Ctrl+P Quick Switcher
      if ((e.ctrlKey||e.metaKey) && !e.shiftKey && e.key==='p') { e.preventDefault(); openQuickSwitcher(); return; }
      // Ctrl+Shift+F 전체 검색
      if ((e.ctrlKey||e.metaKey) && e.shiftKey && (e.key==='F'||e.key==='f')) { e.preventDefault(); openSearch(); return; }

      // ESC — 최상위 오버레이만 닫기
      if (e.key==='Escape') {
        if (grOverlay && grOverlay.classList.contains('open')) { closeGraph(); return; }
        if (srOverlay && srOverlay.classList.contains('open')) { closeSearch(); return; }
        if (qsSwitcher && qsSwitcher.classList.contains('open')) { closeQuickSwitcher(); return; }
        if (nfModal && nfModal.classList.contains('open')) { closeNewFile(); return; }
        return;
      }

      // Quick Switcher 내비게이션
      if (qsSwitcher && qsSwitcher.classList.contains('open')) {
        if (e.key==='ArrowDown') { e.preventDefault(); moveQs(1); return; }
        if (e.key==='ArrowUp')   { e.preventDefault(); moveQs(-1); return; }
        if (e.key==='Enter')     { e.preventDefault(); selectQs(); return; }
      }

      // Search 내비게이션
      if (srOverlay && srOverlay.classList.contains('open')) {
        if (e.key==='ArrowDown') { e.preventDefault(); moveSr(1); return; }
        if (e.key==='ArrowUp')   { e.preventDefault(); moveSr(-1); return; }
        if (e.key==='Enter')     { e.preventDefault(); selectSr(); return; }
      }

      // 모드 단축키 (에디터 포커스 없을 때)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && document.activeElement !== editor) {
        if (e.key==='v') setMode('view');
        else if (e.key==='s') setMode('split');
        else if (e.key==='e') setMode('edit');
      }
    });

    /* ── 에디터 ──────────────────────── */
    editor.addEventListener('keydown', function(e) {
      if (e.key==='Tab') {
        e.preventDefault();
        var s=editor.selectionStart, en=editor.selectionEnd;
        editor.value=editor.value.slice(0,s)+'  '+editor.value.slice(en);
        editor.selectionStart=editor.selectionEnd=s+2;
      }
    });

    editor.addEventListener('input', function() {
      lastEditTime=Date.now();
      modified=true;
      if (modDot) modDot.style.display='inline';
      clearTimeout(previewTimer);
      previewTimer=setTimeout(sendPreview, 400);
    });

    async function loadEditorContent(rel) {
      if (!rel) return;
      try {
        var res=await fetch('/api/raw?file='+encodeURIComponent(rel));
        if (!res.ok) return;
        var d=await res.json();
        editor.value=d.content;
        modified=false; if (modDot) modDot.style.display='none';
      } catch(err) { console.error('에디터 로드 실패', err); }
    }

    async function sendPreview() {
      if (!editor.value) return;
      try {
        var res=await fetch('/api/preview',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({content:editor.value})
        });
        if (!res.ok) return;
        var d=await res.json();
        mdEl.innerHTML=d.html;
        if (window.__mermaidRender) window.__mermaidRender();
        applyFoldButtons(); if (window.__loadEmbeds) window.__loadEmbeds(mdEl);
        renderToc(d.toc);
      } catch(err) {}
    }

    window.saveFile = async function() {
      if (!currentRel||!modified) return;
      try {
        var res=await fetch('/api/save',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({path:currentRel,content:editor.value})
        });
        if (res.ok) {
          modified=false;
          if (modDot) modDot.style.display='none';
          statusText.textContent='저장됨';
          setTimeout(function(){statusText.textContent='연결됨';},2000);
        }
      } catch(err) { statusText.textContent='저장 실패'; }
    };

    /* ── 파일 트리 ───────────────────── */
    function rebuildTree() {
      if (!cfg.isDir || !cfg.tree || !cfg.tree.children || !cfg.tree.children.length) return;
      treeSection.style.display='block';
      treeRoot.innerHTML=renderTreeChildren(cfg.tree.children,'',0);
      wireTreeEvents();
      expandToActive();
      applyTagFilter();
    }

    function wireTreeEvents() {
      treeRoot.querySelectorAll('.tree-file a').forEach(function(a) {
        a.addEventListener('click', function(e) {
          e.preventDefault();
          loadFile(this.dataset.rel, this.dataset.abs);
        });
      });
      treeRoot.querySelectorAll('.tree-dir-label').forEach(function(el) {
        el.addEventListener('click', function() { toggleDir(this); });
      });
      treeRoot.querySelectorAll('.bookmark-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          toggleBookmark(this.dataset.rel, this.dataset.abs, this.dataset.name);
          updateBookmarkBtns();
        });
      });
    }

    if (cfg.isDir && cfg.tree && cfg.tree.children && cfg.tree.children.length) {
      rebuildTree();
    }

    function renderTreeChildren(nodes, prefix, depth) {
      var d = depth || 0;
      var pl = (10 + d * 14) + 'px';
      var html = '';
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.type === 'dir') {
          var id = 'dir-' + esc(prefix + n.name).replace(/[^a-zA-Z0-9]/g,'-');
          html += '<li class="tree-dir">'
            + '<div class="tree-dir-label" data-id="' + id + '" style="padding-left:' + pl + '">'
            + '<span class="tree-arrow" id="arr-' + id + '">▶</span>'
            + '<span>' + esc(n.name) + '</span></div>'
            + '<ul class="tree-children tree-list" id="' + id + '">'
            + (n.children ? renderTreeChildren(n.children, prefix + n.name + '/', d + 1) : '')
            + '</ul></li>';
        } else {
          var isActive = (n.absPath === currentPath);
          var bms = getBookmarks();
          var isBm = bms.some(function(b){ return b.relativePath === n.path; });
          var displayName = esc(n.name.replace(/\\.md$/i,''));
          html += '<li class="tree-file">'
            + '<a href="#" data-rel="' + esc(n.path) + '" data-abs="' + esc(n.absPath) + '"'
            + ' class="' + (isActive ? 'active' : '') + '" style="padding-left:' + pl + '">'
            + displayName + '</a>'
            + '<button class="bookmark-btn' + (isBm ? ' bookmarked' : '') + '"'
            + ' data-rel="' + esc(n.path) + '" data-abs="' + esc(n.absPath) + '"'
            + ' data-name="' + displayName + '" title="즐겨찾기">' + (isBm ? '★' : '☆') + '</button>'
            + '</li>';
        }
      }
      return html;
    }

    function toggleDir(label) {
      var id = label.dataset.id;
      var ul = document.getElementById(id);
      var arr = document.getElementById('arr-' + id);
      if (!ul) return;
      var open = ul.classList.toggle('open');
      if (arr) arr.classList.toggle('open', open);
    }

    function expandToActive() {
      var active = treeRoot.querySelector('.tree-file a.active');
      if (!active) return;
      var el = active.parentElement;
      while (el && el !== treeRoot) {
        if (el.classList.contains('tree-children')) {
          el.classList.add('open');
          var arr = document.getElementById('arr-' + el.id);
          if (arr) arr.classList.add('open');
        }
        el = el.parentElement;
      }
    }

    function setActiveFile(absPath) {
      currentPath = absPath;
      treeRoot.querySelectorAll('.tree-file a').forEach(function(a) {
        a.classList.toggle('active', a.dataset.abs === absPath);
      });
    }

    /* ── 파일 로드 ───────────────────── */
    async function loadFile(rel, abs) {
      try {
        statusText.textContent='로딩 중...';
        var res = await fetch('/api/render?file=' + encodeURIComponent(rel));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var d = await res.json();
        var anchor = saveAnchor();
        mdEl.innerHTML = d.html;
        if (window.__mermaidRender) window.__mermaidRender();
        applyFoldButtons(); if (window.__loadEmbeds) window.__loadEmbeds(mdEl);
        renderToc(d.toc);
        renderFm(d.frontmatter);
        restoreAnchor(anchor);
        setActiveFile(abs);
        currentRel = rel;
        var name = d.name || rel.split('/').pop();
        document.title = name.replace(/\\.md$/i,'') + '  — mdViewer';
        if (filepathName) filepathName.textContent = name.replace(/\\.md$/i,'');
        if (filepath)  filepath.style.display = '';
        if (headerSep) headerSep.style.display = '';
        history.pushState({file:rel}, '', '/?file=' + encodeURIComponent(rel));
        statusText.textContent = '연결됨';
        addRecent(rel, abs, name);
        modified = false;
        if (modDot) modDot.style.display = 'none';
        if (currentMode !== 'view') { editor.value = ''; loadEditorContent(rel); }
        if (d.wordCount !== undefined) updateWordCount(d.wordCount);
        if (cfg.isDir) loadBacklinks(rel);
      } catch(err) { statusText.textContent = '로드 실패: ' + err.message; }
    }
    window.__loadFile = loadFile;

    window.addEventListener('popstate', function(e) {
      var f = e.state && e.state.file;
      if (f) {
        var entry = cfg.files.find(function(x){ return x.relativePath === f; });
        if (entry) loadFile(entry.relativePath, entry.absolutePath);
      }
    });

    /* ── TOC ─────────────────────────── */
    function renderToc(toc) {
      if (!toc || !toc.length) {
        tocList.innerHTML = '';
        if (tocSection) tocSection.style.display = 'none';
        return;
      }
      if (tocSection) tocSection.style.display = '';
      tocList.innerHTML = toc.filter(function(i){ return i.depth <= 4; }).map(function(i) {
        return '<li class="h' + i.depth + '"><a href="#' + esc(i.id) + '">' + esc(i.text) + '</a></li>';
      }).join('');
      setupTocObserver();
    }

    var tocObserver = null;
    function setupTocObserver() {
      if (tocObserver) tocObserver.disconnect();
      tocObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
          var a = tocList.querySelector('a[href="#' + e.target.id + '"]');
          if (a) a.classList.toggle('active', e.isIntersecting);
        });
      }, {rootMargin: '-44px 0px -70% 0px'});
      mdEl.querySelectorAll('h1,h2,h3,h4').forEach(function(h){ tocObserver.observe(h); });
    }

    /* ── Frontmatter ─────────────────── */
    function renderFm(fm) {
      if (!fm || !Object.keys(fm).length) { fmEl.style.display='none'; return; }
      fmEl.innerHTML = '<dl>' + Object.entries(fm).map(function(kv) {
        return '<dt>' + esc(kv[0]) + '</dt><dd>' + esc(String(kv[1])) + '</dd>';
      }).join('') + '</dl>';
      fmEl.style.display = 'block';
    }

    /* ── 스크롤 복원 ─────────────────── */
    function saveAnchor() {
      var last = null;
      mdEl.querySelectorAll('h1,h2,h3,h4').forEach(function(h) {
        if (h.getBoundingClientRect().top <= 80) last = h.id;
      });
      return last;
    }
    function restoreAnchor(id) {
      if (!id) { previewPanel.scrollTop = 0; return; }
      var el = document.getElementById(id);
      if (el) el.scrollIntoView({block:'start'});
    }

    /* ── 테마 ────────────────────────── */
    function isDark() {
      var t = document.documentElement.getAttribute('data-theme');
      return t === 'dark' || (!t && matchMedia('(prefers-color-scheme:dark)').matches);
    }
    function syncThemeBtn() {
      var btn = document.getElementById('theme-btn');
      if (btn) btn.textContent = isDark() ? '☀' : '☾';
    }
    window.toggleTheme = function() {
      var next = isDark() ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('mdv-theme', next);
      syncThemeBtn();
      if (window.__mermaidInit) window.__mermaidInit(next === 'dark');
    };
    syncThemeBtn();

    /* ── Heading Fold ────────────────── */
    function applyFoldButtons() {
      mdEl.querySelectorAll('h1,h2,h3,h4').forEach(function(h) {
        if (h.querySelector('.fold-toggle')) return;
        var btn = document.createElement('span');
        btn.className = 'fold-toggle';
        btn.textContent = '▾';
        btn.title = '접기/펼치기';
        h.insertBefore(btn, h.firstChild);
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var folded = btn.classList.toggle('folded');
          var level = parseInt(h.tagName[1]);
          var sib = h.nextElementSibling;
          while (sib) {
            var m = sib.tagName && sib.tagName.match(/^H([1-4])$/i);
            if (m && parseInt(m[1]) <= level) break;
            sib.classList.toggle('folded-content', folded);
            sib = sib.nextElementSibling;
          }
        });
      });
    }

    /* ── Word Count ──────────────────── */
    function updateWordCount(wc) {
      if (!wordBadge) return;
      if (!wc) { wordBadge.style.display = 'none'; return; }
      var min = Math.max(1, Math.round(wc / 250));
      wordBadge.textContent = wc.toLocaleString() + 'W · ' + min + 'min';
      wordBadge.style.display = '';
    }

    /* ── Bookmarks ───────────────────── */
    function getBookmarks() {
      try { return JSON.parse(localStorage.getItem('mdv-bookmarks') || '[]'); }
      catch(err) { return []; }
    }
    function saveBookmarks(bms) {
      localStorage.setItem('mdv-bookmarks', JSON.stringify(bms));
    }
    function toggleBookmark(rel, abs, name) {
      var bms = getBookmarks();
      var idx = bms.findIndex(function(b){ return b.relativePath === rel; });
      if (idx >= 0) bms.splice(idx, 1);
      else bms.push({name: name, relativePath: rel, absolutePath: abs});
      saveBookmarks(bms);
      renderBookmarks();
    }
    function updateBookmarkBtns() {
      var bms = getBookmarks();
      treeRoot.querySelectorAll('.bookmark-btn').forEach(function(btn) {
        var isBm = bms.some(function(b){ return b.relativePath === btn.dataset.rel; });
        btn.classList.toggle('bookmarked', isBm);
        btn.textContent = isBm ? '★' : '☆';
      });
    }
    function renderBookmarks() {
      if (!bkSection || !bkList) return;
      var bms = getBookmarks();
      if (!bms.length) { bkSection.style.display = 'none'; return; }
      bkSection.style.display = 'block';
      bkList.innerHTML = bms.map(function(b) {
        return '<li class="tree-file"><a href="#" data-rel="' + esc(b.relativePath)
          + '" data-abs="' + esc(b.absolutePath) + '" style="padding-left:12px">'
          + esc(b.name.replace(/\.md$/i,'')) + '</a></li>';
      }).join('');
      bkList.querySelectorAll('a').forEach(function(a) {
        a.addEventListener('click', function(e) {
          e.preventDefault();
          loadFile(this.dataset.rel, this.dataset.abs);
        });
      });
    }
    function loadBookmarks() { renderBookmarks(); }

    /* ── Tags ────────────────────────── */
    async function loadTags() {
      if (!cfg.isDir) return;
      try {
        var res = await fetch('/api/tags');
        if (!res.ok) return;
        var d = await res.json();
        tagFilesMap = {};
        (d.tags || []).forEach(function(t) { tagFilesMap[t.name] = t.files || []; });
        renderTags(d.tags || []);
      } catch(err) {}
    }

    function renderTags(tags) {
      if (!tagsSection || !tagsList) return;
      if (!tags.length) { tagsSection.style.display = 'none'; return; }
      tagsSection.style.display = 'block';
      tagsList.innerHTML = tags.map(function(t) {
        return '<span class="tag-pill' + (activeTagFilter === t.name ? ' active' : '')
          + '" data-tag="' + esc(t.name) + '">#' + esc(t.name)
          + '<span class="tag-count">' + t.count + '</span></span>';
      }).join('');
      tagsList.querySelectorAll('.tag-pill').forEach(function(pill) {
        pill.addEventListener('click', function() {
          var tag = this.dataset.tag;
          if (activeTagFilter === tag) {
            activeTagFilter = null;
            if (tagsClearBtn) tagsClearBtn.style.display = 'none';
          } else {
            activeTagFilter = tag;
            if (tagsClearBtn) tagsClearBtn.style.display = '';
          }
          tagsList.querySelectorAll('.tag-pill').forEach(function(p) {
            p.classList.toggle('active', p.dataset.tag === activeTagFilter);
          });
          applyTagFilter();
        });
      });
    }

    function applyTagFilter() {
      treeRoot.querySelectorAll('.tree-file').forEach(function(li) {
        if (!activeTagFilter) {
          li.classList.remove('tag-hidden');
        } else {
          var a = li.querySelector('a');
          var rel = a ? a.dataset.rel : null;
          var files = tagFilesMap[activeTagFilter] || [];
          li.classList.toggle('tag-hidden', !rel || !files.some(function(f){ return f.relativePath === rel; }));
        }
      });
    }

    window.clearTagFilter = function() {
      activeTagFilter = null;
      if (tagsClearBtn) tagsClearBtn.style.display = 'none';
      if (tagsList) tagsList.querySelectorAll('.tag-pill').forEach(function(p){ p.classList.remove('active'); });
      applyTagFilter();
    };

    /* ── Backlinks ───────────────────── */
    async function loadBacklinks(rel) {
      if (!cfg.isDir || !blSection || !blList) return;
      try {
        var res = await fetch('/api/backlinks?file=' + encodeURIComponent(rel));
        if (!res.ok) return;
        var d = await res.json();
        var bls = d.backlinks || [];
        if (!bls.length) { blSection.style.display = 'none'; return; }
        blSection.style.display = 'block';
        blList.innerHTML = bls.map(function(b) {
          return '<li><a href="#" data-rel="' + esc(b.relativePath)
            + '" data-abs="' + esc(b.absolutePath) + '">' + esc(b.name.replace(/\.md$/i,'')) + '</a></li>';
        }).join('');
        blList.querySelectorAll('a').forEach(function(a) {
          a.addEventListener('click', function(e) {
            e.preventDefault();
            loadFile(this.dataset.rel, this.dataset.abs);
          });
        });
      } catch(err) { if (blSection) blSection.style.display = 'none'; }
    }

    /* ── Quick Switcher ──────────────── */
    function openQuickSwitcher() {
      if (!qsSwitcher) return;
      qsSwitcher.classList.add('open');
      if (qsInput) { qsInput.value = ''; qsInput.focus(); }
      qsSelected = -1;
      renderQsResults('');
    }
    function closeQuickSwitcher() {
      if (qsSwitcher) qsSwitcher.classList.remove('open');
    }
    window.openQuickSwitcher = openQuickSwitcher;
    window.closeQuickSwitcher = closeQuickSwitcher;

    function renderQsResults(query) {
      if (!qsResults) return;
      var files = cfg.files || [];
      var q = query.toLowerCase().trim();
      var filtered = q
        ? files.filter(function(f) {
            return f.name.toLowerCase().indexOf(q) >= 0
              || f.relativePath.toLowerCase().indexOf(q) >= 0;
          })
        : files.slice(0, 30);
      filtered = filtered.slice(0, 50);
      qsSelected = filtered.length > 0 ? 0 : -1;
      qsResults.innerHTML = filtered.map(function(f, i) {
        var name = f.name.replace(/\\.md$/i,'');
        return '<div class="qs-item' + (i === 0 ? ' selected' : '')
          + '" data-rel="' + esc(f.relativePath) + '" data-abs="' + esc(f.absolutePath) + '">'
          + '<span class="qs-name">' + esc(name) + '</span>'
          + '<span class="qs-path">' + esc(f.relativePath) + '</span>'
          + '</div>';
      }).join('');
      qsResults.querySelectorAll('.qs-item').forEach(function(item) {
        item.addEventListener('click', function() {
          loadFile(this.dataset.rel, this.dataset.abs);
          closeQuickSwitcher();
        });
      });
    }

    function moveQs(dir) {
      var items = qsResults ? qsResults.querySelectorAll('.qs-item') : [];
      if (!items.length) return;
      if (qsSelected >= 0 && items[qsSelected]) items[qsSelected].classList.remove('selected');
      qsSelected = Math.max(0, Math.min(items.length - 1, qsSelected + dir));
      if (items[qsSelected]) { items[qsSelected].classList.add('selected'); items[qsSelected].scrollIntoView({block:'nearest'}); }
    }
    function selectQs() {
      var items = qsResults ? qsResults.querySelectorAll('.qs-item') : [];
      var idx = qsSelected >= 0 ? qsSelected : 0;
      if (items[idx]) items[idx].click();
    }

    if (qsInput) {
      qsInput.addEventListener('input', function() {
        qsSelected = -1;
        renderQsResults(this.value);
      });
    }

    /* ── Full-text Search ────────────── */
    function openSearch() {
      if (!srOverlay) return;
      srOverlay.classList.add('open');
      if (srInput) { srInput.value = ''; srInput.focus(); }
      if (srResults) srResults.innerHTML = '';
      srSelected = -1;
    }
    function closeSearch() {
      if (srOverlay) srOverlay.classList.remove('open');
    }
    window.openSearch = openSearch;
    window.closeSearch = closeSearch;

    function doSearch(q) {
      if (!q.trim() || !srResults) { if (srResults) srResults.innerHTML = ''; return; }
      fetch('/api/search?q=' + encodeURIComponent(q))
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(d) {
          if (!d || !srResults) return;
          var results = d.results || [];
          srSelected = results.length > 0 ? 0 : -1;
          if (!results.length) {
            srResults.innerHTML = '<div style="padding:16px;color:var(--muted);font-size:13px;text-align:center">검색 결과 없음</div>';
            return;
          }
          var qSafe = q.trim().replace(/[-.*+?^{}$()|\\[\\]\\\\]/g, '\\\\$&');
          var qRe = new RegExp('(' + qSafe + ')', 'gi');
          srResults.innerHTML = results.map(function(r, i) {
            var snippet = esc(r.snippet || '').replace(qRe, '<span class="sr-highlight">$1</span>');
            return '<div class="sr-item' + (i === 0 ? ' selected' : '')
              + '" data-rel="' + esc(r.relativePath) + '" data-abs="' + esc(r.absolutePath) + '">'
              + '<div class="sr-name">' + esc((r.name || '').replace(/\\.md$/i,'')) + '</div>'
              + (snippet ? '<div class="sr-snippet">...' + snippet + '...</div>' : '')
              + '</div>';
          }).join('');
          srResults.querySelectorAll('.sr-item').forEach(function(item) {
            item.addEventListener('click', function() {
              loadFile(this.dataset.rel, this.dataset.abs);
              closeSearch();
            });
          });
        }).catch(function(){});
    }

    function moveSr(dir) {
      var items = srResults ? srResults.querySelectorAll('.sr-item') : [];
      if (!items.length) return;
      if (srSelected >= 0 && items[srSelected]) items[srSelected].classList.remove('selected');
      srSelected = Math.max(0, Math.min(items.length - 1, srSelected + dir));
      if (items[srSelected]) { items[srSelected].classList.add('selected'); items[srSelected].scrollIntoView({block:'nearest'}); }
    }
    function selectSr() {
      var items = srResults ? srResults.querySelectorAll('.sr-item') : [];
      var idx = srSelected >= 0 ? srSelected : 0;
      if (items[idx]) items[idx].click();
    }

    if (srInput) {
      srInput.addEventListener('input', function() {
        var q = this.value;
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(function(){ doSearch(q); }, 300);
      });
    }

    /* ── Graph View ──────────────────── */
    function openGraph() {
      if (!grOverlay) return;
      grOverlay.classList.add('open');
      requestAnimationFrame(function(){ loadGraph(); });
    }
    function closeGraph() {
      if (grOverlay) grOverlay.classList.remove('open');
    }
    window.openGraph = openGraph;
    window.closeGraph = closeGraph;

    var graphFilter = 'all';

    window.setGraphFilter = function(mode) {
      graphFilter = mode;
      document.getElementById('graph-filter-all').classList.toggle('active', mode === 'all');
      document.getElementById('graph-filter-local').classList.toggle('active', mode === 'local');
      loadGraph();
    };

    async function loadGraph() {
      if (!window.__renderGraph) return;
      try {
        var res = await fetch('/api/graph');
        if (!res.ok) return;
        var d = await res.json();
        var nodes = d.nodes || [];
        var edges = d.edges || [];
        if (graphFilter === 'local' && currentRel) {
          var curNode = nodes.find(function(n) { return n.relativePath === currentRel; });
          if (curNode) {
            var neighborIds = new Set();
            neighborIds.add(curNode.id);
            edges.forEach(function(e) {
              var s = typeof e.source === 'object' ? e.source.id : e.source;
              var t = typeof e.target === 'object' ? e.target.id : e.target;
              if (s === curNode.id) neighborIds.add(t);
              if (t === curNode.id) neighborIds.add(s);
            });
            nodes = nodes.filter(function(n) { return neighborIds.has(n.id); });
            edges = edges.filter(function(e) {
              var s = typeof e.source === 'object' ? e.source.id : e.source;
              var t = typeof e.target === 'object' ? e.target.id : e.target;
              return neighborIds.has(s) && neighborIds.has(t);
            });
          }
        }
        window.__renderGraph(nodes, edges, currentRel);
      } catch(err) {}
    }

    /* ── Wiki Preview Popup ──────────────── */
    (function() {
      var popup    = document.getElementById('wiki-preview-popup');
      var wpTitle  = document.getElementById('wp-title');
      var wpBody   = document.getElementById('wp-body');
      var hoverTimer = null;
      var currentHref = null;

      function showPopup(x, y, title, html) {
        wpTitle.textContent = title;
        wpBody.innerHTML = html;
        popup.classList.add('visible');
        positionPopup(x, y);
      }

      function positionPopup(x, y) {
        var pw = 380, ph = 300;
        var vw = window.innerWidth, vh = window.innerHeight;
        var left = x + 14;
        var top  = y + 14;
        if (left + pw > vw - 10) left = x - pw - 10;
        if (top  + ph > vh - 10) top  = y - ph - 10;
        if (left < 8) left = 8;
        if (top  < 8) top  = 8;
        popup.style.left = left + 'px';
        popup.style.top  = top  + 'px';
      }

      function hidePopup() {
        clearTimeout(hoverTimer);
        hoverTimer = null;
        currentHref = null;
        popup.classList.remove('visible');
      }

      if (mdEl) {
        mdEl.addEventListener('mouseover', function(e) {
          var a = e.target.closest ? e.target.closest('a.wiki-link') : null;
          if (!a) return;
          var href = a.getAttribute('href') || '';
          var fileParam = null;
          try {
            var url = new URL(href, location.href);
            fileParam = url.searchParams.get('file');
          } catch(_) {}
          if (!fileParam) return;
          if (currentHref === fileParam) return;
          clearTimeout(hoverTimer);
          currentHref = fileParam;
          var cx = e.clientX, cy = e.clientY;
          hoverTimer = setTimeout(function() {
            fetch('/api/preview?file=' + encodeURIComponent(fileParam))
              .then(function(r) { return r.ok ? r.json() : null; })
              .then(function(d) {
                if (d && currentHref === fileParam) showPopup(cx, cy, d.title || fileParam, d.html || '');
              })
              .catch(function() {});
          }, 400);
        });

        mdEl.addEventListener('mouseout', function(e) {
          var a = e.target.closest ? e.target.closest('a.wiki-link') : null;
          if (a) hidePopup();
        });

        mdEl.addEventListener('mousemove', function(e) {
          var a = e.target.closest ? e.target.closest('a.wiki-link') : null;
          if (a && popup.classList.contains('visible')) positionPopup(e.clientX, e.clientY);
        });
      }

      document.addEventListener('click', function() { hidePopup(); });
    })();

    /* ── Link Autocomplete ───────────────── */
    (function() {
      var lac      = document.getElementById('link-autocomplete');
      var lacIdx   = -1;
      var lacItems = [];

      function closeLac() {
        if (lac) lac.classList.remove('visible');
        lacIdx = -1;
        lacItems = [];
      }

      function openLac(items, query, caretRect) {
        if (!lac || !items.length) { closeLac(); return; }
        lacItems = items;
        lacIdx = -1;
        lac.innerHTML = items.slice(0, 8).map(function(f, i) {
          return '<div class="lac-item" data-idx="' + i + '" data-name="' + esc(f.name.replace(/\\.md$/i, '')) + '">'
            + esc(f.name.replace(/\\.md$/i, ''))
            + (f.relativePath !== f.name ? '<span style="opacity:.5;font-size:11px;margin-left:6px">' + esc(f.relativePath) + '</span>' : '')
            + '</div>';
        }).join('');
        lac.querySelectorAll('.lac-item').forEach(function(el) {
          el.addEventListener('mousedown', function(e) {
            e.preventDefault();
            insertLacItem(this.dataset.name);
          });
        });

        var vw = window.innerWidth, vh = window.innerHeight;
        var left = caretRect.left;
        var top  = caretRect.bottom + 4;
        if (left + 340 > vw - 10) left = vw - 350;
        if (top + 200 > vh - 10) top = caretRect.top - 200 - 4;
        if (left < 8) left = 8;
        lac.style.left = left + 'px';
        lac.style.top  = top  + 'px';
        lac.classList.add('visible');
      }

      function insertLacItem(name) {
        if (!editor) return;
        var pos  = editor.selectionStart;
        var text = editor.value;
        var before = text.slice(0, pos);
        var after  = text.slice(pos);
        var bracketIdx = before.lastIndexOf('[[');
        if (bracketIdx === -1) { closeLac(); return; }
        var newBefore = before.slice(0, bracketIdx) + '[[' + name + ']]';
        editor.value = newBefore + after;
        var newPos = newBefore.length;
        editor.setSelectionRange(newPos, newPos);
        editor.dispatchEvent(new Event('input'));
        closeLac();
      }

      function highlightLacItem(idx) {
        lac.querySelectorAll('.lac-item').forEach(function(el, i) {
          el.classList.toggle('active', i === idx);
        });
      }

      if (editor) {
        editor.addEventListener('input', function() {
          var pos    = editor.selectionStart;
          var before = editor.value.slice(0, pos);
          var last50 = before.slice(-50);
          var m      = last50.match(/\\[\\[([^\\]]*)$/);
          if (!m) { closeLac(); return; }
          var query  = m[1].toLowerCase();
          var files  = (cfg.files || []).filter(function(f) {
            return f.name.toLowerCase().replace(/\\.md$/i, '').indexOf(query) !== -1;
          });
          if (!files.length) { closeLac(); return; }
          var rect  = editor.getBoundingClientRect();
          var lines = before.split('\\n');
          var lineIdx = lines.length - 1;
          var linesBefore = lines.slice(0, lineIdx);
          var style = window.getComputedStyle(editor);
          var lineH = parseFloat(style.lineHeight) || 20;
          var padT  = parseFloat(style.paddingTop)  || 0;
          var padL  = parseFloat(style.paddingLeft)  || 0;
          var fontSize = parseFloat(style.fontSize)  || 13;
          var approxCharW = fontSize * 0.55;
          var curLine = lines[lineIdx];
          var caretX = rect.left + padL + curLine.length * approxCharW;
          var caretY = rect.top  + padT + linesBefore.length * lineH;
          openLac(files, query, { left: caretX, bottom: caretY + lineH, top: caretY });
        });

        editor.addEventListener('keydown', function(e) {
          if (!lac.classList.contains('visible')) return;
          var items = lac.querySelectorAll('.lac-item');
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            lacIdx = Math.min(lacIdx + 1, items.length - 1);
            highlightLacItem(lacIdx);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            lacIdx = Math.max(lacIdx - 1, 0);
            highlightLacItem(lacIdx);
          } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (lacIdx >= 0 && items[lacIdx]) {
              e.preventDefault();
              insertLacItem(items[lacIdx].dataset.name);
            }
          } else if (e.key === 'Escape') {
            closeLac();
          }
        });
      }

      document.addEventListener('click', function(e) {
        if (lac && !lac.contains(e.target)) closeLac();
      });
    })();

    /* ── New File Modal ──────────────── */
    function openNewFile() {
      if (!nfModal || !cfg.isDir) return;
      var dirs = [''];
      function collectDirs(node, prefix) {
        if (!node) return;
        (node.children || []).forEach(function(c) {
          if (c.type === 'dir') {
            dirs.push(prefix + c.name);
            collectDirs(c, prefix + c.name + '/');
          }
        });
      }
      collectDirs(cfg.tree, '');
      nfDir.innerHTML = dirs.map(function(d) {
        return '<option value="' + esc(d) + '">' + esc(d || '(루트)') + '</option>';
      }).join('');
      if (nfName) nfName.value = '';
      nfModal.classList.add('open');
      if (nfName) nfName.focus();
    }
    function closeNewFile() {
      if (nfModal) nfModal.classList.remove('open');
    }
    window.openNewFile  = openNewFile;
    window.closeNewFile = closeNewFile;

    window.createNewFile = async function() {
      if (!nfName) return;
      var name = nfName.value.trim();
      if (!name) { nfName.focus(); return; }
      if (!name.match(/\\.md$/i)) name += '.md';
      var dir = nfDir ? nfDir.value : '';
      try {
        var res = await fetch('/api/files/new', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({dir: dir || undefined, name: name})
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var d = await res.json();
        closeNewFile();
        loadFile(d.relativePath, d.absolutePath);
      } catch(err) { statusText.textContent = '파일 생성 실패: ' + err.message; }
    };

    /* ── WebSocket ───────────────────── */
    function connect() {
      var ws = new WebSocket('ws://' + location.host + '/ws');
      ws.onopen = function(){ retries=0; dot.className='dot'; statusText.textContent='연결됨'; };
      ws.onmessage = function(e) {
        var msg = JSON.parse(e.data);
        if (msg.type === 'tree:update') {
          cfg.tree = msg.tree;
          cfg.files = msg.files;
          rebuildTree();
          loadTags();
        } else if (msg.type === 'update') {
          if (msg.path && currentPath && msg.path !== currentPath) return;
          if (currentMode !== 'view' && Date.now() - lastEditTime < 2000) return;
          var anchor = saveAnchor();
          mdEl.innerHTML = msg.html;
          if (window.__mermaidRender) window.__mermaidRender();
          applyFoldButtons(); if (window.__loadEmbeds) window.__loadEmbeds(mdEl);
          renderToc(msg.toc);
          renderFm(msg.frontmatter);
          restoreAnchor(anchor);
          if (msg.wordCount !== undefined) updateWordCount(msg.wordCount);
          if (currentRel && cfg.isDir) loadBacklinks(currentRel);
          if (currentMode !== 'view' && !modified && currentRel) { editor.value=''; loadEditorContent(currentRel); }
        } else if (msg.type === 'error') {
          statusText.textContent = '오류: ' + msg.message;
        }
      };
      ws.onclose = function(){
        dot.className = 'dot off';
        if (retries < MAX) {
          var delay = Math.min(500 * Math.pow(1.5, retries), 10000);
          statusText.textContent = '재연결 중…';
          setTimeout(connect, delay);
          retries++;
        } else {
          statusText.textContent = '연결 끊김';
        }
      };
      ws.onerror = function(){ ws.close(); };
    }

    /* ── 초기화 ─────────────────────── */
    renderFm(${fmJson});
    renderToc([]);

    if (cfg.currentPath && cfg.files) {
      var found = cfg.files.find(function(f){ return f.absolutePath === cfg.currentPath; });
      if (found) currentRel = found.relativePath;
    }

    setMode(currentMode);
    connect();
    loadTags();
    loadBookmarks();
    renderRecents();
    if (mdEl && mdEl.innerHTML.trim()) { applyFoldButtons(); loadEmbeds(mdEl); }

    /* ── Embedded Notes 로딩 ─────────────────────── */
    function loadEmbeds(container) {
      var embeds = container.querySelectorAll('.embed-note[data-embed]');
      embeds.forEach(function(el) {
        var fname = el.getAttribute('data-embed');
        if (!fname || el.dataset.loaded) return;
        el.dataset.loaded = '1';
        el.innerHTML = '<span class="embed-note-loading">⏳ ' + esc(fname) + ' 로딩 중...</span>';
        fetch('/api/render?file=' + encodeURIComponent(fname))
          .then(function(r){ return r.ok ? r.json() : Promise.reject(r.status); })
          .then(function(d) {
            var title = fname.replace(/\.md$/i,'');
            el.innerHTML =
              '<div class="embed-note-title">📄 ' + esc(title) + '</div>' +
              '<div class="embed-note-body">' + (d.html || '') + '</div>';
          })
          .catch(function(){ el.innerHTML = '<span class="embed-note-loading">⚠ ' + esc(fname) + ' 로드 실패</span>'; });
      });
    }
    window.__loadEmbeds = loadEmbeds;

    /* ── 최근 파일 ───────────────────────── */
    var recentSection = document.getElementById('recent-section');
    var recentList    = document.getElementById('recent-list');

    function getRecents() {
      try { return JSON.parse(localStorage.getItem('mdv-recents') || '[]'); } catch(e) { return []; }
    }

    function addRecent(rel, abs, name) {
      if (!cfg.isDir) return;
      var recents = getRecents().filter(function(r) { return r.relativePath !== rel; });
      recents.unshift({ name: name, relativePath: rel, absolutePath: abs });
      localStorage.setItem('mdv-recents', JSON.stringify(recents.slice(0, 10)));
      renderRecents();
    }

    function renderRecents() {
      if (!recentSection || !recentList || !cfg.isDir) return;
      var recents = getRecents();
      if (!recents.length) { recentSection.style.display = 'none'; return; }
      recentSection.style.display = 'block';
      recentList.innerHTML = recents.map(function(r) {
        return '<li class="tree-file"><a href="#" data-rel="' + esc(r.relativePath)
          + '" data-abs="' + esc(r.absolutePath) + '" style="padding-left:12px">'
          + esc((r.name || r.relativePath.split('/').pop() || '').replace(/\\.md$/i, '')) + '</a></li>';
      }).join('');
      recentList.querySelectorAll('a').forEach(function(a) {
        a.addEventListener('click', function(e) {
          e.preventDefault();
          loadFile(this.dataset.rel, this.dataset.abs);
        });
      });
    }

    /* ── 컨텍스트 메뉴 (이름변경/삭제) ──────── */
    var ctxMenu      = document.getElementById('ctx-menu');
    var ctxTarget    = null;

    document.addEventListener('contextmenu', function(e) {
      if (!ctxMenu) return;
      var a = e.target && e.target.closest ? e.target.closest('.tree-file a') : null;
      if (!a) { ctxMenu.classList.remove('visible'); return; }
      e.preventDefault();
      ctxTarget = { rel: a.dataset.rel, abs: a.dataset.abs, name: a.textContent.trim(), el: a };
      var x = e.clientX, y = e.clientY;
      var mw = 160, mh = 80, vw = window.innerWidth, vh = window.innerHeight;
      ctxMenu.style.left = (x + mw > vw - 4 ? x - mw : x) + 'px';
      ctxMenu.style.top  = (y + mh > vh - 4 ? y - mh : y) + 'px';
      ctxMenu.classList.add('visible');
    });

    document.addEventListener('click', function(e) {
      if (ctxMenu && !ctxMenu.contains(e.target)) ctxMenu.classList.remove('visible');
    });

    var ctxOpenBtn     = document.getElementById('ctx-open');
    var ctxCopyPath    = document.getElementById('ctx-copy-path');
    var ctxCopyRel     = document.getElementById('ctx-copy-rel');
    var ctxRenameBtn   = document.getElementById('ctx-rename');
    var ctxDeleteBtn   = document.getElementById('ctx-delete');

    if (ctxOpenBtn) ctxOpenBtn.addEventListener('click', function() {
      var t = ctxTarget;
      if (!t) return;
      ctxMenu.classList.remove('visible');
      window.open('/?file=' + encodeURIComponent(t.rel), '_blank');
    });

    if (ctxCopyPath) ctxCopyPath.addEventListener('click', function() {
      var t = ctxTarget;
      if (!t) return;
      ctxMenu.classList.remove('visible');
      navigator.clipboard.writeText(t.abs).then(function() {
        if (statusText) { statusText.textContent = '경로 복사됨'; setTimeout(function(){ statusText.textContent = '연결됨'; }, 2000); }
      }).catch(function() {
        var inp = document.createElement('input');
        inp.value = t.abs;
        document.body.appendChild(inp); inp.select(); document.execCommand('copy'); document.body.removeChild(inp);
      });
    });

    if (ctxCopyRel) ctxCopyRel.addEventListener('click', function() {
      var t = ctxTarget;
      if (!t) return;
      ctxMenu.classList.remove('visible');
      navigator.clipboard.writeText(t.rel).then(function() {
        if (statusText) { statusText.textContent = '상대 경로 복사됨'; setTimeout(function(){ statusText.textContent = '연결됨'; }, 2000); }
      }).catch(function() {
        var inp = document.createElement('input');
        inp.value = t.rel;
        document.body.appendChild(inp); inp.select(); document.execCommand('copy'); document.body.removeChild(inp);
      });
    });

    if (ctxRenameBtn) ctxRenameBtn.addEventListener('click', function() {
      var t = ctxTarget;
      if (!t || !t.el) return;
      ctxMenu.classList.remove('visible');
      var aEl = t.el;
      var curName = aEl.textContent.trim();
      var input = document.createElement('input');
      input.style.cssText = 'all:unset;flex:1;min-width:60px;color:var(--fg);background:var(--editor-bg);'
        + 'border:1px solid var(--accent);border-radius:3px;padding:1px 5px;'
        + 'font-size:12px;outline:none;width:100%;box-sizing:border-box;';
      aEl.style.display = 'none';
      aEl.parentElement.insertBefore(input, aEl);
      input.value = curName;
      input.focus(); input.select();
      var done = false;
      function doRename() {
        if (done) return; done = true;
        var newName = input.value.trim();
        if (input.parentNode) input.parentNode.removeChild(input);
        aEl.style.display = '';
        if (!newName || newName === curName) return;
        fetch('/api/files/rename', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ path: t.rel, newName: newName })
        }).then(function(r) {
          if (!r.ok) return r.json().then(function(d) { throw new Error(d.error || '이름 변경 실패'); });
          return r.json();
        }).then(function(d) {
          if (currentRel === t.rel) {
            currentRel = d.relativePath; currentPath = d.absolutePath;
            if (filepathName) filepathName.textContent = d.relativePath.split('/').pop().replace(/\\.md$/i,'');
            history.replaceState({file:d.relativePath}, '', '/?file=' + encodeURIComponent(d.relativePath));
          }
          var recents = getRecents().map(function(r) {
            return r.relativePath === t.rel ? { name: d.relativePath.split('/').pop(), relativePath: d.relativePath, absolutePath: d.absolutePath } : r;
          });
          localStorage.setItem('mdv-recents', JSON.stringify(recents));
          renderRecents();
        }).catch(function(err) { if (statusText) statusText.textContent = err.message; });
      }
      function cancelRename() {
        if (done) return; done = true;
        if (input.parentNode) input.parentNode.removeChild(input);
        aEl.style.display = '';
      }
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); doRename(); }
        else if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
      });
      input.addEventListener('blur', cancelRename);
    });

    if (ctxDeleteBtn) ctxDeleteBtn.addEventListener('click', function() {
      var t = ctxTarget;
      if (!t) return;
      ctxMenu.classList.remove('visible');
      if (!confirm('"' + t.name + '" 파일을 삭제하시겠습니까?')) return;
      fetch('/api/files?file=' + encodeURIComponent(t.rel), { method: 'DELETE' })
        .then(function(r) {
          if (!r.ok) return r.json().then(function(d) { throw new Error(d.error || '삭제 실패'); });
          if (currentRel === t.rel) {
            mdEl.innerHTML = '<p style="color:var(--muted);padding:24px 0">파일이 삭제되었습니다.</p>';
            currentRel = ''; currentPath = '';
            if (filepathName) filepathName.textContent = '';
            if (filepath) filepath.style.display = 'none';
            if (headerSep) headerSep.style.display = 'none';
            document.title = 'mdViewer';
          }
          var recents = getRecents().filter(function(r) { return r.relativePath !== t.rel; });
          localStorage.setItem('mdv-recents', JSON.stringify(recents));
          renderRecents();
        }).catch(function(err) { if (statusText) statusText.textContent = err.message; });
    });

  })();
  </script>

  <!-- vendor 스크립트: 메인 IIFE 이후 로드 → connect()가 블락되지 않음 -->
  <script src="/vendor/mermaid.min.js" onerror="void 0"></script>
  <script>
    (function(){
      var dark = function(){ return document.documentElement.getAttribute('data-theme')==='dark'
        ||(!document.documentElement.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme:dark)').matches); };
      if(typeof mermaid !== 'undefined'){
        window.__mermaidInit=function(d){ mermaid.initialize({startOnLoad:false,theme:d?'dark':'default'}); };
        window.__mermaidRender=async function(){ var n=document.querySelectorAll('.mermaid:not([data-processed])');if(n.length)await mermaid.run({nodes:n}); };
        window.__mermaidInit(dark());
        window.__mermaidRender();
      }
    })();
  </script>

  <script src="/vendor/d3.min.js" onerror="void 0"></script>
  <script>
    (function() {
      if (typeof d3 === 'undefined') return;
      window.__renderGraph = function(nodes, edges, currentRelPath) {
      var svgEl = document.getElementById('graph-canvas');
      var statsEl = document.getElementById('graph-stats');
      if (!svgEl) return;

      while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

      var W = svgEl.clientWidth || 800;
      var H = svgEl.clientHeight || 600;

      var isDark = document.documentElement.getAttribute('data-theme') === 'dark'
        || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme:dark)').matches);

      var deg = {};
      nodes.forEach(function(n) { deg[n.id] = 0; });
      edges.forEach(function(e) {
        var s = typeof e.source === 'object' ? e.source.id : e.source;
        var t = typeof e.target === 'object' ? e.target.id : e.target;
        if (deg[s] !== undefined) deg[s]++;
        if (deg[t] !== undefined) deg[t]++;
      });

      var C_CURRENT = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0969da';
      var C_LINKED  = isDark ? '#58a6ff' : '#1f6feb';
      var C_SOLO    = isDark ? '#484f58' : '#cdd5de';
      var C_EDGE    = isDark ? '#3d444d' : '#c5cfd8';
      var C_EDGE_HL = isDark ? '#79c0ff' : '#0969da';
      var C_TEXT    = isDark ? '#cdd9e5' : '#1f2328';
      var C_BG_DOT  = isDark ? '#2a3038' : '#dce3ea';

      function nodeColor(n) {
        if (n.relativePath === currentRelPath) return C_CURRENT;
        return (deg[n.id] || 0) > 0 ? C_LINKED : C_SOLO;
      }
      function nodeR(n) {
        var d = deg[n.id] || 0;
        return Math.max(5, Math.min(18, 6 + d * 2.5));
      }

      if (statsEl) statsEl.textContent = nodes.length + '개 노트 · ' + edges.length + '개 링크';

      var svg = d3.select(svgEl).attr('width', W).attr('height', H);

      var defs = svg.append('defs');
      defs.append('pattern').attr('id','dotgrid').attr('width',24).attr('height',24)
        .attr('patternUnits','userSpaceOnUse')
        .append('circle').attr('cx',1).attr('cy',1).attr('r',1).attr('fill', C_BG_DOT);

      var flt = defs.append('filter').attr('id','glow').attr('x','-50%').attr('y','-50%').attr('width','200%').attr('height','200%');
      flt.append('feGaussianBlur').attr('stdDeviation',3).attr('result','blur');
      var fltMerge = flt.append('feMerge');
      fltMerge.append('feMergeNode').attr('in','blur');
      fltMerge.append('feMergeNode').attr('in','SourceGraphic');

      defs.append('marker').attr('id','arrow').attr('viewBox','0 -4 8 8').attr('refX',14).attr('refY',0)
        .attr('markerWidth',6).attr('markerHeight',6).attr('orient','auto')
        .append('path').attr('d','M0,-4L8,0L0,4').attr('fill', C_EDGE).attr('opacity',0.8);

      svg.append('rect').attr('width',W).attr('height',H).attr('fill','url(#dotgrid)');

      var g = svg.append('g');
      var zoom = d3.zoom().scaleExtent([0.08, 12])
        .on('zoom', function(ev) { g.attr('transform', ev.transform); });
      svg.call(zoom);

      var simNodes = nodes.map(function(n) { return Object.assign({}, n); });
      var simEdges = edges.map(function(e) { return {source: e.source, target: e.target}; });

      var linkDist = Math.max(80, Math.min(180, 500 / Math.max(nodes.length, 1)));
      var repulse  = Math.max(-350, -60 * Math.sqrt(Math.max(nodes.length, 1)));

      var sim = d3.forceSimulation(simNodes)
        .force('link', d3.forceLink(simEdges).id(function(d) { return d.id; }).distance(linkDist).strength(0.6))
        .force('charge', d3.forceManyBody().strength(repulse))
        .force('center', d3.forceCenter(W / 2, H / 2))
        .force('collision', d3.forceCollide().radius(function(d) { return nodeR(d) + 8; }))
        .alphaDecay(0.03);

      setTimeout(function() { sim.stop(); }, 8000);

      var linkSel = g.append('g').selectAll('line').data(simEdges).join('line')
        .attr('stroke', C_EDGE)
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.6)
        .attr('marker-end', 'url(#arrow)');

      var nodeSel = g.append('g').selectAll('g').data(simNodes).join('g')
        .call(d3.drag()
          .on('start', function(ev, d) { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
          .on('drag',  function(ev, d) { d.fx=ev.x; d.fy=ev.y; })
          .on('end',   function(ev, d) { if (!ev.active) sim.alphaTarget(0); d.fx=null; d.fy=null; }));

      nodeSel.filter(function(d) { return d.relativePath === currentRelPath; })
        .append('circle')
        .attr('r', function(d) { return nodeR(d) + 5; })
        .attr('fill', 'none')
        .attr('stroke', C_CURRENT)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.4)
        .attr('filter', 'url(#glow)');

      var circles = nodeSel.append('circle')
        .attr('r', nodeR)
        .attr('fill', nodeColor)
        .attr('stroke', isDark ? '#1c2128' : '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('click', function(ev, d) {
          if (window.closeGraph) window.closeGraph();
          if (window.__loadFile) window.__loadFile(d.relativePath, d.absolutePath);
        })
        .on('mouseover', function(ev, d) {
          var conn = new Set([d.id]);
          simEdges.forEach(function(e) {
            var s = (e.source && typeof e.source==='object') ? e.source.id : e.source;
            var t = (e.target && typeof e.target==='object') ? e.target.id : e.target;
            if (s===d.id) conn.add(t);
            if (t===d.id) conn.add(s);
          });
          circles.attr('opacity', function(nd) { return conn.has(nd.id) ? 1 : 0.15; });
          linkSel
            .attr('stroke', function(e) {
              var s=(e.source&&typeof e.source==='object')?e.source.id:e.source;
              var t=(e.target&&typeof e.target==='object')?e.target.id:e.target;
              return (s===d.id||t===d.id) ? C_EDGE_HL : C_EDGE;
            })
            .attr('stroke-width', function(e) {
              var s=(e.source&&typeof e.source==='object')?e.source.id:e.source;
              var t=(e.target&&typeof e.target==='object')?e.target.id:e.target;
              return (s===d.id||t===d.id) ? 2.5 : 1.5;
            })
            .attr('stroke-opacity', function(e) {
              var s=(e.source&&typeof e.source==='object')?e.source.id:e.source;
              var t=(e.target&&typeof e.target==='object')?e.target.id:e.target;
              return (s===d.id||t===d.id) ? 1 : 0.08;
            });
          labels.attr('opacity', function(nd) { return conn.has(nd.id) ? 1 : 0; })
                .attr('font-weight', function(nd) { return nd.id===d.id ? 'bold' : 'normal'; });
        })
        .on('mouseout', function() {
          circles.attr('opacity', 1);
          linkSel.attr('stroke', C_EDGE).attr('stroke-width', 1.5).attr('stroke-opacity', 0.6);
          labels.attr('opacity', function(d) { return (deg[d.id]||0) > 0 ? 0.85 : 0.5; })
                .attr('font-weight', 'normal');
        });

      var labels = nodeSel.append('text')
        .attr('dy', '0.35em')
        .attr('font-size', function(d) { return (deg[d.id]||0) > 2 ? '11px' : '10px'; })
        .attr('font-family', 'var(--font-ui, system-ui)')
        .attr('fill', C_TEXT)
        .attr('pointer-events', 'none')
        .attr('text-anchor', 'middle')
        .attr('y', function(d) { return nodeR(d) + 12; })
        .attr('opacity', function(d) { return (deg[d.id]||0) > 0 ? 0.85 : 0.5; })
        .text(function(d) { var l = d.label || d.id; return l.length > 18 ? l.slice(0,16) + '…' : l; });

      nodeSel.append('title').text(function(d) { return (d.label || d.id) + ' (' + (deg[d.id]||0) + ' 연결)'; });

      sim.on('tick', function() {
        linkSel
          .attr('x1', function(d) { return d.source.x; })
          .attr('y1', function(d) { return d.source.y; })
          .attr('x2', function(d) { return d.target.x; })
          .attr('y2', function(d) { return d.target.y; });
        nodeSel.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
      });

      sim.on('end', function() {
        if (!simNodes.length) return;
        var minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
        simNodes.forEach(function(n) {
          if(n.x<minX) minX=n.x; if(n.y<minY) minY=n.y;
          if(n.x>maxX) maxX=n.x; if(n.y>maxY) maxY=n.y;
        });
        var pad=60, bW=maxX-minX+pad*2, bH=maxY-minY+pad*2;
        var k=Math.min(W/bW, H/bH, 1.5);
        var tx=(W-(maxX+minX)*k)/2, ty=(H-(maxY+minY)*k)/2;
        svg.call(zoom.transform, d3.zoomIdentity.translate(tx,ty).scale(k));
      });
      };
    })();
  </script>
</body>
</html>`;
}

function buildFmHtml(fm?: Record<string, unknown>): string {
  if (!fm || Object.keys(fm).length === 0) return '';
  return '<dl>' + Object.entries(fm).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(String(v))}</dd>`).join('') + '</dl>';
}

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
