# 🚨 FIX CHATBOT ERROR - STEP BY STEP

## The Problem
Your chatbot shows "Failed to send message" because the Gemini API key is not set in Supabase's cloud environment.

## ✅ QUICK FIX (5 minutes)

### Step 1: Go to Supabase Dashboard
1. Open your browser
2. Go to: https://supabase.com/dashboard/project/ypbklvrerxikktkbswad/settings/functions
3. Log in if needed

### Step 2: Add the Secret
1. You should see "Edge Function Secrets" or "Manage secrets" button
2. Click it
3. Add new secret:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** `AIzaSyA_QzqnZnnjyOcn4JU3o_NWdAA4XukrqVQ`
4. Click **Save** or **Add secret**

### Step 3: Redeploy Functions
Since you don't have Supabase CLI installed, you have two options:

#### Option A: Install Supabase CLI (Recommended)
```powershell
# Install using npm
npm install -g supabase

# Then deploy
supabase login
supabase link --project-ref ypbklvrerxikktkbswad
supabase functions deploy
```

#### Option B: Manual Redeploy via Dashboard
1. Go to: https://supabase.com/dashboard/project/ypbklvrerxikktkbswad/functions
2. Find each function (chat-bot, execute-tool, generate-appointment-excel)
3. Click on each one
4. Look for "Redeploy" or "Deploy" button
5. Click it to redeploy with the new secret

### Step 4: Test
1. Refresh your application (Ctrl + F5)
2. Open the chatbot
3. Send "Hello"
4. You should get a response!

## 🔍 If Still Not Working

### Check 1: Verify API Key is Valid
1. Go to: https://makersuite.google.com/app/apikey
2. Check if your key `AIzaSyA_QzqnZnnjyOcn4JU3o_NWdAA4XukrqVQ` is listed
3. If not, create a new one and update the secret

### Check 2: Check Browser Console
1. Press F12 in your browser
2. Go to Console tab
3. Send a message in chatbot
4. Look for error messages
5. Share the error with me

### Check 3: Check Function Logs
1. Go to: https://supabase.com/dashboard/project/ypbklvrerxikktkbswad/logs/edge-functions
2. Select "chat-bot" function
3. Send a message in chatbot
4. Check the logs for errors

## 📝 Alternative: Use OpenAI Instead

If Gemini continues to have issues, I can switch the chatbot to use OpenAI's GPT-4 instead. Just let me know!

## 🎯 What Should Work After Fix

1. ✅ Send messages to chatbot
2. ✅ Get AI responses
3. ✅ Upload medical images
4. ✅ Book appointments
5. ✅ Dentist sees appointments in their portal
6. ✅ PDF generation for dentists

## Need Help?

If you're stuck on any step, let me know which step and what error you're seeing!
