#!/usr/bin/env python3
"""
Extract embedded media from screentosoundscape.com pages
"""

import re
import subprocess

pages = {
    'sounds': 'https://www.screentosoundscape.com/sounds',
    'prototype': 'https://www.screentosoundscape.com/prototype',
    'phase-1-report': 'https://www.screentosoundscape.com/phase-1-report',
    'phase-2-report': 'https://www.screentosoundscape.com/phase-2-report',
    'tutorial': 'https://www.screentosoundscape.com/tutorial'
}

for page_name, url in pages.items():
    print(f"\n=== {page_name.upper()} ===\n")

    # Fetch page
    result = subprocess.run(['curl', '-s', url], capture_output=True, text=True)
    html = result.stdout

    # Find iframes
    iframes = re.findall(r'<iframe[^>]*>.*?</iframe>', html, re.DOTALL)
    if iframes:
        print(f"Found {len(iframes)} iframe(s):")
        for i, iframe in enumerate(iframes[:5], 1):  # Show first 5
            src = re.search(r'src="([^"]*)"', iframe)
            if src:
                print(f"  {i}. {src.group(1)}")

    # Find audio embeds
    audio_embeds = re.findall(r'class="sqs-audio-embed"[^>]*data-url="([^"]*)"[^>]*data-title="([^"]*)"', html)
    if audio_embeds:
        print(f"\nFound {len(audio_embeds)} audio file(s):")
        for i, (url, title) in enumerate(audio_embeds[:10], 1):  # Show first 10
            print(f"  {i}. {title}: {url}")

    # Find images with captions
    figures = re.findall(r'<figure[^>]*>.*?</figure>', html, re.DOTALL)
    if figures:
        print(f"\nFound {len(figures)} figure(s) with potential captions")

    print("\n" + "="*60)

print("\nDone!")
