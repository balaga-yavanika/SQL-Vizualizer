#!/usr/bin/env python3
"""
SQL Viz Static Site Analyzer
- Audits CSS for unused selectors
- Measures and flags file size bloat
"""

import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Set
from collections import defaultdict

# Fix encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. CSS UNUSED SELECTOR AUDITOR
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class CSSAuditor:
    """Audits CSS for unused selectors"""

    # CSS selectors to ignore (pseudo-elements, at-rules, etc.)
    IGNORE_PATTERNS = {
        r'^@',  # @media, @keyframes, etc.
        r'^\:',  # ::before, ::after, etc.
        r'^html$|^body$|^\*$',  # Global selectors
        r'^input|^button|^select|^textarea',  # Form elements
    }

    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
        self.css_selectors = defaultdict(list)  # selector -> [files]
        self.html_content = ""
        self.unused_selectors = []

    def extract_selectors_from_css(self, css_text: str) -> List[str]:
        """Extract selectors from CSS text"""
        selectors = []

        # Remove comments
        css_text = re.sub(r'/\*.*?\*/', '', css_text, flags=re.DOTALL)

        # Match selector blocks: everything before opening brace
        pattern = r'([^{}]+)\s*\{'
        matches = re.findall(pattern, css_text)

        for match in matches:
            # Split by comma for multiple selectors
            for selector in match.split(','):
                selector = selector.strip()
                if selector and not selector.startswith('@'):
                    selectors.append(selector)

        return selectors

    def should_ignore_selector(self, selector: str) -> bool:
        """Check if selector should be ignored"""
        for pattern in self.IGNORE_PATTERNS:
            if re.match(pattern, selector):
                return True
        return False

    def extract_class_and_id(self, selector: str) -> Set[str]:
        """Extract class and id selectors from a CSS selector"""
        terms = set()

        # Extract classes
        for match in re.finditer(r'\.([a-zA-Z0-9_-]+)', selector):
            terms.add(match.group(1))

        # Extract ids
        for match in re.finditer(r'#([a-zA-Z0-9_-]+)', selector):
            terms.add(match.group(1))

        return terms

    def scan_css_files(self):
        """Scan all CSS files for selectors"""
        css_dir = self.root_dir / "styles"
        css_dirs = [css_dir, self.root_dir / "Assets" / "fx", self.root_dir / "pages"]

        for base_dir in css_dirs:
            if not base_dir.exists():
                continue

            for css_file in base_dir.rglob("*.css"):
                # Skip minified and font files
                if css_file.name.endswith(".min.css") or "fontawesome" in str(css_file) or "fonts" in str(css_file):
                    continue

                try:
                    with open(css_file, 'r', encoding='utf-8') as f:
                        css_text = f.read()
                        selectors = self.extract_selectors_from_css(css_text)

                        for selector in selectors:
                            terms = self.extract_class_and_id(selector)
                            for term in terms:
                                self.css_selectors[term].append(str(css_file.relative_to(self.root_dir)))
                except Exception as e:
                    print(f"Error reading {css_file}: {e}")

    def scan_html_files(self):
        """Scan all HTML files for selector usage"""
        for html_file in self.root_dir.rglob("*.html"):
            # Skip component files
            if "components" in str(html_file):
                continue

            try:
                with open(html_file, 'r', encoding='utf-8') as f:
                    self.html_content += f.read() + "\n"
            except Exception as e:
                print(f"Error reading {html_file}: {e}")

    def find_unused_selectors(self) -> Dict[str, List[str]]:
        """Find unused CSS selectors"""
        unused = defaultdict(list)

        for selector, files in self.css_selectors.items():
            if self.should_ignore_selector(selector):
                continue

            # Check if selector appears in HTML (class or id)
            class_pattern = f'class=["\']([^"\']*\\b{re.escape(selector)}\\b[^"\']*)["\']'
            id_pattern = f'id=["\']([^"\']*\\b{re.escape(selector)}\\b[^"\']*)["\']'

            if not re.search(class_pattern, self.html_content) and \
               not re.search(id_pattern, self.html_content):
                unused[selector] = files

        return unused

    def print_report(self):
        """Print CSS audit report"""
        print("\n" + "="*70)
        print("CSS UNUSED SELECTOR AUDIT")
        print("="*70)

        self.scan_css_files()
        self.scan_html_files()
        unused = self.find_unused_selectors()

        print(f"\nℹ️  NOTE: This scan only checks static HTML. Classes added dynamically")
        print(f"    by JavaScript (e.g., .modal-open, .active) will appear as unused.")
        print(f"    Review before deletion!\n")

        if unused:
            print(f"⚠️  Found {len(unused)} potentially unused selectors:\n")
            for selector in sorted(unused.keys()):
                files = unused[selector]
                print(f"  • .{selector}")
                for file in files:
                    print(f"    └─ {file}")
        else:
            print("\n✓ No unused selectors found!")

        print(f"\nTotal selectors scanned: {len(self.css_selectors)}")
        print(f"Potential unused: {len(unused)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. FILE SIZE ANALYZER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class FileSizeAnalyzer:
    """Analyzes file sizes and flags bloat"""

    # Thresholds for warnings (in KB)
    THRESHOLDS = {
        '.css': 50,
        '.js': 100,
        '.html': 200,
    }

    # Files to ignore
    IGNORE_PATTERNS = [
        'fontawesome',
        'fonts/',
        '.min.css',
        '.min.js',
    ]

    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
        self.files = {}  # path -> size (bytes)
        self.bloat_files = []

    def should_analyze(self, file_path: Path) -> bool:
        """Check if file should be analyzed"""
        file_str = str(file_path)

        for pattern in self.IGNORE_PATTERNS:
            if pattern in file_str:
                return False

        return file_path.suffix in self.THRESHOLDS

    def scan_files(self):
        """Scan all files and record sizes"""
        for file_path in self.root_dir.rglob('*'):
            if not file_path.is_file():
                continue

            if self.should_analyze(file_path):
                size_kb = file_path.stat().st_size / 1024
                self.files[file_path] = size_kb

                # Check if bloated
                threshold = self.THRESHOLDS[file_path.suffix]
                if size_kb > threshold:
                    self.bloat_files.append((file_path, size_kb, threshold))

    def print_report(self):
        """Print file size analysis report"""
        self.scan_files()

        print("\n" + "="*70)
        print("FILE SIZE ANALYSIS")
        print("="*70)

        # Summary by type
        by_type = defaultdict(list)
        for file_path, size_kb in self.files.items():
            by_type[file_path.suffix].append(size_kb)

        total_size = 0
        print("\n📊 Size Summary by File Type:")
        print("-" * 70)

        for ext in sorted(by_type.keys()):
            sizes = by_type[ext]
            total = sum(sizes)
            avg = total / len(sizes)
            print(f"  {ext:10s} | Files: {len(sizes):3d} | Total: {total:7.2f} KB | Avg: {avg:6.2f} KB")
            total_size += total

        print("-" * 70)
        print(f"  {'TOTAL':10s} | Files: {len(self.files):3d} | Total: {total_size:7.2f} KB")

        # Bloat warnings
        if self.bloat_files:
            print("\n" + "="*70)
            print("⚠️  BLOATED FILES (Exceeding thresholds)")
            print("="*70)

            self.bloat_files.sort(key=lambda x: x[1], reverse=True)

            for file_path, size_kb, threshold in self.bloat_files:
                excess = size_kb - threshold
                percent_over = (excess / threshold) * 100
                relative_path = str(file_path.relative_to(self.root_dir))
                print(f"\n  {relative_path}")
                print(f"    Size: {size_kb:.2f} KB (threshold: {threshold} KB)")
                print(f"    Over by: +{excess:.2f} KB ({percent_over:.0f}%)")
        else:
            print("\n✓ All files are within size thresholds!")

        # Top 10 largest files
        print("\n" + "="*70)
        print("📈 Top 10 Largest Files")
        print("="*70)

        sorted_files = sorted(self.files.items(), key=lambda x: x[1], reverse=True)[:10]
        for i, (file_path, size_kb) in enumerate(sorted_files, 1):
            relative_path = str(file_path.relative_to(self.root_dir))
            print(f"  {i:2d}. {relative_path:50s} {size_kb:8.2f} KB")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MAIN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def main():
    root_dir = Path(__file__).parent.parent

    print("\n🔍 SQL Viz Static Site Analyzer")
    print(f"   Root: {root_dir}")

    # 1. CSS Unused Selector Audit
    css_auditor = CSSAuditor(str(root_dir))
    css_auditor.print_report()

    # 2. File Size Analysis
    size_analyzer = FileSizeAnalyzer(str(root_dir))
    size_analyzer.print_report()

    print("\n" + "="*70)
    print("✓ Analysis Complete!")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
