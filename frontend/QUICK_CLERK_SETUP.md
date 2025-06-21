# ⚡ Quick Clerk Setup (2 minutes)

## 🎯 Goal
Get FlashAudit authentication working in under 2 minutes.

## 📋 Steps

### 1. Create Clerk Account (30 seconds)
- Go to: https://dashboard.clerk.com/
- Click "Sign up" 
- Use Google/GitHub for fastest signup

### 2. Create Application (30 seconds)
- Click "Create Application"
- Name: `FlashAudit`
- Select providers:
  - ✅ Email
  - ✅ Google  
  - ✅ GitHub
- Click "Create Application"

### 3. Copy Your Key (15 seconds)
- You'll see your dashboard
- Copy the **Publishable Key** (starts with `pk_test_`)
- **DON'T** copy the Secret Key

### 4. Update Environment (30 seconds)
- Open `frontend/.env`
- Find line: `VITE_CLERK_PUBLISHABLE_KEY=`
- Paste your key after the `=`
- Save the file

### 5. Restart Server (15 seconds)
```bash
# In your terminal, stop the server (Ctrl+C)
# Then restart:
npm run dev
```

## ✅ Test It Works
1. Go to: http://localhost:5174/
2. Click "GET STARTED"
3. You should see Clerk authentication!

## 🚨 Troubleshooting

**Still seeing setup instructions?**
- Check your `.env` file has the key
- Restart the development server
- Make sure key starts with `pk_test_`

**"GET STARTED" not working?**
- Make sure you're on http://localhost:5174/index.html
- Check browser console for errors

## 🎉 You're Done!
Your FlashAudit app now has professional authentication powered by Clerk!
