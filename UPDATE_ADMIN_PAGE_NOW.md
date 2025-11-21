# Update Admin Page to Use Backend API

## Current Status

✅ **Backend is complete** - All endpoints working
🔧 **Admin page needs update** - Currently uses direct Supabase calls

## What Needs to Change

**File:** `src/pages/EnhancedAdmin.tsx`

### Change 1: Replace Direct Supabase Calls

**Current code (line ~140):**
```typescript
const { data: appts, error: apptsError } = await supabase
  .from('appointments')
  .select('*')
  .order('created_at', { ascending: false });
```

**Replace with:**
```typescript
const response = await fetch('http://localhost:3000/api/admin/appointments', {
  headers: {
    'Authorization': `Bearer ${user.accessToken}` // If you have auth
  }
});
const { data: appts } = await response.json();
```

### Change 2: Add "Add Dentist" Button

Add this to the dentists section:

```typescript
<Button onClick={() => setShowAddDentistDialog(true)}>
  <Plus className="h-4 w-4 mr-2" />
  Add Dentist
</Button>
```

### Change 3: Add "Add Dentist" Dialog

```typescript
<Dialog open={showAddDentistDialog} onOpenChange={setShowAddDentistDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add New Dentist</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleAddDentist}>
      <Input name="name" placeholder="Full Name" required />
      <Input name="email" type="email" placeholder="Email" required />
      <Input name="specialization" placeholder="Specialization" required />
      <Input name="phone" placeholder="Phone" />
      <Input name="years_of_experience" type="number" placeholder="Years of Experience" />
      <Textarea name="bio" placeholder="Bio" />
      <Textarea name="education" placeholder="Education" />
      <Button type="submit">Create Dentist</Button>
    </form>
  </DialogContent>
</Dialog>
```

### Change 4: Add Handler Functions

```typescript
const handleAddDentist = async (e: FormEvent) => {
  e.preventDefault();
  const formData = new FormData(e.target as HTMLFormElement);
  
  const response = await fetch('http://localhost:3000/api/admin/dentists', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.accessToken}`
    },
    body: JSON.stringify({
      name: formData.get('name'),
      email: formData.get('email'),
      specialization: formData.get('specialization'),
      phone: formData.get('phone'),
      years_of_experience: Number(formData.get('years_of_experience')),
      bio: formData.get('bio'),
      education: formData.get('education')
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    toast.success(`Dentist created! Temp password: ${result.data.tempPassword}`);
    setShowAddDentistDialog(false);
    loadAllData(); // Refresh
  }
};

const handleDeleteDentist = async (dentistId: string) => {
  if (!confirm('Are you sure you want to delete this dentist?')) return;
  
  const response = await fetch(`http://localhost:3000/api/admin/dentists/${dentistId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${user.accessToken}`
    }
  });
  
  const result = await response.json();
  
  if (result.success) {
    toast.success('Dentist deleted successfully');
    loadAllData(); // Refresh
  }
};
```

## Quick Implementation

I can do this for you right now! Just say "yes" and I'll:

1. Update `EnhancedAdmin.tsx` to use backend API
2. Add "Add Dentist" button and dialog
3. Add "Delete Dentist" button for each dentist
4. Wire up all the handlers

It will take about 5 minutes.

## Testing After Update

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `npm run dev`
3. Login as admin
4. Go to Admin Dashboard
5. Try:
   - View appointments (should load from backend)
   - View patients (should load from backend)
   - Add a dentist (should create auth + profile + dentist)
   - Delete a dentist (should remove from everywhere)

## Benefits

✅ Centralized logic in backend
✅ Better error handling
✅ Consistent with dentist portal and user app
✅ Easier to maintain
✅ Better security (admin middleware)

Ready to implement?
