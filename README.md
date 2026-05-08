# Climer marketing site

Static landing page at **climer.ai** that pitches Climer and links to the app at **app.climer.ai**.

## Stack

Single `index.html`. No build step. Tailwind-style design tokens are inlined as CSS custom properties (matching the app palette: ink / forest / canopy / lime / amber / coral / ice / fog).

Fonts: Bebas Neue + Outfit, loaded from Google Fonts.

## Local preview

```sh
# any static server works
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

This is a separate Vercel project from the app. Connect this repo and Vercel auto-detects "Other" framework — no build command, output directory `.`.

DNS: `climer.ai` and `www.climer.ai` point at this Vercel project. The app stays at `app.climer.ai` on the other Vercel project.

## Editing

The page is one file. To change copy, edit `index.html` and push. The hero, stats, three "how it works" cards, three route cards, the "why now" section, the audience cards, and the final CTA are each clearly delimited.
