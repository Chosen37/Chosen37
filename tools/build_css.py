#!/usr/bin/env python3
"""Combine the stylesheets into one minified site.css (one request instead of five).

Edit the source files (fonts.css, styles.css, mockup.css, legal.css, property.css, home.css),
then run:  python3 tools/build_css.py   (build_properties.py runs it too)
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORDER = ["fonts.css", "styles.css", "mockup.css", "legal.css", "property.css", "home.css"]


def minify(css):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    css = re.sub(r"\s+", " ", css)
    css = re.sub(r"\s*([{};,>])\s*", r"\1", css)
    css = re.sub(r":\s+", ":", css)
    css = css.replace(";}", "}")
    return css.strip()


css = "\n".join(minify((ROOT / f).read_text()) for f in ORDER)
# The phone menu collapses with CSS alone, so no script has to run before the first paint.
css = css.replace(".js .menu-toggle:not([hidden])", ".menu-toggle:not([hidden])")
css = css.replace(".js .site-header nav.open", ".site-header nav.open")
css = css.replace(".js .site-header nav", ".site-header nav")
(ROOT / "site.css").write_text(css + "\n")
print(f"site.css: {len(css)//1024} KB from {len(ORDER)} files")
