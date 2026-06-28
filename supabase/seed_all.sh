#!/usr/bin/env bash
# taste.node — One-command Supabase demo seed runner
#
# Prerequisites:
#   export SUPABASE_URL=https://your-project.supabase.co
#   export SUPABASE_SERVICE_KEY=your-service-role-key
#
# Then just run:
#   ./supabase/seed_all.sh

set -euo pipefail

cd "$(dirname "$0")/.."

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_KEY:-}" ]; then
    echo "Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set."
    echo "Example:"
    echo "  export SUPABASE_URL=https://your-project.supabase.co"
    echo "  export SUPABASE_SERVICE_KEY=sb_service_role_..."
    exit 1
fi

echo "=== taste.node Supabase Demo Seed ==="
echo "Target: $SUPABASE_URL"
echo ""

echo "[1/3] Regenerating 100K venues (if needed)..."
python supabase/generate_japan_venues.py

echo ""
echo "[2/3] Seeding venues to Supabase (100K batched inserts)..."
python supabase/seed_venues_to_supabase.py

echo ""
echo "[3/3] Seeding 1000 demo users + contexts + ranked items + follows + feed posts..."
python supabase/seed_demo_to_supabase.py

echo ""
echo "=== Seed complete ==="
echo "Check your Supabase dashboard for the data."
