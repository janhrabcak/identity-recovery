#!/usr/bin/env bash
# ==============================================================================
# Cold-Start Identity Recovery Protocol - Modular Web Platform Deployment Script
#
# Supports deploying the public product hub & offline web builder (site/)
# across multiple serverless edge providers:
#   - Cloudflare Pages (Default - idrecoverykit.com)
#   - Netlify
#   - Vercel
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Color helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

# Load environment configuration if present
if [[ -f "$REPO_ROOT/.env" ]]; then
  DEPLOY_PROVIDER_ENV=$(grep -E '^\s*DEPLOY_PROVIDER=' "$REPO_ROOT/.env" | cut -d'=' -f2- | tr -d '"'\'' ' || true)
  CLOUDFLARE_PAGES_SITE_PROJECT_ENV=$(grep -E '^\s*CLOUDFLARE_PAGES_SITE_PROJECT=' "$REPO_ROOT/.env" | cut -d'=' -f2- | tr -d '"'\'' ' || true)
  CLOUDFLARE_PAGES_PROJECT_ENV=$(grep -E '^\s*CLOUDFLARE_PAGES_PROJECT=' "$REPO_ROOT/.env" | cut -d'=' -f2- | tr -d '"'\'' ' || true)
  CLOUDFLARE_API_TOKEN_ENV=$(grep -E '^\s*CLOUDFLARE_API_TOKEN=' "$REPO_ROOT/.env" | cut -d'=' -f2- | tr -d '"'\'' ' || true)
  CLOUDFLARE_ACCOUNT_ID_ENV=$(grep -E '^\s*CLOUDFLARE_ACCOUNT_ID=' "$REPO_ROOT/.env" | cut -d'=' -f2- | tr -d '"'\'' ' || true)
  NETLIFY_SITE_ID_ENV=$(grep -E '^\s*NETLIFY_SITE_ID=' "$REPO_ROOT/.env" | cut -d'=' -f2- | tr -d '"'\'' ' || true)
  NETLIFY_AUTH_TOKEN_ENV=$(grep -E '^\s*NETLIFY_AUTH_TOKEN=' "$REPO_ROOT/.env" | cut -d'=' -f2- | tr -d '"'\'' ' || true)
  VERCEL_TOKEN_ENV=$(grep -E '^\s*VERCEL_TOKEN=' "$REPO_ROOT/.env" | cut -d'=' -f2- | tr -d '"'\'' ' || true)
  VERCEL_ORG_ID_ENV=$(grep -E '^\s*VERCEL_ORG_ID=' "$REPO_ROOT/.env" | cut -d'=' -f2- | tr -d '"'\'' ' || true)
  VERCEL_PROJECT_ID_ENV=$(grep -E '^\s*VERCEL_PROJECT_ID=' "$REPO_ROOT/.env" | cut -d'=' -f2- | tr -d '"'\'' ' || true)
fi

# Defaults
DEPLOY_PROVIDER="${DEPLOY_PROVIDER:-${DEPLOY_PROVIDER_ENV:-cloudflare}}"
PAGES_PROJECT="${CLOUDFLARE_PAGES_SITE_PROJECT_ENV:-${CLOUDFLARE_PAGES_PROJECT_ENV:-idrecoverykit}}"
BRANCH="main"
SKIP_BUILD=false

# CLI parsing
while [[ $# -gt 0 ]]; do
  case "$1" in
    --provider)
      DEPLOY_PROVIDER="$2"
      shift 2
      ;;
    --project)
      PAGES_PROJECT="$2"
      shift 2
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --list-providers)
      node scripts/providers/index.js list
      exit 0
      ;;
    --help|-h)
      echo "Usage: ./scripts/deploy-site.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --provider <name>   Target provider: cloudflare (default), netlify, or vercel"
      echo "  --project <name>    Project/site name (default: idrecoverykit)"
      echo "  --branch <name>     Target branch for deployment (default: main)"
      echo "  --skip-build        Skip running npm run build:site before deploying"
      echo "  --list-providers    List all supported hosting providers and status"
      echo "  --help, -h          Display this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BOLD}${CYAN}=== Modular Web Platform Deployment (${DEPLOY_PROVIDER^^}) ===${NC}"

# Step 1: Build & Synchronize Site Assets via Provider Registry
if [ "$SKIP_BUILD" = false ]; then
  echo -e "\n${BLUE}[1/3] Building Web Platform & Synchronizing Multi-Provider Assets...${NC}"
  node scripts/build-site.js
  echo -e "${GREEN}✓ Web assets and multi-provider edge security headers synchronized.${NC}"
else
  echo -e "\n${YELLOW}[1/3] Skipping build step (--skip-build specified).${NC}"
fi

# Step 2: Validate Target Files & Parity
echo -e "\n${BLUE}[2/3] Validating Site Integrity...${NC}"
if [[ ! -f "$REPO_ROOT/site/index.html" ]]; then
  echo -e "${RED}Error: site/index.html missing!${NC}" >&2
  exit 1
fi
if [[ ! -f "$REPO_ROOT/site/app/index.html" ]]; then
  echo -e "${RED}Error: site/app/index.html missing!${NC}" >&2
  exit 1
fi

echo -e "${GREEN}✓ Site assets verified: Landing page, /app/ web builder, and provider configs present.${NC}"

# Step 3: Deploy to Chosen Edge Provider
echo -e "\n${BLUE}[3/3] Deploying to ${BOLD}${DEPLOY_PROVIDER^^}${NC}${BLUE} edge...${NC}"

if [[ "$DEPLOY_PROVIDER" == "cloudflare" ]]; then
  if [[ -n "${CLOUDFLARE_API_TOKEN_ENV:-}" ]]; then
    export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN_ENV"
  fi
  if [[ -n "${CLOUDFLARE_ACCOUNT_ID_ENV:-}" ]]; then
    export CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID_ENV"
  fi

  npx wrangler pages deploy site \
    --project-name="$PAGES_PROJECT" \
    --branch="$BRANCH" \
    --commit-dirty=true

  echo -e "\n${GREEN}${BOLD}🎉 Deployment to Cloudflare Pages complete!${NC}"
  echo -e "${CYAN}Next Steps for idrecoverykit.com:${NC}"
  echo -e "  1. Log in to Cloudflare Dashboard: https://dash.cloudflare.com/"
  echo -e "  2. Go to ${BOLD}Workers & Pages${NC} -> select project ${BOLD}${PAGES_PROJECT}${NC}."
  echo -e "  3. Open the ${BOLD}Custom domains${NC} tab and click ${BOLD}Set up a custom domain${NC}."
  echo -e "  4. Add ${BOLD}idrecoverykit.com${NC} and ${BOLD}www.idrecoverykit.com${NC}."

elif [[ "$DEPLOY_PROVIDER" == "netlify" ]]; then
  NETLIFY_ARGS=("--dir=site" "--prod")
  if [[ -n "${NETLIFY_SITE_ID_ENV:-}" ]]; then
    NETLIFY_ARGS+=("--site=$NETLIFY_SITE_ID_ENV")
  fi
  if [[ -n "${NETLIFY_AUTH_TOKEN_ENV:-}" ]]; then
    NETLIFY_ARGS+=("--auth=$NETLIFY_AUTH_TOKEN_ENV")
  fi
  npx --yes netlify-cli deploy "${NETLIFY_ARGS[@]}"

  echo -e "\n${GREEN}${BOLD}🎉 Deployment to Netlify complete!${NC}"

elif [[ "$DEPLOY_PROVIDER" == "vercel" ]]; then
  VERCEL_ARGS=("site" "--prod" "--yes")
  if [[ -n "${VERCEL_TOKEN_ENV:-}" ]]; then
    VERCEL_ARGS+=("--token=$VERCEL_TOKEN_ENV")
  fi
  if [[ -n "${VERCEL_ORG_ID_ENV:-}" ]]; then
    export VERCEL_ORG_ID="$VERCEL_ORG_ID_ENV"
  fi
  if [[ -n "${VERCEL_PROJECT_ID_ENV:-}" ]]; then
    export VERCEL_PROJECT_ID="$VERCEL_PROJECT_ID_ENV"
  fi
  npx --yes vercel deploy "${VERCEL_ARGS[@]}"

  echo -e "\n${GREEN}${BOLD}🎉 Deployment to Vercel complete!${NC}"

else
  echo -e "${RED}Error: Unsupported provider '$DEPLOY_PROVIDER'. Run './scripts/deploy-site.sh --list-providers' to see options.${NC}" >&2
  exit 1
fi
