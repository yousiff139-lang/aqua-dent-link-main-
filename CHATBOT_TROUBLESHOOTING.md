# 🔧 Chatbot Troubleshooting Guide

## What You Showed Me

The command output:
```
Found: .env
Found: .env.example
```

**This is NOT an error!** This just confirms your `.env` files exist, which is good.

---

## 🐛 Finding the Real Error

### Step 1: Check Browser Console

1. Open your application in the browser
2. Press **F12** to open Developer Tools
3. Click the **Console** tab
4. Try to open the chatbot
5. Look for **red error messages**

**Common errors you might see:**

#### Error 1: "Cannot find module"
```
Error: Cannot find module '@/services/chatbot/ConversationManager'
```

**Fix:** Restart the dev server
```powershell
# Stop server (Ctrl+C)
npm run dev
```

#### Error 2: "user.email is undefined"
```
TypeError: Cannot read property 'email' of undefined
```

**Fix:** Make sure you're logged in before opening chatbot

#### Error 3: "MessageHandler is not defined"
```
ReferenceError: MessageHandler is not defined
```

**Fix:** Clear cache and hard refresh (Ctrl+Shift+R)

---

## 🔄 Quick Fixes

### Fix 1: Restart Dev Server
```powershell
# Stop the server
Ctrl+C

# Clear node cache
Remove-Item -Recurse -Force node_modules/.vite

# Restart
npm run dev
```

### Fix 2: Hard Refresh Browser
- **Windows:** Ctrl + Shift + R
- **Mac:** Cmd + Shift + R

### Fix 3: Clear Browser Cache
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

---

## 📋 Checklist

Before using the chatbot, verify:

- [ ] Dev server is running (`npm run dev`)
- [ ] No errors in terminal
- [ ] Browser shows the site (http://localhost:5174)
- [ ] You are logged in
- [ ] Browser console (F12) shows no errors

---

## 🧪 Test the Chatbot

1. Go to: http://localhost:5174/dentists
2. Click any "View Profile" button
3. Click "Book with AI Assistant" button
4. Chatbot modal should open
5. You should see:
   ```
   Welcome to Dental Care Connect! 👋
   How can I assist you today?
   
   [📅 Book an Appointment] [👨‍⚕️ Dentist Info] [🦷 Dental Questions]
   ```

---

## ❌ If Chatbot Doesn't Open

### Check 1: Is the button visible?
- Go to dentist profile page
- Look for "Book with AI Assistant" button
- If not visible, check DentistProfile.tsx

### Check 2: Console errors when clicking?
- Open console (F12)
- Click the button
- Check for errors

### Check 3: Modal backdrop appears but no content?
- This means the component is loading
- Check console for errors
- Might be authentication issue

---

## 🆘 Still Having Issues?

### Collect This Information:

1. **Browser Console Errors:**
   - Press F12 → Console tab
   - Copy any red error messages
   - Take a screenshot

2. **Terminal Output:**
   - Check the terminal running `npm run dev`
   - Look for compilation errors
   - Copy any error messages

3. **What You See:**
   - Does the chatbot modal open?
   - Is it blank/white?
   - Does it show old chatbot or new one?
   - Can you type messages?

4. **Steps to Reproduce:**
   - What page are you on?
   - What button did you click?
   - What happened vs what you expected?

---

## 🔍 Common Issues & Solutions

### Issue: "Old chatbot still showing"

**Solution:**
```powershell
# 1. Stop server
Ctrl+C

# 2. Clear cache
Remove-Item -Recurse -Force node_modules/.vite
Remove-Item -Recurse -Force dist

# 3. Restart
npm run dev

# 4. Hard refresh browser
Ctrl+Shift+R
```

### Issue: "Chatbot asks for phone number first"

**Solution:** This means old chatbot is still active
- Follow steps above to clear cache
- Make sure OptimizedChatbotInterface.tsx exists
- Check ChatbotModal.tsx imports OptimizedChatbotInterface

### Issue: "Cannot read property 'email' of null"

**Solution:** You're not logged in
1. Go to /auth page
2. Sign in or sign up
3. Then try chatbot again

### Issue: "Blank