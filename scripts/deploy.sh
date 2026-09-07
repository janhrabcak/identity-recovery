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
  CLOUDFLARE_API_TOKEN_ENV=$(grep -E '^\s*CLOUDFLARE_API_TOKEN=' "$REPO_ROOT/.env" | cut -d'=' -f2- | tr -d '"'\'' ' || true)
  CLOUDFLARE_ZONE_ID_ENV=$(grep -E '^\s*CLOUDFLARE_ZONE_ID=' "$REPO_ROOT/.env" | cut -d'=' -f2- | tr -d '"'\'' ' || true)
fi

# Detect from index.html meta tag if not in environment
META_DOMAIN=$(grep -o 'name="recovery-dns-domain" content="[^"]*"' "$REPO_ROOT/public/index.html" | cut -d'"' -f4 || true)

RECOVERY_DOMAIN="${RECOVERY_DOMAIN:-${RECOVERY_DOMAIN_ENV:-${META_DOMAIN:-recovery.hrabcak.com}}}"
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-$CLOUDFLARE_API_TOKEN_ENV}"
CLOUDFLARE_ZONE_ID="${CLOUDFLARE_ZONE_ID:-$CLOUDFLARE_ZONE_ID_ENV}"

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
if ! node -e "import('node:fs').then(fs=>JSON.parse(fs.readFileSync(process.argv[1],'utf8')))" "$PAYLOAD_FILE" >/dev/null 2>&1; then
  echo -e "${C_RED}✗ Error: '$PAYLOAD_FILE' is not valid JSON.${C_RESET}"
  exit 1
fi

# Check required fields
node -e "
  const fs = await import('node:fs');
  const p = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
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

  ENTROPY_CHECK=$(node -e "
    import('./scripts/encrypt.js').then(m => {
      const res = m.evaluatePassphraseEntropy(process.argv[1]);
      if (!res.valid) {
        console.error(res.reason);
        process.exit(1);
      }
      console.log(res.wordCount);
    }).catch(e => {
      console.error('Failed to load encrypt.js:', e.message);
      process.exit(1);
    });
  " "$PASSPHRASE" 2>&1) || ENTROPY_STATUS=$?

  if [[ "${ENTROPY_STATUS:-0}" -ne 0 ]]; then
    echo -e "${C_RED}✗ Passphrase Entropy Error: ${ENTROPY_CHECK}${C_RESET}"
    echo -e "${C_YELLOW}Please enter a valid 6-word Diceware passphrase (~77 bits entropy).${C_RESET}\n"
    unset ENTROPY_STATUS
    continue
  fi

  read -s -rp "Confirm Passphrase: " PASSPHRASE_CONFIRM
  echo
  if [[ "$PASSPHRASE" != "$PASSPHRASE_CONFIRM" ]]; then
    echo -e "${C_RED}✗ Passphrases did not match. Please try again.${C_RESET}"
  else
    echo -e "${C_GREEN}✓ Passphrase confirmed (${ENTROPY_CHECK} words, ~77 bits entropy verified).${C_RESET}\n"
    break
  fi
done

# ------------------------------------------------------------------------------
# 3. Encrypt & Inject into public/index.html
# ------------------------------------------------------------------------------
echo -e "${C_BOLD}[3/7] Encrypting payload & injecting into public/index.html...${C_RESET}"
ENCRYPT_PASSPHRASE="$PASSPHRASE" node scripts/encrypt.js -i "$PAYLOAD_FILE" --domain "$RECOVERY_DOMAIN" --embed-html public/index.html
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

# Clear ALL staged changes first to guarantee a clean staging area
git reset --quiet 2>/dev/null || true

# Stage ONLY public/index.html — nothing else touches the commit
git add public/index.html

# Final safety audit: verify only public/index.html is staged
STAGED_FILES=$(git diff --cached --name-only)
if [[ "$STAGED_FILES" != "public/index.html" && -n "$STAGED_FILES" ]]; then
  echo -e "${C_RED}✗ CRITICAL: Unexpected files in staging area! Aborting.${C_RESET}"
  echo -e "${C_RED}Staged files: ${STAGED_FILES}${C_RESET}"
  git reset --quiet
  exit 1
fi
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

# Optional secondary DNS Dead-Drop Synchronization
B64_CIPHERTEXT=$(grep -o 'const EMBEDDED_CIPHERTEXT = "[^"]*"' public/index.html | cut -d'"' -f2)
if [[ -n "$B64_CIPHERTEXT" ]]; then
  RECORD_NAME="$RECOVERY_DOMAIN"

  if [[ -n "$CLOUDFLARE_API_TOKEN" && -n "$CLOUDFLARE_ZONE_ID" ]]; then
    echo -e "\n${C_CYAN}${C_BOLD}Synchronizing Cloudflare DNS TXT Dead-Drop (${RECOVERY_DOMAIN})...${C_RESET}"
    
    # Query existing TXT record ID
    CF_QUERY_RES=$(curl -s -X GET \
      "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?type=TXT&name=${RECOVERY_DOMAIN}" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" || true)

    EXISTING_RECORD_ID=$(node -e "
      try {
        const res = JSON.parse(process.argv[1]);
        if (res.success && res.result && res.result.length > 0) {
          console.log(res.result[0].id);
        }
      } catch (e) {}
    " "$CF_QUERY_RES")

    RECORD_PAYLOAD=$(node -e "
      console.log(JSON.stringify({
        type: 'TXT',
        name: process.argv[1],
        content: process.argv[2],
        ttl: 120,
        comment: 'Cold-Start Identity Recovery Dead-Drop (Automated by deploy.sh)'
      }));
    " "$RECOVERY_DOMAIN" "$B64_CIPHERTEXT")

    if [[ -n "$EXISTING_RECORD_ID" ]]; then
      # Update existing record
      CF_SYNC_RES=$(curl -s -X PUT \
        "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${EXISTING_RECORD_ID}" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" \
        --data "$RECORD_PAYLOAD" || true)
    else
      # Create new record
      CF_SYNC_RES=$(curl -s -X POST \
        "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" \
        --data "$RECORD_PAYLOAD" || true)
    fi

    CF_SYNC_SUCCESS=$(node -e "
      try {
        const res = JSON.parse(process.argv[1]);
        console.log(res.success ? 'true' : 'false');
      } catch (e) {
        console.log('false');
      }
    " "$CF_SYNC_RES")

    if [[ "$CF_SYNC_SUCCESS" == "true" ]]; then
      echo -e "${C_GREEN}✓ Cloudflare DNS TXT record synchronized successfully! (TTL: 120s)${C_RESET}"
    else
      CF_ERR_MSG=$(node -e "
        try {
          const res = JSON.parse(process.argv[1]);
          const errs = (res.errors || []).map(e => e.message).join(', ');
          console.log(errs || 'Unknown error');
        } catch (e) {
          console.log('Failed to parse Cloudflare response');
        }
      " "$CF_SYNC_RES")
      echo -e "${C_RED}✗ Cloudflare DNS API sync failed: ${CF_ERR_MSG}${C_RESET}"
      echo -e "${C_YELLOW}Falling back to manual DNS record details:${C_RESET}"
      echo -e "  ${C_BOLD}Type:${C_RESET}    TXT"
      echo -e "  ${C_BOLD}Name:${C_RESET}    $RECORD_NAME"
      echo -e "  ${C_BOLD}TTL:${C_RESET}     120s"
      echo -e "  ${C_BOLD}Content:${C_RESET} $B64_CIPHERTEXT"
    fi
  else
    echo -e "\n${C_CYAN}${C_BOLD}DNS TXT Dead-Drop Record (${RECOVERY_DOMAIN}):${C_RESET}"
    echo -e "To sync your secondary dead-drop, add or update this TXT record in Cloudflare DNS:"
    echo -e "  ${C_BOLD}Type:${C_RESET}    TXT"
    echo -e "  ${C_BOLD}Name:${C_RESET}    $RECORD_NAME"
    echo -e "  ${C_BOLD}TTL:${C_RESET}     120s"
    echo -e "  ${C_BOLD}Content:${C_RESET} $B64_CIPHERTEXT"
    echo -e "\n${C_CYAN}Tip: Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID in .env to automate this step!${C_RESET}"
  fi
fi

echo
echo -e "${C_GREEN}${C_BOLD}================================================================="
echo "   DEPLOYMENT COMPLETE: Recovery Vault Updated Successfully!    "
echo "=================================================================${C_RESET}"
