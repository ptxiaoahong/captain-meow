# 猫猫船长个人网站重构（路线 A：去主题，自建布局）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除 hugo-theme-stack 依赖，用纯 Hugo 自建一套"浅色杂志式"摄影布局：首页 Hero 大图 + 瀑布流，文章页单列全宽沉浸看图，移动端沉浸单列，现代灯箱（GLightbox 替换 PhotoSwipe 4），响应式图片（补 width/height + srcset），根治布局跳变与补丁债。

**Architecture:** 利用 Hugo 布局查找顺序（项目 `layouts/` 优先于主题）**渐进替换**：先自建全套骨架（baseof/head/header/footer/icon），再逐页覆盖（首页→文章页→列表页），最后删除主题依赖与旧补丁。每个 Task 结束站点都可构建、可访问。核心图片渲染通过 Hugo 内置 `imageConfig` 函数读取 static 图片真实尺寸（解决现有 `resources.Get` 查不到 static 图片导致布局跳变的根因）。

**Tech Stack:** Hugo（extended v0.144+）、SCSS（Hugo 原生管道）+ CSS 变量 tokens、GLightbox 3.3（CDN，无构建依赖）、Waline（保留，清理调试代码）、原生 CSS `columns` 瀑布流。

**设计决策（用户已确认）：**
- 视觉基调：浅色杂志式（暖米白背景、衬线标题、大留白）
- 首页：精选 Hero 大图 + 瀑布流
- 文章页：单列纵向全宽（强调单张构图）
- 移动端：文章页单列 + 上下滑沉浸

---

## 文件结构总览（目标态）

```
layouts/
  _default/
    baseof.html            # 全局骨架（head + header + main + footer）
    list.html              # 列表页（分类页 / 全部页）+ 分页
    single.html            # 文章详情页
    _markup/
      render-image.html    # 重写：单列全宽 + 真实尺寸 + medium 图 + GLightbox 链接
  index.html               # 首页：hero + 瀑布流
  404.html                 # 404 页
  partials/
    head.html              # head：meta、OG、Google Analytics、样式管道
    icon.html              # 自建 SVG 图标集合（替代主题 helper/icon）
    header.html            # 顶部导航（站点名 + 菜单 + 移动端汉堡）
    footer.html            # 页脚（社交、微信二维码、版权）
    hero.html              # 首页精选大图区
    article-card.html      # 瀑布流/列表卡片
    article-header.html    # 文章页头部（返回按钮 + 分类 + 标题 + 日期）
    lightbox.html          # GLightbox CDN + 初始化
    comments.html          # Waline 评论（简化版）
    back-to-top.html       # 回到顶部（保留现有）
    qrcode-modal.html      # 微信二维码弹窗（保留现有，仅重定位到 footer）
    helper/
      image.html           # 复用现有（封面图提取）
assets/
  scss/
    _tokens.scss           # 设计 tokens（颜色/间距/字体/圆角/阴影/断点）
    _base.scss             # 全局 reset + 基础排版
    _header.scss           # 顶部导航
    _footer.scss           # 页脚
    _home.scss             # 首页 hero + 瀑布流
    _article.scss          # 文章页（单列全宽、图注、排版）
    _list.scss             # 列表页
    _lightbox.scss         # GLightbox 风格微调
    style.scss             # 入口（@use 全部模块）
  js/
    scroll-position.js     # 保留（滚动位置恢复）
hugo.toml                  # 移除 theme、清理主题特有 params、图片处理
```

**删除清单（最终）：** `themes/hugo-theme-stack/`、`.gitmodules` 中主题条目、`assets/scss/custom.scss`、`layouts/partials/sidebar/`、`layouts/partials/article/components/photoswipe.html`、`layouts/partials/article/components/details.html`、`layouts/partials/article/components/header.html`、`layouts/partials/article/components/back-to-list.html`（并入新 article-header）、`assets/js/gallery-enhance.js`、`layouts/partials/footer/custom.html`（并入新 footer）。

---

## Phase 0 — 准备

### Task 0: 隔离工作分支

**Files:**
- Git 操作

- [ ] **Step 1: 确认当前工作区状态**

Run: `git -C "/Users/hongshize/文档/Project/猫猫船长个人网站" status --short`
Expected: 显示若干未提交改动（`.DS_Store`、`assets/scss/custom.scss`、`layouts/_default/list.html` 等）。

- [ ] **Step 2: 提交现有未提交改动（保留在 main 的历史中，重构在分支上进行）**

```bash
git add -A
git commit -m "chore: 保存重构前工作区状态"
```

- [ ] **Step 3: 创建重构分支**

```bash
git checkout -b feature/redesign-v2
```

- [ ] **Step 4: 确认分支**

Run: `git branch --show-current`
Expected: `feature/redesign-v2`

---

## Phase 1 — 骨架（无主题依赖的裸 Hugo）

### Task 1: 设计 tokens 与全局基础样式

**Files:**
- Create: `assets/scss/_tokens.scss`
- Create: `assets/scss/_base.scss`
- Create: `assets/scss/style.scss`

- [ ] **Step 1: 创建 `assets/scss/_tokens.scss`**

```scss
/* ============================================================
   设计 Tokens — 浅色杂志式
   ============================================================ */
:root {
    /* 颜色 */
    --color-bg:            #faf9f7;   /* 暖米白页面背景 */
    --color-surface:       #ffffff;   /* 卡片/容器 */
    --color-text:          #1d1d1f;   /* 主文本（近黑） */
    --color-text-secondary:#6e6a64;   /* 次级文本 */
    --color-text-tertiary: #9a958e;   /* 弱文本 */
    --color-border:        #e8e4dd;   /* 细边框 */
    --color-accent:        #b07d3f;   /* 强调色（暖赭石） */
    --color-accent-soft:   #f3ecdf;   /* 强调色浅底 */
    --color-code-bg:       #f4f2ee;

    /* 字体 */
    --font-serif:  "Iowan Old Style", "Songti SC", "Noto Serif SC", "Source Han Serif SC", STSong, Georgia, serif;
    --font-sans:   -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    --font-mono:   "SF Mono", Menlo, Consolas, monospace;

    /* 字号（rem，html 16px） */
    --text-xs:   1.2rem;   /* 12px 标签/元信息 */
    --text-sm:   1.3rem;   /* 13px */
    --text-base: 1.6rem;   /* 16px 正文 */
    --text-lg:   1.8rem;   /* 18px */
    --text-xl:   2.2rem;   /* 22px */
    --text-2xl:  3.2rem;   /* 32px 文章标题 */
    --text-3xl:  4.8rem;   /* 48px Hero 标题 */

    /* 间距（8px 网格） */
    --space-1: 0.8rem;   /* 8px */
    --space-2: 1.6rem;   /* 16px */
    --space-3: 2.4rem;   /* 24px */
    --space-4: 3.2rem;   /* 32px */
    --space-5: 4.8rem;   /* 48px */
    --space-6: 6.4rem;   /* 64px */
    --space-7: 9.6rem;   /* 96px */

    /* 布局 */
    --container-max: 1200px;
    --article-max:   960px;   /* 文章图片容器宽 */
    --text-max:      760px;   /* 正文阅读宽 */
    --header-height: 6.4rem;

    /* 圆角 / 阴影 */
    --radius-sm: 0.8rem;
    --radius-md: 1.2rem;
    --radius-lg: 2rem;
    --shadow-1: 0 1px 3px rgba(0, 0, 0, 0.05);
    --shadow-2: 0 4px 16px rgba(0, 0, 0, 0.07);

    /* 动效 */
    --ease: cubic-bezier(0.22, 1, 0.36, 1);
    --duration: 0.25s;

    /* 断点 */
    --bp-mobile: 768px;
    --bp-tablet: 1024px;
}
```

- [ ] **Step 2: 创建 `assets/scss/_base.scss`**

```scss
/* ============================================================
   全局基础样式
   ============================================================ */
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html {
    font-size: 62.5%; /* 1rem = 10px，方便换算 */
    -webkit-text-size-adjust: 100%;
}

body {
    font-family: var(--font-sans);
    font-size: var(--text-base);
    line-height: 1.75;
    color: var(--color-text);
    background-color: var(--color-bg);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
}

img {
    display: block;
    max-width: 100%;
    height: auto;
}

a {
    color: inherit;
    text-decoration: none;
    transition: color var(--duration) var(--ease);
}

a:hover {
    color: var(--color-accent);
}

h1, h2, h3, h4 {
    font-family: var(--font-serif);
    font-weight: 600;
    line-height: 1.3;
    color: var(--color-text);
}

.container {
    width: 100%;
    max-width: var(--container-max);
    margin: 0 auto;
    padding: 0 var(--space-3);
}

::selection {
    background: var(--color-accent-soft);
}
```

- [ ] **Step 3: 创建 `assets/scss/style.scss`（入口）**

```scss
/* 入口：按依赖顺序导入 */
@use "tokens";
@use "base";
@use "header";
@use "footer";
@use "home";
@use "article";
@use "list";
@use "lightbox";
```

> 注意：本 Task 中 `_header.scss` 等模块尚不存在，Step 3 的 `@use` 会在构建时报错。**先只导入 tokens 和 base**，后续 Task 创建对应文件时再补 `@use` 行：

```scss
@use "tokens";
@use "base";
/* 后续 Task 依次追加：
@use "header";
@use "footer";
@use "home";
@use "article";
@use "list";
@use "lightbox";
*/
```

- [ ] **Step 4: 验证 SCSS 管道可用**

```bash
hugo --gc --minify
```

Expected: 构建成功（此时站点仍用主题布局，但 assets/scss/style.scss 已编译。若 Hugo 报 `@use` 错误，先执行 Step 3 的"只导入 tokens/base"方案）。

- [ ] **Step 5: Commit**

```bash
git add assets/scss/
git commit -m "feat(scss): 建立设计 tokens 与全局基础样式"
```

### Task 2: 自建 head partial（含样式管道与 GA）

**Files:**
- Create: `layouts/partials/head.html`
- Modify: `hugo.toml`（移除主题相关 head 配置的依赖，本步只确认参数保留）

- [ ] **Step 1: 创建 `layouts/partials/head.html`**

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{ if .IsHome }}{{ .Site.Title }}{{ else }}{{ .Title }} · {{ .Site.Title }}{{ end }}</title>
<meta name="description" content="{{ with .Description }}{{ . }}{{ else }}{{ .Site.Params.sidebar.subtitle }}{{ end }}">

<!-- Open Graph -->
<meta property="og:type" content="{{ if .IsPage }}article{{ else }}website{{ end }}">
<meta property="og:title" content="{{ .Title }}">
<meta property="og:url" content="{{ .Permalink }}">
{{ with .Params.image }}<meta property="og:image" content="{{ . }}">{{ end }}
<meta name="twitter:card" content="summary_large_image">

<!-- RSS -->
{{ with .OutputFormats.Get "rss" -}}
<link rel="alternate" type="application/rss+xml" title="{{ $.Site.Title }}" href="{{ .Permalink }}">
{{ end }}

<link rel="icon" href="/favicon.ico">

<!-- 样式管道 -->
{{ $style := resources.Get "scss/style.scss" | toCSS | minify | fingerprint }}
<link rel="stylesheet" href="{{ $style.RelPermalink }}" integrity="{{ $style.Data.Integrity }}">

<!-- 站点描述 JSON-LD -->
<script type="application/ld+json">
{
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "{{ .Site.Title }}",
    "url": "{{ .Site.BaseURL }}"
}
</script>

{{ partial "google_analytics.html" . }}
```

- [ ] **Step 2: 验证**

Run: `hugo --gc --minify`
Expected: 构建成功。检查 `public/index.html` 中 `<head>` 是否包含新的样式 link（`style.min.*.css`）与 GA 脚本。

Run: `grep -c "google-analytics\|gtag" public/index.html`
Expected: 输出 ≥ 2（GA 脚本被引入）。

- [ ] **Step 3: Commit**

```bash
git add layouts/partials/head.html
git commit -m "feat(layout): 自建 head partial（meta/OG/样式管道/GA）"
```

### Task 3: 自建 SVG 图标集合

**Files:**
- Create: `layouts/partials/icon.html`

- [ ] **Step 1: 创建 `layouts/partials/icon.html`**

```html
{{/* 用法：{{ partial "icon" (dict "name" "calendar" "class" "icon") }}
     name 可选：calendar / clock / mail / wechat / arrow-left / arrow-up / chat / close */}}
{{- $name := .name -}}
{{- $class := default "icon" .class -}}
{{- if eq $name "calendar" -}}
<svg class="{{ $class }}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
{{- else if eq $name "clock" -}}
<svg class="{{ $class }}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
{{- else if eq $name "mail" -}}
<svg class="{{ $class }}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="m2 7 10 7 10-7" stroke="currentColor" stroke-width="2"/></svg>
{{- else if eq $name "wechat" -}}
<svg class="{{ $class }}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16" aria-hidden="true"><path d="M9 4C5.1 4 2 6.7 2 10c0 1.9 1 3.5 2.6 4.6L4 17l2.6-1.3c.7.2 1.5.3 2.4.3h.3c-.2-.6-.3-1.2-.3-1.9 0-3.1 2.9-5.6 6.5-5.6h.4C15.3 5.7 12.5 4 9 4z" fill="currentColor"/><path d="M22 13.5c0-2.6-2.6-4.7-5.8-4.7s-5.8 2.1-5.8 4.7 2.6 4.7 5.8 4.7c.7 0 1.4-.1 2-.3L20 19l-.8-1.8c1.7-.9 2.8-2.2 2.8-3.7z" fill="currentColor" opacity="0.7"/></svg>
{{- else if eq $name "arrow-left" -}}
<svg class="{{ $class }}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18" aria-hidden="true"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
{{- else if eq $name "arrow-up" -}}
<svg class="{{ $class }}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18" aria-hidden="true"><path d="M12 19V5M12 5l-7 7M12 5l7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
{{- else if eq $name "chat" -}}
<svg class="{{ $class }}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
{{- else if eq $name "menu" -}}
<svg class="{{ $class }}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
{{- else if eq $name "close" -}}
<svg class="{{ $class }}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
{{- end -}}
```

- [ ] **Step 2: 验证**

Run: `hugo --gc --minify`
Expected: 构建成功（partial 尚未被引用，只验证语法）。

- [ ] **Step 3: Commit**

```bash
git add layouts/partials/icon.html
git commit -m "feat(layout): 自建 SVG 图标 partial（替代主题 helper/icon）"
```

### Task 4: 顶部导航 header + 移动端汉堡菜单

**Files:**
- Create: `layouts/partials/header.html`
- Create: `assets/scss/_header.scss`
- Modify: `assets/scss/style.scss`（追加 `@use "header";`）

- [ ] **Step 1: 创建 `layouts/partials/header.html`**

```html
<header class="site-header">
    <div class="container site-header__inner">
        <a class="site-header__brand" href="/">{{ .Site.Title }}</a>

        <nav class="site-header__nav" id="site-nav" aria-label="主导航">
            {{ range .Site.Menus.main }}
            <a class="site-header__link{{ if $.IsMenuCurrent "main" . }} is-active{{ end }}" href="{{ .URL }}">
                {{ .Name }}
            </a>
            {{ end }}
        </nav>

        <button class="site-header__toggle" id="nav-toggle" aria-label="打开菜单" aria-expanded="false" aria-controls="site-nav">
            {{ partial "icon" (dict "name" "menu") }}
        </button>
    </div>
</header>

<script>
(function () {
    var toggle = document.getElementById('nav-toggle');
    var nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    });
    // 点击链接后自动收起（移动端）
    nav.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') {
            nav.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });
})();
</script>
```

- [ ] **Step 2: 创建 `assets/scss/_header.scss`**

```scss
.site-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background-color: rgba(250, 249, 247, 0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--color-border);
}

.site-header__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--header-height);
    gap: var(--space-3);
}

.site-header__brand {
    font-family: var(--font-serif);
    font-size: var(--text-xl);
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
}

.site-header__nav {
    display: flex;
    gap: var(--space-4);
    align-items: center;
}

.site-header__link {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    transition: color var(--duration) var(--ease), background-color var(--duration) var(--ease);

    &:hover {
        color: var(--color-text);
        background-color: var(--color-accent-soft);
    }

    &.is-active {
        color: var(--color-accent);
        font-weight: 500;
    }
}

.site-header__toggle {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text);
    padding: var(--space-1);
}

@media (max-width: 767px) {
    .site-header__toggle {
        display: block;
    }

    .site-header__nav {
        display: none;
        position: absolute;
        top: var(--header-height);
        left: 0;
        right: 0;
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        background-color: var(--color-bg);
        border-bottom: 1px solid var(--color-border);
        padding: var(--space-2) var(--space-3);
        box-shadow: var(--shadow-2);

        &.is-open {
            display: flex;
        }
    }

    .site-header__link {
        padding: var(--space-2) var(--space-1);
        border-bottom: 1px solid var(--color-border);

        &:last-child {
            border-bottom: none;
        }
    }
}
```

- [ ] **Step 3: 修改 `assets/scss/style.scss`，追加 `@use "header";`**

```scss
@use "tokens";
@use "base";
@use "header";
/* @use "footer"; 后续 Task 追加 */
```

- [ ] **Step 4: 验证**

Run: `hugo --gc --minify`
Expected: 构建成功。

- [ ] **Step 5: Commit**

```bash
git add layouts/partials/header.html assets/scss/_header.scss assets/scss/style.scss
git commit -m "feat(layout): 顶部导航 + 移动端汉堡菜单"
```

### Task 5: 页脚 footer（社交 + 微信二维码 + 版权）

**Files:**
- Create: `layouts/partials/footer.html`
- Create: `assets/scss/_footer.scss`
- Modify: `assets/scss/style.scss`（追加 `@use "footer";`）
- Note: `layouts/partials/qrcode-modal.html` 与 `layouts/partials/footer/back-to-top.html` 保留复用

- [ ] **Step 1: 创建 `layouts/partials/footer.html`**

```html
<footer class="site-footer">
    <div class="container site-footer__inner">
        <div class="site-footer__brand">
            <span class="site-footer__name">{{ .Site.Title }}</span>
            <p class="site-footer__desc">{{ .Site.Params.sidebar.subtitle }}</p>
        </div>

        <div class="site-footer__social">
            {{ range .Site.Menus.social }}
                {{ if .Params.qrcode }}
                <a class="site-footer__social-link" href="{{ .URL }}" data-qrcode="true" title="{{ .Name }}">
                    {{ partial "icon" (dict "name" "wechat" "class" "site-footer__social-icon") }}
                    <span>{{ .Name }}</span>
                </a>
                {{ else }}
                <a class="site-footer__social-link" href="{{ .URL }}" target="_blank" rel="noopener" title="{{ .Name }}">
                    {{ partial "icon" (dict "name" "mail" "class" "site-footer__social-icon") }}
                    <span>{{ .Name }}</span>
                </a>
                {{ end }}
            {{ end }}
        </div>

        <p class="site-footer__copyright">
            © {{ with .Site.Params.footer.since }}{{ . }}{{ end }}-{{ now.Format "2006" }} {{ .Site.Title }} ·
            <a href="/index.xml">RSS</a>
        </p>
    </div>
</footer>
```

> 注意：`data-qrcode="true"` 由现有 `qrcode-modal.html` 的点击拦截逻辑驱动（该文件保留，需在 baseof 中引用）。

- [ ] **Step 2: 创建 `assets/scss/_footer.scss`**

```scss
.site-footer {
    margin-top: var(--space-7);
    border-top: 1px solid var(--color-border);
    background-color: var(--color-surface);
    padding: var(--space-5) 0;
}

.site-footer__inner {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    align-items: center;
    text-align: center;
}

.site-footer__name {
    font-family: var(--font-serif);
    font-size: var(--text-lg);
    font-weight: 600;
}

.site-footer__desc {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    max-width: 480px;
    margin: var(--space-1) auto 0;
    line-height: 1.6;
}

.site-footer__social {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-2);
}

.site-footer__social-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    transition: all var(--duration) var(--ease);

    &:hover {
        color: var(--color-accent);
        border-color: var(--color-accent);
        background-color: var(--color-accent-soft);
    }
}

.site-footer__copyright {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    margin-top: var(--space-2);
}
```

- [ ] **Step 3: 修改 `assets/scss/style.scss`，追加 `@use "footer";`**

- [ ] **Step 4: 验证**

Run: `hugo --gc --minify`
Expected: 构建成功。

- [ ] **Step 5: Commit**

```bash
git add layouts/partials/footer.html assets/scss/_footer.scss assets/scss/style.scss
git commit -m "feat(layout): 页脚（社交/二维码/版权）"
```

### Task 6: baseof.html 骨架（新布局主骨架）

**Files:**
- Modify: `layouts/_default/baseof.html`（重写，不再引用任何主题 partial）

- [ ] **Step 1: 重写 `layouts/_default/baseof.html`**

```html
<!DOCTYPE html>
<html lang="{{ .Site.LanguageCode }}">
<head>
    {{ partial "head.html" . }}
    {{ block "head" . }}{{ end }}
</head>
<body class="{{ block "body-class" . }}{{ end }}">
    {{ partial "header.html" . }}

    <main class="container main" id="main-content">
        {{ block "main" . }}{{ end }}
    </main>

    {{ partial "footer.html" . }}

    {{ partial "footer/back-to-top.html" . }}
    {{ partial "qrcode-modal.html" . }}

    {{ block "scripts" . }}{{ end }}

    {{/* 滚动位置恢复脚本 */}}
    {{ $scrollPosition := resources.Get "js/scroll-position.js" }}
    {{ if $scrollPosition }}
        <script>{{ $scrollPosition.Content | safeJS }}</script>
    {{ end }}
</body>
</html>
```

- [ ] **Step 2: 验证**

Run: `hugo --gc --minify`
Expected: 构建成功。此时打开任意页面，顶部应有新导航条（站点名 + 菜单），页面主体仍是旧主题内容（因为 `index.html`/`single.html`/`list.html` 尚未重写）。**这是预期中间态。**

Run: `curl -s http://localhost:8787/ | grep -c "site-header"`（若本地服务未启动可跳过，改用 `grep "site-header" public/index.html`）
Expected: ≥ 1

- [ ] **Step 3: Commit**

```bash
git add layouts/_default/baseof.html
git commit -m "feat(layout): 重写 baseof 骨架，脱离主题依赖"
```

### Task 7: 404 页

**Files:**
- Create: `layouts/404.html`

- [ ] **Step 1: 创建 `layouts/404.html`**

```html
{{ define "main" }}
<div class="not-found">
    <h1 class="not-found__code">404</h1>
    <p class="not-found__text">页面不存在或已被移动</p>
    <a class="not-found__link" href="/">返回首页</a>
</div>
{{ end }}
```

- [ ] **Step 2: 在 `assets/scss/_base.scss` 末尾追加**

```scss
.not-found {
    padding: var(--space-7) 0;
    text-align: center;

    &__code {
        font-size: 8rem;
        font-family: var(--font-serif);
        color: var(--color-accent);
    }

    &__text {
        color: var(--color-text-secondary);
        margin: var(--space-2) 0 var(--space-3);
    }

    &__link {
        display: inline-block;
        padding: var(--space-1) var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        transition: all var(--duration) var(--ease);

        &:hover {
            border-color: var(--color-accent);
            color: var(--color-accent);
        }
    }
}
```

- [ ] **Step 3: 验证**

Run: `hugo --gc --minify && grep -c "not-found" public/404.html`
Expected: 输出 ≥ 1

- [ ] **Step 4: Commit**

```bash
git add layouts/404.html assets/scss/_base.scss
git commit -m "feat(layout): 404 页面"
```

---

## Phase 2 — 首页（Hero + 瀑布流）

### Task 8: 首页 Hero 区（精选作品大图）

**Files:**
- Create: `layouts/partials/hero.html`
- Modify: `layouts/index.html`（重写，引入 hero + 瀑布流）
- Create: `assets/scss/_home.scss`

- [ ] **Step 1: 创建 `layouts/partials/hero.html`**

选取"作品"分类中最近一篇作为 Hero：取第一张图（复用 `helper/image.html` 逻辑），杂志式左图右文。

```html
{{/* Hero：最新一篇作品的大图 + 信息 */}}
{{ $works := where .Site.RegularPages "Params.categories" "intersect" (slice "作品") }}
{{ $featured := index (first 1 $works) 0 }}
{{ if $featured }}
    {{ $image := partial "helper/image" (dict "Context" $featured "Type" "article") }}
    {{ if $image.exists }}
    <section class="hero">
        <a class="hero__media" href="{{ $featured.RelPermalink }}">
            <img class="hero__image"
                 src="{{ $image.permalink }}"
                 alt="{{ $featured.Title }}"
                 loading="eager" fetchpriority="high">
        </a>
        <div class="hero__info">
            <span class="hero__eyebrow">最新作品</span>
            <h2 class="hero__title"><a href="{{ $featured.RelPermalink }}">{{ $featured.Title }}</a></h2>
            <p class="hero__date">
                {{ partial "icon" (dict "name" "calendar") }}
                <time datetime='{{ $featured.Date.Format "2006-01-02" }}'>{{ $featured.Date.Format "2006.01.02" }}</time>
            </p>
        </div>
    </section>
    {{ end }}
{{ end }}
```

> 说明：`helper/image.html` 已能从文章内容提取第一张图（现有功能），Hero 复用它。`$image.permalink` 是渲染路径，若为压缩版路径则后续 Task 11 统一优化。

- [ ] **Step 2: 重写 `layouts/index.html`**

```html
{{ define "main" }}
    {{ partial "hero.html" . }}

    <section class="home-list">
        <h2 class="home-list__title">全部文章</h2>
        <div class="home-list__grid">
            {{ $pages := where .Site.RegularPages "Params.hidden" "!=" true }}
            {{ range .Paginate $pages.Pages | .Paginate.Pages }}
                {{ partial "article-card.html" . }}
            {{ end }}
        </div>
    </section>

    {{ partial "pagination.html" . }}
{{ end }}
```

> 说明：上面的 `{{ range .Paginate $pages.Pages | .Paginate.Pages }}` 写法有误，正确写法见 Step 4。本 Task 先实现 hero，瀑布流网格在 Task 9 完成。

- [ ] **Step 3: 创建 `assets/scss/_home.scss`（先只含 hero 部分）**

```scss
/* Hero 区 */
.hero {
    display: grid;
    grid-template-columns: 1.6fr 1fr;
    gap: var(--space-4);
    align-items: center;
    padding: var(--space-5) 0 var(--space-6);
}

.hero__media {
    display: block;
    overflow: hidden;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-2);
    aspect-ratio: 16 / 10;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s var(--ease);
    }

    &:hover img {
        transform: scale(1.02);
    }
}

.hero__info {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.hero__eyebrow {
    font-size: var(--text-xs);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-accent);
    font-weight: 600;
}

.hero__title {
    font-size: var(--text-2xl);
    line-height: 1.3;

    a {
        background-image: linear-gradient(var(--color-accent), var(--color-accent));
        background-size: 0% 2px;
        background-position: 0 100%;
        background-repeat: no-repeat;
        transition: background-size 0.4s var(--ease);

        &:hover {
            background-size: 100% 2px;
            color: var(--color-text);
        }
    }
}

.hero__date {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
}

@media (max-width: 767px) {
    .hero {
        grid-template-columns: 1fr;
        padding: var(--space-3) 0 var(--space-4);
        gap: var(--space-3);
    }

    .hero__title {
        font-size: var(--text-xl);
    }
}
```

- [ ] **Step 4: 重写 `layouts/index.html`（修正分页写法，本步完成首页结构）**

```html
{{ define "main" }}
    {{ partial "hero.html" . }}

    <section class="home-list">
        <h2 class="home-list__title">全部文章</h2>
        {{ $pages := where .Site.RegularPages "Params.hidden" "!=" true }}
        {{ $paginator := .Paginate $pages }}
        <div class="home-list__grid">
            {{ range $paginator.Pages }}
                {{ partial "article-card.html" . }}
            {{ end }}
        </div>
        {{ partial "pagination.html" . }}
    </section>
{{ end }}
```

- [ ] **Step 5: 验证**

Run: `hugo --gc --minify`
Expected: 构建成功（`article-card.html` 与 `pagination.html` 尚不存在时，`partial` 调用会渲染为空但不报错——Hugo 对缺失 partial 会静默返回空）。检查 `public/index.html` 是否包含 `hero` 结构：

Run: `grep -c "class=\"hero" public/index.html`
Expected: ≥ 1

- [ ] **Step 6: Commit**

```bash
git add layouts/partials/hero.html layouts/index.html assets/scss/_home.scss
git commit -m "feat(home): 首页 Hero 精选大图区"
```

### Task 9: 瀑布流卡片网格

**Files:**
- Create: `layouts/partials/article-card.html`
- Create: `layouts/partials/pagination.html`
- Modify: `assets/scss/_home.scss`（追加瀑布流样式）
- Modify: `assets/scss/style.scss`（追加 `@use "home";`——若 Task 8 未追加）

- [ ] **Step 1: 创建 `layouts/partials/article-card.html`**

```html
{{/* 瀑布流卡片：图片（封面）+ 分类 + 标题 + 日期 */}}
<article class="masonry-card">
    <a class="masonry-card__media" href="{{ .RelPermalink }}">
        {{ $image := partial "helper/image" (dict "Context" . "Type" "article") }}
        {{ if $image.exists }}
            <img class="masonry-card__image"
                 src="{{ $image.permalink }}"
                 alt="{{ .Title }}"
                 loading="lazy">
        {{ end }}
    </a>
    <div class="masonry-card__body">
        {{ with .Params.categories }}
        <span class="masonry-card__category">{{ index . 0 }}</span>
        {{ end }}
        <h3 class="masonry-card__title"><a href="{{ .RelPermalink }}">{{ .Title }}</a></h3>
        <p class="masonry-card__date">
            {{ partial "icon" (dict "name" "calendar") }}
            <time datetime='{{ .Date.Format "2006-01-02" }}'>{{ .Date.Format "2006.01.02" }}</time>
        </p>
    </div>
</article>
```

- [ ] **Step 2: 创建 `layouts/partials/pagination.html`**

```html
{{ if gt .TotalPages 1 }}
<nav class="pagination" aria-label="分页">
    {{ if .HasPrev }}
    <a class="pagination__link" href="{{ .Prev.URL }}">← 上一页</a>
    {{ else }}
    <span class="pagination__link is-disabled">← 上一页</span>
    {{ end }}

    <span class="pagination__info">{{ .PageNumber }} / {{ .TotalPages }}</span>

    {{ if .HasNext }}
    <a class="pagination__link" href="{{ .Next.URL }}">下一页 →</a>
    {{ else }}
    <span class="pagination__link is-disabled">下一页 →</span>
    {{ end }}
</nav>
{{ end }}
```

- [ ] **Step 3: 在 `assets/scss/_home.scss` 末尾追加瀑布流样式**

```scss
/* 瀑布流网格（CSS columns，兼容性 100%） */
.home-list {
    padding-bottom: var(--space-6);
}

.home-list__title {
    font-size: var(--text-xl);
    margin-bottom: var(--space-3);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-border);
}

.home-list__grid {
    columns: 3;
    column-gap: var(--space-3);
}

.masonry-card {
    break-inside: avoid;
    margin-bottom: var(--space-3);
    background-color: var(--color-surface);
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-1);
    transition: transform var(--duration) var(--ease), box-shadow var(--duration) var(--ease);

    &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-2);
    }
}

.masonry-card__media {
    display: block;
    overflow: hidden;
    aspect-ratio: 4 / 3;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.5s var(--ease);
    }

    &:hover img {
        transform: scale(1.04);
    }
}

.masonry-card__body {
    padding: var(--space-2);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.masonry-card__category {
    font-size: var(--text-xs);
    color: var(--color-accent);
    font-weight: 500;
}

.masonry-card__title {
    font-size: var(--text-lg);
    line-height: 1.4;

    a {
        transition: color var(--duration) var(--ease);

        &:hover {
            color: var(--color-accent);
        }
    }
}

.masonry-card__date {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
}

/* 分页 */
.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-3);
    margin-top: var(--space-5);

    &__link {
        padding: var(--space-1) var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        font-size: var(--text-sm);
        transition: all var(--duration) var(--ease);

        &:hover:not(.is-disabled) {
            border-color: var(--color-accent);
            color: var(--color-accent);
        }

        &.is-disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
    }

    &__info {
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
    }
}

@media (max-width: 1023px) {
    .home-list__grid { columns: 2; }
}

@media (max-width: 767px) {
    .home-list__grid { columns: 2; column-gap: var(--space-2); }
    .masonry-card { margin-bottom: var(--space-2); }
    .masonry-card__title { font-size: var(--text-base); }
}
```

> 注：移动端保持 2 列瀑布流（小红书式），文章页才是单列沉浸（Task 11-13）。

- [ ] **Step 4: 修改 `assets/scss/style.scss`，追加 `@use "home";`（若 Task 8 已加则跳过）**

- [ ] **Step 5: 验证**

Run: `hugo --gc --minify && grep -c "masonry-card" public/index.html`
Expected: ≥ 5（多个卡片）

- [ ] **Step 6: 验证截图（桌面 + 移动）**

用 Playwright 打开 `http://localhost:8787/`（本地服务需已启动：`python3 -m http.server 8787 --directory public`）：
- 桌面 1440px：Hero 大图在左、信息在右；下方 3 列瀑布流卡片
- 移动 390px：Hero 单列、瀑布流 2 列
- 若样式异常（卡片塌陷/图片裁切怪异），检查 `.masonry-card__media` 的 aspect-ratio 与 `columns` 是否生效

- [ ] **Step 7: Commit**

```bash
git add layouts/partials/article-card.html layouts/partials/pagination.html assets/scss/_home.scss
git commit -m "feat(home): 瀑布流卡片网格 + 分页"
```

---

## Phase 3 — 文章页（看图核心）

### Task 10: 重写 render-image（真实尺寸 + medium 图 + GLightbox 链接）

**Files:**
- Modify: `layouts/_default/_markup/render-image.html`（完全重写）

**背景：** 现有实现用 `resources.Get` 查找图片（只查 `assets/`），而图片实际在 `static/`，导致宽高拿不到、`data-flex-grow` 一直是 fallback 值 100/240px、页面布局跳变。Hugo 内置 `imageConfig` 函数可直接读取 static 目录图片的真实尺寸。

- [ ] **Step 1: 先验证 `imageConfig` 行为（本步骤只读不改）**

```bash
cd /Users/hongshize/文档/Project/猫猫船长个人网站
cat > /tmp/test-imageconfig.md << 'EOF'
+++
date = '2026-01-01'
title = 'test'
+++
{{ $cfg := imageConfig "static/compressed/medium/17/文件1.jpg" }}
{{ $cfg.Width }}x{{ $cfg.Height }}
EOF
hugo --gc --minify --source . --contentDir /tmp --destination /tmp/testimg 2>&1 | head -20
```

> 手动检查输出。若 `imageConfig "static/..."` 报错或返回空，改用不含 `static/` 前缀的路径（`imageConfig "compressed/medium/17/文件1.jpg"`，Hugo 会相对 static 目录解析）。**以实测结果为准，写入 Step 2 的实现。** 若中文路径有问题，则用 `urlquery.Unescape` 处理 `.Destination`（.Destination 在 markdown 渲染时是原始中文，一般无需转义）。

- [ ] **Step 2: 重写 `layouts/_default/_markup/render-image.html`**

```html
{{- /* ============================================================
     文章内图片渲染：单列全宽、真实尺寸（防布局跳变）、
     medium 压缩图为主、原图供 GLightbox 放大
     ============================================================ */ -}}
{{- $dest := .Destination -}}
{{- $isExternal := or (hasPrefix $dest "http://") (hasPrefix $dest "https://") -}}

{{- if $isExternal -}}
    <figure class="article-figure">
        <a href="{{ $dest }}" data-glightbox data-glightbox-title="{{ .Text }}">
            <img src="{{ $dest }}" alt="{{ .Text }}" loading="lazy" decoding="async">
        </a>
        {{ with .Text }}<figcaption>{{ . }}</figcaption>{{ end }}
    </figure>
{{- else -}}
    {{- /* 去掉开头的 /，得到相对 static 的路径 */ -}}
    {{- $rel := strings.TrimPrefix "/" $dest -}}
    {{- /* 原图路径（GLightbox 放大用） */ -}}
    {{- $originalURL := $dest | relURL -}}
    {{- /* 优先使用 compressed/medium 压缩图作为展示图 */ -}}
    {{- $displayURL := $originalURL -}}
    {{- $mediumPath := printf "static/compressed/medium/%s" $rel -}}
    {{- if fileExists $mediumPath -}}
        {{- $displayURL = (printf "/compressed/medium/%s" $rel) | relURL -}}
    {{- end -}}

    {{- /* 读取真实尺寸（防布局跳变）：优先压缩图，回退原图 */ -}}
    {{- $width := "" -}}
    {{- $height := "" -}}
    {{- $cfgPath := $mediumPath -}}
    {{- if not (fileExists $cfgPath) -}}
        {{- $cfgPath = printf "static/%s" $rel -}}
    {{- end -}}
    {{- if fileExists $cfgPath -}}
        {{- $cfg := imageConfig $cfgPath -}}
        {{- $width = $cfg.Width -}}
        {{- $height = $cfg.Height -}}
    {{- end -}}

    <figure class="article-figure">
        <a href="{{ $originalURL }}" data-glightbox data-glightbox-title="{{ .Text }}">
            <img src="{{ $displayURL }}"
                 alt="{{ .Text }}"
                 loading="lazy" decoding="async"
                 {{ with $width }}width="{{ . }}"{{ end }}
                 {{ with $height }}height="{{ . }}"{{ end }}>
        </a>
        {{ with .Text }}<figcaption>{{ . }}</figcaption>{{ end }}
    </figure>
{{- end -}}
```

- [ ] **Step 3: 验证**

Run: `hugo --gc --minify`
Expected: 构建成功。

Run: `grep -o '<figure class="article-figure"' public/posts/去海边吧/index.html | wc -l`
Expected: 输出 ≥ 10（该文章有 16 张图）

Run: `grep -o 'width="[0-9]*"' public/posts/去海边吧/index.html | head -3`
Expected: 输出类似 `width="1200"` 的真实尺寸（不再是 fallback）

Run: `grep -o 'src="/compressed/medium/[^"]*"' public/posts/去海边吧/index.html | head -2`
Expected: 展示图指向 compressed/medium

- [ ] **Step 4: Commit**

```bash
git add layouts/_default/_markup/render-image.html
git commit -m "feat(article): 重写图片渲染（真实尺寸/medium 图/GLightbox 链接）"
```

### Task 11: 文章页 single + 头部信息

**Files:**
- Modify: `layouts/_default/single.html`（重写）
- Create: `layouts/partials/article-header.html`
- Create: `layouts/partials/lightbox.html`

- [ ] **Step 1: 创建 `layouts/partials/article-header.html`**

```html
{{/* 文章页头部：返回 + 分类 + 标题 + 日期 */}}
<div class="article-header">
    <button class="article-header__back" id="back-to-list" aria-label="返回列表">
        {{ partial "icon" (dict "name" "arrow-left") }}
    </button>

    <div class="article-header__meta">
        {{ with .Params.categories }}
        <span class="article-header__category">
            <a href="{{ (index $.Site.Taxonomies.categories (index . 0 | urlize)).Page.RelPermalink }}">{{ index . 0 }}</a>
        </span>
        {{ end }}

        <h1 class="article-header__title">{{ .Title }}</h1>

        <div class="article-header__details">
            {{ partial "icon" (dict "name" "calendar") }}
            <time datetime='{{ .Date.Format "2006-01-02" }}'>{{ .Date.Format "2006.01.02" }}</time>

            {{/* 修复「阅读时长: 0 分钟」：纯图片文章 ReadingTime 为 0 时不显示 */}}
            {{ $readingTime := .ReadingTime }}
            {{ if and (gt $readingTime 0) (default true .Site.Params.article.readingTime) }}
            <span class="article-header__reading">
                · {{ $readingTime }} 分钟阅读
            </span>
            {{ end }}
        </div>
    </div>
</div>

<script>
(function () {
    var backBtn = document.getElementById('back-to-list');
    if (!backBtn) return;
    backBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (window.history.length > 1 && document.referrer) {
            window.history.back();
        } else {
            window.location.href = '/';
        }
    });
})();
</script>
```

> 分类链接写法的说明：`(index $.Site.Taxonomies.categories (index . 0 | urlize)).Page.RelPermalink` 可能因 Hugo 版本差异为空，若验证时链接为空，改用简单写法：`/categories/{{ index . 0 | urlize }}/`（hugo.toml 中分类 permalink 为默认）。**以实测为准。**

- [ ] **Step 2: 创建 `layouts/partials/lightbox.html`（GLightbox CDN + 初始化）**

```html
{{/* GLightbox 灯箱：https://glightbox.maykar.io */}}
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/glightbox@3.3.0/dist/css/glightbox.min.css">
<script src="https://cdn.jsdelivr.net/npm/glightbox@3.3.0/dist/js/glightbox.min.js"></script>
<script>
(function () {
    if (typeof GLightbox === 'undefined') return;
    var lightbox = GLightbox({
        selector: '.article-figure a[data-glightbox], .article-content a[data-glightbox]',
        touchNavigation: true,
        loop: true,
        zoomable: true,
        draggable: true,
        openEffect: 'fade',
        closeEffect: 'fade'
    });
})();
</script>
```

- [ ] **Step 3: 重写 `layouts/_default/single.html`**

```html
{{ define "body-class" }}article-page{{ end }}

{{ define "main" }}
    <article class="article">
        {{ partial "article-header.html" . }}

        <div class="article-content">
            {{ .Content }}
        </div>

        {{ if and (not (eq .Params.comments false)) .Site.Params.comments.enabled }}
            {{ partial "comments.html" . }}
        {{ end }}
    </article>
{{ end }}

{{ define "scripts" }}
    {{ partial "lightbox.html" . }}
{{ end }}
```

- [ ] **Step 4: 验证**

Run: `hugo --gc --minify`
Expected: 构建成功。

Run: `grep -c "article-header" public/posts/去海边吧/index.html`
Expected: ≥ 1

Run: `grep -c "glightbox" public/posts/去海边吧/index.html`
Expected: ≥ 2（CSS link + JS script）

- [ ] **Step 5: Commit**

```bash
git add layouts/_default/single.html layouts/partials/article-header.html layouts/partials/lightbox.html
git commit -m "feat(article): 文章页头部 + GLightbox 灯箱引入"
```

### Task 12: 文章页样式（单列全宽 + 图注 + 沉浸阅读）

**Files:**
- Create: `assets/scss/_article.scss`
- Modify: `assets/scss/style.scss`（追加 `@use "article";`）

- [ ] **Step 1: 创建 `assets/scss/_article.scss`**

```scss
/* ============================================================
   文章页：单列全宽看图 + 沉浸排版
   ============================================================ */
.article-page .main {
    max-width: var(--article-max);
}

.article {
    padding: var(--space-5) 0;
}

/* 头部 */
.article-header {
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
    margin-bottom: var(--space-5);
}

.article-header__back {
    flex-shrink: 0;
    width: 4rem;
    height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 50%;
    cursor: pointer;
    color: var(--color-text);
    box-shadow: var(--shadow-1);
    transition: all var(--duration) var(--ease);

    &:hover {
        color: var(--color-accent);
        border-color: var(--color-accent);
        transform: translateX(-2px);
    }
}

.article-header__meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.article-header__category {
    font-size: var(--text-xs);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-accent);
    font-weight: 600;
}

.article-header__title {
    font-size: var(--text-2xl);
    line-height: 1.3;
}

.article-header__details {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
}

/* 正文内容 */
.article-content {
    font-size: var(--text-base);
    line-height: 1.8;
    color: var(--color-text);

    /* 纯图片段落统一无外边距（图片流） */
    p {
        margin: var(--space-3) 0;
    }

    p:empty {
        display: none;
    }
}

/* 单列全宽图片流 */
.article-figure {
    margin: var(--space-4) 0;

    a {
        display: block;
        overflow: hidden;
        border-radius: var(--radius-md);
        background-color: var(--color-surface);
        border: 1px solid var(--color-border);
        cursor: zoom-in;
        transition: box-shadow var(--duration) var(--ease);

        &:hover {
            box-shadow: var(--shadow-2);
        }
    }

    img {
        width: 100%;
        height: auto;
        display: block;
    }

    figcaption {
        margin-top: var(--space-2);
        font-size: var(--text-sm);
        color: var(--color-text-tertiary);
        text-align: center;
    }
}

/* 评论 */
.comments {
    margin-top: var(--space-6);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
}

.comments__title {
    font-size: var(--text-lg);
    margin-bottom: var(--space-3);
}

/* 移动端：沉浸式单列，间距压缩 */
@media (max-width: 767px) {
    .article-page .main {
        padding: 0;
    }

    .article {
        padding: var(--space-3) 0 var(--space-5);
    }

    .article-header {
        padding: 0 var(--space-2);
        margin-bottom: var(--space-3);
    }

    .article-header__title {
        font-size: var(--text-xl);
    }

    .article-figure {
        margin: var(--space-2) 0;

        a {
            border-radius: 0;
            border-left: none;
            border-right: none;
        }

        figcaption {
            font-size: var(--text-xs);
            margin-top: var(--space-1);
        }
    }
}
```

- [ ] **Step 2: 修改 `assets/scss/style.scss`，追加 `@use "article";`**

- [ ] **Step 3: 验证构建 + 截图**

Run: `hugo --gc --minify`

Playwright 检查（桌面 1440px 文章页 `/posts/去海边吧/`）：
- 标题为衬线大字、分类橙色小字、日期灰色
- 图片单列全宽，两张图间距舒适（约 24-40px）
- 移动 390px：图片全宽到边（无左右留白）、间距 8-16px、沉浸滚动

- [ ] **Step 4: Commit**

```bash
git add assets/scss/_article.scss assets/scss/style.scss
git commit -m "feat(article): 文章页单列全宽沉浸样式"
```

### Task 13: 列表页（分类/全部）+ 相关样式

**Files:**
- Modify: `layouts/_default/list.html`（重写）
- Create: `assets/scss/_list.scss`
- Modify: `assets/scss/style.scss`（追加 `@use "list";`）

- [ ] **Step 1: 重写 `layouts/_default/list.html`**

```html
{{ define "main" }}
    <div class="list-page">
        <header class="list-page__header">
            <h1 class="list-page__title">{{ .Title }}</h1>
            <p class="list-page__count">{{ len .Pages }} 篇{{ if .Params.description }} · {{ .Params.description }}{{ end }}</p>
        </header>

        <div class="home-list__grid">
            {{ $paginator := .Paginate .Pages }}
            {{ range $paginator.Pages }}
                {{ partial "article-card.html" . }}
            {{ end }}
        </div>

        {{ partial "pagination.html" . }}
    </div>
{{ end }}
```

> 说明：分类页（`/categories/作品/`）自动继承此模板（`_default/list.html` 适用所有 section/分类列表）。「全部」页 `/posts/` 也走此模板。

- [ ] **Step 2: 创建 `assets/scss/_list.scss`**

```scss
.list-page {
    padding: var(--space-5) 0 var(--space-6);

    &__header {
        margin-bottom: var(--space-4);
    }

    &__title {
        font-size: var(--text-2xl);
        margin-bottom: var(--space-1);
    }

    &__count {
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
    }
}

@media (max-width: 767px) {
    .list-page {
        padding: var(--space-3) 0 var(--space-5);
    }

    .list-page__title {
        font-size: var(--text-xl);
    }
}
```

- [ ] **Step 3: 修改 `assets/scss/style.scss`，追加 `@use "list";`**

- [ ] **Step 4: 验证**

Run: `hugo --gc --minify`
Expected: 构建成功。

Run: `grep -c "list-page" public/categories/作品/index.html`
Expected: ≥ 1

Run: `grep -c "list-page" public/posts/index.html`
Expected: ≥ 1

- [ ] **Step 5: Commit**

```bash
git add layouts/_default/list.html assets/scss/_list.scss assets/scss/style.scss
git commit -m "feat(list): 列表页（分类/全部）自建模板 + 分页"
```

### Task 14: 首页简介区（承接原侧边栏信息）

**Files:**
- Modify: `layouts/index.html`（hero 前加入简介条）
- Modify: `assets/scss/_home.scss`（追加简介条样式）

- [ ] **Step 1: 修改 `layouts/index.html`，在 `{{ partial "hero.html" . }}` 之前插入简介区**

```html
{{ define "main" }}
    <section class="intro">
        <h1 class="intro__title">{{ .Site.Title }}</h1>
        <p class="intro__desc">{{ .Site.Params.sidebar.subtitle }}</p>
    </section>

    {{ partial "hero.html" . }}
    {{/* ...其余保持不变... */}}
{{ end }}
```

- [ ] **Step 2: 在 `assets/scss/_home.scss` 开头追加**

```scss
/* 首页简介条 */
.intro {
    padding: var(--space-5) 0 var(--space-2);
    text-align: center;

    &__title {
        font-size: var(--text-3xl);
        margin-bottom: var(--space-2);
    }

    &__desc {
        font-size: var(--text-lg);
        color: var(--color-text-secondary);
        max-width: 640px;
        margin: 0 auto;
        line-height: 1.7;
    }
}

@media (max-width: 767px) {
    .intro {
        padding: var(--space-3) 0 var(--space-2);

        &__title { font-size: var(--text-2xl); }
        &__desc { font-size: var(--text-base); }
    }
}
```

- [ ] **Step 3: 验证**

Run: `hugo --gc --minify && grep -c "class=\"intro" public/index.html`
Expected: ≥ 1

- [ ] **Step 4: Commit**

```bash
git add layouts/index.html assets/scss/_home.scss
git commit -m "feat(home): 首页简介区（承接原侧边栏信息）"
```

---

## Phase 4 — 组件收尾

### Task 15: 简化 Waline 评论（删除调试代码）

**Files:**
- Create: `layouts/partials/comments.html`
- Delete: `layouts/partials/comments/provider/waline.html`

- [ ] **Step 1: 创建 `layouts/partials/comments.html`（干净版，替代旧 waline provider）**

```html
{{ if .Site.Params.comments.enabled }}
{{ with .Site.Params.comments.waline }}
<div class="comments">
    <h2 class="comments__title">评论区</h2>
    <div id="waline" class="waline-container"></div>
</div>

<link rel="stylesheet" href="https://unpkg.com/@waline/client@v2/dist/waline.css">
<script src="https://unpkg.com/@waline/client@v2/dist/waline.js"></script>
<script>
(function () {
    var el = document.getElementById('waline');
    if (!el || typeof Waline === 'undefined') { if (el) el.style.display = 'none'; return; }

    var config = {
        el: '#waline',
        serverURL: '{{ .serverURL }}',
        lang: '{{ .lang | default "zh-CN" }}',
        visitor: {{ .visitor | default true }},
        requiredMeta: {{ .requiredMeta | jsonify }},
        emoji: {{ .emoji | jsonify }}
    };

    try {
        Waline.init(config);
    } catch (err) {
        el.style.display = 'none'; // 网络/配置异常时优雅隐藏
    }
})();
</script>
<style>
.waline-container {
    --waline-font-size: 1.5rem;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-3);
}
</style>
{{ end }}
{{ end }}
```

> 注意：原 `hugo.toml` 的 waline 配置项有 `locale`、`avatar`、`serverURL` 等，模板只透传核心项；若需保留 `avatar: hide` 与 `locale`，在 config 中追加：
> ```html
> avatar: '{{ .avatar }}',
> locale: {{ .locale | jsonify }},
> ```

- [ ] **Step 2: 删除旧文件**

```bash
rm -rf layouts/partials/comments/provider
```

- [ ] **Step 3: 验证**

Run: `hugo --gc --minify`
Expected: 构建成功。确认 `public/posts/去海边吧/index.html` 含 `waline-container`。

Run: `grep -c "Waline Debug" public/posts/去海边吧/index.html`
Expected: 0（调试代码已清除）

- [ ] **Step 4: Commit**

```bash
git add -A layouts/partials/comments.html
git rm -r layouts/partials/comments/provider
git commit -m "refactor(comments): 简化 Waline 集成，清除调试代码"
```

### Task 16: 适配旧组件引用（back-to-top / qrcode / scroll-position）

**Files:**
- Modify: `layouts/partials/footer/back-to-top.html`（无 JS 依赖变更，仅确认样式变量适配）
- Modify: `assets/scss/style.scss`（将 back-to-top/qrcode 的旧样式迁移或确认兼容）

- [ ] **Step 1: 检查旧样式引用**

旧 `custom.scss` 中 `.back-to-top`、`.scroll-to-comments`、`.qrcode-modal` 的样式使用了 `var(--card-background)`、`var(--card-border-radius)` 等**已不存在的主题变量**。在 `assets/scss/_base.scss` 末尾追加兼容定义：

```scss
/* 兼容旧组件引用的主题变量（back-to-top / qrcode-modal） */
:root {
    --card-background: var(--color-surface);
    --card-border-radius: var(--radius-md);
    --card-border-color: var(--color-border);
    --card-padding: var(--space-3);
    --card-text-color-main: var(--color-text);
    --card-text-color-secondary: var(--color-text-secondary);
    --shadow-l1: var(--shadow-1);
    --accent-color: var(--color-accent);
    --body-background: var(--color-bg);
    --body-text-color: var(--color-text);
}
```

> 这样 `back-to-top.html`、`qrcode-modal.html`、`scroll-position.js`（依赖 body 类名 `article-page`，single.html 已保留该 class）无需改动即可工作。**旧 `custom.scss` 中其余样式（分类颜色、卡片布局、侧边栏等）随 Task 19 删除。**

- [ ] **Step 2: 验证**

Run: `hugo --gc --minify`
Expected: 构建成功。

Playwright 验证（文章页）：
- 滚动 500px 后右下角出现回到顶部按钮
- 点击回到顶部平滑滚动到顶
- 页脚微信链接点击弹出二维码 modal

- [ ] **Step 3: Commit**

```bash
git add assets/scss/_base.scss
git commit -m "fix(styles): 兼容旧组件引用的主题变量"
```

---

## Phase 5 — 清理与回归

### Task 17: 删除主题依赖

**Files:**
- Modify: `hugo.toml`
- Modify: `.gitmodules`
- Delete: `themes/hugo-theme-stack/`

- [ ] **Step 1: 修改 `hugo.toml`**

- 删除 `theme = 'hugo-theme-stack'` 行
- 删除以下主题特有参数（保留不影响构建，但为整洁删除）：
  - `[params.sidebar]`、`[params.widgets]`、`[params.opengraph]`、`[params.defaultImage]`、`[params.imageProcessing]`、`[params.colorScheme]`
- 保留：`[params.footer]`、`[params.dateFormat]`、`[params.article]`（含 `readingTime`）、`[params.comments]`、`[menu]`、`[services]`、`[imaging]`、`[markup]`、`[related]`、`[permalinks]`、`[pagination]`

- [ ] **Step 2: 删除主题与子模块**

```bash
git rm -r themes/hugo-theme-stack
```

- [ ] **Step 3: 修改 `.gitmodules`，移除 hugo-theme-stack 条目**

```gitmodules
# 仅保留一个条目或删除整个文件
```

> 若删除后无其他子模块，直接 `git rm .gitmodules`。

- [ ] **Step 4: 验证**

Run: `hugo --gc --minify`
Expected: 构建成功，无主题相关报错。若报错提示引用了不存在的主题 partial，检查所有 layouts 是否还有 `{{ partial "helper/..." }}`、`{{ partial "sidebar/..." }}` 等主题引用（本计划已全部替换；`helper/image.html` 是项目自有的，保留）。

Run: `grep -rn "hugo-theme-stack\|partial \"helper/" layouts/ | grep -v "helper/image" || echo "clean"`
Expected: 无输出（干净）或仅 `helper/image` 相关

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: 移除 hugo-theme-stack 主题依赖"
```

### Task 18: 删除旧补丁代码

**Files:**
- Delete: `assets/scss/custom.scss`
- Delete: `layouts/partials/sidebar/`
- Delete: `layouts/partials/article/components/photoswipe.html`
- Delete: `layouts/partials/article/components/details.html`
- Delete: `layouts/partials/article/components/header.html`
- Delete: `layouts/partials/article/components/back-to-list.html`
- Delete: `assets/js/gallery-enhance.js`
- Delete: `layouts/partials/footer/custom.html`
- Modify: `assets/scss/style.scss`（确认无 custom.scss 引用——style.scss 从不用 @use 引用 custom.scss，二者独立）

- [ ] **Step 1: 删除文件**

```bash
git rm assets/scss/custom.scss assets/js/gallery-enhance.js
git rm -r layouts/partials/sidebar layouts/partials/article/components
git rm layouts/partials/footer/custom.html
```

- [ ] **Step 2: 全局搜索残留引用**

Run: `grep -rn "photoswipe\|gallery-enhance\|custom.scss\|sidebar/left\|article/components" layouts/ assets/scss/ hugo.toml || echo "clean"`
Expected: 无输出

- [ ] **Step 3: 验证**

Run: `hugo --gc --minify`
Expected: 构建成功。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: 删除旧补丁代码（custom.scss/PS4/gallery-enhance/sidebar）"
```

### Task 19: 全面回归验证

**Files:**
- 验证清单（无代码改动，除非发现问题）

- [ ] **Step 1: 构建 + 本地服务**

```bash
hugo --gc --minify
python3 -m http.server 8787 --directory public &
```

- [ ] **Step 2: 桌面端（1440px）截图验证**

用 Playwright 逐页截图并检查：
- `/` 首页：intro 简介条 → hero 大图（左图右文）→ 3 列瀑布流 → 分页 → 页脚（社交/二维码）
- `/posts/去海边吧/` 文章页：返回按钮 + 分类 + 衬线大标题 + 日期 → 单列全宽图片流 → 评论区 → 页脚
- `/categories/作品/` 分类页：标题 + 计数 + 瀑布流
- 点击文章页第一张图 → GLightbox 灯箱打开（现代 UI、可缩放、可左右切换）
- 滚动 → 回到顶部按钮出现并可用

- [ ] **Step 3: 移动端（390px）截图验证**

- 首页：intro → hero 单列 → 2 列瀑布流 → 汉堡菜单展开/收起正常
- 文章页：图片全宽到边、间距 8-16px、沉浸滚动
- 灯箱：触摸导航正常

- [ ] **Step 4: 功能清单核对**

| 功能 | 状态 |
|---|---|
| 菜单导航（首页/全部/作品/回忆/心里话） | 确认跳转 |
| 分类页 / 全部页列表 + 分页 | 确认渲染 |
| 文章页图片点击放大（GLightbox） | 确认 |
| 评论（Waline）加载且无调试日志 | 确认 |
| 微信二维码弹窗 | 确认 |
| 回到顶部 + 滚动进度环 | 确认 |
| 文章列表→详情→返回滚动位置恢复 | 确认（scroll-position.js） |
| 移动端汉堡菜单 | 确认 |
| 404 页 | 确认 |
| Google Analytics 脚本存在 | 确认 |
| RSS（/index.xml） | 确认 |

- [ ] **Step 5: 性能抽查**

Run: `grep -o '<img[^>]*width="[0-9]*"[^>]*height="[0-9]*"' public/posts/去海边吧/index.html | wc -l`
Expected: ≥ 10（大部分图片带真实宽高，防布局跳变）

Run: `ls -la public/compressed/medium/17/ | head -3`
Expected: medium 图约 200-400KB（页面初始加载轻量；原图仅灯箱点击后加载）

- [ ] **Step 6: 若有问题，回退到对应 Task 修复；全部通过后提交**

```bash
git add -A
git commit -m "chore: 重构回归验证通过"
```

### Task 20: 合并回 main（用户确认后执行）

**Files:**
- Git 操作

- [ ] **Step 1: 展示重构结果，请求用户确认**

- [ ] **Step 2: 合并**

```bash
git checkout main
git merge feature/redesign-v2 --no-ff -m "merge: 浅色杂志式自建布局重构（路线 A）"
git push
```

> 推送后 Vercel 自动构建部署。**合并前确认生产站点预览**（Vercel 预览部署）视觉无误。

---

## Self-Review 记录

**1. Spec 覆盖：**
- 浅色杂志式 → Task 1（tokens）、Task 12（article 样式）
- 首页 Hero + 瀑布流 → Task 8、9、14
- 文章页单列全宽 → Task 10、11、12
- 移动端沉浸单列 → Task 12（移动断点）
- GLightbox 替换 PS4 → Task 10（链接）、Task 11（灯箱 partial）、Task 18（删 PS4）
- 响应式图片/尺寸修复 → Task 10（imageConfig）
- 清理补丁债 → Task 15、17、18
- 侧边栏信息重分布 → Task 4（header）、5（footer）、14（intro）
- 修复「阅读时长 0 分钟」 → Task 11

**2. Placeholder 扫描：** 无 TODO/TBD；所有代码完整给出。

**3. 类型一致性：** `article-figure`（render-image 输出）与 `_article.scss`、`lightbox.html` 的 selector 一致；`article-header` 类名在 single.html、article-header.html、_article.scss 中一致；`home-list__grid` 在 index.html、list.html、_home.scss、_list.scss 中一致。

**已知风险：**
- `imageConfig` 的路径前缀行为（`static/` vs 相对）需 Task 10 Step 1 实测确认
- 分类链接的 taxonomy 写法可能因 Hugo 版本差异需要回退到硬编码 `/categories/xxx/`
- GLightbox CDN 在部分网络环境可能加载慢（国内用户），可后续考虑自托管
