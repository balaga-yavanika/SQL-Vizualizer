#!/usr/bin/env python3
"""
File size optimization analyzer and suggestions
Identifies specific bloat patterns and optimization opportunities
"""

import re
import sys
from pathlib import Path
from collections import defaultdict

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def analyze_js_bloat(js_text: str, filename: str) -> dict:
    """Analyze JavaScript file for optimization opportunities"""
    issues = []

    # Count string concatenations
    concat_count = js_text.count(' + ')
    if concat_count > 20:
        issues.append({
            'type': 'String Concatenation',
            'count': concat_count,
            'impact': 'HIGH' if concat_count > 50 else 'MEDIUM',
            'suggestion': 'Use template literals or extract to templates',
            'savings': f'{concat_count * 0.5:.0f} bytes'
        })

    # Count inline HTML generation
    html_gen = len(re.findall(r'`[^`]*<[^>]+>[^`]*`', js_text))
    if html_gen > 5:
        issues.append({
            'type': 'Inline HTML Generation',
            'count': html_gen,
            'impact': 'MEDIUM',
            'suggestion': 'Move templates to HTML, use innerHTML templates',
            'savings': f'{html_gen * 100:.0f} bytes'
        })

    # Count repeated patterns
    style_attrs = len(re.findall(r'style="[^"]*\${[^}]*}[^"]*"', js_text))
    if style_attrs > 10:
        issues.append({
            'type': 'Dynamic Inline Styles',
            'count': style_attrs,
            'impact': 'MEDIUM',
            'suggestion': 'Use CSS classes with variables instead',
            'savings': '200-400 bytes'
        })

    # Count event listener setup
    listeners = len(re.findall(r'addEventListener|onclick', js_text))
    if listeners > 15:
        issues.append({
            'type': 'Event Listeners',
            'count': listeners,
            'impact': 'LOW',
            'suggestion': 'Consider event delegation where possible',
            'savings': '100-200 bytes'
        })

    return {
        'filename': filename,
        'size_kb': len(js_text) / 1024,
        'issues': issues
    }


def analyze_css_bloat(css_text: str, filename: str) -> dict:
    """Analyze CSS file for optimization opportunities"""
    issues = []

    # Remove comments and normalize
    clean_css = re.sub(r'/\*.*?\*/', '', css_text, flags=re.DOTALL)
    clean_css = re.sub(r'\s+', ' ', clean_css)

    # Count duplicate properties
    properties = re.findall(r'([a-z-]+):\s*([^;]+);', clean_css)
    prop_counts = defaultdict(int)
    for prop, _ in properties:
        prop_counts[prop] += 1

    duplicates = {k: v for k, v in prop_counts.items() if v > 20}
    if duplicates:
        issues.append({
            'type': 'Repeated Properties',
            'count': len(duplicates),
            'impact': 'HIGH',
            'suggestion': 'Use CSS variables for common values',
            'savings': 'Up to 15-20% reduction'
        })

    # Count vendor prefixes
    vendor_prefixes = len(re.findall(r'-webkit-|-moz-|-ms-', clean_css))
    if vendor_prefixes > 10:
        issues.append({
            'type': 'Vendor Prefixes',
            'count': vendor_prefixes,
            'impact': 'LOW',
            'suggestion': 'Use autoprefixer in build process',
            'savings': '100-200 bytes'
        })

    # Count color/spacing repetitions
    colors = re.findall(r'#[0-9a-f]{6}|rgba?\([^)]+\)|hsl\([^)]+\)', clean_css, re.I)
    if len(colors) > 30:
        issues.append({
            'type': 'Repeated Color Values',
            'count': len(colors),
            'impact': 'MEDIUM',
            'suggestion': 'Move to variables.css',
            'savings': '200-400 bytes'
        })

    return {
        'filename': filename,
        'size_kb': len(css_text) / 1024,
        'issues': issues
    }


def analyze_html_bloat(html_text: str, filename: str) -> dict:
    """Analyze HTML file for optimization opportunities"""
    issues = []

    # Count inline styles
    inline_styles = len(re.findall(r'style="[^"]*"', html_text))
    if inline_styles > 10:
        issues.append({
            'type': 'Inline Styles',
            'count': inline_styles,
            'impact': 'MEDIUM',
            'suggestion': 'Move to CSS file',
            'savings': f'{inline_styles * 20:.0f} bytes'
        })

    # Count inline event handlers
    inline_events = len(re.findall(r'on\w+="[^"]*"', html_text))
    if inline_events > 5:
        issues.append({
            'type': 'Inline Event Handlers',
            'count': inline_events,
            'impact': 'MEDIUM',
            'suggestion': 'Use data-* attributes and external JS',
            'savings': f'{inline_events * 30:.0f} bytes'
        })

    # Count duplicate IDs
    ids = re.findall(r'id="([^"]*)"', html_text)
    if len(ids) != len(set(ids)):
        issues.append({
            'type': 'Duplicate IDs',
            'count': len(ids) - len(set(ids)),
            'impact': 'HIGH',
            'suggestion': 'Ensure all IDs are unique',
            'savings': '0 bytes (but fixes bugs)'
        })

    # Count whitespace
    lines_with_spaces = len(re.findall(r'>\s+<', html_text))
    if lines_with_spaces > 50:
        issues.append({
            'type': 'Unnecessary Whitespace',
            'count': lines_with_spaces,
            'impact': 'LOW',
            'suggestion': 'Minify in production build',
            'savings': f'{lines_with_spaces * 2:.0f} bytes'
        })

    return {
        'filename': filename,
        'size_kb': len(html_text) / 1024,
        'issues': issues
    }


def main():
    root_dir = Path(__file__).parent.parent

    # Files to analyze
    files_to_check = [
        (root_dir / "pages/joins/joins.js", "js"),
        (root_dir / "pages/joins/joins-ui.js", "js"),
        (root_dir / "pages/joins/joins.css", "css"),
        (root_dir / "pages/joins/joins.html", "html"),
    ]

    print("\n" + "="*70)
    print("FILE OPTIMIZATION ANALYZER")
    print("="*70)

    results = []

    for file_path, file_type in files_to_check:
        if not file_path.exists():
            continue

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            if file_type == "js":
                result = analyze_js_bloat(content, file_path.name)
            elif file_type == "css":
                result = analyze_css_bloat(content, file_path.name)
            else:  # html
                result = analyze_html_bloat(content, file_path.name)

            results.append(result)
        except Exception as e:
            print(f"Error analyzing {file_path}: {e}")

    # Print results
    for result in results:
        print(f"\n{result['filename']} ({result['size_kb']:.2f} KB)")
        print("-" * 70)

        if result['issues']:
            for issue in result['issues']:
                print(f"\n  {issue['type']} (Impact: {issue['impact']})")
                print(f"    Count: {issue['count']}")
                print(f"    Fix: {issue['suggestion']}")
                print(f"    Savings: {issue['savings']}")
        else:
            print("  ✓ No major issues found")

    # Summary
    print("\n" + "="*70)
    print("OPTIMIZATION SUMMARY")
    print("="*70)

    total_issues = sum(len(r['issues']) for r in results)
    print(f"\nTotal optimization opportunities: {total_issues}")

    print("\nTop recommendations (highest impact first):")
    print("  1. Extract inline HTML generation to templates (saves 20-25%)")
    print("  2. Use CSS variables instead of inline styles (saves 10-15%)")
    print("  3. Consolidate CSS rules and use variables (saves 10-15%)")
    print("  4. Move event handlers to external JS (saves 5-10%)")
    print("  5. Minify in production build (saves 20-30%)")

    print("\n" + "="*70)


if __name__ == "__main__":
    main()
