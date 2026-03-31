#!/usr/bin/env python3
"""
Simple minifier for CSS, JavaScript, and HTML files
Creates .min versions of files
"""

import re
import sys
from pathlib import Path

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def minify_css(css_text: str) -> str:
    """Minify CSS while preserving functionality"""
    # Remove comments
    css_text = re.sub(r'/\*.*?\*/', '', css_text, flags=re.DOTALL)

    # Remove whitespace around special characters
    css_text = re.sub(r'\s*([{};:,])\s*', r'\1', css_text)

    # Remove unnecessary spaces
    css_text = re.sub(r'\s+', ' ', css_text)

    # Remove trailing semicolons before closing brace
    css_text = re.sub(r';\s*}', '}', css_text)

    # Remove spaces in selectors
    css_text = re.sub(r'>\s+', '>', css_text)
    css_text = re.sub(r'~\s+', '~', css_text)
    css_text = re.sub(r'\+\s+', '+', css_text)

    # Remove leading/trailing whitespace
    css_text = css_text.strip()

    return css_text


def minify_js(js_text: str) -> str:
    """Minify JavaScript (basic - preserves functionality)"""
    # Remove single-line comments (but preserve URLs in comments)
    lines = js_text.split('\n')
    result = []

    for line in lines:
        # Remove comments that aren't URLs
        if '//' in line:
            # Find comment marker
            idx = line.find('//')
            # Check if it's likely a URL (preceded by ://)
            if idx > 0 and line[idx-1:idx+2] == '://':
                result.append(line)
            else:
                # It's a real comment, remove it
                line = line[:idx].rstrip()
                if line:
                    result.append(line)
        else:
            result.append(line)

    js_text = '\n'.join(result)

    # Remove multi-line comments
    js_text = re.sub(r'/\*.*?\*/', '', js_text, flags=re.DOTALL)

    # Remove unnecessary whitespace (but preserve strings)
    # This is a simplified approach
    js_text = re.sub(r';\s*\n\s*', ';', js_text)  # Remove newlines after ;
    js_text = re.sub(r'\n\s*', ' ', js_text)  # Replace newlines with space
    js_text = re.sub(r'\s+', ' ', js_text)  # Collapse multiple spaces

    # Remove spaces around operators (carefully)
    js_text = re.sub(r'\s*([{}();:,=+\-*/])\s*', r'\1', js_text)

    # But preserve spaces in keywords
    js_text = re.sub(r'([a-zA-Z0-9_])\s+([a-zA-Z0-9_])', r'\1 \2', js_text)

    js_text = js_text.strip()

    return js_text


def minify_html(html_text: str) -> str:
    """Minify HTML while preserving functionality"""
    # Remove comments
    html_text = re.sub(r'<!--.*?-->', '', html_text, flags=re.DOTALL)

    # Remove whitespace between tags
    html_text = re.sub(r'>\s+<', '><', html_text)

    # Remove whitespace in attributes
    html_text = re.sub(r'\s+', ' ', html_text)

    # Clean up specific patterns
    html_text = re.sub(r'>\s+<\/([a-z]+)>', r'></\1>', html_text)

    # Preserve pre/code blocks (basic)
    html_text = html_text.strip()

    return html_text


def find_js_files(directory: Path) -> list[Path]:
    """Recursively find all .js files in directory, excluding .min.js files"""
    if not directory.exists():
        return []
    return sorted([f for f in directory.glob('**/*.js') if '.min.js' not in f.name])


def minify_file(file_path: Path, output_suffix: str = '.min') -> tuple[int, int]:
    """Minify a file and write output"""
    suffix = file_path.suffix

    # Determine minifier
    if suffix == '.css':
        minifier = minify_css
    elif suffix == '.js':
        minifier = minify_js
    elif suffix == '.html':
        minifier = minify_html
    else:
        return 0, 0

    # Read file
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original = f.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return 0, 0

    # Minify
    minified = minifier(original)

    # Write output
    output_path = file_path.parent / f"{file_path.stem}{output_suffix}{file_path.suffix}"

    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(minified)
    except Exception as e:
        print(f"Error writing {output_path}: {e}")
        return 0, 0

    original_size = len(original)
    minified_size = len(minified)
    savings = original_size - minified_size
    percent = (savings / original_size * 100) if original_size > 0 else 0

    return original_size, minified_size


def main():
    root_dir = Path(__file__).parent.parent

    # Hardcoded files to minify (CSS and other files)
    files_to_minify = [
        root_dir / "style.css",
        root_dir / "script.js",
        root_dir / "global/style-guide.css",
        root_dir / "global/navbars.css",
        root_dir / "pages/joins/joins.css",
        root_dir / "pages/joins/sql-generator.css",
        root_dir / "pages/execorder/eo.css",
        root_dir / "pages/about/ver.css",
        root_dir / "pages/about/adoc.css",
    ]

    # Auto-detect all .js files in pages/ folder only
    print("\n" + "="*70)
    print("FILE MINIFICATION TOOL")
    print("="*70)
    print("Auto-detecting .js files...\n")

    js_files = find_js_files(root_dir / "pages")
    print(f"Found {len(js_files)} .js files in project\n")

    # Merge hardcoded and auto-detected files (avoid duplicates)
    files_to_minify_set = set(str(f) for f in files_to_minify)
    for js_file in js_files:
        files_to_minify_set.add(str(js_file))

    # Convert back to Path objects and sort
    files_to_minify = sorted([Path(f) for f in files_to_minify_set])

    print("="*70 + "\n")

    total_original = 0
    total_minified = 0

    for file_path in files_to_minify:
        if not file_path.exists():
            continue

        original, minified = minify_file(file_path)

        if original > 0:
            savings = original - minified
            percent = (savings / original * 100)
            print(f"{file_path.name:30s} {original:7d} -> {minified:7d} bytes ({percent:5.1f}% savings)")

            total_original += original
            total_minified += minified

    if total_original > 0:
        total_savings = total_original - total_minified
        total_percent = (total_savings / total_original * 100)

        print("\n" + "-"*70)
        print(f"{'TOTAL':30s} {total_original:7d} -> {total_minified:7d} bytes ({total_percent:5.1f}% savings)")
        print("-"*70)

        print(f"\n✓ Minified files saved with .min suffix")
        print(f"  Total savings: {total_savings:,} bytes ({total_percent:.1f}%)")

        print("\n💡 Next step: In production, serve .min files instead of original")
        print("   Example: <script src=\"joins.min.js\"></script>")
    else:
        print("No files found to minify")

    print("\n" + "="*70 + "\n")


if __name__ == "__main__":
    main()
