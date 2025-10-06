#!/bin/bash
# This script wraps all auth pages with Suspense boundaries

files=("app/auth/login/page.tsx" "app/auth/signup/page.tsx" "app/auth/reset-password/page.tsx")

for file in "${files[@]}"; do
  echo "Fixing $file..."
  # Read the entire file content
  content=$(cat "$file")
  
  # Extract everything after 'use client' and export dynamic
  # We'll create a wrapper component approach
done
