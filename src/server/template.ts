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
      --bg:#fff; --fg:#24292f; --border:#d0d7de; --code-bg:#f6f8fa;
      --link:#0969da; --hdr-bg:#24292f; --hdr-fg:#fff; --muted:#636e7b;
      --th-bg:#f6f8fa; --sb-bg:#f6f8fa; --sb-width:240px;
      --editor-bg:#fafafa; --editor-fg:#24292f;
      --accent:#0969da;
    }
    @media (prefers-color-scheme: dark) { :root {
      --bg:#0d1117; --fg:#e6edf3; --border:#30363d; --code-bg:#161b22;
      --link:#58a6ff; --hdr-bg:#161b22; --hdr-fg:#e6edf3; --muted:#8b949e;
      --th-bg:#161b22; --sb-bg:#0d1117; --editor-bg:#161b22; --editor-fg:#e6edf3;
      --accent:#58a6ff;
    }}
    html[data-theme="light"] {
      --bg:#fff; --fg:#24292f; --border:#d0d7de; --code-bg:#f6f8fa;
      --link:#0969da; --hdr-bg:#24292f; --hdr-fg:#fff; --muted:#636e7b;
      --th-bg:#f6f8fa; --sb-bg:#f6f8fa; --editor-bg:#fafafa; --editor-fg:#24292f; --accent:#0969da;
    }
    html[data-theme="dark"] {
      --bg:#0d1117; --fg:#e6edf3; --border:#30363d; --code-bg:#161b22;
      --link:#58a6ff; --hdr-bg:#161b22; --hdr-fg:#e6edf3; --muted:#8b949e;
      --th-bg:#161b22; --sb-bg:#0d1117; --editor-bg:#161b22; --editor-fg:#e6edf3; --accent:#58a6ff;
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
              padding:0 12px;height:44px;display:flex;align-items:center;gap:8px;
              border-bottom:1px solid var(--border);font-size:13px;flex-shrink:0; }
    .logo { font-weight:700;opacity:.55;letter-spacing:.05em; }
    #filepath { font-family:'SFMono-Regular',Consolas,monospace;font-size:12px;opacity:.85; }
    #modified-dot { color:#f0883e;display:none;margin-left:2px; }
    #mode-btns { display:flex;gap:2px;margin-left:4px; }
    .mode-btn { background:none;border:none;cursor:pointer;color:var(--hdr-fg);
                opacity:.5;padding:4px 8px;border-radius:4px;font-size:13px;line-height:1; }
    .mode-btn:hover { opacity:.85;background:rgba(255,255,255,.1); }
    .mode-btn.active { opacity:1;background:rgba(255,255,255,.18); }
    #save-btn { margin-left:4px;background:var(--accent);border:none;color:#fff;cursor:pointer;
                padding:3px 10px;border-radius:5px;font-size:12px;font-weight:600;display:none; }
    #save-btn:hover { opacity:.85; }
    #status { margin-left:auto;display:flex;align-items:center;gap:5px;opacity:.6;font-size:12px; }
    .dot { width:7px;height:7px;border-radius:50%;background:#3fb950;transition:background .3s; }
    .dot.off { background:#f85149; }
    #theme-btn { background:none;border:none;cursor:pointer;color:var(--hdr-fg);
                 opacity:.6;font-size:15px;padding:4px 6px;border-radius:4px; }
    #theme-btn:hover { opacity:1;background:rgba(255,255,255,.1); }

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
    .tree-file a { display:flex;align-items:center;gap:4px;padding:3px 8px 3px 12px;
                   color:var(--muted);text-decoration:none;font-size:12px;
                   white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    .tree-file a:hover { color:var(--fg);background:var(--code-bg); }
    .tree-file a.active { color:var(--accent);font-weight:600;background:var(--code-bg); }

    /* TOC */
    #toc-list { list-style:none;padding:0; }
    #toc-list li a { display:block;padding:3px 12px;color:var(--muted);text-decoration:none;
                     font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                     border-left:2px solid transparent;transition:color .15s,border-color .15s; }
    #toc-list li a:hover { color:var(--fg); }
    #toc-list li a.active { color:var(--accent);border-left-color:var(--accent); }
    #toc-list li.h3 a { padding-left:20px; }
    #toc-list li.h4 a { padding-left:28px; }

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

    /* ── 인쇄 ────────────────────────────────── */
    @media print {
      #header,#sidebar,#editor-panel { display:none!important; }
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
    <span class="logo">MdPad</span>
    <span id="header-sep" style="opacity:.3${filename ? '' : ';display:none'}"> / </span>
    <span id="filepath" style="${filename ? '' : 'display:none'}"><span id="filepath-name">${esc(filename)}</span><span id="modified-dot">●</span></span>
    <div id="mode-btns">
      <button class="mode-btn active" id="btn-view"  title="미리보기 (V)" onclick="setMode('view')">👁</button>
      <button class="mode-btn"        id="btn-split" title="분할 편집 (S)" onclick="setMode('split')">▥</button>
      <button class="mode-btn"        id="btn-edit"  title="전체 편집 (E)" onclick="setMode('edit')">✏</button>
    </div>
    <button id="save-btn" title="저장 (Ctrl+S)" onclick="saveFile()">저장</button>
    <button id="theme-btn" onclick="toggleTheme()">◑</button>
    <div id="status">
      <span class="dot off" id="dot"></span>
      <span id="status-text">연결 중...</span>
    </div>
  </div>

  <div id="main">
    <!-- ── 사이드바 ── -->
    <nav id="sidebar">
      <div id="sidebar-inner">
        <div id="tree-section" class="sb-section" style="display:none">
          <span class="sb-title">파일</span>
          <ul class="tree-list" id="tree-root" role="tree"></ul>
          <hr class="sb-divider">
        </div>
        <div id="toc-section" class="sb-section">
          <span class="sb-title">목차</span>
          <ul id="toc-list" role="list"></ul>
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

  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    const dark = ()=>document.documentElement.getAttribute('data-theme')==='dark'
      ||(!document.documentElement.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme:dark)').matches);
    window.__mermaidInit=d=>mermaid.initialize({startOnLoad:false,theme:d?'dark':'default'});
    window.__mermaidRender=async()=>{const n=document.querySelectorAll('.mermaid:not([data-processed])');if(n.length)await mermaid.run({nodes:n});};
    window.__mermaidInit(dark());
    window.__mermaidRender();
  </script>

  <script id="mdv-config" type="application/json">${configJson}</script>

  <script>
  (function(){
    /* ── 요소 ────────────────────────── */
    var mdEl      = document.getElementById('markdown');
    var fmEl      = document.getElementById('frontmatter');
    var treeRoot  = document.getElementById('tree-root');
    var treeSection=document.getElementById('tree-section');
    var tocList   = document.getElementById('toc-list');
    var editor    = document.getElementById('editor');
    var editorPanel=document.getElementById('editor-panel');
    var previewPanel=document.getElementById('preview-panel');
    var modDot      = document.getElementById('modified-dot');
    var saveBtn     = document.getElementById('save-btn');
    var dot         = document.getElementById('dot');
    var statusText  = document.getElementById('status-text');
    var filepath    = document.getElementById('filepath');
    var filepathName= document.getElementById('filepath-name');
    var headerSep   = document.getElementById('header-sep');

    var cfg         = JSON.parse(document.getElementById('mdv-config').textContent||'{}');
    var currentPath = cfg.currentPath||'';
    var currentRel  = '';
    var modified    = false;
    var currentMode = localStorage.getItem('mdv-mode')||'view';
    var retries     = 0, MAX = 10;
    var lastEditTime= 0;
    var previewTimer= null;

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

    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey||e.metaKey)&&e.key==='s') { e.preventDefault(); saveFile(); }
      if (!e.ctrlKey&&!e.metaKey&&!e.altKey) {
        if (e.key==='v') setMode('view');
        else if (e.key==='s') setMode('split');
        else if (e.key==='e') setMode('edit');
      }
    });

    /* ── 에디터 ──────────────────────── */
    editor.addEventListener('keydown', function(e) {
      // Tab → 2칸 들여쓰기
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
      } catch(e) { console.error('에디터 로드 실패', e); }
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
        renderToc(d.toc);
      } catch(e) {}
    }

    window.saveFile = async function() {
      if (!currentRel||!modified) return;
      try {
        var res=await fetch('/api/save',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({path:currentRel,content:editor.value})
        });
        if (res.ok) { modified=false; if (modDot) modDot.style.display='none'; statusText.textContent='저장됨'; setTimeout(()=>statusText.textContent='연결됨',2000); }
      } catch(e) { statusText.textContent='저장 실패'; }
    };

    /* ── 파일 트리 ───────────────────── */
    if (cfg.isDir&&cfg.tree&&cfg.tree.children&&cfg.tree.children.length) {
      treeSection.style.display='block';
      treeRoot.innerHTML=renderTreeChildren(cfg.tree.children,'');
      treeRoot.querySelectorAll('.tree-file a').forEach(function(a) {
        a.addEventListener('click', function(e) {
          e.preventDefault();
          loadFile(this.dataset.rel, this.dataset.abs);
        });
      });
      treeRoot.querySelectorAll('.tree-dir-label').forEach(function(el) {
        el.addEventListener('click', function() { toggleDir(this); });
      });
      // 현재 파일이 들어있는 폴더 자동 펼치기
      expandToActive();
    }

    function renderTreeChildren(nodes, prefix) {
      var html='';
      for (var i=0;i<nodes.length;i++) {
        var n=nodes[i];
        if (n.type==='dir') {
          var id='dir-'+esc(prefix+n.name).replace(/[^a-zA-Z0-9]/g,'-');
          html+='<li class="tree-dir"><div class="tree-dir-label" data-id="'+id+'">'
            +'<span class="tree-arrow" id="arr-'+id+'">▶</span>'
            +'<span>📁 '+esc(n.name)+'</span></div>'
            +'<ul class="tree-children tree-list" id="'+id+'">'
            +(n.children?renderTreeChildren(n.children,prefix+n.name+'/'):'')
            +'</ul></li>';
        } else {
          var isActive=(n.absPath===currentPath);
          html+='<li class="tree-file"><a href="#" data-rel="'+esc(n.path)+'" data-abs="'+esc(n.absPath)+'" class="'+(isActive?'active':'')+'">'
            +'📄 '+esc(n.name.replace(/\\.md$/i,''))+'</a></li>';
        }
      }
      return html;
    }

    function toggleDir(label) {
      var id=label.dataset.id;
      var ul=document.getElementById(id);
      var arr=document.getElementById('arr-'+id);
      if (!ul) return;
      var open=ul.classList.toggle('open');
      if (arr) arr.classList.toggle('open', open);
    }

    function expandToActive() {
      var active=treeRoot.querySelector('.tree-file a.active');
      if (!active) return;
      var el=active.parentElement;
      while (el&&el!==treeRoot) {
        if (el.classList.contains('tree-children')) {
          el.classList.add('open');
          var id=el.id;
          var arr=document.getElementById('arr-'+id);
          if (arr) arr.classList.add('open');
        }
        el=el.parentElement;
      }
    }

    function setActiveFile(absPath) {
      currentPath=absPath;
      treeRoot.querySelectorAll('.tree-file a').forEach(function(a) {
        a.classList.toggle('active', a.dataset.abs===absPath);
      });
    }

    async function loadFile(rel, abs) {
      try {
        statusText.textContent='로딩 중...';
        var res=await fetch('/api/render?file='+encodeURIComponent(rel));
        if (!res.ok) throw new Error('HTTP '+res.status);
        var d=await res.json();
        var anchor=saveAnchor();
        mdEl.innerHTML=d.html;
        if (window.__mermaidRender) window.__mermaidRender();
        renderToc(d.toc);
        renderFm(d.frontmatter);
        restoreAnchor(anchor);
        setActiveFile(abs);
        currentRel=rel;
        var name=d.name||rel.split('/').pop();
        document.title=name.replace(/\\.md$/i,'')+'  — MdPad';
        if (filepathName) filepathName.textContent=name;
        if (filepath)  filepath.style.display='';
        if (headerSep) headerSep.style.display='';
        history.pushState({file:rel},'','/?file='+encodeURIComponent(rel));
        statusText.textContent='연결됨';
        modified=false; if (modDot) modDot.style.display='none';
        // 에디터 내용도 교체
        if (currentMode!=='view') { editor.value=''; loadEditorContent(rel); }
      } catch(e) { statusText.textContent='로드 실패: '+e.message; }
    }

    window.addEventListener('popstate', function(e) {
      var f=e.state&&e.state.file;
      if (f) { var entry=cfg.files.find(function(x){return x.relativePath===f;}); if(entry) loadFile(entry.relativePath,entry.absolutePath); }
    });

    /* ── TOC ─────────────────────────── */
    function renderToc(toc) {
      if (!toc||!toc.length) { tocList.innerHTML=''; return; }
      tocList.innerHTML=toc.filter(function(i){return i.depth<=4;}).map(function(i) {
        return '<li class="h'+i.depth+'"><a href="#'+esc(i.id)+'">'+esc(i.text)+'</a></li>';
      }).join('');
      setupTocObserver();
    }

    var observer=null;
    function setupTocObserver() {
      if (observer) observer.disconnect();
      observer=new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
          var a=tocList.querySelector('a[href="#'+e.target.id+'"]');
          if (a) a.classList.toggle('active',e.isIntersecting);
        });
      },{rootMargin:'-44px 0px -70% 0px'});
      mdEl.querySelectorAll('h1,h2,h3,h4').forEach(function(h){observer.observe(h);});
    }

    /* ── Frontmatter ─────────────────── */
    function renderFm(fm) {
      if (!fm||!Object.keys(fm).length) { fmEl.style.display='none'; return; }
      fmEl.innerHTML='<dl>'+Object.entries(fm).map(function(kv) {
        return '<dt>'+esc(kv[0])+'</dt><dd>'+esc(String(kv[1]))+'</dd>';
      }).join('')+'</dl>';
      fmEl.style.display='block';
    }

    /* ── 스크롤 복원 ─────────────────── */
    function saveAnchor() {
      var last=null;
      mdEl.querySelectorAll('h1,h2,h3,h4').forEach(function(h) {
        if (h.getBoundingClientRect().top<=80) last=h.id;
      });
      return last;
    }
    function restoreAnchor(id) {
      if (!id) { previewPanel.scrollTop=0; return; }
      var el=document.getElementById(id);
      if (el) el.scrollIntoView({block:'start'});
    }

    /* ── 테마 ────────────────────────── */
    function isDark() {
      var t=document.documentElement.getAttribute('data-theme');
      return t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches);
    }
    function syncThemeBtn() {
      var btn=document.getElementById('theme-btn');
      btn.textContent=isDark()?'☀':'☾';
    }
    window.toggleTheme=function() {
      var next=isDark()?'light':'dark';
      document.documentElement.setAttribute('data-theme',next);
      localStorage.setItem('mdv-theme',next);
      syncThemeBtn();
      if (window.__mermaidInit) window.__mermaidInit(next==='dark');
    };
    syncThemeBtn();

    /* ── WebSocket ───────────────────── */
    function connect() {
      var ws=new WebSocket('ws://'+location.host+'/ws');
      ws.onopen=function(){retries=0;dot.className='dot';statusText.textContent='연결됨';};
      ws.onmessage=function(e) {
        var msg=JSON.parse(e.data);
        if (msg.type==='update') {
          if (msg.path&&currentPath&&msg.path!==currentPath) return;
          // 편집 중이면 미리보기만 업데이트 (에디터 내용은 유지)
          if (currentMode!=='view'&&Date.now()-lastEditTime<2000) return;
          var anchor=saveAnchor();
          mdEl.innerHTML=msg.html;
          if (window.__mermaidRender) window.__mermaidRender();
          renderToc(msg.toc);
          renderFm(msg.frontmatter);
          restoreAnchor(anchor);
          if (currentMode!=='view'&&!modified&&currentRel) { editor.value=''; loadEditorContent(currentRel); }
        } else if (msg.type==='error') {
          statusText.textContent='오류: '+msg.message;
        }
      };
      ws.onclose=function(){
        dot.className='dot off';
        if (retries<MAX){var d=Math.min(500*Math.pow(1.5,retries),10000);statusText.textContent='재연결 중…';setTimeout(connect,d);retries++;}
        else statusText.textContent='연결 끊김';
      };
      ws.onerror=function(){ws.close();};
    }

    /* ── 초기화 ─────────────────────── */
    renderFm(${fmJson});
    renderToc([]);

    // 초기 currentRel 설정
    if (cfg.currentPath&&cfg.files) {
      var found=cfg.files.find(function(f){return f.absolutePath===cfg.currentPath;});
      if (found) currentRel=found.relativePath;
    }

    setMode(currentMode);
    connect();

    function esc(s){
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
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
