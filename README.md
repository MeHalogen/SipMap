# SipMap — Swipe Right on Flavor

Discover the best cafes and drink spots with a simple swipe. SipMap is a sleek, minimal, mobile‑friendly web app for quick, delightful exploration.

> Project by Mehal Srivastava

<p align="left">
  <img alt="Vanilla JS" src="https://img.shields.io/badge/JS-Vanilla-323330?logo=javascript&logoColor=F7DF1E">
  <img alt="Responsive" src="https://img.shields.io/badge/Responsive-Yes-0ea5e9">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-22c55e">
</p>

## ✨ Features

- Swipeable card stack (touch + mouse) via Hammer.js
- Search by city and quick "Near Me" action
- Save and Reject with persistent localStorage
- Saved view with robust de‑duplication (place_id + normalized name+address)
- "Surprise Me" without losing your current stack order
- Skeleton loading to smooth initial renders
- Modern UI: star ratings, price level, open‑now, type, map link
- Works beautifully on mobile and desktop

## 📁 Project Structure

```
SipMap/
├─ index.html     # App markup and layout
├─ styles.css     # Theme, layout, animations, components
└─ script.js      # App logic, swipe, state, rendering
```

## 🚀 Quick Start

Option A — Open directly (no build):
- Double‑click `index.html` to open in your browser.

Option B — Serve locally (recommended):
```bash
# Python 3 simple server
python3 -m http.server (any portnum of your choice)
```

## 🔧 Configuration

### 🔑 API Key Setup (Simplified)

**One place to manage your API key:** Edit the `.env` file in the root directory

1. **Edit `.env`**: Replace `your_google_maps_api_key_here` with your actual API key  
2. **Restart server**: If running the backend, restart to pick up changes

See `CONFIG.md` for detailed instructions.

### Google Cloud Setup

 - Set up your project in the Google Cloud Console. You'll enter a project name and billing information. Your website won't work as it should unless you enable billing, but you won't be charged if the API doesn't get called past the monthly limit (we'll teach you how to cap it at the limit, which is usually 10,000 API calls).
 
 -  Here's how to create and protect your API key:

1. Head to the Google Cloud Console and open the project picker, then click on new project in the corner.
2. Come up with a name for your project! Note that the name can't be changed later.
3. Make sure you're on your cafe finder project and select the APIs & Services button.
4. On the left menu, click on library.
5. Search for the Places API (new) and click on it. Make sure the Places API is enabled.
6. Click on the hamburger menu and look for the APIs & Services button again. Then click on create credentials, then API key.

## 🧭 How to Use

- Enter a city (or use Near Me) to fetch places.
- Swipe cards:
  - Right = Save
  - Left = Reject
- Action buttons under the search:
  - Near Me — browser geolocation
  - Saved — view your saved cafes (button stays highlighted while active)
  - Clear Saved — remove all saved cafes
  - Surprise Me — bring a random cafe to the top
  - Reset Rejected — clear the rejected list so hidden cards can reappear

State is saved in localStorage:
- `savedCafes` — favorites; duplicates are automatically prevented and cleaned
- `rejectedCafes` — hidden cards for the session/area

## 🛠 Implementation Notes

- Gestures: Hammer.js detects left/right swipes for save/reject.
- De‑duplication: a cafe is considered the same if it shares the same `place_id` OR a normalized `name + address` key (case/space‑insensitive). This covers providers returning different IDs for the same venue.
- Mapping: Quick link opens the location in Google Maps.

## ❓ Troubleshooting

- Seeing duplicates? Open the Saved view once—duplicates are auto‑cleaned. If needed, use Clear Saved and re‑save.
- Near Me not working? Allow location permissions in the browser.
- No results? Try another city or click Reset Rejected.

## 🗺️ Roadmap

- Filters (price, rating, open now)
- Shareable saved lists
- PWA install with offline support
- Light/Dark theme toggle

## 🤝 Contributing

Issues and PRs are welcome. If proposing UI changes, include a screenshot or quick mock to speed up review.

------

Crafted with care by Mehal Srivastava. Enjoy the exploration! ☕️🗺️
