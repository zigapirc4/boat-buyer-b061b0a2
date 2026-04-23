#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage:"
  echo "  scripts/switch-supabase-project.sh --project-ref <ref> --url <https://<ref>.supabase.co> --anon-key <jwt>"
  exit 1
}

PROJECT_REF=""
SUPABASE_URL=""
ANON_KEY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-ref)
      PROJECT_REF="${2:-}"
      shift 2
      ;;
    --url)
      SUPABASE_URL="${2:-}"
      shift 2
      ;;
    --anon-key)
      ANON_KEY="${2:-}"
      shift 2
      ;;
    *)
      usage
      ;;
  esac
done

if [[ -z "$PROJECT_REF" || -z "$SUPABASE_URL" || -z "$ANON_KEY" ]]; then
  usage
fi

if [[ ! "$SUPABASE_URL" =~ ^https://[a-z0-9-]+\.supabase\.co$ ]]; then
  echo "Invalid --url format. Example: https://myproject.supabase.co"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
CONFIG_FILE="$ROOT_DIR/supabase/config.toml"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"

if [[ ! -f "$ENV_FILE" ]]; then
  echo ".env not found at $ENV_FILE"
  exit 1
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "supabase/config.toml not found at $CONFIG_FILE"
  exit 1
fi

python3 - "$ENV_FILE" "$CONFIG_FILE" "$MIGRATIONS_DIR" "$PROJECT_REF" "$SUPABASE_URL" "$ANON_KEY" <<'PY'
import re
import sys
from pathlib import Path

env_file = Path(sys.argv[1])
config_file = Path(sys.argv[2])
migrations_dir = Path(sys.argv[3])
project_ref = sys.argv[4]
supabase_url = sys.argv[5]
anon_key = sys.argv[6]

def replace_or_append(content: str, key: str, value: str) -> str:
    pattern = re.compile(rf'^{re.escape(key)}=.*$', flags=re.M)
    line = f'{key}="{value}"'
    if pattern.search(content):
        return pattern.sub(line, content)
    if content and not content.endswith("\n"):
        content += "\n"
    return content + line + "\n"

env = env_file.read_text(encoding="utf-8")
env = replace_or_append(env, "VITE_SUPABASE_PROJECT_ID", project_ref)
env = replace_or_append(env, "VITE_SUPABASE_URL", supabase_url)
env = replace_or_append(env, "VITE_SUPABASE_PUBLISHABLE_KEY", anon_key)
env_file.write_text(env, encoding="utf-8")

cfg = config_file.read_text(encoding="utf-8")
cfg = re.sub(
    r'^project_id\s*=\s*".*?"\s*$',
    f'project_id = "{project_ref}"',
    cfg,
    flags=re.M,
)
config_file.write_text(cfg, encoding="utf-8")

# Update hardcoded Supabase URLs and anon bearer tokens in SQL migrations.
url_re = re.compile(r"https://[a-z0-9-]+\.supabase\.co")
token_re = re.compile(r'("Authorization"\s*:\s*"Bearer\s+)([^"]+)(")')

updated_files = 0
for path in sorted(migrations_dir.glob("*.sql")):
    src = path.read_text(encoding="utf-8")
    dst = url_re.sub(supabase_url, src)
    dst = token_re.sub(rf'\1{anon_key}\3', dst)
    if dst != src:
        path.write_text(dst, encoding="utf-8")
        updated_files += 1

print(f"Updated .env and supabase/config.toml")
print(f"Updated migration files: {updated_files}")
PY

echo "Done."
echo "Next:"
echo "  1) npx supabase login"
echo "  2) npx supabase link --project-ref $PROJECT_REF"
echo "  3) npx supabase db push"
echo "  4) npx supabase functions deploy scrape-free --project-ref $PROJECT_REF"
