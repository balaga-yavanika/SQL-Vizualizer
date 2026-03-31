#!/usr/bin/env python3
"""
File watcher for template system
Monitors /global/content/ and /global/config/ directories
Auto-runs build.py when files change

Usage: python global/template/watch.py
Press Ctrl+C to stop watching
"""

import os
import sys
import time
import subprocess
from pathlib import Path
from datetime import datetime

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
CONTENT_DIR = SCRIPT_DIR.parent / "content"
CONFIG_DIR = SCRIPT_DIR.parent / "config"
BUILD_SCRIPT = SCRIPT_DIR / "build.py"

WATCH_DIRS = [CONTENT_DIR, CONFIG_DIR]
WATCH_EXTENSIONS = {".html", ".json"}
POLL_INTERVAL = 1  # Check for changes every 1 second

# ============================================================================
# FILE TRACKING
# ============================================================================

file_mtimes = {}

def get_watched_files():
    """Get all files to watch"""
    files = {}
    for watch_dir in WATCH_DIRS:
        if watch_dir.exists():
            for file_path in watch_dir.iterdir():
                if file_path.suffix in WATCH_EXTENSIONS:
                    files[str(file_path)] = file_path.stat().st_mtime
    return files

def check_changes():
    """Check if any watched files have changed"""
    current_files = get_watched_files()

    # Check for modified files
    for file_path, mtime in current_files.items():
        if file_path not in file_mtimes or file_mtimes[file_path] != mtime:
            file_mtimes[file_path] = mtime
            return True, file_path

    # Check for deleted files
    for file_path in list(file_mtimes.keys()):
        if file_path not in current_files:
            del file_mtimes[file_path]
            return True, file_path

    return False, None

def run_build():
    """Run build.py"""
    try:
        result = subprocess.run(
            [sys.executable, str(BUILD_SCRIPT)],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True
        )
        return result.returncode == 0, result.stdout + result.stderr
    except Exception as e:
        return False, str(e)

def log(message):
    """Log message with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")

def main():
    """Main watch loop"""
    log("=================================")
    log("🔍 Template File Watcher Started 🔍")
    log("=================================")
    log(f"   Watching: {CONTENT_DIR}")
    log(f"   Watching: {CONFIG_DIR}")
    log("   Extensions: .html, .json")
    log("   Interval: {0}s\n".format(POLL_INTERVAL))
    log("Press Ctrl+C to stop\n")

    # Initialize file tracking
    file_mtimes.update(get_watched_files())

    try:
        while True:
            time.sleep(POLL_INTERVAL)
            changed, file_path = check_changes()

            if changed:
                # Get relative path for display
                try:
                    rel_path = Path(file_path).relative_to(PROJECT_ROOT)
                except ValueError:
                    rel_path = Path(file_path).name

                log(f"📝 Changed: {rel_path}")
                log("🔨 Running build.py...")

                success, output = run_build()

                if success:
                    log("✅ Build successful!\n")
                else:
                    log("❌ Build failed!")
                    log(output)
                    log()

    except KeyboardInterrupt:
        log("\n\n 🛑 Watcher stopped")
        sys.exit(0)

if __name__ == "__main__":
    main()
