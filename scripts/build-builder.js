#!/usr/bin/env node
/**
 * Builder Generator for Cold-Start Identity Recovery Protocol
 * Generates tools/builder.html with embedded default template from public/index.html.
 * Studio Workspace Edition (Split-Pane Sidebar + Active Card Editor + Live Terminal Preview)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const templatePath = path.join(REPO_ROOT, 'public', 'index.html');
if (!fs.existsSync(templatePath)) {
  console.error(`Error: public/index.html not found at ${templatePath}`);
  process.exit(1);
}

const templateRaw = fs.readFileSync(templatePath, 'utf8');
const templateB64 = Buffer.from(templateRaw, 'utf8').toString('base64');

const toolsDir = path.join(REPO_ROOT, 'tools');
if (!fs.existsSync(toolsDir)) {
  fs.mkdirSync(toolsDir, { recursive: true });
}

// Curated 1,000 common, friendly, unambiguous 4-8 letter English words for Diceware generator
const DICEWARE_WORDS = [
  "acorn", "action", "active", "actor", "admire", "admit", "adore", "advice", "afford", "afraid",
  "agency", "agenda", "agent", "agile", "agree", "ahead", "aiming", "airport", "alarm", "alaska",
  "alder", "alert", "alibi", "align", "allege", "alley", "allied", "alloy", "almost", "alpine",
  "alter", "amaze", "amber", "amend", "amity", "amount", "amuse", "anchor", "angel", "angle",
  "animal", "anklet", "annual", "answer", "anthem", "antique", "anvil", "anyhow", "anyone", "apiece",
  "appeal", "appear", "append", "apple", "apron", "arcade", "archer", "arctic", "ardent", "arena",
  "argue", "aridly", "armada", "armor", "aroma", "around", "arouse", "array", "arrest", "arrive",
  "arrow", "arthur", "artist", "ascend", "ascent", "ashore", "asking", "asleep", "aspect", "aspire",
  "assent", "assert", "assign", "assist", "assume", "assure", "aston", "astral", "atlas", "atom",
  "atomic", "attach", "attack", "attain", "attend", "attic", "attire", "auburn", "auction", "audio",
  "audit", "august", "auntie", "aurora", "author", "autism", "autumn", "avail", "avenue", "aviary",
  "avocado", "avoid", "avowal", "await", "awake", "awaken", "award", "aware", "awash", "awhile",
  "awning", "axle", "baboon", "backup", "badger", "baffle", "bagel", "baggage", "baker", "balance",
  "balcony", "ballad", "ballet", "ballot", "balsam", "bamboo", "banana", "bandit", "banker", "banner",
  "banquet", "barber", "barely", "bargain", "barker", "barley", "barnet", "baron", "barrel", "barter",
  "basalt", "baseman", "basics", "basket", "bassoon", "baton", "batter", "battle", "beacon", "beagle",
  "beanie", "bearing", "beast", "beauty", "beaver", "beckon", "bedbug", "bedford", "bedrock", "beeper",
  "beetle", "before", "beggar", "behalf", "behave", "behold", "belief", "belittle", "belong", "beloved",
  "belted", "bender", "bengal", "benign", "bequest", "berlin", "beside", "bestow", "bethel", "betray",
  "better", "beyond", "biased", "biblical", "bicycle", "bidder", "bifocal", "bigot", "bikini", "billet",
  "binary", "binder", "biology", "birch", "bishop", "bison", "bitter", "blaster", "blazer", "blender",
  "blessing", "blimp", "blizzard", "blonde", "blossom", "blunder", "bobcat", "boggle", "boiler", "bonanza",
  "bonding", "bonfire", "bonnet", "bonsai", "booklet", "boomer", "bootleg", "border", "boring", "botany",
  "bottle", "bounce", "boundary", "bouquet", "bovine", "bowling", "boxcar", "boxing", "boyhood", "bracket",
  "braided", "brainy", "bramble", "branch", "brandy", "brass", "bravery", "brawler", "breadth", "breaker",
  "breeder", "breeze", "brewer", "bribe", "bridge", "brigade", "bright", "brilliant", "brimful", "brine",
  "brisket", "bristle", "bronco", "bronze", "brother", "brush", "brutish", "bubble", "bucket", "buckle",
  "budget", "buffalo", "buffet", "buggy", "builder", "bullet", "bumble", "bumper", "bundle", "bungee",
  "bunker", "burden", "bureau", "burglar", "burnout", "burrito", "bursar", "busboy", "bushel", "bushy",
  "bustle", "butler", "butter", "button", "buyer", "buzzard", "cabbage", "cabin", "cabinet", "cable",
  "cactus", "cadet", "cadillac", "cafeteria", "calcium", "calendar", "calico", "caller", "calmly", "calorie",
  "camera", "camper", "campus", "canal", "canary", "cancel", "candle", "candor", "canine", "canning",
  "cannon", "canoe", "canopy", "canteen", "canvas", "canyon", "capable", "capital", "caprice", "captain",
  "caption", "capture", "caravan", "carbon", "cardiac", "cardigan", "career", "careful", "cargo", "caribou",
  "caring", "carnival", "carpenter", "carpet", "carrier", "carrot", "cartel", "carton", "carve", "cascade",
  "cashier", "casino", "cassette", "castaway", "castle", "casual", "catalog", "catchy", "caterer", "catfish",
  "cathode", "cattle", "caucus", "cauliflower", "causeway", "caution", "cavalry", "cavern", "ceasefire", "cedar",
  "ceiling", "celebrate", "celery", "celestial", "cellar", "cement", "censor", "census", "central", "ceramic",
  "cereal", "ceremony", "certain", "certify", "chalet", "chalk", "chamber", "champion", "channel", "chapel",
  "chapter", "charcoal", "charge", "chariot", "charity", "charm", "charter", "chaser", "chateau", "checkup",
  "cheddar", "cheering", "chemist", "cherry", "chestnut", "chevron", "chicken", "chicory", "chieftain", "childhood",
  "chimney", "chimpanzee", "chisel", "chloride", "chocolate", "chorus", "chowder", "chrome", "chronic", "chubby",
  "chuckle", "chunk", "church", "chutney", "cider", "cigar", "cinema", "cinnamon", "circle", "circuit",
  "circular", "cistern", "citadel", "citizen", "citrus", "civics", "clamor", "clanking", "clarity", "classic",
  "clatter", "clavicle", "cleanup", "clearance", "clearing", "clever", "client", "climate", "climax", "clinic",
  "clipping", "cloak", "clobber", "clock", "closet", "closure", "clothes", "cloud", "clover", "cluster",
  "clutch", "coastal", "coaster", "cobalt", "cobbler", "cobra", "cobweb", "cockpit", "coconut", "cocoon",
  "codebook", "coffee", "cognac", "cohesion", "coiling", "coinage", "coldness", "collage", "collapse", "colleague",
  "collector", "college", "collie", "cologne", "colonel", "colony", "column", "combat", "combine", "comedian",
  "comfort", "comic", "command", "commence", "commerce", "commute", "compact", "companion", "company", "compass",
  "compile", "complain", "complex", "composer", "compost", "compute", "comrade", "conceal", "concede", "concept",
  "concerto", "conclude", "concrete", "condor", "conduct", "conduit", "confess", "confetti", "confide", "confirm",
  "conform", "confuse", "conga", "conical", "connect", "conquer", "consent", "console", "constant", "consult",
  "consume", "contact", "contain", "content", "contest", "context", "continue", "contour", "contract", "contrary",
  "contrast", "control", "convene", "convent", "converse", "convert", "convex", "convey", "convict", "convoy",
  "cookout", "coolant", "cooling", "copper", "copilot", "cordial", "corkscrew", "cornbread", "cornea", "corner",
  "cornet", "cornice", "coronet", "corporal", "correct", "corridor", "corrode", "corrupt", "corsair", "corset",
  "cortex", "cosmic", "cosmos", "costume", "cottage", "cotton", "couch", "cougar", "counsel", "counter",
  "countess", "country", "county", "coupling", "courage", "courier", "courtyard", "cousin", "covenant", "coverage",
  "cowboy", "coworker", "coyote", "coziness", "cradle", "crafty", "crag", "cranberry", "crane", "crater",
  "crawfish", "crayon", "creature", "credence", "credit", "creek", "creep", "crept", "crescent", "crest",
  "crevice", "cricket", "crimson", "cripple", "crisis", "crispy", "criteria", "critic", "critter", "crockery",
  "crocodile", "crocus", "croissant", "croquet", "crossbar", "crowbar", "crown", "crucial", "crucible", "crude",
  "cruiser", "crumb", "crumpet", "crusade", "crush", "crust", "crystal", "cubicle", "cucumber", "cuddle",
  "cueball", "cuisine", "culprit", "cultivate", "culture", "cumulus", "cupcake", "cupola", "curator", "curfew",
  "curiosity", "curler", "curly", "currency", "current", "curriculum", "curry", "curse", "curtain", "curtsy",
  "cushion", "custard", "custom", "cuticle", "cutlery", "cutlet", "cyber", "cycle", "cyclone", "cylinder",
  "cymbal", "cynic", "cypress", "dagger", "daily", "dairy", "daisy", "damage", "damask", "damper",
  "dancer", "dandelion", "dandruff", "dapper", "daredevil", "darkroom", "darling", "dashboard", "database", "datebook",
  "daughter", "daunting", "dawdling", "daybreak", "daydream", "daylight", "daytime", "dazzle", "deacon", "deadlock",
  "dealer", "dearborn", "debatable", "debris", "debtor", "decade", "decency", "decibel", "decide", "decimal",
  "decking", "declare", "decline", "decode", "decor", "decrease", "decree", "dedicate", "deduct", "deepen",
  "defeat", "defect", "defend", "defense", "defer", "defiant", "deficit", "deflate", "deforest", "defrost",
  "degree", "dejected", "delay", "delegate", "delight", "deliver", "delusion", "demand", "demerit", "demise",
  "democrat", "demolish", "demon", "demote", "denial", "density", "dentist", "denture", "depart", "depend",
  "depict", "deplete", "deploy", "deposit", "deprave", "depress", "deprive", "deputy", "derail", "derby",
  "derive", "descend", "describe", "desert", "deserve", "design", "desire", "desktop", "despair", "destiny",
  "destroy", "detail", "detain", "detect", "deter", "detour", "device", "devise", "devoid", "devote",
  "devour", "dexter", "diagram", "dialysis", "diamond", "diaper", "diaphragm", "diary", "dibble", "dictate",
  "dietary", "diffuse", "digest", "digital", "dignity", "dilemma", "dilute", "dimple", "diner", "dinghy",
  "dinner", "dinosaur", "diode", "dioxide", "diploma", "director", "dirtbike", "disable", "disarm", "disaster",
  "disciple", "disco", "discount", "discourse", "discover", "discuss", "disdain", "disguise", "dishcloth", "dislike",
  "dismay", "dismiss", "disorder", "dispatch", "display", "disposal", "dispute", "disrupt", "distance", "distort",
  "distress", "district", "disturb", "ditch", "ditto", "diver", "divide", "divine", "divorce", "dizzy",
  "docking", "doctor", "document", "dodger", "doghouse", "dogwood", "dollhouse", "dolphin", "domain", "domestic",
  "dominant", "domino", "donation", "donkey", "donor", "doorbell", "doorstep", "dormitory", "dosage", "double",
  "doubter", "doughnut", "dovecote", "downhill", "downpour", "downstairs", "downtown", "dozenth", "drafty", "dragnet",
  "dragon", "drainage", "dramatic", "drawback", "drawbridge", "drawer", "drawing", "dreamer", "dredge", "dresser",
  "dressing", "driftwood", "drill", "driver", "droplet", "dropout", "drover", "drummer", "dryer", "dualism",
  "duckling", "ductile", "duel", "duet", "duffel", "dugout", "dumpling", "dune", "dungeon", "duplex",
  "duplicate", "durable", "duration", "dustpan", "duty", "dwarf", "dwelling", "dynamite", "dynamo", "dynasty"
];

const BUILDER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none';">
  <title>Cold-Start Recovery Vault Builder | Studio Workspace</title>
  <style>
    :root {
      --bg-base: #080c14;
      --bg-sidebar: #0e1526;
      --bg-surface: #121c32;
      --bg-surface-elevated: #172440;
      --bg-surface-subtle: #1e293b;
      --border-subtle: #1e293d;
      --border-card: #22314e;
      --border-focus: #10b981;
      --border-accent: #38bdf8;
      
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      
      --accent-primary: #10b981;
      --accent-primary-hover: #059669;
      --accent-cyan: #06b6d4;
      --accent-blue: #38bdf8;

      --status-green-bg: rgba(16, 185, 129, 0.15);
      --status-green-border: rgba(16, 185, 129, 0.4);
      --status-green-text: #34d399;

      --status-amber-bg: rgba(245, 158, 11, 0.15);
      --status-amber-border: rgba(245, 158, 11, 0.4);
      --status-amber-text: #fbbf24;

      --status-red-bg: rgba(239, 68, 68, 0.15);
      --status-red-border: rgba(239, 68, 68, 0.4);
      --status-red-text: #f87171;

      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 14px;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg-base);
      color: var(--text-primary);
      font-family: var(--font-sans);
      line-height: 1.5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
    }

    /* Top Studio Header */
    .studio-header {
      background: var(--bg-sidebar);
      border-bottom: 1px solid var(--border-subtle);
      height: 56px;
      padding: 0 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-title {
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.3px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-tag {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-primary);
      border: 1px solid var(--status-green-border);
      padding: 2px 8px;
      border-radius: 9999px;
      font-weight: 700;
    }

    .security-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--text-muted);
      border-left: 1px solid var(--border-subtle);
      padding-left: 12px;
      margin-left: 4px;
    }

    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--accent-primary);
      box-shadow: 0 0 8px var(--accent-primary);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Studio Split Workspace */
    .studio-workspace {
      display: grid;
      grid-template-columns: 320px 1fr;
      flex: 1;
      min-height: calc(100vh - 56px);
    }

    @media (max-width: 960px) {
      .studio-workspace {
        grid-template-columns: 1fr;
      }
    }

    /* Sidebar */
    .studio-sidebar {
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border-subtle);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      overflow-y: auto;
    }

    .sidebar-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .sidebar-heading {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .sidebar-nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
    }

    .sidebar-nav-item:hover {
      background: var(--bg-surface-elevated);
      border-color: #334155;
    }

    .sidebar-nav-item.active {
      border-color: var(--accent-primary);
      background: rgba(16, 185, 129, 0.08);
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.15);
    }

    .sidebar-nav-icon {
      font-size: 1.15rem;
      width: 24px;
      text-align: center;
      flex-shrink: 0;
    }

    .sidebar-nav-content {
      flex: 1;
      min-width: 0;
    }

    .sidebar-nav-title {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar-nav-sub {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 1px;
    }

    /* Quick Add Tool Palette */
    .quick-add-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-bottom: 8px;
    }

    .quick-add-chip {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      border-radius: var(--radius-sm);
      padding: 6px 4px;
      font-size: 0.74rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: all 0.12s ease;
      white-space: nowrap;
    }

    .quick-add-chip:hover {
      background: var(--bg-surface-elevated);
      color: var(--text-primary);
      border-color: var(--border-accent);
    }

    /* Sidebar Cards List */
    .sidebar-cards-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
      overflow-y: auto;
      min-height: 120px;
    }

    .sidebar-card-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 10px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .sidebar-card-row:hover {
      background: var(--bg-surface-elevated);
      border-color: #334155;
    }

    .sidebar-card-row.active {
      border-color: var(--border-accent);
      background: rgba(56, 189, 248, 0.08);
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.15);
    }

    .sidebar-card-info {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }

    .sidebar-card-icon {
      font-size: 1rem;
      flex-shrink: 0;
    }

    .sidebar-card-text {
      flex: 1;
      min-width: 0;
    }

    .sidebar-card-title {
      font-size: 0.84rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text-primary);
    }

    .sidebar-card-meta {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .sidebar-card-actions {
      display: flex;
      align-items: center;
      gap: 3px;
      opacity: 0.6;
      transition: opacity 0.15s;
    }

    .sidebar-card-row:hover .sidebar-card-actions {
      opacity: 1;
    }

    .btn-card-action {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 0.75rem;
    }

    .btn-card-action:hover {
      color: var(--text-primary);
      background: var(--bg-surface-subtle);
    }

    .btn-card-delete:hover {
      color: var(--status-red-text) !important;
      background: var(--status-red-bg) !important;
    }

    /* Sidebar Footer */
    .sidebar-footer {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid var(--border-subtle);
    }

    /* Right Canvas */
    .studio-canvas {
      background: var(--bg-base);
      padding: 24px 28px;
      overflow-y: auto;
    }

    .canvas-panel {
      max-width: 1040px;
      margin: 0 auto;
    }

    .panel-header {
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 12px;
    }

    .panel-title {
      font-size: 1.45rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .panel-subtitle {
      font-size: 0.88rem;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-lg);
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .form-group {
      margin-bottom: 14px;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    label {
      display: block;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }

    input[type="text"],
    input[type="password"],
    input[type="number"],
    textarea,
    select {
      width: 100%;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      padding: 9px 12px;
      border-radius: var(--radius-md);
      font-family: inherit;
      font-size: 0.92rem;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    input[type="text"]:focus,
    input[type="password"]:focus,
    input[type="number"]:focus,
    textarea:focus,
    select:focus {
      outline: none;
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
    }

    .mono {
      font-family: var(--font-mono) !important;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    @media (max-width: 640px) {
      .grid-2 { grid-template-columns: 1fr; }
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius-md);
      font-size: 0.86rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease-in-out;
      user-select: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #fff;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
      box-shadow: 0 6px 18px rgba(16, 185, 129, 0.45);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: var(--bg-surface-elevated);
      border-color: var(--border-subtle);
      color: var(--text-primary);
    }

    .btn-secondary:hover {
      background: var(--bg-surface-subtle);
      border-color: #334155;
    }

    .btn-success {
      background-color: #059669;
      color: #fff;
    }

    .btn-success:hover {
      background-color: #047857;
    }

    .btn-ghost {
      background: transparent;
      color: var(--text-secondary);
      border-color: transparent;
    }

    .btn-ghost:hover {
      color: var(--text-primary);
      background: var(--bg-surface-elevated);
    }

    .btn-sm {
      padding: 5px 10px;
      font-size: 0.8rem;
    }

    .btn-large {
      padding: 12px 18px;
      font-size: 0.95rem;
      width: 100%;
    }

    .btn-icon {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      cursor: pointer;
      padding: 4px 8px;
      font-size: 0.85rem;
      transition: all 0.15s;
    }

    .btn-icon:hover {
      background: var(--bg-surface-subtle);
      color: var(--text-primary);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.74rem;
      font-weight: 600;
    }

    .badge-gray {
      background: rgba(107, 114, 128, 0.2);
      color: var(--text-secondary);
      border: 1px solid var(--border-subtle);
    }

    .badge-green {
      background: var(--status-green-bg);
      color: var(--status-green-text);
      border: 1px solid var(--status-green-border);
    }

    .badge-amber {
      background: var(--status-amber-bg);
      color: var(--status-amber-text);
      border: 1px solid var(--status-amber-border);
    }

    .badge-red {
      background: var(--status-red-bg);
      color: var(--status-red-text);
      border: 1px solid var(--status-red-border);
    }

    .validation-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }

    .input-with-button {
      display: flex;
      gap: 8px;
    }

    .input-with-button input {
      flex: 1;
    }

    .kv-row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      align-items: center;
    }

    /* Editor Split: Form Left + Live Preview Right */
    .editor-split-layout {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 20px;
      align-items: start;
    }

    @media (max-width: 1040px) {
      .editor-split-layout {
        grid-template-columns: 1fr;
      }
    }

    .editor-form-col {
      min-width: 0;
    }

    .editor-preview-col {
      min-width: 0;
      position: sticky;
      top: 76px;
    }

    /* Live Terminal Preview Component */
    .preview-card-frame {
      background: #060911;
      border: 1px solid #1f2a40;
      border-radius: var(--radius-lg);
      padding: 16px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }

    .preview-frame-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      border-bottom: 1px solid #1a2336;
      margin-bottom: 14px;
    }

    .preview-mode-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--accent-primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .preview-terminal-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px;
    }

    .preview-item-row {
      margin-bottom: 10px;
    }

    .preview-item-row:last-child {
      margin-bottom: 0;
    }

    .preview-label {
      font-size: 0.72rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 3px;
    }

    .preview-value-box {
      background: #090e1a;
      border: 1px solid #1c263c;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      font-size: 0.82rem;
      color: #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .preview-chip-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 4px;
    }

    .preview-code-tag {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #a7f3d0;
      padding: 3px 7px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: 0.76rem;
    }

    .preview-seed-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      max-height: 180px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .preview-seed-item {
      background: #0c1322;
      border: 1px solid #1c2840;
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 0.74rem;
      font-family: var(--font-mono);
      color: #cbd5e1;
    }

    .preview-totp-display {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #090f1d;
      border: 1px solid #1a2742;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      margin-top: 4px;
    }

    .preview-totp-code {
      font-family: var(--font-mono);
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--status-green-text);
      letter-spacing: 0.12em;
    }

    /* Deployment View */
    #view-deploy {
      display: none;
      max-width: 900px;
      margin: 30px auto;
      padding: 0 20px;
    }

    .code-block {
      background: #05080e;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 12px 16px;
      font-family: var(--font-mono);
      font-size: 0.85rem;
      color: #e5e7eb;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .dns-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }

    .dns-table th, .dns-table td {
      padding: 10px 12px;
      border: 1px solid var(--border-subtle);
      font-size: 0.88rem;
      text-align: left;
    }

    .dns-table th {
      background: var(--bg-surface-elevated);
      color: var(--text-secondary);
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .dns-table td {
      background: var(--bg-surface-subtle);
    }

    .tab-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 8px;
    }

    .tab-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.88rem;
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .tab-btn.active {
      background: var(--bg-surface-elevated);
      color: var(--border-accent);
    }

    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #059669;
      color: white;
      padding: 10px 18px;
      border-radius: var(--radius-md);
      font-weight: 600;
      box-shadow: 0 4px 14px rgba(0,0,0,0.5);
      display: none;
      z-index: 2000;
      animation: fadeIn 0.2s;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>

<!-- Studio Header Bar -->
<header class="studio-header">
  <div class="brand-wrap">
    <div class="brand-title">
      <span>🛡️ Cold-Start Recovery</span>
      <span class="brand-tag">Studio</span>
    </div>
    <div class="security-status-badge">
      <span class="pulse-dot"></span>
      <span>RAM-Only WebCrypto • Zero-Network</span>
    </div>
  </div>
  <div class="header-actions">
    <button type="button" class="btn btn-secondary btn-sm" id="btn-load-sample">📋 Load Sample</button>
    <button type="button" class="btn btn-secondary btn-sm" id="btn-import-json">📂 Import JSON</button>
    <button type="button" class="btn btn-secondary btn-sm" id="btn-export-plaintext">💾 Export Plaintext</button>
    <button type="button" class="btn btn-ghost btn-sm" id="btn-reset-all" style="color: var(--status-red-text);">🧹 Clear All</button>
    <input type="file" id="input-json-file" accept=".json" style="display: none;">
  </div>
</header>

<!-- STUDIO WORKSPACE (FORM VIEW) -->
<div id="view-form">
  <div class="studio-workspace">
    
    <!-- LEFT SIDEBAR: Navigation & Card Deck -->
    <aside class="studio-sidebar">
      <!-- Section 1: Recovery Key -->
      <div class="sidebar-heading">Master Recovery Key</div>
      <div class="sidebar-nav-item active" id="nav-item-passphrase" onclick="selectSection('passphrase')">
        <div class="sidebar-nav-icon">🔑</div>
        <div class="sidebar-nav-content">
          <div class="sidebar-nav-title">Diceware Passphrase</div>
          <div class="sidebar-nav-sub" id="sidebar-passphrase-status">Entropy: Incomplete</div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-generate-diceware" title="Generate 8-Word Diceware Passphrase" style="padding: 3px 7px; font-size: 0.72rem;">🎲 Gen</button>
      </div>

      <!-- Section 2: Credential Deck -->
      <div style="margin-top: 10px;">
        <div class="sidebar-section-header">
          <div class="sidebar-heading">Credentials <span class="badge badge-gray" id="sidebar-cards-count">0</span></div>
        </div>

        <!-- Quick Add Tool Palette -->
        <div class="quick-add-grid">
          <button type="button" id="btn-add-pm" class="quick-add-chip" onclick="addCard('password_manager')">🔑 Password</button>
          <button type="button" id="btn-add-codes" class="quick-add-chip" onclick="addCard('backup_codes')">🛡️ Backup</button>
          <button type="button" id="btn-add-seed" class="quick-add-chip" onclick="addCard('seed_phrase')">🌱 Seed</button>
          <button type="button" id="btn-add-totp" class="quick-add-chip" onclick="addCard('totp_group')">⏱️ TOTP</button>
          <button type="button" id="btn-add-kv" class="quick-add-chip" onclick="addCard('key_value')">🔐 Custom</button>
          <button type="button" id="btn-add-notes" class="quick-add-chip" onclick="addCard('notes')">📝 Notes</button>
        </div>

        <!-- Sidebar Cards List -->
        <div class="sidebar-cards-list" id="sidebar-cards-list"></div>
      </div>

      <!-- Section 3: Vault & DNS Settings -->
      <div style="margin-top: 10px;">
        <div class="sidebar-heading">Vault & Dead-Drop DNS</div>
        <div class="sidebar-nav-item" id="nav-item-settings" onclick="selectSection('settings')">
          <div class="sidebar-nav-icon">⚙️</div>
          <div class="sidebar-nav-content">
            <div class="sidebar-nav-title">DNS & Staleness</div>
            <div class="sidebar-nav-sub" id="sidebar-domain-status">recovery.yourdomain.com</div>
          </div>
        </div>
      </div>

      <!-- Sticky Sidebar Footer: Build Action -->
      <div class="sidebar-footer">
        <button type="button" class="btn btn-primary btn-large" id="btn-build-vault">
          🔒 Encrypt & Build Terminal
        </button>
        <div id="build-status" style="text-align: center; margin-top: 8px; font-size: 0.8rem; color: var(--accent-primary); display: none;">
          Deriving key via PBKDF2 (600,000 rounds) & encrypting...
        </div>
        <div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; margin-top: 8px;">
          PBKDF2-SHA256 • AES-GCM-256 • RAM Only
        </div>
      </div>
    </aside>

    <!-- RIGHT CANVAS: Focused Active Panel -->
    <main class="studio-canvas">
      
      <!-- CANVAS PANEL 1: PASSPHRASE -->
      <div class="canvas-panel" id="panel-passphrase">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">🔑 Disaster Recovery Passphrase</h2>
            <p class="panel-subtitle">A memorized 6+ word Diceware passphrase (~77 bits entropy) that decrypts your offline vault on any borrowed browser.</p>
          </div>
        </div>

        <div class="card">
          <div class="form-group">
            <label for="passphrase">Emergency Passphrase</label>
            <div class="input-with-button">
              <input type="password" id="passphrase" class="mono" placeholder="word1 word2 word3 word4 word5 word6" autocomplete="off" autocorrect="off" spellcheck="false">
              <button type="button" class="btn btn-secondary" id="btn-toggle-passphrase" title="Show/Hide Passphrase">👁️</button>
            </div>

            <div class="validation-row" id="passphrase-validation">
              <span class="badge badge-gray" id="badge-words">0 / 6 words</span>
              <span class="badge badge-gray" id="badge-chars">0 / 20 chars</span>
              <span class="badge badge-gray" id="badge-unique">0 unique</span>
              <span class="badge badge-gray" id="badge-status">Entropy: Incomplete</span>
            </div>
          </div>
        </div>

        <div class="card" style="background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.2);">
          <div style="display: flex; gap: 12px; align-items: flex-start;">
            <div style="font-size: 1.4rem;">🛡️</div>
            <div>
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--accent-primary); margin-bottom: 4px;">Zero-Hardware Cold-Start Recovery Guarantee</div>
              <p style="font-size: 0.86rem; color: var(--text-secondary); line-height: 1.6;">
                Because all physical hardware (phones, security keys, laptops) is assumed lost or stolen in a cold-start disaster, your passphrase is the sole cryptographic root of trust. 600,000 PBKDF2 iterations render offline brute-force attacks computationally infeasible.
              </p>
            </div>
          </div>
        </div>

        <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary" onclick="focusFirstCardOrAdd()">
            <span>Configure Credential Cards →</span>
          </button>
        </div>
      </div>

      <!-- CANVAS PANEL 2: CREDENTIAL CARD EDITOR + LIVE PREVIEW -->
      <div class="canvas-panel" id="panel-card-editor" style="display: none;">
        <div class="panel-header">
          <div>
            <h2 class="panel-title" id="editor-card-heading">Credential Card Editor</h2>
            <p class="panel-subtitle">Edit credential fields on the left. See exact emergency terminal output in real-time on the right.</p>
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-secondary btn-sm" id="editor-btn-up" title="Move card up">↑ Up</button>
            <button type="button" class="btn btn-secondary btn-sm" id="editor-btn-down" title="Move card down">↓ Down</button>
            <button type="button" class="btn btn-secondary btn-sm btn-delete" id="editor-btn-delete" title="Delete card" style="color: var(--status-red-text);">🗑️ Delete</button>
          </div>
        </div>

        <div class="editor-split-layout">
          <!-- Left Column: Form Editor -->
          <div class="editor-form-col">
            <div id="cards-container"></div>
            
            <div id="empty-cards-notice" style="display: none; text-align: center; padding: 48px 24px; background: var(--bg-surface); border: 2px dashed var(--border-subtle); border-radius: var(--radius-lg);">
              <div style="font-size: 2.2rem; margin-bottom: 10px;">📦</div>
              <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 6px;">No Credential Cards Added Yet</h3>
              <p style="color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 16px;">Add a password manager, backup codes, or crypto seed phrase from the sidebar palette.</p>
              <button type="button" class="btn btn-secondary btn-sm" onclick="loadSampleData()">📋 Load Sample Cards</button>
            </div>
          </div>

          <!-- Right Column: Live Terminal Preview -->
          <div class="editor-preview-col">
            <div class="preview-card-frame">
              <div class="preview-frame-header">
                <div class="preview-mode-tag">
                  <span class="pulse-dot"></span>
                  <span>Live Terminal Preview</span>
                </div>
                <span class="badge badge-green" style="font-size: 0.7rem;">Decrypted Mode</span>
              </div>
              <div id="live-preview-content">
                <!-- Dynamically updated in real-time -->
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CANVAS PANEL 3: SETTINGS -->
      <div class="canvas-panel" id="panel-settings" style="display: none;">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">⚙️ Vault Configuration & Dead-Drop DNS</h2>
            <p class="panel-subtitle">Configure RFC 1035 DNS TXT dead-drop parameters and vault staleness alerts.</p>
          </div>
        </div>

        <div class="card">
          <div class="grid-2">
            <div class="form-group">
              <label for="recovery-domain">Recovery DNS Subdomain</label>
              <input type="text" id="recovery-domain" class="mono" value="recovery.yourdomain.com" placeholder="recovery.yourdomain.com">
              <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 4px;">Subdomain hosting your emergency DNS TXT record.</div>
            </div>
            <div class="form-group">
              <label for="canary-code">Canary Verification Code</label>
              <div class="input-with-button">
                <input type="text" id="canary-code" class="mono" placeholder="12345678">
                <button type="button" class="btn btn-secondary" id="btn-random-canary" title="Generate Random Canary Code">🎲</button>
              </div>
              <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 4px;">Used for instant zero-knowledge decryption verification.</div>
            </div>
          </div>

          <div class="grid-2" style="margin-top: 16px;">
            <div class="form-group">
              <label for="stale-months">Stale After (Months)</label>
              <input type="number" id="stale-months" value="6" min="1" max="24">
              <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 4px;">Automated warning trigger when the vault hasn't been rotated.</div>
            </div>
            <div class="form-group">
              <label>HTML Terminal Template</label>
              <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 7px 12px; min-height: 42px;">
                <span class="badge badge-green" id="template-status">✓ Default Embedded</span>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-select-template">Change Template...</button>
                <input type="file" id="input-template-file" accept=".html" style="display: none;">
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="background: rgba(56, 189, 248, 0.05); border-color: rgba(56, 189, 248, 0.2);">
          <div style="display: flex; gap: 12px; align-items: flex-start;">
            <div style="font-size: 1.4rem;">📡</div>
            <div>
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--border-accent); margin-bottom: 4px;">Pillar 2: RFC 1035 DNS TXT Dead-Drop</div>
              <p style="font-size: 0.86rem; color: var(--text-secondary); line-height: 1.6;">
                Even if your web hosting provider is offline or blocked, your encrypted ciphertext can be fetched directly via Cloudflare or Google DNS-over-HTTPS (DoH) queries to your recovery domain.
              </p>
            </div>
          </div>
        </div>
      </div>

    </main>
  </div>
</div>

<!-- DEPLOYMENT & VERIFICATION VIEW (Shown after successful build) -->
<div id="view-deploy">
  <div class="card" style="border-color: var(--status-green-border); background: rgba(6, 78, 59, 0.15); margin-bottom: 20px;">
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <div>
        <h2 style="color: var(--status-green-text); font-size: 1.35rem; display: flex; align-items: center; gap: 8px;">
          ✓ Recovery Vault Encrypted Successfully!
        </h2>
        <p style="color: var(--text-secondary); font-size: 0.88rem; margin-top: 4px;">
          PBKDF2-SHA-256 (600,000 rounds) • AES-GCM-256 • Verified round-trip decryption
        </p>
      </div>
      <button type="button" class="btn btn-success" id="btn-download-html" style="font-size: 0.95rem; padding: 12px 20px;">
        ⬇️ Download index.html
      </button>
    </div>
  </div>

  <!-- Step 1: Deploy to Edge Hosting -->
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid var(--border-subtle);">
      <div>
        <div style="font-size: 1.05rem; font-weight: 700;">🌐 Step 1: Deploy to Edge Hosting (Cloudflare / Netlify / Vercel)</div>
        <div style="font-size: 0.82rem; color: var(--text-secondary);">Host your hardened single-file recovery terminal at <code>https://sos.yourdomain.com</code></div>
      </div>
    </div>

    <div class="tab-bar">
      <button type="button" class="tab-btn active" id="tab-cf-btn">Cloudflare Pages</button>
      <button type="button" class="tab-btn" id="tab-netlify-btn">Netlify</button>
      <button type="button" class="tab-btn" id="tab-vercel-btn">Vercel</button>
      <button type="button" class="tab-btn" id="tab-git-btn">Git Push (All Providers)</button>
    </div>

    <!-- Cloudflare Tab -->
    <div id="tab-cf-content">
      <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 8px;">
        <strong>Option A: Direct Upload via Web Dashboard (Zero Git Clone, Zero Terminal)</strong>
      </p>
      <ol style="margin-left: 20px; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.8;">
        <li>Log into the <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener" style="color: var(--border-accent);">Cloudflare Dashboard</a>.</li>
        <li>Navigate to <strong>Workers & Pages</strong> → Select your Pages project (or click <strong>Create application → Pages → Direct Upload</strong>).</li>
        <li>Create an empty folder, place the downloaded <code>index.html</code> inside, and drag it into the dropzone.</li>
        <li>Click <strong>Deploy site</strong>. Your vault is live worldwide on Cloudflare's Anycast Edge!</li>
      </ol>
      <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 12px 0 6px 0;">
        <strong>Option B: 1-Command Automated CLI (Zero Git Clone)</strong>
      </p>
      <div class="code-block">npx github:janhrabcak/identity-recovery --provider cloudflare</div>
    </div>

    <!-- Netlify Tab -->
    <div id="tab-netlify-content" style="display: none;">
      <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 8px;">
        <strong>Option A: Netlify Drop Web Dashboard (Zero Git Clone, Zero Terminal)</strong>
      </p>
      <ol style="margin-left: 20px; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.8;">
        <li>Log into the <a href="https://app.netlify.com/" target="_blank" rel="noopener" style="color: var(--border-accent);">Netlify Dashboard</a>.</li>
        <li>Navigate to <strong>Sites</strong> and scroll down to the <strong>Deploy manually / Netlify Drop</strong> section.</li>
        <li>Drag-and-drop the folder containing your downloaded <code>index.html</code>.</li>
        <li>Your recovery vault is live with full edge security header parity!</li>
      </ol>
      <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 12px 0 6px 0;">
        <strong>Option B: 1-Command Automated CLI (Zero Git Clone)</strong>
      </p>
      <div class="code-block">npx github:janhrabcak/identity-recovery --provider netlify</div>
    </div>

    <!-- Vercel Tab -->
    <div id="tab-vercel-content" style="display: none;">
      <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 8px;">
        <strong>Option A: 1-Command Automated CLI (Zero Git Clone)</strong>
      </p>
      <div class="code-block">npx github:janhrabcak/identity-recovery --provider vercel</div>
      <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 12px 0 6px 0;">
        <strong>Option B: Git Integration (Private Repositories)</strong>
      </p>
      <ol style="margin-left: 20px; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.8;">
        <li>Import your repository in the <a href="https://vercel.com/dashboard" target="_blank" rel="noopener" style="color: var(--border-accent);">Vercel Dashboard</a>.</li>
        <li>Deployments automatically apply strict security headers from <code>vercel.json</code>.</li>
      </ol>
    </div>

    <!-- Git Tab -->
    <div id="tab-git-content" style="display: none;">
      <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 8px;">
        For private repositories or standard Git workflows across any provider, commit and push:
      </p>
      <div class="code-block" id="code-git-snippet">mv ~/Downloads/index.html public/index.html
git add public/index.html
git commit -m "vault: rotate encrypted recovery payload"
git push origin main</div>
      <button type="button" class="btn btn-secondary btn-sm" style="margin-top: 8px;" id="btn-copy-git-snippet">📋 Copy Git Commands</button>
    </div>
  </div>

  <!-- Step 2: Update DNS TXT Dead-Drop -->
  <div class="card">
    <div style="margin-bottom: 12px;">
      <div style="font-size: 1.05rem; font-weight: 700;">📡 Step 2: Update DNS TXT Dead-Drop (Cloudflare, Route53, or Any DNS)</div>
      <div style="font-size: 0.82rem; color: var(--text-secondary);">Secondary emergency fallback queryable via DoH if your web URL is unreachable.</div>
    </div>

    <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 12px;">
      In your DNS provider, add or update the following TXT record in your domain zone:
    </p>

    <table class="dns-table">
      <tr>
        <th style="width: 120px;">Field</th>
        <th>Value</th>
        <th style="width: 90px;">Action</th>
      </tr>
      <tr>
        <td><strong>Type</strong></td>
        <td><code>TXT</code></td>
        <td>-</td>
      </tr>
      <tr>
        <td><strong>Name / Host</strong></td>
        <td><code id="dns-record-name">recovery.yourdomain.com</code></td>
        <td><button type="button" class="btn btn-secondary btn-sm" id="btn-copy-dns-name">📋 Copy</button></td>
      </tr>
      <tr>
        <td><strong>TTL</strong></td>
        <td><code>120</code> (2 minutes, or Auto)</td>
        <td>-</td>
      </tr>
      <tr>
        <td><strong>Content / Value</strong></td>
        <td>
          <div id="dns-record-value" class="mono" style="max-height: 80px; overflow-y: auto; font-size: 0.78rem; word-break: break-all; color: var(--status-green-text);"></div>
        </td>
        <td><button type="button" class="btn btn-secondary btn-sm" id="btn-copy-ciphertext">📋 Copy</button></td>
      </tr>
    </table>
  </div>

  <!-- Bottom Action Buttons -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; margin-bottom: 40px; flex-wrap: wrap; gap: 12px;">
    <button type="button" class="btn btn-secondary" id="btn-back-to-edit">✏️ Back to Edit</button>
    <button type="button" class="btn btn-secondary" id="btn-purge-and-lock" style="color: var(--status-red-text); border-color: var(--status-red-border);">🔒 Wipe Memory & Reset Builder</button>
  </div>
</div>

<div class="toast" id="toast">Copied to clipboard!</div>

<script>
// Embedded default template from public/index.html
const DEFAULT_INDEX_TEMPLATE_B64 = "${templateB64}";
let activeTemplate = null;

// Embedded Diceware word list (1,000 clean words)
const DICEWARE_WORDS = ${JSON.stringify(DICEWARE_WORDS)};

const PBKDF2_ITERATIONS = 600000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

// Runtime generated state
let generatedCiphertextB64 = null;
let generatedHtml = null;

// Studio Workspace active state
let activeSection = 'passphrase';
let currentSelectedCardId = null;

function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.style.display = 'block';
  setTimeout(function() { t.style.display = 'none'; }, 2500);
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() { showToast('Copied to clipboard!'); });
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copied to clipboard!');
  }
}

function normalizePassphrase(str) {
  if (!str) return '';
  return str.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

function evaluatePassphraseEntropy(passphrase) {
  const normalized = normalizePassphrase(passphrase);
  const words = normalized ? normalized.split(' ') : [];
  const unique = new Set(words.map(function(w) { return w.toLowerCase(); }));
  const charCount = normalized.length;

  const res = {
    valid: false,
    wordCount: words.length,
    charCount: charCount,
    uniqueCount: unique.size,
    reason: ''
  };

  if (words.length < 6) {
    res.reason = 'Insufficient words (' + words.length + '/6). Minimum 6 words required.';
    return res;
  }
  if (charCount < 20) {
    res.reason = 'Passphrase too short (' + charCount + '/20 chars).';
    return res;
  }
  if (unique.size < 4) {
    res.reason = 'Too many repeated words.';
    return res;
  }
  if (words.some(function(w) { return w.length < 2; })) {
    res.reason = 'Words must be at least 2 characters.';
    return res;
  }

  res.valid = true;
  res.normalized = normalized;
  return res;
}

function updatePassphraseUI() {
  const val = document.getElementById('passphrase').value;
  const evalRes = evaluatePassphraseEntropy(val);

  const bWords = document.getElementById('badge-words');
  const bChars = document.getElementById('badge-chars');
  const bUnique = document.getElementById('badge-unique');
  const bStatus = document.getElementById('badge-status');
  const sbStatus = document.getElementById('sidebar-passphrase-status');

  bWords.innerText = evalRes.wordCount + ' / 6 words';
  bWords.className = evalRes.wordCount >= 6 ? 'badge badge-green' : 'badge badge-gray';

  bChars.innerText = evalRes.charCount + ' / 20 chars';
  bChars.className = evalRes.charCount >= 20 ? 'badge badge-green' : 'badge badge-gray';

  bUnique.innerText = evalRes.uniqueCount + ' unique';
  bUnique.className = evalRes.uniqueCount >= 4 ? 'badge badge-green' : 'badge badge-gray';

  if (evalRes.valid) {
    const text = evalRes.wordCount >= 8 ? '✓ Strong (~80 bits entropy)' : '✓ Valid (≥6 words)';
    bStatus.innerText = text;
    bStatus.className = 'badge badge-green';
    if (sbStatus) sbStatus.innerText = evalRes.wordCount + ' words • Strong';
  } else if (evalRes.wordCount >= 4) {
    bStatus.innerText = 'Moderate entropy';
    bStatus.className = 'badge badge-amber';
    if (sbStatus) sbStatus.innerText = evalRes.wordCount + ' words • Moderate';
  } else {
    bStatus.innerText = 'Incomplete';
    bStatus.className = 'badge badge-red';
    if (sbStatus) sbStatus.innerText = 'Entropy: Incomplete';
  }
}

function generateDiceware() {
  const words = [];
  const randomIndices = new Uint32Array(8);
  window.crypto.getRandomValues(randomIndices);
  for (let i = 0; i < 8; i++) {
    const idx = randomIndices[i] % DICEWARE_WORDS.length;
    words.push(DICEWARE_WORDS[idx]);
  }
  const phrase = words.join(' ');
  document.getElementById('passphrase').value = phrase;
  document.getElementById('passphrase').type = 'text';
  updatePassphraseUI();
  showToast('Generated 8-word Diceware phrase (~80 bits entropy)!');
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let cardCounter = 0;

function updateEmptyNotice() {
  const container = document.getElementById('cards-container');
  const empty = document.getElementById('empty-cards-notice');
  const hasCards = container && container.children.length > 0;
  if (empty) empty.style.display = hasCards ? 'none' : 'block';
  
  const countBadge = document.getElementById('sidebar-cards-count');
  if (countBadge) countBadge.innerText = container ? container.children.length : 0;
}

function getDefaultTitleForType(type, service) {
  switch (type) {
    case 'password_manager': return service ? ('Root of Trust: ' + service) : 'Password Manager';
    case 'backup_codes': return service ? (service + ' 2SV Backup Codes') : 'Emergency Backup Codes';
    case 'seed_phrase': return service ? (service + ' Seed Phrase') : 'BIP-39 Recovery Phrase';
    case 'totp_group': return 'Live Authenticator (TOTP)';
    case 'key_value': return 'Custom Secrets & Keys';
    case 'notes': return 'Emergency Instructions & Contacts';
    default: return 'Credential Card';
  }
}

function getCardIcon(type) {
  switch (type) {
    case 'password_manager': return '🔑';
    case 'backup_codes': return '🛡️';
    case 'seed_phrase': return '🌱';
    case 'totp_group': return '⏱️';
    case 'key_value': return '🔐';
    case 'notes': return '📝';
    default: return '📄';
  }
}

function selectSection(sectionId) {
  activeSection = sectionId;
  const navPass = document.getElementById('nav-item-passphrase');
  const navSet = document.getElementById('nav-item-settings');
  const panelPass = document.getElementById('panel-passphrase');
  const panelEditor = document.getElementById('panel-card-editor');
  const panelSet = document.getElementById('panel-settings');

  if (sectionId === 'passphrase') {
    navPass.classList.add('active');
    navSet.classList.remove('active');
    panelPass.style.display = 'block';
    panelEditor.style.display = 'none';
    panelSet.style.display = 'none';
    currentSelectedCardId = null;
    updateSidebarCardsHighlight();
  } else if (sectionId === 'settings') {
    navPass.classList.remove('active');
    navSet.classList.add('active');
    panelPass.style.display = 'none';
    panelEditor.style.display = 'none';
    panelSet.style.display = 'block';
    currentSelectedCardId = null;
    updateSidebarCardsHighlight();
  } else {
    navPass.classList.remove('active');
    navSet.classList.remove('active');
    panelPass.style.display = 'none';
    panelEditor.style.display = 'block';
    panelSet.style.display = 'none';
    currentSelectedCardId = sectionId;

    const cards = document.querySelectorAll('#cards-container .card-item');
    let activeCardEl = null;
    cards.forEach(function(c) {
      if (c.dataset.id === sectionId) {
        c.style.display = 'block';
        activeCardEl = c;
      } else {
        c.style.display = 'none';
      }
    });

    if (activeCardEl) {
      const heading = document.getElementById('editor-card-heading');
      const titleInput = activeCardEl.querySelector('.card-title-input');
      if (heading && titleInput) {
        heading.innerText = titleInput.value || 'Edit Credential Card';
      }
    }

    updateSidebarCardsHighlight();
    renderLivePreview(sectionId);
  }
}

function updateSidebarCardsHighlight() {
  const rows = document.querySelectorAll('.sidebar-card-row');
  rows.forEach(function(r) {
    if (r.dataset.id === currentSelectedCardId) {
      r.classList.add('active');
    } else {
      r.classList.remove('active');
    }
  });
}

function focusFirstCardOrAdd() {
  const first = document.querySelector('#cards-container .card-item');
  if (first) {
    selectSection(first.dataset.id);
  } else {
    addCard('password_manager');
  }
}

function updateSidebarCardRow(cardId) {
  const card = document.querySelector('#cards-container .card-item[data-id="' + cardId + '"]');
  const row = document.querySelector('.sidebar-card-row[data-id="' + cardId + '"]');
  if (!card || !row) return;

  const type = card.dataset.type;
  const titleInput = card.querySelector('.card-title-input');
  const title = (titleInput && titleInput.value.trim()) || getDefaultTitleForType(type);
  
  const titleEl = row.querySelector('.sidebar-card-title');
  if (titleEl) titleEl.innerText = title;

  const metaEl = row.querySelector('.sidebar-card-meta');
  if (metaEl) {
    if (type === 'password_manager') {
      const email = card.querySelector('.pm-email')?.value.trim();
      metaEl.innerText = email || card.querySelector('.pm-service')?.value || 'Credentials';
    } else if (type === 'backup_codes') {
      const ta = card.querySelector('.codes-textarea')?.value || '';
      const count = (ta.match(/\b[A-Za-z0-9_-]{6,16}\b/g) || []).length;
      metaEl.innerText = count + ' backup codes';
    } else if (type === 'seed_phrase') {
      const ta = card.querySelector('.seed-textarea')?.value.trim() || '';
      const count = ta ? ta.split(/\s+/).filter(function(w) { return w.length > 0; }).length : 0;
      metaEl.innerText = count + ' words';
    } else if (type === 'totp_group') {
      const count = card.querySelectorAll('.totp-rows-container .kv-row').length;
      metaEl.innerText = count + ' accounts';
    } else if (type === 'key_value') {
      const count = card.querySelectorAll('.kv-rows-container .kv-row').length;
      metaEl.innerText = count + ' fields';
    } else if (type === 'notes') {
      metaEl.innerText = 'Text instructions';
    }
  }

  if (currentSelectedCardId === cardId) {
    const heading = document.getElementById('editor-card-heading');
    if (heading) heading.innerText = title;
  }
}

function renderSidebarCards() {
  const list = document.getElementById('sidebar-cards-list');
  list.innerHTML = '';

  const cards = document.querySelectorAll('#cards-container .card-item');
  cards.forEach(function(card) {
    const cardId = card.dataset.id;
    const type = card.dataset.type;
    const icon = getCardIcon(type);

    const row = document.createElement('div');
    row.className = 'sidebar-card-row' + (cardId === currentSelectedCardId ? ' active' : '');
    row.dataset.id = cardId;

    row.innerHTML = 
      '<div class="sidebar-card-info" onclick="selectSection(\'' + cardId + '\')">' +
        '<div class="sidebar-card-icon">' + icon + '</div>' +
        '<div class="sidebar-card-text">' +
          '<div class="sidebar-card-title">Card</div>' +
          '<div class="sidebar-card-meta">...</div>' +
        '</div>' +
      '</div>' +
      '<div class="sidebar-card-actions">' +
        '<button type="button" class="btn-card-action" title="Move Up" onclick="moveCardUp(\'' + cardId + '\')">↑</button>' +
        '<button type="button" class="btn-card-action" title="Move Down" onclick="moveCardDown(\'' + cardId + '\')">↓</button>' +
        '<button type="button" class="btn-card-action btn-card-delete" title="Delete" onclick="deleteCard(\'' + cardId + '\')">✕</button>' +
      '</div>';

    list.appendChild(row);
    updateSidebarCardRow(cardId);
  });

  updateEmptyNotice();
}

function moveCardUp(cardId) {
  const card = document.querySelector('#cards-container .card-item[data-id="' + cardId + '"]');
  if (!card) return;
  const prev = card.previousElementSibling;
  if (prev) {
    card.parentNode.insertBefore(card, prev);
    renderSidebarCards();
  }
}

function moveCardDown(cardId) {
  const card = document.querySelector('#cards-container .card-item[data-id="' + cardId + '"]');
  if (!card) return;
  const next = card.nextElementSibling;
  if (next) {
    card.parentNode.insertBefore(next, card);
    renderSidebarCards();
  }
}

function deleteCard(cardId) {
  if (!confirm('Delete this credential card?')) return;
  const card = document.querySelector('#cards-container .card-item[data-id="' + cardId + '"]');
  if (card) card.remove();
  
  const remaining = document.querySelectorAll('#cards-container .card-item');
  if (remaining.length > 0) {
    selectSection(remaining[0].dataset.id);
  } else {
    selectSection('passphrase');
  }
  renderSidebarCards();
  updateEmptyNotice();
}

function renderLivePreview(cardId) {
  const container = document.getElementById('live-preview-content');
  if (!container) return;
  
  const card = document.querySelector('#cards-container .card-item[data-id="' + cardId + '"]');
  if (!card) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 12px 0;">No active card selected.</div>';
    return;
  }

  const type = card.dataset.type;
  const title = card.querySelector('.card-title-input')?.value || getDefaultTitleForType(type);
  const icon = getCardIcon(type);

  let html = 
    '<div class="preview-terminal-card">' +
      '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-subtle);">' +
        '<div style="font-weight: 700; font-size: 0.92rem; display: flex; align-items: center; gap: 6px;">' +
          '<span>' + icon + '</span>' +
          '<span>' + escapeHtml(title) + '</span>' +
        '</div>' +
        '<span class="badge badge-green">Decrypted</span>' +
      '</div>';

  if (type === 'password_manager') {
    const service = card.querySelector('.pm-service')?.value || '1Password';
    const email = card.querySelector('.pm-email')?.value.trim() || 'user@example.com';
    const secret = card.querySelector('.pm-secret')?.value.trim() || 'A3-XXXXXX-XXXXXX-XXXXX';
    const hint = card.querySelector('.pm-hint')?.value.trim();
    const inst = card.querySelector('.pm-instructions')?.value.trim();

    html += 
      '<div class="preview-item-row">' +
        '<div class="preview-label">Account / Email</div>' +
        '<div class="preview-value-box mono">' +
          '<span>' + escapeHtml(email) + '</span>' +
          '<span style="color: var(--status-green-text); font-size: 0.75rem; cursor: pointer;">Copy</span>' +
        '</div>' +
      '</div>' +
      '<div class="preview-item-row">' +
        '<div class="preview-label">Secret Key / Token</div>' +
        '<div class="preview-value-box mono">' +
          '<span style="color: #6ee7b7;">' + escapeHtml(secret) + '</span>' +
          '<span style="color: var(--status-green-text); font-size: 0.75rem; cursor: pointer;">Copy</span>' +
        '</div>' +
      '</div>';
    if (hint) {
      html += 
        '<div class="preview-item-row">' +
          '<div class="preview-label">Key Hint</div>' +
          '<div style="font-size: 0.82rem; color: var(--text-secondary);">' + escapeHtml(hint) + '</div>' +
        '</div>';
    }
    if (inst) {
      html += 
        '<div class="preview-item-row" style="margin-top: 8px;">' +
          '<div class="preview-label">Sign-In Instructions</div>' +
          '<div style="font-size: 0.78rem; color: var(--text-secondary); background: #070c17; border: 1px solid #1c263c; padding: 6px 10px; border-radius: 4px; white-space: pre-wrap;">' + escapeHtml(inst) + '</div>' +
        '</div>';
    }
  } else if (type === 'backup_codes') {
    const raw = card.querySelector('.codes-textarea')?.value || '';
    const codes = raw.match(/\b[A-Za-z0-9_-]{6,16}\b/g) || ['48291042', '71039821', '33029184'];
    html += 
      '<div class="preview-item-row">' +
        '<div style="display: flex; justify-content: space-between; align-items: center;">' +
          '<div class="preview-label">Available Backup Codes (' + codes.length + ')</div>' +
          '<span style="font-size: 0.72rem; color: var(--status-green-text); cursor: pointer;">Copy All</span>' +
        '</div>' +
        '<div class="preview-chip-wrap">';
    codes.slice(0, 12).forEach(function(c) {
      html += '<span class="preview-code-tag">' + escapeHtml(c) + '</span>';
    });
    if (codes.length > 12) {
      html += '<span class="badge badge-gray">+' + (codes.length - 12) + ' more</span>';
    }
    html += '</div><div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 6px;">Click code in terminal to mark as used.</div></div>';
  } else if (type === 'seed_phrase') {
    const raw = card.querySelector('.seed-textarea')?.value.trim() || 'witch collapse practice feed shame open despair creek road again ice least';
    const words = raw.split(/\s+/).filter(function(w) { return w.length > 0; });
    html += 
      '<div class="preview-item-row">' +
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">' +
          '<div class="preview-label">BIP-39 Mnemonic Seed (' + words.length + ' words)</div>' +
          '<span style="font-size: 0.72rem; color: var(--status-green-text); cursor: pointer;">Copy Seed</span>' +
        '</div>' +
        '<div class="preview-seed-grid">';
    words.forEach(function(w, idx) {
      html += '<div class="preview-seed-item"><span style="color:var(--text-muted); margin-right:4px;">' + String(idx + 1).padStart(2, '0') + '.</span>' + escapeHtml(w) + '</div>';
    });
    html += '</div></div>';
  } else if (type === 'totp_group') {
    const rows = card.querySelectorAll('.totp-rows-container .kv-row');
    html += '<div class="preview-item-row"><div class="preview-label">Live In-Browser TOTP Seeds</div>';
    if (rows.length === 0) {
      html += '<div style="font-size:0.8rem; color:var(--text-muted);">No TOTP seeds configured.</div>';
    } else {
      rows.forEach(function(r) {
        const acc = r.querySelector('.totp-acc')?.value.trim() || 'Account';
        html += 
          '<div class="preview-totp-display">' +
            '<div>' +
              '<div style="font-size: 0.8rem; font-weight: 600;">' + escapeHtml(acc) + '</div>' +
              '<div style="font-size: 0.7rem; color: var(--text-muted);">Refreshes every 30s</div>' +
            '</div>' +
            '<div class="preview-totp-code">849 201</div>' +
          '</div>';
      });
    }
    html += '</div>';
  } else if (type === 'key_value') {
    const rows = card.querySelectorAll('.kv-rows-container .kv-row');
    html += '<div class="preview-item-row"><div class="preview-label">Custom Secrets & Keys</div>';
    if (rows.length === 0) {
      html += '<div style="font-size:0.8rem; color:var(--text-muted);">No key-value entries.</div>';
    } else {
      rows.forEach(function(r) {
        const k = r.querySelector('.kv-key')?.value.trim() || 'Key';
        const v = r.querySelector('.kv-val')?.value.trim() || 'Secret Value';
        html += 
          '<div class="preview-item-row" style="margin-bottom: 6px;">' +
            '<div style="font-size: 0.72rem; color: var(--text-secondary);">' + escapeHtml(k) + '</div>' +
            '<div class="preview-value-box mono">' +
              '<span>' + escapeHtml(v) + '</span>' +
              '<span style="color: var(--status-green-text); font-size: 0.75rem; cursor: pointer;">Copy</span>' +
            '</div>' +
          '</div>';
      });
    }
    html += '</div>';
  } else if (type === 'notes') {
    const content = card.querySelector('.notes-textarea')?.value.trim() || 'Emergency instructions...';
    html += 
      '<div class="preview-item-row">' +
        '<div class="preview-label">Emergency Protocol Notes</div>' +
        '<div style="font-size: 0.82rem; color: #cbd5e1; background: #070c17; border: 1px solid #1c263c; padding: 10px; border-radius: 6px; line-height: 1.5; white-space: pre-wrap;">' + escapeHtml(content) + '</div>' +
      '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

function addCard(type, data) {
  data = data || {};
  cardCounter++;
  const cardId = data.id || ('card_' + cardCounter + '_' + Date.now().toString(36));
  const container = document.getElementById('cards-container');

  const card = document.createElement('div');
  card.className = 'card card-item';
  card.dataset.id = cardId;
  card.dataset.type = type;

  const titleText = data.title || getDefaultTitleForType(type, data.service);

  let formFields = '';
  if (type === 'password_manager') {
    const service = data.service || '1Password';
    formFields = 
      '<div class="grid-2">' +
        '<div class="form-group">' +
          '<label>Service Preset</label>' +
          '<select class="pm-service">' +
            '<option value="1Password"' + (service === '1Password' ? ' selected' : '') + '>1Password</option>' +
            '<option value="Bitwarden"' + (service === 'Bitwarden' ? ' selected' : '') + '>Bitwarden</option>' +
            '<option value="KeePassXC"' + (service === 'KeePassXC' ? ' selected' : '') + '>KeePassXC</option>' +
            '<option value="Dashlane"' + (service === 'Dashlane' ? ' selected' : '') + '>Dashlane</option>' +
            '<option value="Proton Pass"' + (service === 'Proton Pass' ? ' selected' : '') + '>Proton Pass</option>' +
            '<option value="Other"' + (!['1Password', 'Bitwarden', 'KeePassXC', 'Dashlane', 'Proton Pass'].includes(service) ? ' selected' : '') + '>Other / Custom</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Account / Key Hint</label>' +
          '<input type="text" class="pm-hint" placeholder="Personal Emergency Vault" value="' + escapeHtml(data.hint || '') + '">' +
        '</div>' +
      '</div>' +
      '<div class="grid-2" style="margin-top: 12px;">' +
        '<div class="form-group">' +
          '<label>Account Email / Username</label>' +
          '<input type="text" class="pm-email mono" placeholder="user@example.com" value="' + escapeHtml(data.email || '') + '">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Secret Key / Master Key Token</label>' +
          '<input type="text" class="pm-secret mono" placeholder="A3-XXXXXX-XXXXXX-XXXXX-XXXXX-XXXXX-XXXXX" value="' + escapeHtml(data.secretKey || '') + '">' +
        '</div>' +
      '</div>' +
      '<div class="form-group" style="margin-top: 12px;">' +
        '<label>Optional Sign-in Instructions</label>' +
        '<textarea class="pm-instructions" rows="2" placeholder="1. Go to https://my.1password.com\n2. Paste email and secret key\n3. Enter memorized master password">' + escapeHtml(data.instructions || '') + '</textarea>' +
      '</div>';
  } else if (type === 'backup_codes') {
    const service = data.service || 'Google';
    const codesStr = Array.isArray(data.codes) ? data.codes.join('\n') : (data.codes || '');
    formFields = 
      '<div class="grid-2">' +
        '<div class="form-group">' +
          '<label>Service Preset</label>' +
          '<select class="codes-service">' +
            '<option value="Google"' + (service === 'Google' ? ' selected' : '') + '>Google (8-digit)</option>' +
            '<option value="GitHub"' + (service === 'GitHub' ? ' selected' : '') + '>GitHub (10-char)</option>' +
            '<option value="Apple"' + (service === 'Apple' ? ' selected' : '') + '>Apple (Recovery Key)</option>' +
            '<option value="Microsoft"' + (service === 'Microsoft' ? ' selected' : '') + '>Microsoft</option>' +
            '<option value="AWS"' + (service === 'AWS' ? ' selected' : '') + '>AWS</option>' +
            '<option value="Other"' + (!['Google', 'GitHub', 'Apple', 'Microsoft', 'AWS'].includes(service) ? ' selected' : '') + '>Other</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Parsed Code Count</label>' +
          '<div style="display: flex; align-items: center; height: 38px;">' +
            '<span class="badge badge-gray codes-badge">0 codes parsed</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="form-group" style="margin-top: 12px;">' +
        '<label>Backup Codes (One per line, space, or comma separated)</label>' +
        '<textarea class="codes-textarea mono" rows="4" placeholder="23456789\n34567890\n45678901\n...">' + escapeHtml(codesStr) + '</textarea>' +
      '</div>';
  } else if (type === 'seed_phrase') {
    const service = data.service || 'Ledger';
    const phrase = data.phrase || '';
    formFields = 
      '<div class="grid-2">' +
        '<div class="form-group">' +
          '<label>Wallet / Service Preset</label>' +
          '<select class="seed-service">' +
            '<option value="Ledger"' + (service === 'Ledger' ? ' selected' : '') + '>Ledger</option>' +
            '<option value="Trezor"' + (service === 'Trezor' ? ' selected' : '') + '>Trezor</option>' +
            '<option value="MetaMask"' + (service === 'MetaMask' ? ' selected' : '') + '>MetaMask</option>' +
            '<option value="Phantom"' + (service === 'Phantom' ? ' selected' : '') + '>Phantom</option>' +
            '<option value="BIP-39"' + (service === 'BIP-39' ? ' selected' : '') + '>Standard BIP-39 (12/24 words)</option>' +
            '<option value="Other"' + (!['Ledger', 'Trezor', 'MetaMask', 'Phantom', 'BIP-39'].includes(service) ? ' selected' : '') + '>Other</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Word Count Status</label>' +
          '<div style="display: flex; align-items: center; height: 38px;">' +
            '<span class="badge badge-gray seed-badge">0 words</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="form-group" style="margin-top: 12px;">' +
        '<label>Mnemonic Recovery Words (Space-separated 12, 18, or 24 words)</label>' +
        '<textarea class="seed-textarea mono" rows="3" placeholder="witch collapse practice feed shame open despair creek road again ice least">' + escapeHtml(phrase) + '</textarea>' +
      '</div>';
  } else if (type === 'totp_group') {
    formFields = 
      '<div class="form-group">' +
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">' +
          '<label style="margin-bottom: 0;">Authenticator Accounts</label>' +
          '<button type="button" class="btn btn-secondary btn-sm btn-add-totp-row">+ Add Account</button>' +
        '</div>' +
        '<div class="totp-rows-container"></div>' +
      '</div>';
  } else if (type === 'key_value') {
    formFields = 
      '<div class="form-group">' +
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">' +
          '<label style="margin-bottom: 0;">Key-Value Entries</label>' +
          '<button type="button" class="btn btn-secondary btn-sm btn-add-kv-row">+ Add Field</button>' +
        '</div>' +
        '<div class="kv-rows-container"></div>' +
      '</div>';
  } else if (type === 'notes') {
    formFields = 
      '<div class="form-group">' +
        '<label>Emergency Instructions / Contacts</label>' +
        '<textarea class="notes-textarea" rows="4" placeholder="Emergency contact: Alice (+1-555-0199).">' + escapeHtml(data.content || data.notes || '') + '</textarea>' +
      '</div>';
  }

  card.innerHTML = 
    '<div class="form-group" style="margin-bottom: 16px;">' +
      '<label>Card Title / Label</label>' +
      '<input type="text" class="card-title-input" value="' + escapeHtml(titleText) + '" style="font-weight: 700;">' +
    '</div>' +
    formFields;

  if (type === 'backup_codes') {
    const ta = card.querySelector('.codes-textarea');
    const badge = card.querySelector('.codes-badge');
    const updateCodes = function() {
      const matches = (ta.value.match(/\b[A-Za-z0-9_-]{6,16}\b/g) || []);
      badge.textContent = matches.length + ' codes parsed';
      badge.className = matches.length >= 10 ? 'badge badge-green' : (matches.length > 0 ? 'badge badge-amber' : 'badge badge-gray');
    };
    ta.addEventListener('input', updateCodes);
    updateCodes();
  } else if (type === 'seed_phrase') {
    const ta = card.querySelector('.seed-textarea');
    const badge = card.querySelector('.seed-badge');
    const updateSeed = function() {
      const words = ta.value.trim().split(/\s+/).filter(function(w) { return w.length > 0; });
      badge.textContent = words.length + ' words';
      badge.className = (words.length === 12 || words.length === 24) ? 'badge badge-green' : (words.length > 0 ? 'badge badge-amber' : 'badge badge-gray');
    };
    ta.addEventListener('input', updateSeed);
    updateSeed();
  } else if (type === 'totp_group') {
    const totpContainer = card.querySelector('.totp-rows-container');
    const addRowBtn = card.querySelector('.btn-add-totp-row');
    const addRow = function(acc, sec) {
      acc = acc || '';
      sec = sec || '';
      const row = document.createElement('div');
      row.className = 'kv-row';
      row.innerHTML = 
        '<input type="text" class="totp-acc" placeholder="Account / Service" value="' + escapeHtml(acc) + '" style="flex:1;">' +
        '<input type="text" class="totp-sec mono" placeholder="Base32 Secret" value="' + escapeHtml(sec) + '" style="flex:1.5;">' +
        '<button type="button" class="btn-icon btn-delete" style="padding:6px 10px;">✕</button>';
      row.querySelector('.btn-delete').onclick = function() {
        row.remove();
        updateSidebarCardRow(cardId);
        renderLivePreview(cardId);
      };
      row.querySelectorAll('input').forEach(function(inp) {
        inp.addEventListener('input', function() {
          updateSidebarCardRow(cardId);
          renderLivePreview(cardId);
        });
      });
      totpContainer.appendChild(row);
    };
    addRowBtn.onclick = function() {
      addRow();
      updateSidebarCardRow(cardId);
      renderLivePreview(cardId);
    };
    if (data.seeds && typeof data.seeds === 'object') {
      for (const [k, v] of Object.entries(data.seeds)) addRow(k, v);
    } else {
      addRow('Google', '');
    }
  } else if (type === 'key_value') {
    const kvContainer = card.querySelector('.kv-rows-container');
    const addRowBtn = card.querySelector('.btn-add-kv-row');
    const addRow = function(k, v) {
      k = k || '';
      v = v || '';
      const row = document.createElement('div');
      row.className = 'kv-row';
      row.innerHTML = 
        '<input type="text" class="kv-key" placeholder="Label / Key" value="' + escapeHtml(k) + '" style="flex:1;">' +
        '<input type="text" class="kv-val mono" placeholder="Value / Secret" value="' + escapeHtml(v) + '" style="flex:2;">' +
        '<button type="button" class="btn-icon btn-delete" style="padding:6px 10px;">✕</button>';
      row.querySelector('.btn-delete').onclick = function() {
        row.remove();
        updateSidebarCardRow(cardId);
        renderLivePreview(cardId);
      };
      row.querySelectorAll('input').forEach(function(inp) {
        inp.addEventListener('input', function() {
          updateSidebarCardRow(cardId);
          renderLivePreview(cardId);
        });
      });
      kvContainer.appendChild(row);
    };
    addRowBtn.onclick = function() {
      addRow();
      updateSidebarCardRow(cardId);
      renderLivePreview(cardId);
    };
    if (Array.isArray(data.entries)) {
      data.entries.forEach(function(e) { addRow(e.label || e.key || '', e.value || ''); });
    } else if (data.entries && typeof data.entries === 'object') {
      for (const [k, v] of Object.entries(data.entries)) addRow(k, String(v));
    } else {
      addRow('', '');
    }
  }

  card.addEventListener('input', function() {
    updateSidebarCardRow(cardId);
    if (currentSelectedCardId === cardId) {
      renderLivePreview(cardId);
    }
  });

  container.appendChild(card);
  renderSidebarCards();
  selectSection(cardId);
  return card;
}

function getCardsData() {
  const container = document.getElementById('cards-container');
  const cardEls = container.querySelectorAll('.card-item');
  const items = [];

  cardEls.forEach(function(card, idx) {
    const type = card.dataset.type;
    const id = card.dataset.id || ('card_' + (idx + 1));
    const titleInput = card.querySelector('.card-title-input');
    const title = (titleInput && titleInput.value.trim()) || getDefaultTitleForType(type);

    if (type === 'password_manager') {
      items.push({
        id: id,
        type: type,
        title: title,
        service: card.querySelector('.pm-service').value,
        hint: card.querySelector('.pm-hint').value.trim() || undefined,
        email: card.querySelector('.pm-email').value.trim(),
        secretKey: card.querySelector('.pm-secret').value.trim(),
        instructions: card.querySelector('.pm-instructions').value.trim() || undefined
      });
    } else if (type === 'backup_codes') {
      const raw = card.querySelector('.codes-textarea').value;
      const codes = raw.match(/\b[A-Za-z0-9_-]{6,16}\b/g) || [];
      items.push({
        id: id,
        type: type,
        title: title,
        service: card.querySelector('.codes-service').value,
        codes: codes
      });
    } else if (type === 'seed_phrase') {
      const phrase = card.querySelector('.seed-textarea').value.trim().replace(/\s+/g, ' ');
      items.push({
        id: id,
        type: type,
        title: title,
        service: card.querySelector('.seed-service').value,
        phrase: phrase
      });
    } else if (type === 'totp_group') {
      const seeds = {};
      card.querySelectorAll('.totp-rows-container .kv-row').forEach(function(row) {
        const acc = row.querySelector('.totp-acc').value.trim();
        const sec = row.querySelector('.totp-sec').value.trim().replace(/\s+/g, '').toUpperCase();
        if (acc && sec) seeds[acc] = sec;
      });
      items.push({
        id: id,
        type: type,
        title: title,
        seeds: seeds
      });
    } else if (type === 'key_value') {
      const entries = [];
      card.querySelectorAll('.kv-rows-container .kv-row').forEach(function(row) {
        const k = row.querySelector('.kv-key').value.trim();
        const v = row.querySelector('.kv-val').value.trim();
        if (k || v) entries.push({ label: k, value: v });
      });
      items.push({
        id: id,
        type: type,
        title: title,
        entries: entries
      });
    } else if (type === 'notes') {
      items.push({
        id: id,
        type: type,
        title: title,
        content: card.querySelector('.notes-textarea').value.trim()
      });
    }
  });

  return items;
}

function buildVaultPayload(items) {
  const canary = document.getElementById('canary-code').value.trim() || '12345678';
  const staleMonths = parseInt(document.getElementById('stale-months').value, 10) || 6;

  const payload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      staleAfterMonths: staleMonths,
      canaryCode: canary
    },
    items: items
  };

  const firstPm = items.find(function(it) { return it.type === 'password_manager'; });
  if (firstPm) {
    payload.onePassword = {
      email: firstPm.email || '',
      secretKey: firstPm.secretKey || '',
      accountKeyHint: firstPm.hint || 'Personal Emergency Vault'
    };
  }
  const firstCodes = items.find(function(it) { return it.type === 'backup_codes'; });
  if (firstCodes) {
    payload.googleBackupCodes = firstCodes.codes || [];
  }
  const firstTotp = items.find(function(it) { return it.type === 'totp_group' || it.type === 'totp'; });
  if (firstTotp && firstTotp.seeds) {
    payload.totpSeeds = firstTotp.seeds;
  }
  const firstNotes = items.find(function(it) { return it.type === 'notes'; });
  if (firstNotes) {
    payload.notes = firstNotes.content;
  }

  return payload;
}

function normalizeVaultPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { metadata: {}, items: [] };
  }
  const res = Object.assign({}, payload);
  if (!Array.isArray(res.items)) {
    res.items = [];
    if (res.onePassword && (res.onePassword.email || res.onePassword.secretKey)) {
      res.items.push({
        id: 'legacy-op',
        type: 'password_manager',
        title: 'Root of Trust: 1Password',
        service: '1Password',
        email: res.onePassword.email || '',
        secretKey: res.onePassword.secretKey || '',
        hint: res.onePassword.accountKeyHint || '',
        instructions: '1. Go to https://my.1password.com\n2. Paste email and secret key\n3. Enter memorized master password.'
      });
    }
    if (Array.isArray(res.googleBackupCodes) && res.googleBackupCodes.length > 0) {
      res.items.push({
        id: 'legacy-codes',
        type: 'backup_codes',
        title: 'Google 2SV Backup Codes',
        service: 'Google',
        codes: res.googleBackupCodes
      });
    }
    if (res.totpSeeds && typeof res.totpSeeds === 'object' && Object.keys(res.totpSeeds).length > 0) {
      res.items.push({
        id: 'legacy-totp',
        type: 'totp_group',
        title: 'Live Authenticator (TOTP)',
        seeds: res.totpSeeds
      });
    }
    if (res.notes) {
      res.items.push({
        id: 'legacy-notes',
        type: 'notes',
        title: 'Emergency Instructions & Contacts',
        content: res.notes
      });
    }
  }
  return res;
}

function generateCanaryCode() {
  const arr = new Uint32Array(1);
  window.crypto.getRandomValues(arr);
  const code = (arr[0] % 90000000 + 10000000).toString();
  document.getElementById('canary-code').value = code;
}

function loadSampleData() {
  const container = document.getElementById('cards-container');
  container.innerHTML = '';

  addCard('password_manager', {
    service: '1Password',
    title: 'Root of Trust: 1Password',
    email: 'user@example.com',
    secretKey: 'A3-XXXXXX-XXXXXX-XXXXX-XXXXX-XXXXX-XXXXX',
    hint: 'Personal Emergency Vault',
    instructions: '1. Go to https://my.1password.com in a clean browser tab.\n2. Paste email and secret key.\n3. Enter memorized master password.'
  });

  addCard('backup_codes', {
    service: 'Google',
    title: 'Google 2SV Backup Codes',
    codes: [
      '23456789', '34567890', '45678901', '56789012', '67890123',
      '78901234', '89012345', '90123456', '01234567', '12345670'
    ]
  });

  addCard('totp_group', {
    title: 'Live Authenticator (TOTP)',
    seeds: {
      'Google': 'JBSWY3DPEHPK3PXP',
      'GitHub': 'KVKFKRCPI5UHIZKS'
    }
  });

  addCard('notes', {
    title: 'Emergency Instructions & Contacts',
    content: 'Emergency contact: Alice (+1-555-0199). Recovery protocol: Recover primary email first using backup codes, then sign in to password manager.'
  });

  document.getElementById('recovery-domain').value = 'recovery.yourdomain.com';
  document.getElementById('canary-code').value = '12345678';
  document.getElementById('stale-months').value = '6';

  if (!document.getElementById('passphrase').value) {
    document.getElementById('passphrase').value = 'correct horse battery staple zebra guitar';
  }
  updatePassphraseUI();
  
  const first = document.querySelector('#cards-container .card-item');
  if (first) selectSection(first.dataset.id);
  showToast('Loaded sample credential cards!');
}

function clearAll() {
  if (!confirm('Are you sure you want to clear all entered credentials and keys?')) return;
  document.getElementById('passphrase').value = '';
  document.getElementById('cards-container').innerHTML = '';
  renderSidebarCards();
  document.getElementById('canary-code').value = '';
  updatePassphraseUI();
  selectSection('passphrase');
  showToast('Cleared all fields.');
}

async function deriveKey(passphrase, salt, usages) {
  const enc = new TextEncoder();
  const normalized = normalizePassphrase(passphrase);
  const passphraseBytes = enc.encode(normalized);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passphraseBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usages
  );
}

async function encryptPayload(payloadObj, passphrase) {
  const jsonString = JSON.stringify(payloadObj, null, 2);
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt, ['encrypt']);

  const enc = new TextEncoder();
  const plaintextBytes = enc.encode(jsonString);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    plaintextBytes
  );

  plaintextBytes.fill(0);

  const ciphertextBytes = new Uint8Array(ciphertextBuffer);
  const combined = new Uint8Array(SALT_BYTES + IV_BYTES + ciphertextBytes.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_BYTES);
  combined.set(ciphertextBytes, SALT_BYTES + IV_BYTES);

  let binary = '';
  const len = combined.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

async function verifyDecryption(b64Ciphertext, passphrase) {
  const binary = atob(b64Ciphertext);
  const combined = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    combined[i] = binary.charCodeAt(i);
  }
  const salt = combined.subarray(0, SALT_BYTES);
  const iv = combined.subarray(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = combined.subarray(SALT_BYTES + IV_BYTES);

  const key = await deriveKey(passphrase, salt, ['decrypt']);
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    ciphertext
  );
  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decryptedBuffer));
}

function escapeHtmlAttr(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function injectIntoTemplate(templateHtml, ciphertextB64, metadata, domain) {
  let html = templateHtml;

  const placeholderRegex = /const\s+EMBEDDED_CIPHERTEXT\s*=\s*["'][^"']*["'];/;
  if (!placeholderRegex.test(html)) {
    throw new Error('Template is missing "const EMBEDDED_CIPHERTEXT = ...;" placeholder.');
  }
  html = html.replace(placeholderRegex, 'const EMBEDDED_CIPHERTEXT = "' + ciphertextB64 + '";');

  if (metadata.generatedAt) {
    const genMetaRegex = /<meta\s+name=["']vault-generated-at["']\s+content=["'][^"']*["']\s*\/?>/i;
    if (genMetaRegex.test(html)) {
      html = html.replace(genMetaRegex, '<meta name="vault-generated-at" content="' + escapeHtmlAttr(metadata.generatedAt) + '">');
    }
  }

  if (metadata.staleAfterMonths !== undefined) {
    const staleMetaRegex = /<meta\s+name=["']vault-stale-after-months["']\s+content=["'][^"']*["']\s*\/?>/i;
    if (staleMetaRegex.test(html)) {
      html = html.replace(staleMetaRegex, '<meta name="vault-stale-after-months" content="' + escapeHtmlAttr(metadata.staleAfterMonths) + '">');
    }
  }

  if (domain) {
    const domainMetaRegex = /<meta\s+name=["']recovery-dns-domain["']\s+content=["'][^"']*["']\s*\/?>/i;
    if (domainMetaRegex.test(html)) {
      html = html.replace(domainMetaRegex, '<meta name="recovery-dns-domain" content="' + escapeHtmlAttr(domain.trim()) + '">');
    }
  }

  return html;
}

function triggerDownload(filename, textContent) {
  const blob = new Blob([textContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

async function handleBuildVault() {
  const pass = document.getElementById('passphrase').value;
  const entropy = evaluatePassphraseEntropy(pass);
  if (!entropy.valid) {
    alert('Passphrase error: ' + entropy.reason);
    selectSection('passphrase');
    document.getElementById('passphrase').focus();
    return;
  }

  const items = getCardsData();
  if (items.length === 0) {
    alert('Please add at least one credential card to your vault.');
    return;
  }

  const payload = buildVaultPayload(items);
  const canary = payload.metadata.canaryCode;
  const domain = document.getElementById('recovery-domain').value.trim() || 'recovery.yourdomain.com';

  const btn = document.getElementById('btn-build-vault');
  const statusDiv = document.getElementById('build-status');
  btn.disabled = true;
  statusDiv.style.display = 'block';

  try {
    await new Promise(function(r) { setTimeout(r, 40); });

    const ciphertextB64 = await encryptPayload(payload, pass);

    const verified = await verifyDecryption(ciphertextB64, pass);
    if (!verified || verified.metadata.canaryCode !== canary) {
      throw new Error('Internal validation failed: Round-trip decryption mismatch.');
    }

    if (!activeTemplate) {
      const bin = atob(DEFAULT_INDEX_TEMPLATE_B64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      activeTemplate = new TextDecoder('utf-8').decode(bytes);
    }

    const finalHtml = injectIntoTemplate(activeTemplate, ciphertextB64, payload.metadata, domain);

    generatedCiphertextB64 = ciphertextB64;
    generatedHtml = finalHtml;

    document.getElementById('dns-record-name').innerText = domain;
    document.getElementById('dns-record-value').innerText = ciphertextB64;

    document.getElementById('view-form').style.display = 'none';
    document.getElementById('view-deploy').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (err) {
    alert('Encryption error: ' + err.message);
  } finally {
    btn.disabled = false;
    statusDiv.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('passphrase').addEventListener('input', updatePassphraseUI);

  document.getElementById('btn-toggle-passphrase').addEventListener('click', function() {
    const p = document.getElementById('passphrase');
    p.type = p.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('btn-generate-diceware').addEventListener('click', generateDiceware);
  document.getElementById('btn-random-canary').addEventListener('click', generateCanaryCode);
  document.getElementById('btn-load-sample').addEventListener('click', loadSampleData);
  document.getElementById('btn-reset-all').addEventListener('click', clearAll);

  document.getElementById('editor-btn-up').addEventListener('click', function() {
    if (currentSelectedCardId) moveCardUp(currentSelectedCardId);
  });
  document.getElementById('editor-btn-down').addEventListener('click', function() {
    if (currentSelectedCardId) moveCardDown(currentSelectedCardId);
  });
  document.getElementById('editor-btn-delete').addEventListener('click', function() {
    if (currentSelectedCardId) deleteCard(currentSelectedCardId);
  });

  document.getElementById('recovery-domain').addEventListener('input', function(e) {
    const el = document.getElementById('sidebar-domain-status');
    if (el) el.innerText = e.target.value.trim() || 'recovery.yourdomain.com';
  });

  document.getElementById('btn-select-template').addEventListener('click', function() {
    document.getElementById('input-template-file').click();
  });

  document.getElementById('input-template-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      activeTemplate = evt.target.result;
      const statusBadge = document.getElementById('template-status');
      statusBadge.innerText = '✓ Custom (' + file.name + ')';
      statusBadge.className = 'badge badge-green';
      showToast('Loaded custom template: ' + file.name);
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-import-json').addEventListener('click', function() {
    document.getElementById('input-json-file').click();
  });

  document.getElementById('input-json-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const json = JSON.parse(evt.target.result);
        const normalized = normalizeVaultPayload(json);

        const container = document.getElementById('cards-container');
        container.innerHTML = '';

        if (Array.isArray(normalized.items)) {
          normalized.items.forEach(function(item) {
            if (item.type) {
              addCard(item.type, item);
            }
          });
        }

        if (normalized.metadata) {
          if (normalized.metadata.canaryCode) {
            document.getElementById('canary-code').value = normalized.metadata.canaryCode;
          }
          if (normalized.metadata.staleAfterMonths) {
            document.getElementById('stale-months').value = normalized.metadata.staleAfterMonths;
          }
        }

        renderSidebarCards();
        const first = document.querySelector('#cards-container .card-item');
        if (first) selectSection(first.dataset.id);
        showToast('Imported payload.json successfully!');
      } catch (err) {
        alert('Invalid JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-export-plaintext').addEventListener('click', function() {
    const items = getCardsData();
    if (items.length === 0) {
      alert('Vault is empty. Add at least one credential card.');
      return;
    }
    if (!confirm('CAUTION: This exports unencrypted credentials to your local disk. Remember to store or shred it safely. Proceed?')) return;

    const payload = buildVaultPayload(items);
    triggerDownload('payload.json', JSON.stringify(payload, null, 2));
  });

  document.getElementById('btn-build-vault').addEventListener('click', handleBuildVault);

  document.getElementById('btn-download-html').addEventListener('click', function() {
    if (!generatedHtml) {
      alert('No vault generated yet.');
      return;
    }
    triggerDownload('index.html', generatedHtml);
  });

  document.getElementById('btn-copy-ciphertext').addEventListener('click', function() {
    if (generatedCiphertextB64) {
      copyText(generatedCiphertextB64);
    }
  });

  document.getElementById('btn-copy-dns-name').addEventListener('click', function() {
    copyText(document.getElementById('dns-record-name').innerText);
  });

  document.getElementById('btn-copy-git-snippet').addEventListener('click', function() {
    copyText(document.getElementById('code-git-snippet').innerText);
  });

  const tabCfBtn = document.getElementById('tab-cf-btn');
  const tabNetlifyBtn = document.getElementById('tab-netlify-btn');
  const tabVercelBtn = document.getElementById('tab-vercel-btn');
  const tabGitBtn = document.getElementById('tab-git-btn');

  const tabCfContent = document.getElementById('tab-cf-content');
  const tabNetlifyContent = document.getElementById('tab-netlify-content');
  const tabVercelContent = document.getElementById('tab-vercel-content');
  const tabGitContent = document.getElementById('tab-git-content');

  function selectTab(activeBtn, activeContent) {
    [tabCfBtn, tabNetlifyBtn, tabVercelBtn, tabGitBtn].forEach(function(btn) { btn.classList.remove('active'); });
    [tabCfContent, tabNetlifyContent, tabVercelContent, tabGitContent].forEach(function(c) { c.style.display = 'none'; });
    activeBtn.classList.add('active');
    activeContent.style.display = 'block';
  }

  tabCfBtn.addEventListener('click', function() { selectTab(tabCfBtn, tabCfContent); });
  tabNetlifyBtn.addEventListener('click', function() { selectTab(tabNetlifyBtn, tabNetlifyContent); });
  tabVercelBtn.addEventListener('click', function() { selectTab(tabVercelBtn, tabVercelContent); });
  tabGitBtn.addEventListener('click', function() { selectTab(tabGitBtn, tabGitContent); });

  document.getElementById('btn-back-to-edit').addEventListener('click', function() {
    document.getElementById('view-deploy').style.display = 'none';
    document.getElementById('view-form').style.display = 'block';
  });

  document.getElementById('btn-purge-and-lock').addEventListener('click', function() {
    if (!confirm('This will wipe all generated ciphertext and sensitive fields from browser memory. Proceed?')) return;
    generatedCiphertextB64 = null;
    generatedHtml = null;
    document.getElementById('dns-record-value').innerText = '';
    clearAll();
    document.getElementById('view-deploy').style.display = 'none';
    document.getElementById('view-form').style.display = 'block';
    showToast('Memory purged.');
  });

  generateCanaryCode();
  updatePassphraseUI();
  loadSampleData();
});
</script>
</body>
</html>
`;

const outputPath = path.join(toolsDir, 'builder.html');
fs.writeFileSync(outputPath, BUILDER_HTML, 'utf8');
console.log(`✓ Generated tools/builder.html (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
