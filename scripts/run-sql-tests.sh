#!/usr/bin/env bash
# Jalankan penguji SQL yang stabil terhadap Supabase lokal.
# Tidak dijalankan oleh npm run check karena memerlukan database DEV.
set -u
host="${PGHOST:-127.0.0.1}"
port="${PGPORT:-54322}"
user="${PGUSER:-postgres}"
dbname="${PGDATABASE:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"

files=(
  supabase/tests/revision_privacy.sql
  supabase/tests/security_baseline.sql
  supabase/tests/participant_event_scope.sql
  supabase/tests/public_aggregate_allowlist.sql
  supabase/tests/observer_assignment_scope.sql
  supabase/tests/finalize_approval_order.sql
  supabase/tests/rpc_contract_behavior.sql
)

failed=0
for file in "${files[@]}"; do
  if psql -h "$host" -p "$port" -U "$user" -d "$dbname" -v ON_ERROR_STOP=1 -f "$file" >/dev/null 2>&1; then
    echo "OK   $file"
  else
    echo "FAIL $file"
    failed=1
  fi
done
exit "$failed"
