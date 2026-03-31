#!/usr/bin/env python3
"""
HTML Template Builder
Generates HTML pages from template + config + content files
"""

import os
import json
import sys
from pathlib import Path

# ============================================================================
# CONFIGURATION
# ============================================================================

# Set your base URL here (used in all pages)
BASE_URL = "https://YOUR_URL"

# Directories
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
CONFIG_DIR = SCRIPT_DIR.parent / "config"
CONTENT_DIR = SCRIPT_DIR.parent / "content"
TEMPLATE_FILE = SCRIPT_DIR / "base.html"

# ============================================================================
# FUNCTIONS
# ============================================================================

def load_template():
    """Load the base template"""
    with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
        return f.read()

def load_config(config_file):
    """Load a config JSON file"""
    with open(config_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_content(content_path):
    """Load content HTML file"""
    full_path = PROJECT_ROOT / content_path
    if full_path.exists():
        with open(full_path, 'r', encoding='utf-8') as f:
            return f.read()
    else:
        print(f"  [WARN] Content file not found: {content_path}")
        return ""

def build_og_image(og_image):
    """Generate Open Graph image meta tags"""
    if not og_image:
        return ""

    url = og_image.get('url', '').replace('{{BASE_URL}}', BASE_URL)
    width = og_image.get('width', '')
    height = og_image.get('height', '')
    alt = og_image.get('alt', '')

    tags = [f'<meta property="og:image" content="{url}" />']
    if width:
        tags.append(f'<meta property="og:image:width" content="{width}" />')
    if height:
        tags.append(f'<meta property="og:image:height" content="{height}" />')
    if alt:
        tags.append(f'<meta property="og:image:alt" content="{alt}" />')

    return '\n    '.join(tags)

def build_twitter_image(twitter_image):
    """Generate Twitter image meta tags"""
    if not twitter_image:
        return ""

    url = twitter_image.get('url', '').replace('{{BASE_URL}}', BASE_URL)
    alt = twitter_image.get('alt', '')

    tags = [f'<meta name="twitter:image" content="{url}" />']
    if alt:
        tags.append(f'<meta name="twitter:image:alt" content="{alt}" />')

    return '\n    '.join(tags)

def build_profile_link(profile_url):
    """Generate profile link tag"""
    if not profile_url:
        return ""
    return f'<link rel="me" href="{profile_url}" />'

def build_jsonld(jsonld_data):
    """Generate JSON-LD structured data"""
    if not jsonld_data:
        return ""

    # Replace {{BASE_URL}} in the JSON data
    jsonld_str = json.dumps(jsonld_data)
    jsonld_str = jsonld_str.replace('{{BASE_URL}}', BASE_URL)
    jsonld_data = json.loads(jsonld_str)

    return '<script type="application/ld+json">\n      ' + json.dumps(jsonld_data, indent=2).replace('\n', '\n      ') + '\n    </script>'

def build_keywords(keywords):
    """Generate keywords meta tag"""
    if not keywords:
        return ""
    return f'<meta name="keywords" content="{keywords}" />'

def build_css_imports(css_file):
    """Generate CSS import link"""
    if not css_file:
        return ""
    # Convert relative paths to absolute (start with /)
    if css_file.startswith('/'):
        href = css_file
    else:
        href = '/' + css_file
    return f'<link rel="stylesheet" href="{href}" />'

def build_scripts(scripts_list):
    """Generate script tags"""
    if not scripts_list:
        return ""

    script_tags = []
    for script in scripts_list:
        # Convert relative paths to absolute (start with /)
        if script.startswith('/'):
            src = script
        else:
            src = '/' + script
        script_tags.append(f'<script type="module" src="{src}" defer></script>')

    return '\n    '.join(script_tags)

def build_body_class(body_class):
    """Generate body class attribute"""
    if not body_class:
        return ""
    return f' class="{body_class}"'

def build_breadcrumb(show_breadcrumb):
    """Generate breadcrumb navigation"""
    if not show_breadcrumb:
        return ""
    return '''<nav class="breadcrumb" aria-label="Breadcrumb" style="font-size: 0.7rem;">
        <a><i class="fa-solid fa-angles-left"></i></a>
        <a href="#" onclick="history.back()" style="font-weight: 600;font-size: 0.8rem;">
        Go Back&nbsp;</a>
        <a href="/main.html" rel="prev"
          ><i class="fa-solid fa-angles-left"></i>&nbsp;<i class="fa-solid fa-house"></i
        ></a>
      </nav>'''

def build_loader(show_loader):
    """Generate loading screen"""
    if not show_loader:
        return ""
    return '''<!-- ── LOADING SCREEN ── -->
    <div id="loading-screen">
      <span class="loader"></span>
      <div id="percentage">[0%]</div>
    </div>'''

def build_body_content(content, breadcrumb, show_section, show_outer_wrapper, show_article):
    """Build body content with conditional wrappers"""

    # Start with breadcrumb + content
    inner = breadcrumb + '\n    ' + content if breadcrumb else content

    # Wrap with article if enabled
    if show_article:
        inner = f'''<article>
        {inner}
      </article>'''

    # Wrap with outer-wrapper if enabled
    if show_outer_wrapper:
        inner = f'''<div class="outer-wrapper">
        {inner}
      </div>'''

    # Wrap with section if enabled
    if show_section:
        inner = f'''<section>
      {inner}
    </section>'''

    return inner

def generate_html(config_dict, template):
    """Generate HTML by replacing template placeholders"""

    html = template

    # Basic metadata
    html = html.replace('{{TITLE}}', config_dict.get('title', ''))
    html = html.replace('{{DESCRIPTION}}', config_dict.get('description', ''))
    html = html.replace('{{AUTHOR}}', config_dict.get('author', 'Y-SQLVIZ'))
    html = html.replace('{{ROBOTS}}', config_dict.get('robots', 'index, follow'))
    html = html.replace('{{CANONICAL}}', config_dict.get('canonical', '/'))
    html = html.replace('{{BASE_URL}}', BASE_URL)

    # Keywords
    html = html.replace('{{KEYWORDS}}', build_keywords(config_dict.get('keywords', '')))

    # Open Graph
    html = html.replace('{{OG_TITLE}}', config_dict.get('og_title', config_dict.get('title', '')))
    html = html.replace('{{OG_DESCRIPTION}}', config_dict.get('og_description', config_dict.get('description', '')))
    html = html.replace('{{OG_TYPE}}', config_dict.get('og_type', 'website'))
    html = html.replace('{{OG_IMAGE}}', build_og_image(config_dict.get('og_image')))

    # Twitter
    html = html.replace('{{TWITTER_CARD}}', config_dict.get('twitter_card', 'summary_large_image'))
    html = html.replace('{{TWITTER_TITLE}}', config_dict.get('twitter_title', config_dict.get('title', '')))
    html = html.replace('{{TWITTER_DESCRIPTION}}', config_dict.get('twitter_description', config_dict.get('description', '')))
    html = html.replace('{{TWITTER_IMAGE}}', build_twitter_image(config_dict.get('twitter_image')))

    # Profile and JSON-LD
    html = html.replace('{{PROFILE_LINK}}', build_profile_link(config_dict.get('profile_link')))
    html = html.replace('{{JSONLD}}', build_jsonld(config_dict.get('jsonld')))

    # CSS, Scripts, Body Class, Breadcrumb, and Loader
    html = html.replace('{{CSS_IMPORTS}}', build_css_imports(config_dict.get('cssImports', '')))
    html = html.replace('{{SCRIPTS}}', build_scripts(config_dict.get('scripts', [])))
    html = html.replace('{{BODY_CLASS}}', build_body_class(config_dict.get('bodyClass', '')))
    html = html.replace('{{BREADCRUMB}}', build_breadcrumb(config_dict.get('showBreadcrumb', False)))
    html = html.replace('{{LOADER}}', build_loader(config_dict.get('showLoader', False)))

    # Load content
    content_path = config_dict.get('content', '')
    content = load_content(content_path) if content_path else ''

    # Build body content with optional wrappers
    breadcrumb = build_breadcrumb(config_dict.get('showBreadcrumb', False))
    show_section = config_dict.get('showSection', True)
    show_outer_wrapper = config_dict.get('showOuterWrapper', True)
    show_article = config_dict.get('showArticle', True)

    body_content = build_body_content(content, breadcrumb, show_section, show_outer_wrapper, show_article)
    html = html.replace('{{BREADCRUMB}}', '')  # Remove old breadcrumb placeholder
    html = html.replace('{{BODY_CONTENT}}', body_content)

    return html

def write_output(html, output_path):
    """Write HTML to file"""
    full_path = PROJECT_ROOT / output_path

    # Ensure output directory exists
    full_path.parent.mkdir(parents=True, exist_ok=True)

    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(html)

def main():
    """Main build process"""
    print("Building HTML pages from templates...\n")

    # Load template once
    template = load_template()

    # Find all config files
    if not CONFIG_DIR.exists():
        print(f"[ERROR] Config directory not found: {CONFIG_DIR}")
        return

    config_files = sorted(CONFIG_DIR.glob('*.json'))

    if not config_files:
        print(f"[ERROR] No config files found in {CONFIG_DIR}")
        return

    success_count = 0

    for config_file in config_files:
        try:
            config = load_config(config_file)
            output_path = config.get('outputPath')

            if not output_path:
                print(f"[SKIP] {config_file.name}: No outputPath specified")
                continue

            # Generate HTML
            html = generate_html(config, template)

            # Write main version
            write_output(html, output_path)
            print(f"[OK] Generated: {output_path}")

            success_count += 1

        except Exception as e:
            print(f"[ERROR] {config_file.name}: {str(e)}")

    print(f"\n[DONE] Build complete! Generated {success_count}/{len(config_files)} pages.")

if __name__ == '__main__':
    main()
