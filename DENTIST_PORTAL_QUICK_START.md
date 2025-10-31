# Dentist Portal - Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Start the Backend
```bash
cd backend
npm run dev
```
✅ Backend should be running on http://localhost:3000

### Step 2: Start the Dentist Portal
```bash
cd dentist-portal
npm run dev
```
✅ Portal should be running on http://localhost:5173

Or use the batch file:
```bash
start-dentist-portal.bat
```

### Step 3: Login
1. Open http://localhost:5173 in your browser
2. Enter one of these authorized emails:
   - david.kim@dentalcare.com
   - lisa.thompson@dentalcare.com
   - james.wilson@dentalcare.com
   - emily.rodriguez@dentalcare.com
   - michael.chen@dentalcare.com
   - sarah.johnson@dentalcare.com
3. Click "Sign In"

## 📋 What You Can Do

### Profile Page
- View your dentist profile
- See your specialization, experience, education
- This is what patients see on the website

### Available Times Page
- View all your availability slots
- Edit time slots
- Update your schedule

### Patients Page
- View all patient appointments
- Search for specific patients
- Filter by status (pending/completed/cancelled)
- **Add notes** for each patient
- **Mark appointments as completed**
- **Export patient reports as PDF**

## 💡 Key Features

### Patient Notes
1. Go to Patients page
2. Find an appointment
3. Type notes in the text area
4. Click "Save Notes"
5. Notes are saved automatically

### Mark as Completed
1. Find a pending appointment
2. Click "Mark Completed" button
3. Status changes to completed
4. Toast notification confirms

### Export PDF Report
1. Click "Export PDF" on any appointment
2. PDF downloads automatically
3. Includes patient info, appointment details, and your notes

## 🔧 Troubleshooting

### Can't Login?
- Make sure your email is in the authorized list
- Check that backend is running on port 3000
- Check browser console for errors

### No Patients Showing?
- Patients need to book appointments first
- Check backend database has appointment data
- Try refreshing the page

### PDF Not Downloading?
- Check browser's download settings
- Allow downloads from localhost
- Check browser console for errors

## 📱 Mobile Access

The portal is fully responsive:
- Works on phones and tablets
- Sidebar collapses to hamburger menu
- Touch-friendly buttons
- Optimized layouts for small screens

## 🎯 Tips

1. **Save Notes Regularly**: Notes auto-save when you click "Save Notes"
2. **Use Search**: Quickly find patients by name or email
3. **Filter by Status**: Focus on pending appointments
4. **Export PDFs**: Keep records of completed appointments
5. **Check Profile**: Make sure your info is up-to-date

## ⚡ Keyboard Shortcuts

- `Tab` - Navigate between fields
- `Enter` - Submit forms
- `Esc` - Close modals

## 🎉 You're Ready!

The Dentist Portal is now set up and ready to use. Login with your authorized email and start managing your patients!

---

**Need Help?** Check DENTIST_PORTAL_COMPLETE.md for detailed documentation.
