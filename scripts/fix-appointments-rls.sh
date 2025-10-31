#!/bin/bash

# Script to fix appointments RLS policies

echo "🔧 Fixing Appointments RLS Policies..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase"
    echo "Logging in..."
    supabase login
fi

echo "✅ Authenticated with Supabase"
echo ""

# Apply the migration
echo "📝 Applying RLS fix migration..."
supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "🧪 Testing appointments query..."
    echo ""
    
    # You can add a test query here if needed
    echo "Please test the appointments loading in your application."
    echo ""
    echo "If you still see errors, check:"
    echo "  1. User is authenticated"
    echo "  2. User has correct role (patient/dentist/admin)"
    echo "  3. Browser console for specific error messages"
else
    echo ""
    echo "❌ Migration failed"
    echo "Check the error messages above"
    exit 1
fi
