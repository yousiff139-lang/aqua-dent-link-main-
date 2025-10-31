# Dentist Guide: Managing Chatbot Bookings

## Welcome! 👨‍⚕️👩‍⚕️

This guide will help you manage appointments booked through the AI chatbot system. Learn how to view bookings, access patient information, review documents, and manage your schedule effectively.

---

## Table of Contents

1. [Overview](#overview)
2. [Accessing Your Dashboard](#accessing-your-dashboard)
3. [Understanding Booking Notifications](#understanding-booking-notifications)
4. [Viewing Appointment Details](#viewing-appointment-details)
5. [Understanding Uncertainty Notes](#understanding-uncertainty-notes)
6. [Reviewing Patient Documents](#reviewing-patient-documents)
7. [Managing Your Appointments](#managing-your-appointments)
8. [Setting Your Availability](#setting-your-availability)
9. [Adding Private Notes](#adding-private-notes)
10. [Downloading Reports](#downloading-reports)
11. [Best Practices](#best-practices)
12. [Frequently Asked Questions](#frequently-asked-questions)
13. [Troubleshooting](#troubleshooting)

---

## Overview

### What is the Chatbot Booking System?

The chatbot booking system is an AI-powered assistant that:
- Guides patients through the booking process
- Collects essential patient information
- Gathers symptoms and medical history
- Handles document uploads
- Manages appointment scheduling
- Generates comprehensive booking summaries

### Benefits for Dentists

✅ **Automated Information Collection**: Patients provide detailed information before arrival
✅ **Structured Data**: All information is organized in a standardized format
✅ **Document Access**: View patient-uploaded documents before appointments
✅ **Uncertainty Detection**: Know when patients are unsure about their condition
✅ **Time Savings**: Less time spent on intake during appointments
✅ **Better Preparation**: Review patient information in advance

---

## Accessing Your Dashboard

### Login

1. Navigate to the dentist portal
2. Log in with your credentials
3. You'll be directed to your dashboard

### Dashboard Overview

Your dashboard displays:
- **Upcoming Appointments**: Today and future appointments
- **Recent Bookings**: Latest appointments booked via chatbot
- **Appointment Statistics**: Total appointments, completion rate
- **Quick Actions**: Common tasks and shortcuts

### Navigation

```
Dashboard Layout:

┌─────────────────────────────────────────┐
│  Dentist Dashboard                      │
├─────────────────────────────────────────┤
│  [Appointments] [Availability] [Profile]│
├─────────────────────────────────────────┤
│                                         │
│  Upcoming Appointments (5)              │
│  ┌───────────────────────────────────┐ │
│  │ Today, 10:00 AM - John Doe        │ │
│  │ Tooth pain - Documents: 2         │ │
│  │ [View Details]                    │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Recent Bookings                        │
│  [Appointment Sheet View]               │
│                                         │
└─────────────────────────────────────────┘
```

---

## Understanding Booking Notifications

### Real-Time Notifications

When a patient books an appointment, you receive:
- 🔔 **In-App Notification**: Toast notification in your dashboard
- 📧 **Email Notification**: Detailed email with booking summary
- 📱 **SMS Notification** (if enabled): Text message alert

### Notification Content

Each notification includes:
- Patient name
- Appointment date and time
- Chief complaint/symptoms
- Booking reference number
- Link to view full details

### Example Notification

```
🔔 New Appointment Booked

Patient: John Doe
Date: Monday, Oct 28, 2025 at 10:00 AM
Symptoms: Tooth pain when eating cold foods
Reference: BK-2025-ABC123
Documents: 2 files uploaded

[View Details] [View Calendar]
```

### Managing Notification Preferences

1. Go to **Settings** → **Notifications**
2. Choose notification methods:
   - In-app notifications
   - Email notifications
   - SMS notifications
3. Set notification frequency
4. Save preferences

---

## Viewing Appointment Details

### Appointment Sheet View

The appointment sheet displays all bookings in a tabular format:

| Patient Name | Phone | Age | Gender | Symptoms | Time | Documents | Status |
|--------------|-------|-----|--------|----------|------|-----------|--------|
| John Doe | +1234567890 | 35 | Male | Tooth pain | 10:00 AM | 📎 2 | Confirmed |
| Jane Smith | +0987654321 | 28 | Female | Cleaning | 2:00 PM | - | Confirmed |

### Sorting and Filtering

**Sort by:**
- Date (ascending/descending)
- Patient name (A-Z)
- Status
- Appointment type

**Filter by:**
- Date range
- Status (Confirmed, Completed, Cancelled)
- Appointment type
- Patients with documents
- Patients with uncertainty notes

### Viewing Full Details

Click on any appointment to view complete information:

#### Patient Information
- Full name
- Contact details (phone, email)
- Age and date of birth
- Gender

#### Appointment Details
- Date and time
- Appointment type
- Status
- Booking reference
- Booked via chatbot indicator

#### Medical Information
- Chief complaint
- Detailed symptoms
- Cause identified (Yes/No)
- Uncertainty note (if applicable)
- Medical history (if provided)
- Patient notes

#### Documents
- List of uploaded files
- File names and types
- Upload timestamps
- Quick view/download buttons

#### Conversation History
- Link to view chatbot conversation
- Conversation ID
- Conversation timestamp

---

## Understanding Uncertainty Notes

### What Are Uncertainty Notes?

When patients are unsure about the cause of their symptoms, the chatbot:
1. Detects uncertainty indicators ("I don't know", "not sure", etc.)
2. Records an uncertainty note
3. Marks `cause_identified` as `false`
4. Highlights this information for you

### Why This Matters

Uncertainty notes help you:
- ✅ Prepare for diagnostic work
- ✅ Allocate appropriate appointment time
- ✅ Plan necessary examinations
- ✅ Set patient expectations
- ✅ Avoid assumptions about the condition

### How Uncertainty Notes Are Displayed

#### In Appointment Details

```
⚠️ IMPORTANT NOTE

Patient reports tooth pain but is unsure of the cause.

The patient expressed uncertainty about what's causing their 
symptoms. Additional diagnostic work may be needed.
```

#### In PDF Summary

Uncertainty notes appear in a highlighted yellow box with:
- ⚠️ Warning icon
- Bold "Important Note" header
- The uncertainty note text
- Explanation that diagnosis is needed

#### In Excel Sheet

Uncertainty notes are highlighted in yellow with special formatting.

### Example Scenarios

**Scenario 1: Patient Knows the Cause**
```
Symptoms: Tooth pain
Cause Identified: Yes
Patient Response: "I think it's a cavity because I can see a hole"
```

**Scenario 2: Patient Unsure**
```
Symptoms: Tooth pain
Cause Identified: No
Uncertainty Note: "Patient reports tooth pain but is unsure of the cause"
Patient Response: "I don't know what's causing it"
```

### Best Practices for Uncertain Cases

1. **Allocate Extra Time**: Plan for diagnostic procedures
2. **Prepare Equipment**: Have diagnostic tools ready
3. **Explain Process**: Tell patient what to expect
4. **Be Thorough**: Don't rush the examination
5. **Educate Patient**: Explain findings clearly

---

## Reviewing Patient Documents

### Document Types

Patients can upload:
- 📄 **PDF Documents**: Medical records, reports
- 📷 **Images (JPG/PNG)**: Photos of teeth, X-rays
- 📋 **Previous Records**: Treatment history

### Accessing Documents

#### From Appointment Details

1. Open appointment details
2. Scroll to "Uploaded Documents" section
3. See list of all documents
4. Click to view or download

#### Document Information

Each document shows:
- File name
- File type (PDF, JPG, PNG)
- File size
- Upload date and time
- Preview thumbnail (for images)

### Viewing Documents

**Images:**
- Click to open in lightbox viewer
- Zoom in/out
- Download original file

**PDFs:**
- Click to open in browser
- View inline or download
- Print if needed

### Document Security

- 🔒 All documents are encrypted
- 🔒 Only you and the patient can access them
- 🔒 HIPAA-compliant storage
- 🔒 Audit trail of all access

### What to Look For

When reviewing documents:
- ✅ Previous X-rays showing progression
- ✅ Treatment history from other dentists
- ✅ Medication lists
- ✅ Allergy information
- ✅ Insurance details
- ✅ Photos showing current condition

---

## Managing Your Appointments

### Appointment Statuses

| Status | Description | Actions Available |
|--------|-------------|-------------------|
| **Confirmed** | Appointment is scheduled | View, Add Notes, Cancel |
| **Completed** | Appointment occurred | View, Add Notes |
| **Cancelled** | Appointment was cancelled | View Only |
| **No-Show** | Patient didn't arrive | View, Add Notes |

### Updating Appointment Status

1. Open appointment details
2. Click **"Update Status"**
3. Select new status:
   - Mark as Completed
   - Mark as No-Show
   - Cancel Appointment
4. Add reason/notes (optional)
5. Save changes

### Cancelling Appointments

**As a Dentist, you can:**
- Cancel any appointment
- Provide cancellation reason
- Patient is notified automatically
- Time slot becomes available

**Steps:**
1. Open appointment
2. Click **"Cancel Appointment"**
3. Select reason:
   - Dentist unavailable
   - Emergency
   - Rescheduling needed
   - Other (specify)
4. Confirm cancellation

### Rescheduling Appointments

**Current Process:**
1. Cancel existing appointment
2. Contact patient to reschedule
3. Patient books new appointment via chatbot

**Note:** Direct rescheduling feature coming soon!

---

## Setting Your Availability

### Availability Management

Control when patients can book appointments with you.

### Setting Weekly Schedule

1. Go to **Dashboard** → **Availability**
2. Set hours for each day of the week
3. Configure:
   - Start time
   - End time
   - Slot duration (15, 30, 45, or 60 minutes)
   - Break times

### Example Schedule

```
Monday:
  9:00 AM - 12:00 PM (30-minute slots)
  1:00 PM - 5:00 PM (30-minute slots)

Tuesday:
  9:00 AM - 12:00 PM (30-minute slots)
  2:00 PM - 6:00 PM (30-minute slots)

Wednesday:
  Closed

Thursday:
  9:00 AM - 1:00 PM (30-minute slots)

Friday:
  9:00 AM - 3:00 PM (30-minute slots)
```

### Blocking Time Slots

**For specific dates:**
1. Go to **Calendar View**
2. Click on time slot
3. Select **"Block Time"**
4. Add reason (optional)
5. Save

**Use cases:**
- Lunch breaks
- Meetings
- Personal time off
- Emergency procedures

### Vacation Mode

**Going on vacation?**
1. Go to **Availability** → **Vacation Mode**
2. Set start and end dates
3. All slots during this period are blocked
4. Patients see "Unavailable" for these dates

---

## Adding Private Notes

### What Are Private Notes?

Private notes are:
- ✅ Visible only to you
- ✅ Not shared with patients
- ✅ Attached to specific appointments
- ✅ Useful for clinical observations

### Adding Notes

1. Open appointment details
2. Scroll to **"Private Notes"** section
3. Click **"Add Note"**
4. Type your note
5. Click **"Save"**

### Note Examples

**Pre-Appointment Notes:**
```
"Patient has severe dental anxiety - plan extra time for 
explanation and reassurance. Consider sedation options."
```

**Post-Appointment Notes:**
```
"Completed root canal on tooth #14. Patient tolerated 
procedure well. Follow-up in 2 weeks. Prescribed 
amoxicillin 500mg."
```

**Clinical Observations:**
```
"Noticed signs of teeth grinding. Discuss night guard 
at next appointment. Patient unaware of grinding habit."
```

### Editing Notes

1. Find the note you want to edit
2. Click **"Edit"**
3. Make changes
4. Click **"Save"**

### Note History

- All notes are timestamped
- Edit history is preserved
- You can see when notes were added/modified

---

## Downloading Reports

### Available Reports

#### 1. PDF Booking Summary

**Contains:**
- Complete patient information
- Appointment details
- Symptoms and medical history
- Uncertainty notes (if applicable)
- Uploaded documents (with links)
- Professional formatting

**How to Download:**
1. Open appointment details
2. Click **"Download PDF Summary"**
3. PDF opens in new tab
4. Save or print

**Use cases:**
- Patient records
- Insurance claims
- Referrals to specialists
- Legal documentation

#### 2. Excel Appointment Sheet

**Contains:**
- Tabular format with all appointment data
- Patient demographics
- Symptoms and notes
- Document references
- Status information

**How to Download:**
1. Go to **Appointments** tab
2. Click **"Export to Excel"**
3. Select date range
4. Download Excel file

**Use cases:**
- Record keeping
- Analytics
- Billing
- Practice management

### Bulk Downloads

**Download multiple summaries:**
1. Go to **Appointments** tab
2. Select appointments (checkboxes)
3. Click **"Bulk Download"**
4. Choose format (PDF or Excel)
5. Download ZIP file

---

## Best Practices

### Before Appointments

✅ **Review Booking Summary**
- Read patient symptoms
- Check uncertainty notes
- Review uploaded documents
- Note any special considerations

✅ **Prepare Equipment**
- Based on symptoms, prepare necessary tools
- Have diagnostic equipment ready
- Prepare treatment options

✅ **Allocate Appropriate Time**
- Uncertain cases may need more time
- Complex symptoms require thorough examination
- Plan accordingly

### During Appointments

✅ **Reference Chatbot Information**
- Confirm symptoms with patient
- Discuss uncertainty notes
- Review uploaded documents together
- Update information if needed

✅ **Add Clinical Notes**
- Document findings
- Record treatment provided
- Note follow-up requirements
- Add private observations

✅ **Update Status**
- Mark appointment as completed
- Update any changed information
- Schedule follow-ups if needed

### After Appointments

✅ **Complete Documentation**
- Finalize clinical notes
- Upload any new documents
- Update treatment plans
- Generate reports if needed

✅ **Follow-Up Planning**
- Schedule next appointment
- Send post-visit instructions
- Prescribe medications if needed
- Arrange referrals if necessary

### Communication Tips

✅ **For Uncertain Cases**
- Acknowledge patient's uncertainty
- Explain diagnostic process
- Set realistic expectations
- Provide education

✅ **Document Review**
- Thank patients for uploading documents
- Discuss relevant findings
- Explain how documents help diagnosis
- Request additional documents if needed

---

## Frequently Asked Questions

### General Questions

**Q: How do I know when a new appointment is booked?**
A: You'll receive real-time notifications in your dashboard, plus email/SMS alerts.

**Q: Can I see the chatbot conversation?**
A: Yes, click on the conversation ID in appointment details to view the full chat history.

**Q: What if a patient provides incorrect information?**
A: You can update information during the appointment and add notes about corrections.

### Uncertainty Notes

**Q: What does "cause identified: false" mean?**
A: The patient was unsure about what's causing their symptoms. Plan for diagnostic work.

**Q: Should I treat uncertain cases differently?**
A: Yes, allocate more time for examination and diagnosis. Don't assume the cause.

**Q: Can I see what the patient said about their uncertainty?**
A: Yes, the uncertainty note includes the patient's response, and you can view the full conversation.

### Documents

**Q: What if documents are unclear or low quality?**
A: Request better quality documents during the appointment or take new images.

**Q: Can I upload documents on behalf of patients?**
A: Yes, you can upload documents to patient records during or after appointments.

**Q: How long are documents stored?**
A: Documents are stored indefinitely unless deleted. They're part of the patient's permanent record.

### Availability

**Q: How far in advance can patients book?**
A: Based on your availability settings, typically up to 3 months in advance.

**Q: Can I block specific time slots?**
A: Yes, use the calendar view to block individual slots or use vacation mode for longer periods.

**Q: What if I need to change my schedule?**
A: Update your availability settings anytime. Existing appointments are not affected.

### Reports

**Q: Can I customize the PDF summary format?**
A: Currently, the format is standardized. Custom templates may be available in the future.

**Q: Can I export data for my practice management system?**
A: Yes, use the Excel export feature. The data can be imported into most systems.

**Q: Are reports HIPAA compliant?**
A: Yes, all reports and documents are HIPAA compliant and securely stored.

---

## Troubleshooting

### Common Issues

#### Issue: Not Receiving Notifications

**Solutions:**
1. Check notification settings
2. Verify email address is correct
3. Check spam/junk folder
4. Enable browser notifications
5. Contact support if issue persists

#### Issue: Can't View Documents

**Solutions:**
1. Check internet connection
2. Try different browser
3. Clear browser cache
4. Verify document wasn't deleted
5. Contact support

#### Issue: Appointment Not Showing

**Solutions:**
1. Refresh dashboard
2. Check date filters
3. Verify appointment wasn't cancelled
4. Check all status filters
5. Search by patient name or booking reference

#### Issue: Can't Update Availability

**Solutions:**
1. Ensure you're logged in
2. Check for conflicting appointments
3. Verify time format is correct
4. Try different browser
5. Contact support

### Getting Help

**Technical Support:**
- Email: dentist-support@dentalclinic.com
- Phone: +1-800-DENTIST
- Live Chat: Available in dashboard

**Training Resources:**
- Video tutorials in Help Center
- User manual downloads
- Webinar recordings
- FAQ database

**Emergency Support:**
- 24/7 emergency line for critical issues
- Escalation process for urgent matters

---

## Advanced Features

### Analytics Dashboard

View insights about your bookings:
- Total appointments per month
- Most common symptoms
- Cancellation rates
- Patient demographics
- Peak booking times
- Document upload rates

### Integration with Practice Management

Export data to:
- Electronic Health Records (EHR)
- Practice management software
- Billing systems
- Insurance platforms

### Automated Reminders

System automatically sends:
- 24-hour appointment reminders
- Post-appointment follow-ups
- Review requests
- Recall reminders

---

## Security & Compliance

### Data Protection

- 🔒 End-to-end encryption
- 🔒 HIPAA compliant
- 🔒 Regular security audits
- 🔒 Secure data centers
- 🔒 Access logging

### Your Responsibilities

✅ **Protect Login Credentials**
- Use strong passwords
- Don't share accounts
- Log out when finished
- Enable two-factor authentication

✅ **Handle Patient Data Responsibly**
- Only access necessary information
- Don't share patient data
- Follow privacy regulations
- Report security concerns

✅ **Maintain Professional Standards**
- Document accurately
- Respond to bookings promptly
- Communicate professionally
- Provide quality care

---

## Conclusion

The chatbot booking system streamlines your appointment management and provides valuable patient information before appointments. By following this guide, you can:

- ✅ Efficiently manage bookings
- ✅ Prepare for appointments
- ✅ Understand patient needs
- ✅ Provide better care
- ✅ Save time on administrative tasks

**Key Takeaways:**
1. Review booking summaries before appointments
2. Pay attention to uncertainty notes
3. Check uploaded documents
4. Keep your availability updated
5. Add private notes for continuity of care

**Need Help?** Contact our support team anytime!

---

*Last Updated: October 25, 2025*
*Version: 1.0.0*
