# SipMap Configuration Guide

## 🔑 API Key Management

### Single Source of Truth
The application uses **ONE** configuration file for the Google Maps API key:

```
📁 SipMap/
  └── .env  ← YOUR API KEY GOES HERE (ONLY PLACE TO CHANGE IT)
```

### How to Update Your API Key

1. **Open the file**: `/Users/mehalsrivastava/GitHub/SipMap/.env`
2. **Update the key**: Change `GOOGLE_MAPS_API_KEY=your_current_key` to your new key
3. **Restart the server**: The server will automatically pick up the new key

## 🔄 Quick Restart Commands

When you change the API key, restart the server:

```bash
# Stop any running server
pkill -f "node server.js"

# Start the server
cd /Users/mehalsrivastava/GitHub/SipMap/server && node server.js
```

## ✅ Verification

After updating the API key:
1. Check server logs show: `API Key loaded successfully`
2. Test a search in your browser at `http://localhost:5500`
3. Verify API calls return restaurant/cafe data

## 🚨 Important Notes

**No more duplicate .env files** - Server reads from root `.env` only
- **One place to change API key** - Only edit `/SipMap/.env`
- **Version control** - The `.env` file is gitignored for security
