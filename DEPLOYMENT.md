# Deployment Guide for Screen-to-Soundscape

This guide will help you deploy the Screen-to-Soundscape website to GitHub Pages.

## Pre-Deployment Checklist

- [x] All HTML files are valid and semantic
- [x] CSS is responsive and works across devices
- [x] Images are optimized and loaded
- [x] External links open in new tabs
- [x] Accessibility features implemented
- [x] README.md created with documentation

## Quick Deployment Steps

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right and select "New repository"
3. Choose one of these options:

   **Option A: Project Repository**
   - Repository name: `screentosoundscape`
   - Your site will be at: `https://[your-username].github.io/screentosoundscape/`

   **Option B: User/Organization Site**
   - Repository name: `screentosoundscape.github.io`
   - Your site will be at: `https://screentosoundscape.github.io/`

4. Make it public
5. Do NOT initialize with README (we already have one)
6. Click "Create repository"

### Step 2: Push Code to GitHub

Open Terminal and run these commands:

```bash
cd /Users/ahnjili_harmony/Documents/GitHub/screentosoundscape

# Initialize git repository
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: Screen-to-Soundscape website"

# Rename branch to main
git branch -M main

# Add remote (replace YOUR-USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/screentosoundscape.git

# Push to GitHub
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings" tab
3. Click "Pages" in the left sidebar
4. Under "Source":
   - Branch: select "main"
   - Folder: select "/ (root)"
5. Click "Save"
6. Wait 1-2 minutes for deployment
7. Your site will be live at the URL shown!

## Testing Locally Before Deployment

### Option 1: Simple File Open
```bash
open /Users/ahnjili_harmony/Documents/GitHub/screentosoundscape/index.html
```

### Option 2: Local Server (Recommended)
```bash
cd /Users/ahnjili_harmony/Documents/GitHub/screentosoundscape
python3 -m http.server 8000
```
Then visit: http://localhost:8000

### Option 3: Using Node.js
```bash
npx http-server /Users/ahnjili_harmony/Documents/GitHub/screentosoundscape -p 8000
```

## Post-Deployment Verification

After deployment, check these items:

- [ ] Site loads without errors
- [ ] All navigation links work
- [ ] Images display correctly
- [ ] Video player works
- [ ] Audio player works
- [ ] Mobile menu functions properly
- [ ] External links open in new tabs
- [ ] Site is responsive on mobile devices
- [ ] Site works in different browsers

## Updating the Site

To make changes after initial deployment:

```bash
cd /Users/ahnjili_harmony/Documents/GitHub/screentosoundscape

# Make your changes to files...

# Stage changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push
```

GitHub Pages will automatically rebuild and deploy your changes within 1-2 minutes.

## Custom Domain (Optional)

If you want to use a custom domain like `www.screentosoundscape.com`:

1. Add a file named `CNAME` to the repository root
2. Put your domain name in the file (just the domain, nothing else)
3. In your domain registrar, add a CNAME record pointing to `[username].github.io`
4. Wait for DNS propagation (can take up to 24 hours)

## Troubleshooting

### Site not loading after deployment
- Wait 5 minutes and clear browser cache
- Check that GitHub Pages is enabled in Settings > Pages
- Verify the branch and folder are correct

### Images not showing
- Check that image paths are relative (e.g., `assets/images/...`)
- Ensure images are committed to the repository
- Check browser console for 404 errors

### CSS not applying
- Verify the CSS file path in index.html is correct
- Clear browser cache
- Check that styles.css is in the repository

### Mobile menu not working
- Ensure JavaScript is enabled in browser
- Check browser console for errors
- Verify the script tag is present in index.html

## Need Help?

- GitHub Pages Documentation: https://docs.github.com/en/pages
- GitHub Support: https://support.github.com
- Stack Overflow: https://stackoverflow.com/questions/tagged/github-pages

---

**Ready to Deploy?** Follow Step 1 above!
