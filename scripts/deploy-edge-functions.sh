#!/bin/bash

# Edge Functions Deployment Script
# This script deploys all chatbot booking system edge functions to Supabase

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Banner
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Chatbot Booking System - Edge Functions Deployment      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists supabase; then
    print_error "Supabase CLI is not installed"
    echo "Install it with: npm install -g supabase"
    exit 1
fi
print_success "Supabase CLI is installed"

if ! command_exists git; then
    print_warning "Git is not installed (optional)"
else
    print_success "Git is installed"
fi

# Check if we're in the right directory
if [ ! -d "supabase/functions" ]; then
    print_error "supabase/functions directory not found"
    echo "Please run this script from the project root directory"
    exit 1
fi
print_success "Project structure verified"

# Check if logged in to Supabase
print_info "Checking Supabase authentication..."
if ! supabase projects list >/dev/null 2>&1; then
    print_warning "Not logged in to Supabase"
    print_info "Logging in..."
    supabase login
fi
print_success "Authenticated with Supabase"

# List available functions
print_info "Available edge functions:"
echo "  1. chat-bot"
echo "  2. generate-booking-summary"
echo "  3. generate-appointment-excel"
echo ""

# Ask user what to deploy
echo "What would you like to deploy?"
echo "  1) All functions"
echo "  2) chat-bot only"
echo "  3) generate-booking-summary only"
echo "  4) generate-appointment-excel only"
echo "  5) Custom selection"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        FUNCTIONS=("chat-bot" "generate-booking-summary" "generate-appointment-excel")
        ;;
    2)
        FUNCTIONS=("chat-bot")
        ;;
    3)
        FUNCTIONS=("generate-booking-summary")
        ;;
    4)
        FUNCTIONS=("generate-appointment-excel")
        ;;
    5)
        FUNCTIONS=()
        read -p "Deploy chat-bot? (y/n): " deploy_chatbot
        [ "$deploy_chatbot" = "y" ] && FUNCTIONS+=("chat-bot")
        
        read -p "Deploy generate-booking-summary? (y/n): " deploy_summary
        [ "$deploy_summary" = "y" ] && FUNCTIONS+=("generate-booking-summary")
        
        read -p "Deploy generate-appointment-excel? (y/n): " deploy_excel
        [ "$deploy_excel" = "y" ] && FUNCTIONS+=("generate-appointment-excel")
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

if [ ${#FUNCTIONS[@]} -eq 0 ]; then
    print_warning "No functions selected for deployment"
    exit 0
fi

echo ""
print_info "Functions to deploy: ${FUNCTIONS[*]}"
echo ""

# Confirm deployment
read -p "Continue with deployment? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    print_warning "Deployment cancelled"
    exit 0
fi

echo ""
print_info "Starting deployment..."
echo ""

# Deploy each function
DEPLOYED=0
FAILED=0

for func in "${FUNCTIONS[@]}"; do
    print_info "Deploying $func..."
    
    if supabase functions deploy "$func" 2>&1; then
        print_success "$func deployed successfully"
        ((DEPLOYED++))
    else
        print_error "Failed to deploy $func"
        ((FAILED++))
    fi
    echo ""
done

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Deployment Summary                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
print_success "Successfully deployed: $DEPLOYED function(s)"
if [ $FAILED -gt 0 ]; then
    print_error "Failed to deploy: $FAILED function(s)"
fi
echo ""

# Check environment variables
print_info "Checking environment variables..."
echo ""
print_warning "Make sure the following secrets are configured in Supabase Dashboard:"
echo "  - SUPABASE_URL"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo "  - SUPABASE_ANON_KEY"
echo "  - GEMINI_API_KEY (for chat-bot)"
echo ""
echo "To set secrets, use:"
echo "  supabase secrets set KEY=value"
echo ""

# List deployed functions
print_info "Listing deployed functions..."
echo ""
supabase functions list

echo ""
print_info "Next steps:"
echo "  1. Verify environment variables are set"
echo "  2. Test deployed functions"
echo "  3. Monitor logs for errors"
echo "  4. Update frontend to use deployed endpoints"
echo ""

# Offer to view logs
read -p "Would you like to view logs for deployed functions? (y/n): " view_logs
if [ "$view_logs" = "y" ]; then
    for func in "${FUNCTIONS[@]}"; do
        echo ""
        print_info "Logs for $func (last 20 lines):"
        supabase functions logs "$func" --tail 20 || print_warning "No logs available yet"
    done
fi

echo ""
print_success "Deployment complete!"
echo ""
