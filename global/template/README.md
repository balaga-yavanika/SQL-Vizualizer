# HTML Template System

This template system generates all HTML pages from a shared template, page configs, and content files.

## Directory Structure

```
global/
├── template/
│   ├── base.html         (shared HTML template)
│   ├── build.py          (build script)
│   └── README.md         (this file)
├── config/
│   ├── main.json         (main page config)
│   ├── joins.json        (joins page config)
│   ├── execorder.json    (execution order config)
│   ├── adoc.json         (documentation config)
│   └── ver.json          (version history config)
└── content/
    ├── main-content.html       (main page body content)
    ├── joins-content.html      (joins page body content)
    ├── execorder-content.html  (execution order content)
    ├── adoc-content.html       (documentation content)
    └── ver-content.html        (version history content)
```

## How to Use

### 1. Run the Build Script
```bash
cd "c:/Users/srini/Documents/SQL Viz"
python global/template/build.py
```

This generates all HTML files in their original locations:
- `main.html`
- `pages/joins/joins.html`
- `pages/execorder/eo.html`
- `pages/about/adoc.html`
- `pages/about/ver.html`

### 2. Edit Page Content
To update a page's content, edit the corresponding file in `/global/content/`:
- Update `global/content/joins-content.html` to change joins page content
- Update `global/content/main-content.html` to change home page content
- etc.

Then run `build.py` again to regenerate.

### 3. Edit Page Metadata
To update SEO, title, scripts, or CSS for a page, edit the config file in `/global/config/`:
- `joins.json` - title, description, keywords, CSS imports, scripts
- `main.json` - all metadata + bodyClass for `<body class="...">` attribute
- etc.

Then run `build.py` again to regenerate.

### 4. Add a New Page
1. Create `global/config/newpage.json`:
```json
{
  "title": "Page Title",
  "description": "Page description",
  "keywords": "keyword1, keyword2",
  "author": "Y-SQLVIZ",
  "robots": "index, follow",
  "canonical": "/path/to/newpage.html",
  "og_title": "Page Title",
  "og_description": "Description",
  "og_type": "website",
  "css Imports": "path/to/style.css",
  "scripts": ["/path/to/script.js"],
  "content": "global/content/newpage-content.html",
  "outputPath": "pages/newpage/newpage.html"
}
```

2. Create `global/content/newpage-content.html` with the page body HTML

3. Run `python global/template/build.py`

## Config Fields

### Required
- `title` - Page title
- `content` - Path to content file (relative to project root)
- `outputPath` - Where to generate HTML (relative to project root)

### Optional
- `description` - Meta description (default: "")
- `keywords` - Meta keywords (default: "")
- `author` - Meta author (default: "Y-SQLVIZ")
- `robots` - Meta robots (default: "index, follow")
- `canonical` - Canonical URL path (default: "/")
- `og_title` - Open Graph title
- `og_description` - OG description
- `og_type` - OG type (default: "website")
- `og_image` - OG image object with `url`, `width`, `height`, `alt`
- `twitter_card` - Twitter card type (default: "summary_large_image")
- `twitter_title` - Twitter title
- `twitter_description` - Twitter description
- `twitter_image` - Twitter image object with `url`, `alt`
- `profile_link` - Link rel="me" URL (for main.html only)
- `jsonld` - JSON-LD structured data object
- `cssImports` - CSS file to import (single file)
- `scripts` - Array of script files to load
- `bodyClass` - CSS class for `<body>` tag (default: "")

## Template Variables

Available placeholders in `base.html`:
- `{{TITLE}}` - Page title
- `{{DESCRIPTION}}` - Meta description
- `{{KEYWORDS}}` - Meta keywords tag
- `{{AUTHOR}}` - Author name
- `{{ROBOTS}}` - Robots meta
- `{{CANONICAL}}` - Canonical URL
- `{{BASE_URL}}` - Base URL (set in build.py)
- `{{OG_TITLE}}`, `{{OG_DESCRIPTION}}`, etc. - Open Graph tags
- `{{TWITTER_CARD}}`, `{{TWITTER_TITLE}}`, etc. - Twitter tags
- `{{PROFILE_LINK}}` - Profile link tag
- `{{JSONLD}}` - JSON-LD script tag
- `{{CSS_IMPORTS}}` - CSS import link
- `{{SCRIPTS}}` - Script tags
- `{{BODY_CLASS}}` - Body class attribute
- `{{CONTENT}}` - Page content HTML

## Important Notes

1. **Base URL** - Edit `BASE_URL` in `build.py` before building for production
2. **Scripts** - Scripts marked with `defer` load asynchronously
3. **CSS** - Import only one CSS "imports" file per page (use @import within that file for dependencies)
4. **Paths** - Use relative paths for content files, absolute paths for CSS/JS links in configs

## Workflow

```
Edit content file → Run build.py → Check generated HTML
Edit config file → Run build.py → Check generated HTML
```

Always run `build.py` after making changes to configs or content files.
