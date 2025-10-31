# Chatbot Setup Guide

## Issue
The chatbot is failing with "Failed to send message" error because the Gemini API key is not properly configured in Supabase Edge Functions.

## Solution

### Step 1: Set the Gemini API Key in Supabase

You have two options:

#### Option A: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project: https://supabase.com/dashboard/project/ypbklvrerxikktkbswad
2. Navigate to **Project Settings** (gear icon in sidebar)
3. Click on **Edge Functions** in the left menu
4. Click on **Manage secrets**
5. Add a new secret:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** `AIzaSyA_QzqnZnnjyOcn4JU3o_NWdAA4XukrqVQ`
6. Click **Save**

#### Option B: Using Supabase CLI
Run this command in your terminal:

```powershell
supabase secrets set GEMINI_API_KEY=AIzaSyA_QzqnZnnjyOcn4JU3o_NWdAA4XukrqVQ --project-ref ypbklvrerxikktkbswad
```

### Step 2: Deploy the Edge Functions

After setting the secret, deploy the functions:

```powershell
# Deploy all functions
supabase functions deploy chat-bot
supabase functions deploy execute-tool
supabase functions deploy generate-appointment-excel
```

Or deploy all at once:

```powershell
supabase functions deploy
```

### Step 3: Verify the Deployment

Check if the functions are deployed:

```powershell
supabase functions list
```

### Step 4: Test the Chatbot

1. Refresh your application
2. Open the chatbot
3. Send a test message like "Hello"
4. You should get a response from the AI

## Troubleshooting

### If you still get errors:

1. **Check the function logs:**
   ```powershell
   supabase functions logs chat-bot
   ```

2. **Verify the API key is valid:**
   - Go to https://makersuite.google.com/app/apikey
   - Check if your API key is active
   - Create a new one if needed

3. **Check browser console:**
   - Open Developer Tools (F12)
   - Look at the Console tab for detailed error messages
   - Look at the Network tab to see the actual API response

4. **Redeploy with verbose logging:**
   ```powershell
   supabase functions deploy chat-bot --debug
   ```

## How the Chatbot Works

1. **User sends message** → Frontend (ChatBot.tsx)
2. **Message sent to** → Supabase Edge Function (chat-bot)
3. **Edge function calls** → Google Gemini API
4. **Gemini processes** → Returns AI response or tool calls
5. **If tool call** → Execute tool (get_dentists, book_appointment, etc.)
6. **Response sent back** → Frontend displays message

## Current Functionality

- ✅ Medical document analysis (X-rays, CT scans, etc.)
- ✅ File upload support (images, PDFs)
- ✅ Appointment booking
- ✅ Dentist recommendations
- ✅ Arabic and English support
- ✅ PDF generation for dentists

## Next Steps After Setup

Once the chatbot is working, test these features:
1. Upload a medical image
2. Ask about dentist availability
3. Book an appointment
4. Check if the appointment appears in the dentist portal
