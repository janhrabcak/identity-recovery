#!/usr/bin/env bash
# ==============================================================================
# Cold-Start Identity Recovery Protocol - Secure Deployment Script
#
# Automates:
#   1. Pre-flight verification (git status, payload validation)
#   2. Secure masked passphrase ingestion with typo confirmation
#   3. PBKDF2-600k + AES-GCM-256 encryption & HTML injection into public/index.html
#   4. Test suite validation (prevents deploying broken payloads)
#   5. Strict git staging (guarantees no plaintext secrets are committed)
#   6. Git commit & push to main (triggers Cloudflare Edge deployment)
#   7. Secure plaintext shredding (defaults to YES)
# ==============================================================================

set -eo pipefail

# Find repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Load environment configuration if present
if [[ -f "$REPO_ROOT/.env" ]]; then
  RECOVERY_DOMAIN_ENV=$(grep -E '^\s*RECOVERY_DOMAIN=' "$REPO_ROOT/.env" | cut -d'=' -f2- | tr -d '"'\'' ' || true)
fi

# Detect from index.html meta tag if not in environment
META_DOMAIN=$(grep -o 'name="recovery-dns-domain" content="[^"]*"' "$REPO_ROOT/public/index.html" | cut -d'"' -f4 || true)

RECOVERY_DOMAIN="${RECOVERY_DOMAIN:-${RECOVERY_DOMAIN_ENV:-${META_DOMAIN:-recovery.hrabcak.com}}}"

# Colors
C_RESET='\033[0m'
C_BOLD='\033[1m'
C_GREEN='\033[0;32m'
C_YELLOW='\033[1;33m'
C_RED='\033[0;31m'
C_CYAN='\033[0;36m'

echo -e "${C_CYAN}${C_BOLD}"
echo "================================================================="
echo "   Cold-Start Identity Recovery Protocol: Automated Deploy       "
echo "================================================================="
echo -e "${C_RESET}"

# ------------------------------------------------------------------------------
# 1. Pre-flight Verification
# ------------------------------------------------------------------------------
echo -e "${C_BOLD}[1/7] Running pre-flight checks...${C_RESET}"

# Ensure we are inside git repo
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo -e "${C_RED}✗ Error: Not inside a git repository.${C_RESET}"
  exit 1
fi

# Ensure git remote exists
if ! git remote get-url origin >/dev/null 2>&1; then
  echo -e "${C_RED}✗ Error: No git remote 'origin' configured.${C_RESET}"
  exit 1
fi

# Determine payload file
PAYLOAD_FILE="${1:-payload.json}"

if [[ ! -f "$PAYLOAD_FILE" ]]; then
  echo -e "${C_YELLOW}Default payload file '$PAYLOAD_FILE' not found.${C_RESET}"
  read -rp "Enter path to recovery JSON payload file: " CUSTOM_PAYLOAD
  PAYLOAD_FILE="$CUSTOM_PAYLOAD"
  if [[ ! -f "$PAYLOAD_FILE" ]]; then
    echo -e "${C_RED}✗ Error: File not found: '$PAYLOAD_FILE'${C_RESET}"
    exit 1
  fi
fi

# Validate JSON format
if ! node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$PAYLOAD_FILE" >/dev/null 2>&1; then
  echo -e "${C_RED}✗ Error: '$PAYLOAD_FILE' is not valid JSON.${C_RESET}"
  exit 1
fi

# Check required fields
node -e "
  const p = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
  if (!p.onePassword || !p.googleBackupCodes) {
    console.error('Warning: Payload is missing onePassword or googleBackupCodes!');
    process.exit(1);
  }
" "$PAYLOAD_FILE"

echo -e "${C_GREEN}✓ Pre-flight checks passed. Using payload: ${PAYLOAD_FILE}${C_RESET}\n"

# ------------------------------------------------------------------------------
# 2. Secure Passphrase Prompt
# ------------------------------------------------------------------------------
echo -e "${C_BOLD}[2/7] Passphrase Ingestion${C_RESET}"
echo "Enter your memorized 6-word Diceware passphrase."

while true; do
  read -s -rp "Passphrase: " PASSPHRASE
  echo
  if [[ -z "${PASSPHRASE// }" ]]; then
    echo -e "${C_RED}Passphrase cannot be empty. Try again.${C_RESET}"
    continue
  fi

  read -s -rp "Confirm Passphrase: " PASSPHRASE_CONFIRM
  echo
  if [[ "$PASSPHRASE" != "$PASSPHRASE_CONFIRM" ]]; then
    echo -e "${C_RED}✗ Passphrases did not match. Please try again.${C_RESET}"
  else
    echo -e "${C_GREEN}✓ Passphrase confirmed.${C_RESET}\n"
    break
  fi
done

# ------------------------------------------------------------------------------
# 3. Encrypt & Inject into public/index.html
# ------------------------------------------------------------------------------
echo -e "${C_BOLD}[3/7] Encrypting payload & injecting into public/index.html...${C_RESET}"
node scripts/encrypt.js -i "$PAYLOAD_FILE" -p "$PASSPHRASE" --domain "$RECOVERY_DOMAIN" --embed-html public/index.html
echo -e "${C_GREEN}✓ Encryption and HTML injection complete.${C_RESET}\n"

# ------------------------------------------------------------------------------
# 4. Verification & Integrity Tests
# ------------------------------------------------------------------------------
echo -e "${C_BOLD}[4/7] Running test suite verification...${C_RESET}"
node tests/test-suite.js
echo -e "${C_GREEN}✓ Test suite passed completely.${C_RESET}\n"

# ------------------------------------------------------------------------------
# 5. Git Safety Guard (Strict Staging)
# ------------------------------------------------------------------------------
echo -e "${C_BOLD}[5/7] Verifying git safety boundaries...${C_RESET}"

# Verify .gitignore exists
if [[ ! -f ".gitignore" ]]; then
  echo -e "${C_RED}✗ Error: .gitignore missing! Aborting to prevent credential leaks.${C_RESET}"
  exit 1
fi

# Explicitly check that PAYLOAD_FILE is not staged
if git diff --cached --name-only | grep -E "payload|secret|\.env" >/dev/null 2>&1; then
  echo -e "${C_RED}✗ CRITICAL: Sensitive files detected in git staging! Unstaging immediately.${C_RESET}"
  git reset
  exit 1
fi

# Stage ONLY public/index.html
git add public/index.html
echo -e "${C_GREEN}✓ Only public/index.html staged for commit.${C_RESET}\n"

# ------------------------------------------------------------------------------
# 6. Git Commit & Push
# ------------------------------------------------------------------------------
echo -e "${C_BOLD}[6/7] Committing and pushing to remote...${C_RESET}"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

if git diff --cached --quiet; then
  echo -e "${C_YELLOW}Notice: public/index.html has no changes to commit.${C_RESET}"
else
  git commit -m "vault: rotate encrypted recovery payload ($TIMESTAMP)"
  git push origin main
  echo -e "${C_GREEN}✓ Successfully pushed to GitHub main branch.${C_RESET}"
  echo -e "${C_GREEN}✓ Cloudflare Edge deployment automatically triggered!${C_RESET}\n"
fi

# ------------------------------------------------------------------------------
# 7. Secure Plaintext Shredding (Defaults to YES)
# ------------------------------------------------------------------------------
echo -e "${C_BOLD}[7/7] Plaintext Credential Cleanup${C_RESET}"

# Protect template files from accidental shredding
if [[ "$PAYLOAD_FILE" == *"sample-payload.json"* ]]; then
  echo -e "${C_CYAN}Skipping shredding for sample template '$PAYLOAD_FILE'.${C_RESET}"
else
  echo -e "${C_YELLOW}WARNING: Leaving unencrypted plaintext credentials ('$PAYLOAD_FILE') on disk is a security risk.${C_RESET}"
  read -rp "Securely shred and permanently remove '$PAYLOAD_FILE'? [Y/n]: " SHRED_CHOICE
  SHRED_CHOICE="${SHRED_CHOICE:-Y}"

  if [[ "$SHRED_CHOICE" =~ ^[Yy]$ ]]; then
    if command -v shred >/dev/null 2>&1; then
      shred -u -z -n 3 "$PAYLOAD_FILE"
      echo -e "${C_GREEN}✓ Securely shredded and unlinked '$PAYLOAD_FILE' (3 passes + zero-fill).${C_RESET}"
    else
      rm -P "$PAYLOAD_FILE" 2>/dev/null || rm -f "$PAYLOAD_FILE"
      echo -e "${C_GREEN}✓ Permanently removed '$PAYLOAD_FILE'.${C_RESET}"
    fi
  else
    echo -e "${C_YELLOW}⚠️ Preserved '$PAYLOAD_FILE' on disk. Remember to delete it before leaving this machine!${C_RESET}"
  fi
fi

# Optional secondary DNS Dead-Drop info
B64_CIPHERTEXT=$(grep -o 'const EMBEDDED_CIPHERTEXT = "[^"]*"' public/index.html | cut -d'"' -f2)
if [[ -n "$B64_CIPHERTEXT" ]]; then
  RECORD_NAME=$(echo "$RECOVERY_DOMAIN" | cut -d'.' -f1)
  echo -e "\n${C_CYAN}${C_BOLD}DNS TXT Dead-Drop Record (${RECOVERY_DOMAIN}):${C_RESET}"
  echo -e "To sync your secondary dead-drop, add or update this TXT record in Cloudflare DNS:"
  echo -e "  ${C_BOLD}Type:${C_RESET}    TXT"
  echo -e "  ${C_BOLD}Name:${C_RESET}    $RECORD_NAME"
  echo -e "  ${C_BOLD}TTL:${C_RESET}     Auto (or 300s)"
  echo -e "  ${C_BOLD}Content:${C_RESET} $B64_CIPHERTEXT"
fi

echo
echo -e "${C_GREEN}${C_BOLD}================================================================="
echo "   DEPLOYMENT COMPLETE: Recovery Vault Updated Successfully!    "
echo "=================================================================${C_RESET}"
