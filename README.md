# Screen-to-Soundscape

A clean, responsive static website for the Screen-to-Soundscape project - an experimental approach to re-imaging screen readers for blind and visually impaired users.

## About

**Screen-to-Soundscape** adopts an experimental approach to re-imaging screen readers in order to address the current limitations for blind and visually impaired users. Our goal is to develop a free and open-source explorative tool that transforms a screen into an immersive soundscape, with a strong focus on providing rich, descriptive alt-text for images and maps.

## Project Structure

```
screentosoundscape/
├── index.html              # Main homepage
├── assets/
│   ├── css/
│   │   └── styles.css      # Main stylesheet
│   └── images/
│       ├── hero-image.png
│       ├── constant-vzw.png
│       ├── processing-foundation.jpg
│       ├── stimuleringsfonds.jpg
│       └── sidns-logo.png
├── source.html             # Original Squarespace HTML (reference)
└── README.md               # This file
```

## Features

- Clean, semantic HTML5 structure
- Responsive design that works on all devices
- Accessible navigation with ARIA labels
- Mobile-friendly hamburger menu
- Embedded YouTube video demo
- Audio podcast player
- Support organization logos with links
- Smooth scrolling navigation
- French translation section

## Technologies Used

- HTML5
- CSS3 (Custom responsive design)
- JavaScript (Vanilla JS for mobile menu)
- Google Fonts (Source Sans Pro)

## Deployment to GitHub Pages

### Option 1: Using GitHub Web Interface

1. Go to GitHub and create a new repository named `screentosoundscape`
2. Upload all files from this directory to the repository
3. Go to repository Settings > Pages
4. Under "Source", select "main" branch and "/" (root) folder
5. Click Save
6. Your site will be published at `https://[username].github.io/screentosoundscape/`

### Option 2: Using Git Command Line

```bash
cd /Users/ahnjili_harmony/Documents/GitHub/screentosoundscape
git init
git add .
git commit -m "Initial commit: Screen-to-Soundscape website"
git branch -M main
git remote add origin https://github.com/[username]/screentosoundscape.git
git push -u origin main
```

Then enable GitHub Pages in repository settings.

### Option 3: Custom Domain (screentosoundscape.github.io)

To use `screentosoundscape.github.io` as the URL:

1. Create a repository named `screentosoundscape.github.io`
2. Upload all files
3. The site will automatically be published at `https://screentosoundscape.github.io/`

## Local Development

To view the site locally:

1. Open `index.html` in a web browser, or
2. Use a local server (recommended):
   ```bash
   # Using Python 3
   cd /Users/ahnjili_harmony/Documents/GitHub/screentosoundscape
   python3 -m http.server 8000
   # Then visit http://localhost:8000 in your browser
   ```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

The site has been built with accessibility in mind:
- Semantic HTML structure
- ARIA labels for navigation
- Alt text for all images
- Keyboard navigation support
- Focus indicators
- Responsive text sizing

## Credits

This site was converted from the original Squarespace site at https://www.screentosoundscape.com/

### Supported By

- [Constant VZW Belgium](https://constantvzw.org/site/)
- [Processing Foundation](https://processingfoundation.org/)
- [Stimuleringsfonds](https://www.stimuleringsfonds.nl/)
- [SIDN Fonds](https://www.sidnfonds.nl/)

## License

Please refer to the original Screen-to-Soundscape project for licensing information.

## Contact

For more information about the Screen-to-Soundscape project, please visit the sections on:
- Team
- Support
- Prototype
- Co-creation Sessions
- Reports
- Tutorial

---

*Last updated: January 2026*
