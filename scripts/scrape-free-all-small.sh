#!/usr/bin/env bash
# Run scrape-free over every CATEGORY_PAGES entry in small HTTP chunks (1 category,
# 2 listing-index pages at a time) so Edge stays under timeout / resource limits.
# Requires .env with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
#
# Usage: bash scripts/scrape-free-all-small.sh
# Optional: SCRAPE_SLEEP_SEC=4 bash scripts/scrape-free-all-small.sh

set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env in $ROOT"
  exit 1
fi

set -a
# shellcheck source=/dev/null
source .env
set +a

URL="${VITE_SUPABASE_URL}/functions/v1/scrape-free"
KEY="${VITE_SUPABASE_PUBLISHABLE_KEY}"
SLEEP_SEC="${SCRAPE_SLEEP_SEC:-3}"

if [[ -z "$URL" || -z "$KEY" ]]; then
  echo "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set in .env"
  exit 1
fi

# Max listing pages per CATEGORY_PAGES index (must match scrape-free/index.ts).
MAX_PAGES=(8 8 30 30 30 30 30 30 30 30 20 20 20 20)

LABELS=(
  "mornar.net sail"
  "mornar.net power"
  "trovobarche.it sail"
  "trovobarche.it power"
  "boat24.com sail"
  "boat24.com power"
  "scanboat.com sail"
  "scanboat.com power"
  "yachtworld.com sail"
  "yachtworld.com power"
  "yachtall.com sail"
  "yachtall.com power"
  "nautano.com sail"
  "nautano.com power"
)

run_chunk() {
  local idx="$1"
  local p="$2"
  local pe="$3"
  local cs="$idx"
  local ce=$((idx + 1))
  local yw_json=""
  # YachtWorld uses yachtworldPageEnd as an extra cap in the worker.
  if [[ "$idx" -eq 8 || "$idx" -eq 9 ]]; then
    yw_json=",\"yachtworldPageEnd\":${pe}"
  fi
  local body
  body="{\"categoryStart\":${cs},\"categoryEnd\":${ce},\"pageStart\":${p},\"pageEnd\":${pe},\"maxListingsPerPage\":12,\"listingConcurrency\":2,\"pageConcurrency\":1,\"fetchRetries\":2,\"upsertRetries\":2,\"enableAiBrandModel\":true${yw_json}}"
  echo ""
  echo ">>> [$(date -u +"%Y-%m-%dT%H:%M:%SZ")] ${LABELS[$idx]} — categories [${cs},${ce}) pages ${p}-${pe}"
  if ! curl -sS -m 300 -X POST "$URL" \
    -H "Authorization: Bearer ${KEY}" \
    -H "Content-Type: application/json" \
    -d "$body"; then
    echo "!!! curl failed for idx=$idx pages $p-$pe"
  fi
  echo ""
  sleep "$SLEEP_SEC"
}

for i in "${!MAX_PAGES[@]}"; do
  max="${MAX_PAGES[$i]}"
  for ((p = 1; p <= max; p += 2)); do
    pe=$((p + 1))
    if ((pe > max)); then pe=$max; fi
    run_chunk "$i" "$p" "$pe"
  done
done

echo "Done. All ${#MAX_PAGES[@]} source/type lanes processed in 2-page windows."
