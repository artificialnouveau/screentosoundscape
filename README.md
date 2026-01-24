# Screen-to-Soundscape

An experimental approach to re-imaging screen readers for blind and visually impaired users.

## About the Project

**Screen-to-Soundscape** adopts an experimental approach to re-imaging screen readers in order to address the current limitations for blind and visually impaired users. Our goal is to develop a free and open-source explorative tool that transforms a screen into an immersive soundscape, with a strong focus on providing rich, descriptive alt-text for images and maps.

The project converts HTML content into an audio format using various voices for different semantic elements of the HTML. It uses the ElevenLabs API for text-to-speech conversion, providing a richer auditory experience through customized voice outputs for different parts of the HTML structure. Additionally, it features spatial audio effects to enhance the auditory landscape.

## Repository Contents

This repository contains two main components:

### 1. Project Website (Root Directory)
- `index.html` - Main project website
- `PREVIEW-index.html` - Local preview version
- `assets/` - Website assets (CSS, images)
- Clean, responsive static website showcasing the project

### 2. Development Scripts (`scripts/` Directory)
- Python scripts for HTML-to-audio conversion
- Wiki API integration
- Audio generation tools
- Glitch effects and sequential playback

## Project Structure

```
screentosoundscape/
├── index.html                    # Project website homepage
├── PREVIEW-index.html            # Local preview
├── assets/
│   ├── css/
│   │   └── styles.css           # Website styles
│   └── images/                   # Logo images
├── scripts/
│   ├── 01_wiki_api.py           # Wikipedia API integration
│   ├── 02_wiki_data_to_audio.py # Audio conversion
│   ├── html_scraping_voice_generation.py
│   └── index.html               # Glitch audio player
├── wiki_jsons/                   # Wiki data storage
└── README.md
```

## Website Features

- Responsive design that works on all devices
- Accessible navigation with ARIA labels
- Mobile-friendly hamburger menu
- Embedded YouTube video demo
- Audio podcast player
- Support organization logos with links
- French translation section

## Development Features

### Wiki JSON Structure

The JSON file created includes:
- **Title**: The title of the Wikipedia page
- **Introduction**: The introductory text
- **Sections**: Nested structure representing content hierarchy
  - Title of the Section (H1, H2, etc.)
  - Text Content with markdown links
  - Subsections (nested)
  - P_audio: path of the audio file

**Naming Convention**: Audio files are named according to the structure they represent (e.g., "Introduction.mp3")

### Parsing the JSON

```python
# Access the Title
json_data['Title']

# Read the Introduction
json_data['Introduction']

# Navigate Sections
json_data['Sections']['H1: Section Title']['P']
```

## Local Development

### View Website Locally
```bash
# Open in browser
open PREVIEW-index.html

# Or use a local server
python3 -m http.server 8000
# Then visit http://localhost:8000
```

### Run Development Scripts
```bash
cd scripts/
python3 01_wiki_api.py
python3 02_wiki_data_to_audio.py
```

## Deployment to GitHub Pages

The website is automatically deployed via GitHub Pages.

Visit: **https://artificialnouveau.github.io/screentosoundscape/**

## Technologies Used

**Website:**
- HTML5
- CSS3 (Custom responsive design)
- JavaScript (Vanilla JS for mobile menu)
- Google Fonts (Source Sans Pro)

**Development:**
- Python 3
- ElevenLabs API
- Wikipedia API
- Spatial audio processing

## Supported By

- [Constant VZW Belgium](https://constantvzw.org/site/)
- [Processing Foundation](https://processingfoundation.org/)
- [Stimuleringsfonds](https://www.stimuleringsfonds.nl/)
- [SIDN Fonds](https://www.sidnfonds.nl/)

## Accessibility

The site has been built with accessibility in mind:
- Semantic HTML structure
- ARIA labels for navigation
- Alt text for all images
- Keyboard navigation support
- Focus indicators
- Responsive text sizing

## Credits

Website converted from the original at https://www.screentosoundscape.com/

## License

Please refer to the LICENSE file for licensing information.

---

*Last updated: January 2026*
