#!/usr/bin/env node
/**
 * Builder Generator for Cold-Start Identity Recovery Protocol
 * Generates tools/builder.html with embedded default template from public/index.html.
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
  <title>Cold-Start Recovery Vault Builder</title>
  <style>
    :root {
      --bg-base: #0a0e17;
      --bg-surface: #111827;
      --bg-surface-elevated: #1f2937;
      --bg-surface-subtle: #1e293b;
      --border-color: #374151;
      --border-focus: #38bdf8;
      --text-primary: #f9fafb;
      --text-secondary: #9ca3af;
      --text-muted: #6b7280;
      
      --accent-primary: #0284c7;
      --accent-hover: #0369a1;
      --accent-focus: rgba(2, 132, 199, 0.4);

      --status-green-bg: rgba(6, 78, 59, 0.35);
      --status-green-border: #059669;
      --status-green-text: #34d399;

      --status-amber-bg: rgba(120, 53, 15, 0.35);
      --status-amber-border: #d97706;
      --status-amber-text: #fbbf24;

      --status-red-bg: rgba(127, 29, 29, 0.35);
      --status-red-border: #dc2626;
      --status-red-text: #f87171;

      --radius-sm: 4px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg-base);
      color: var(--text-primary);
      font-family: var(--font-sans);
      line-height: 1.5;
      padding: 24px 16px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .container {
      width: 100%;
      max-width: 860px;
    }

    header {
      text-align: center;
      margin-bottom: 24px;
    }

    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 4px 10px;
      border-radius: 9999px;
      margin-bottom: 12px;
    }

    .security-notice {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: var(--radius-md);
      padding: 12px 16px;
      font-size: 0.85rem;
      color: #a7f3d0;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    h1 {
      font-size: 1.85rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      margin-bottom: 6px;
    }

    .subtitle {
      color: var(--text-secondary);
      font-size: 0.95rem;
      max-width: 600px;
      margin: 0 auto;
    }

    .card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 22px;
      margin-bottom: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border-color);
    }

    .card-title {
      font-size: 1.1rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-item {
      position: relative;
      transition: border-color 0.15s;
    }

    .card-item:hover {
      border-color: #4b5563;
    }

    .card-controls {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .btn-icon {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-color);
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
      border-color: #4b5563;
    }

    .btn-delete:hover {
      background: var(--status-red-bg) !important;
      color: var(--status-red-text) !important;
      border-color: var(--status-red-border) !important;
    }

    .kv-row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      align-items: center;
    }

    .card-subtitle {
      color: var(--text-secondary);
      font-size: 0.85rem;
      margin-top: 2px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    label {
      display: block;
      font-size: 0.82rem;
      font-weight: 600;
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
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 10px 14px;
      border-radius: var(--radius-md);
      font-family: inherit;
      font-size: 0.95rem;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    input[type="text"]:focus,
    input[type="password"]:focus,
    input[type="number"]:focus,
    textarea:focus,
    select:focus {
      outline: none;
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px var(--accent-focus);
    }

    .mono {
      font-family: var(--font-mono) !important;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .grid-2 > .form-group {
      margin-bottom: 0;
    }

    .status-field-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 6px 12px;
      min-height: 42px;
      box-sizing: border-box;
    }

    @media (max-width: 640px) {
      .grid-2 { grid-template-columns: 1fr; }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 16px;
      border-radius: var(--radius-md);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease-in-out;
      user-select: none;
    }

    .btn-primary {
      background-color: var(--accent-primary);
      color: #fff;
    }

    .btn-primary:hover {
      background-color: var(--accent-hover);
    }

    .btn-success {
      background-color: #059669;
      color: #fff;
    }

    .btn-success:hover {
      background-color: #047857;
    }

    .btn-secondary {
      background-color: var(--bg-surface-elevated);
      border-color: var(--border-color);
      color: var(--text-primary);
    }

    .btn-secondary:hover {
      background-color: var(--bg-surface-subtle);
      border-color: #4b5563;
    }

    .btn-sm {
      padding: 5px 10px;
      font-size: 0.8rem;
    }

    .btn-large {
      padding: 14px 24px;
      font-size: 1.05rem;
      width: 100%;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-gray {
      background: rgba(107, 114, 128, 0.2);
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
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

    .kv-row input:first-child {
      flex: 1;
    }

    .kv-row input:nth-child(2) {
      flex: 2;
    }

    #view-deploy {
      display: none;
    }

    .code-block {
      background: #05080e;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 12px 16px;
      font-family: var(--font-mono);
      font-size: 0.85rem;
      color: #e5e7eb;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
      position: relative;
    }

    .dns-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }

    .dns-table th, .dns-table td {
      padding: 10px 12px;
      border: 1px solid var(--border-color);
      font-size: 0.9rem;
      text-align: left;
    }

    .dns-table th {
      background: var(--bg-surface-elevated);
      color: var(--text-secondary);
      font-size: 0.8rem;
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
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 8px;
    }

    .tab-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.9rem;
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .tab-btn.active {
      background: var(--bg-surface-elevated);
      color: var(--border-focus);
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
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
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

<div class="container">
  <header>
    <div class="brand-badge">🛡️ Offline Vault Compiler</div>
    <h1>Cold-Start Identity Recovery</h1>
    <p class="subtitle">Generate an encrypted, zero-dependency emergency recovery terminal entirely inside your browser.</p>
  </header>

  <div class="security-notice">
    <span style="font-size: 1.3rem;">🔒</span>
    <div>
      <strong>100% Client-Side Privacy:</strong> Derivation and AES-GCM-256 encryption execute locally via <code>window.crypto.subtle</code>. Strict Content-Security-Policy guarantees zero network requests. Your credentials never touch a remote server.
    </div>
  </div>

  <!-- BUILDER FORM VIEW -->
  <div id="view-form">
    <!-- Top Quick Actions Bar -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
      <div style="display: flex; gap: 8px;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-load-sample">📋 Load Sample Data</button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-import-json">📂 Import payload.json</button>
        <input type="file" id="input-json-file" accept=".json" style="display: none;">
      </div>
      <div>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-export-plaintext">💾 Export Plaintext JSON</button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-reset-all" style="color: var(--status-red-text);">🧹 Clear All</button>
      </div>
    </div>

    <!-- CARD 1: Diceware Passphrase (Master Recovery Key) -->
    <div class="card" style="border-color: rgba(56, 189, 248, 0.4);">
      <div class="card-header">
        <div>
          <div class="card-title">🔑 1. Disaster Recovery Passphrase (Master Key)</div>
          <div class="card-subtitle">Memorized Diceware phrase (≥6 words, or 8 generated words for ~80 bits entropy). This decrypts your vault.</div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-generate-diceware">🎲 Generate 8 Words (~80 bits)</button>
      </div>

      <div class="form-group">
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

    <!-- SECTION 2: Modular Credential Cards -->
    <div style="margin: 28px 0 16px 0;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <div>
          <div class="card-title" style="font-size: 1.25rem;">📦 2. Credential Cards (Modular Architecture)</div>
          <div class="card-subtitle">Add, customize, and arrange multiple password managers, single-use backup codes, seed phrases, TOTP seeds, or custom keys.</div>
        </div>
      </div>

      <!-- Add Card Action Toolbar -->
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px 14px; align-items: center;">
        <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-right: 4px;">+ Add Card:</span>
        <button type="button" id="btn-add-pm" class="btn btn-secondary btn-sm" onclick="addCard('password_manager')">🔑 Password Manager</button>
        <button type="button" id="btn-add-codes" class="btn btn-secondary btn-sm" onclick="addCard('backup_codes')">🛡️ Backup Codes</button>
        <button type="button" id="btn-add-seed" class="btn btn-secondary btn-sm" onclick="addCard('seed_phrase')">🌱 Seed Phrase</button>
        <button type="button" id="btn-add-totp" class="btn btn-secondary btn-sm" onclick="addCard('totp_group')">⏱️ Authenticator (TOTP)</button>
        <button type="button" id="btn-add-kv" class="btn btn-secondary btn-sm" onclick="addCard('key_value')">🔐 Custom Key-Value</button>
        <button type="button" id="btn-add-notes" class="btn btn-secondary btn-sm" onclick="addCard('notes')">📝 Secure Notes</button>
      </div>

      <!-- Container for Dynamic Cards -->
      <div id="cards-container"></div>

      <!-- Empty State Notice -->
      <div id="empty-cards-notice" style="text-align: center; padding: 36px 20px; background: var(--bg-surface); border: 2px dashed var(--border-color); border-radius: var(--radius-lg); margin-bottom: 20px; display: none;">
        <div style="font-size: 2rem; margin-bottom: 8px;">📦</div>
        <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 14px;">No credential cards added yet. Click an option above or load sample data.</p>
        <button type="button" class="btn btn-secondary btn-sm" onclick="loadSampleData()">📋 Load Sample Data</button>
      </div>
    </div>

    <!-- CARD 3: Vault Configuration & Dead-Drop DNS -->
    <div class="card" style="margin-top: 28px;">
      <div class="card-header">
        <div>
          <div class="card-title">⚙️ 3. Vault Configuration & Dead-Drop DNS</div>
          <div class="card-subtitle">Settings for staleness detection and the secondary RFC 1035 DNS TXT dead-drop.</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label for="recovery-domain">Recovery DNS Domain</label>
          <input type="text" id="recovery-domain" class="mono" value="recovery.yourdomain.com" placeholder="recovery.yourdomain.com">
        </div>
        <div class="form-group">
          <label for="canary-code">Canary Code (Quick 2SV Verification)</label>
          <div class="input-with-button">
            <input type="text" id="canary-code" class="mono" placeholder="12345678">
            <button type="button" class="btn btn-secondary" id="btn-random-canary" title="Generate Random Canary Code">🎲</button>
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-top: 16px;">
        <div class="form-group">
          <label for="stale-months">Stale After (Months)</label>
          <input type="number" id="stale-months" value="6" min="1" max="24">
        </div>
        <div class="form-group">
          <label>HTML Template Status</label>
          <div class="status-field-container">
            <span class="badge badge-green" id="template-status">✓ Default embedded</span>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-select-template">Change Template...</button>
            <input type="file" id="input-template-file" accept=".html" style="display: none;">
          </div>
        </div>
      </div>
    </div>

    <!-- PRIMARY ACTION BUTTON -->
    <div style="margin-top: 24px; margin-bottom: 40px;">
      <button type="button" class="btn btn-primary btn-large" id="btn-build-vault">
        🔒 Encrypt & Build Recovery Terminal (index.html)
      </button>
      <div id="build-status" style="text-align: center; margin-top: 10px; font-size: 0.9rem; color: var(--border-focus); display: none;">
        Deriving key via PBKDF2-SHA-256 (600,000 rounds) & encrypting...
      </div>
    </div>
  </div>

  <!-- DEPLOYMENT & MANUAL STEPS VIEW (Shown after successful build) -->
  <div id="view-deploy">
    <div class="card" style="border-color: var(--status-green-border); background: rgba(6, 78, 59, 0.15);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="color: var(--status-green-text); font-size: 1.4rem; display: flex; align-items: center; gap: 8px;">
            ✓ Recovery Vault Encrypted Successfully!
          </h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">
            PBKDF2-SHA-256 (600,000 rounds) • AES-GCM-256 • Verified round-trip decryption
          </p>
        </div>
        <button type="button" class="btn btn-success" id="btn-download-html" style="font-size: 1rem; padding: 12px 20px;">
          ⬇️ Download index.html
        </button>
      </div>
    </div>

    <!-- Step 1: Deploy to Edge Hosting -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">🌐 Step 1: Deploy to Edge Hosting (Cloudflare / Netlify / Vercel)</div>
          <div class="card-subtitle">Host your hardened single-file recovery terminal at <code>https://sos.yourdomain.com</code></div>
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
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 10px;">
          <strong>Option A: Direct Upload via Web Dashboard (Zero Git Clone, Zero Terminal)</strong>
        </p>
        <ol style="margin-left: 20px; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.8;">
          <li>Log into the <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener" style="color: var(--border-focus);">Cloudflare Dashboard</a>.</li>
          <li>Navigate to <strong>Workers & Pages</strong> → Select your Pages project (or click <strong>Create application → Pages → Direct Upload</strong>).</li>
          <li>Create an empty folder, place the downloaded <code>index.html</code> (and <code>_headers</code>) inside, and drag it into the dropzone.</li>
          <li>Click <strong>Deploy site</strong>. Your vault is live worldwide on Cloudflare's Anycast Edge!</li>
        </ol>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 12px 0 6px 0;">
          <strong>Option B: 1-Command Automated CLI (Zero Git Clone)</strong>
        </p>
        <div class="code-block">npx github:janhrabcak/identity-recovery --provider cloudflare</div>
      </div>

      <!-- Netlify Tab -->
      <div id="tab-netlify-content" style="display: none;">
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 10px;">
          <strong>Option A: Netlify Drop Web Dashboard (Zero Git Clone, Zero Terminal)</strong>
        </p>
        <ol style="margin-left: 20px; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.8;">
          <li>Log into the <a href="https://app.netlify.com/" target="_blank" rel="noopener" style="color: var(--border-focus);">Netlify Dashboard</a>.</li>
          <li>Navigate to <strong>Sites</strong> and scroll down to the <strong>Deploy manually / Netlify Drop</strong> section.</li>
          <li>Drag-and-drop the folder containing your downloaded <code>index.html</code> (and <code>netlify.toml</code>).</li>
          <li>Your recovery vault is live with full edge security header parity!</li>
        </ol>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 12px 0 6px 0;">
          <strong>Option B: 1-Command Automated CLI (Zero Git Clone)</strong>
        </p>
        <div class="code-block">npx github:janhrabcak/identity-recovery --provider netlify</div>
      </div>

      <!-- Vercel Tab -->
      <div id="tab-vercel-content" style="display: none;">
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 10px;">
          <strong>Option A: 1-Command Automated CLI (Zero Git Clone)</strong>
        </p>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 8px;">
          Deploy directly to Vercel production edge without cloning or committing ciphertext:
        </p>
        <div class="code-block">npx github:janhrabcak/identity-recovery --provider vercel</div>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 12px 0 6px 0;">
          <strong>Option B: Git Integration (Private Repositories)</strong>
        </p>
        <ol style="margin-left: 20px; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.8;">
          <li>Import your repository in the <a href="https://vercel.com/dashboard" target="_blank" rel="noopener" style="color: var(--border-focus);">Vercel Dashboard</a>.</li>
          <li>Configure <strong>Root Directory:</strong> <code>.</code> and <strong>Output Directory:</strong> <code>public</code>.</li>
          <li>Deployments automatically apply strict security headers from <code>vercel.json</code>.</li>
        </ol>
      </div>

      <!-- Git Tab -->
      <div id="tab-git-content" style="display: none;">
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 10px;">
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
      <div class="card-header">
        <div>
          <div class="card-title">📡 Step 2: Update DNS TXT Dead-Drop (Cloudflare, Route53, or Any DNS)</div>
          <div class="card-subtitle">Secondary fallback queryable via DoH if your web URL is unreachable.</div>
        </div>
      </div>

      <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 12px;">
        In your DNS provider (such as <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener" style="color: var(--border-focus);">Cloudflare DNS</a>, AWS Route 53, etc.), add or update the following TXT record in your domain zone:
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
            <div id="dns-record-value" class="mono" style="max-height: 80px; overflow-y: auto; font-size: 0.8rem; word-break: break-all; color: var(--status-green-text);"></div>
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

function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 2500);
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!'));
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

function normalizePassphrase(passphrase) {
  if (!passphrase || typeof passphrase !== 'string') return '';
  return passphrase.trim().normalize('NFKC').replace(/\\s+/g, ' ');
}

function evaluatePassphraseEntropy(passphrase) {
  if (!passphrase || typeof passphrase !== 'string' || passphrase.trim().length === 0) {
    return { valid: false, reason: 'Passphrase cannot be empty.', wordCount: 0, charCount: 0, uniqueCount: 0 };
  }
  const normalized = normalizePassphrase(passphrase);
  const words = normalized.split(' ').filter(w => w.length > 0);
  const charCount = normalized.length;
  const unique = new Set(words.map(w => w.toLowerCase()));

  const res = {
    valid: false,
    wordCount: words.length,
    charCount: charCount,
    uniqueCount: unique.size,
    reason: ''
  };

  if (words.length < 6) {
    res.reason = \`Insufficient words (\${words.length}/6). Minimum 6 words required.\`;
    return res;
  }
  if (charCount < 20) {
    res.reason = \`Passphrase too short (\${charCount}/20 chars).\`;
    return res;
  }
  if (unique.size < 4) {
    res.reason = 'Too many repeated words.';
    return res;
  }
  if (words.some(w => w.length < 2)) {
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

  bWords.innerText = \`\${evalRes.wordCount} / 6 words\`;
  bWords.className = evalRes.wordCount >= 6 ? 'badge badge-green' : 'badge badge-gray';

  bChars.innerText = \`\${evalRes.charCount} / 20 chars\`;
  bChars.className = evalRes.charCount >= 20 ? 'badge badge-green' : 'badge badge-gray';

  bUnique.innerText = \`\${evalRes.uniqueCount} unique\`;
  bUnique.className = evalRes.uniqueCount >= 4 ? 'badge badge-green' : 'badge badge-gray';

  if (evalRes.valid) {
    bStatus.innerText = evalRes.wordCount >= 8 ? '✓ Strong (~80 bits entropy)' : '✓ Valid (≥6 words)';
    bStatus.className = 'badge badge-green';
  } else if (evalRes.wordCount >= 4) {
    bStatus.innerText = 'Moderate entropy';
    bStatus.className = 'badge badge-amber';
  } else {
    bStatus.innerText = 'Incomplete';
    bStatus.className = 'badge badge-red';
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
  if (!container || !empty) return;
  empty.style.display = container.children.length === 0 ? 'block' : 'none';
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

function addCard(type, data = {}) {
  cardCounter++;
  const cardId = data.id || ('card_' + cardCounter + '_' + Date.now().toString(36));
  const container = document.getElementById('cards-container');

  const card = document.createElement('div');
  card.className = 'card card-item';
  card.dataset.id = cardId;
  card.dataset.type = type;

  let headerHtml = '';
  let bodyHtml = '';

  const titleText = data.title || getDefaultTitleForType(type, data.service);

  if (type === 'password_manager') {
    const service = data.service || '1Password';
    headerHtml = '<div>' +
      '<div class="card-title">🔑 <input type="text" class="card-title-input" value="' + escapeHtml(titleText) + '" style="background:none; border:none; color:inherit; font-weight:700; font-size:1.05rem; padding:0; width:auto; max-width:350px;"></div>' +
      '<div class="card-subtitle">Password Manager & Master Vault</div>' +
      '</div>';
    bodyHtml = '<div class="grid-2">' +
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
      '<textarea class="pm-instructions" rows="2" placeholder="1. Go to https://my.1password.com&#10;2. Paste email and secret key&#10;3. Enter memorized master password">' + escapeHtml(data.instructions || '') + '</textarea>' +
      '</div>';
  } else if (type === 'backup_codes') {
    const service = data.service || 'Google';
    const codesStr = Array.isArray(data.codes) ? data.codes.join('\\n') : (data.codes || '');
    headerHtml = '<div>' +
      '<div class="card-title">🛡️ <input type="text" class="card-title-input" value="' + escapeHtml(titleText) + '" style="background:none; border:none; color:inherit; font-weight:700; font-size:1.05rem; padding:0; width:auto; max-width:350px;"></div>' +
      '<div class="card-subtitle">Single-use emergency recovery backup codes</div>' +
      '</div>';
    bodyHtml = '<div class="grid-2">' +
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
      '<div style="display: flex; align-items: center; height: 42px;">' +
      '<span class="badge badge-gray codes-badge">0 codes parsed</span>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="form-group" style="margin-top: 12px;">' +
      '<label>Backup Codes (One per line, space, or comma separated)</label>' +
      '<textarea class="codes-textarea mono" rows="4" placeholder="23456789&#10;34567890&#10;45678901&#10;...">' + escapeHtml(codesStr) + '</textarea>' +
      '</div>';
  } else if (type === 'seed_phrase') {
    const service = data.service || 'Ledger';
    const phrase = data.phrase || '';
    headerHtml = '<div>' +
      '<div class="card-title">🌱 <input type="text" class="card-title-input" value="' + escapeHtml(titleText) + '" style="background:none; border:none; color:inherit; font-weight:700; font-size:1.05rem; padding:0; width:auto; max-width:350px;"></div>' +
      '<div class="card-subtitle">BIP-39 Crypto Wallet / Hardware Key Recovery Phrase</div>' +
      '</div>';
    bodyHtml = '<div class="grid-2">' +
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
      '<div style="display: flex; align-items: center; height: 42px;">' +
      '<span class="badge badge-gray seed-badge">0 words</span>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="form-group" style="margin-top: 12px;">' +
      '<label>Mnemonic Recovery Words (Space-separated 12, 18, or 24 words)</label>' +
      '<textarea class="seed-textarea mono" rows="3" placeholder="witch collapse practice feed shame open despair creek road again ice least">' + escapeHtml(phrase) + '</textarea>' +
      '</div>';
  } else if (type === 'totp_group') {
    headerHtml = '<div>' +
      '<div class="card-title">⏱️ <input type="text" class="card-title-input" value="' + escapeHtml(titleText) + '" style="background:none; border:none; color:inherit; font-weight:700; font-size:1.05rem; padding:0; width:auto; max-width:350px;"></div>' +
      '<div class="card-subtitle">Live In-Browser Time-Based OTP Authenticator Seeds</div>' +
      '</div>';
    bodyHtml = '<div class="form-group">' +
      '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">' +
      '<label style="margin-bottom: 0;">Authenticator Accounts</label>' +
      '<button type="button" class="btn btn-secondary btn-sm btn-add-totp-row">+ Add Account</button>' +
      '</div>' +
      '<div class="totp-rows-container"></div>' +
      '</div>';
  } else if (type === 'key_value') {
    headerHtml = '<div>' +
      '<div class="card-title">🔐 <input type="text" class="card-title-input" value="' + escapeHtml(titleText) + '" style="background:none; border:none; color:inherit; font-weight:700; font-size:1.05rem; padding:0; width:auto; max-width:350px;"></div>' +
      '<div class="card-subtitle">Arbitrary Secrets, SSH Keys, PINs, or Recovery Questions</div>' +
      '</div>';
    bodyHtml = '<div class="form-group">' +
      '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">' +
      '<label style="margin-bottom: 0;">Key-Value Entries</label>' +
      '<button type="button" class="btn btn-secondary btn-sm btn-add-kv-row">+ Add Field</button>' +
      '</div>' +
      '<div class="kv-rows-container"></div>' +
      '</div>';
  } else if (type === 'notes') {
    headerHtml = '<div>' +
      '<div class="card-title">📝 <input type="text" class="card-title-input" value="' + escapeHtml(titleText) + '" style="background:none; border:none; color:inherit; font-weight:700; font-size:1.05rem; padding:0; width:auto; max-width:350px;"></div>' +
      '<div class="card-subtitle">Emergency instructions, contacts, and fallback protocols</div>' +
      '</div>';
    bodyHtml = '<div class="form-group">' +
      '<label>Emergency Instructions / Contacts</label>' +
      '<textarea class="notes-textarea" rows="4" placeholder="Emergency contact: Alice (+1-555-0199).">' + escapeHtml(data.content || data.notes || '') + '</textarea>' +
      '</div>';
  }

  const headerDiv = document.createElement('div');
  headerDiv.className = 'card-header';
  headerDiv.innerHTML = headerHtml;

  const controls = document.createElement('div');
  controls.className = 'card-controls';
  controls.innerHTML = '<button type="button" class="btn-icon btn-move-up" title="Move card up">↑</button>' +
    '<button type="button" class="btn-icon btn-move-down" title="Move card down">↓</button>' +
    '<button type="button" class="btn-icon btn-delete" title="Delete card">🗑️</button>';
  headerDiv.appendChild(controls);
  card.appendChild(headerDiv);

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = bodyHtml;
  card.appendChild(bodyDiv);

  controls.querySelector('.btn-move-up').onclick = () => {
    const prev = card.previousElementSibling;
    if (prev) container.insertBefore(card, prev);
  };
  controls.querySelector('.btn-move-down').onclick = () => {
    const next = card.nextElementSibling;
    if (next) container.insertBefore(next, card);
  };
  controls.querySelector('.btn-delete').onclick = () => {
    if (confirm('Delete this credential card?')) {
      card.remove();
      updateEmptyNotice();
    }
  };

  if (type === 'backup_codes') {
    const ta = card.querySelector('.codes-textarea');
    const badge = card.querySelector('.codes-badge');
    const updateCodes = () => {
      const matches = (ta.value.match(/\\b[A-Za-z0-9_-]{6,16}\\b/g) || []);
      badge.textContent = matches.length + ' codes parsed';
      badge.className = matches.length >= 10 ? 'badge badge-green' : (matches.length > 0 ? 'badge badge-amber' : 'badge badge-gray');
    };
    ta.addEventListener('input', updateCodes);
    updateCodes();
  } else if (type === 'seed_phrase') {
    const ta = card.querySelector('.seed-textarea');
    const badge = card.querySelector('.seed-badge');
    const updateSeed = () => {
      const words = ta.value.trim().split(/\\s+/).filter(w => w.length > 0);
      badge.textContent = words.length + ' words';
      badge.className = (words.length === 12 || words.length === 24) ? 'badge badge-green' : (words.length > 0 ? 'badge badge-amber' : 'badge badge-gray');
    };
    ta.addEventListener('input', updateSeed);
    updateSeed();
  } else if (type === 'totp_group') {
    const totpContainer = card.querySelector('.totp-rows-container');
    const addRowBtn = card.querySelector('.btn-add-totp-row');
    const addRow = (acc = '', sec = '') => {
      const row = document.createElement('div');
      row.className = 'kv-row';
      row.innerHTML = '<input type="text" class="totp-acc" placeholder="Account / Service (e.g. Google)" value="' + escapeHtml(acc) + '" style="flex:1;">' +
        '<input type="text" class="totp-sec mono" placeholder="Base32 Secret Key" value="' + escapeHtml(sec) + '" style="flex:1.5;">' +
        '<button type="button" class="btn-icon btn-delete" style="padding:6px 10px;">✕</button>';
      row.querySelector('.btn-delete').onclick = () => row.remove();
      totpContainer.appendChild(row);
    };
    addRowBtn.onclick = () => addRow();
    if (data.seeds && typeof data.seeds === 'object') {
      for (const [k, v] of Object.entries(data.seeds)) addRow(k, v);
    } else {
      addRow('Google', '');
    }
  } else if (type === 'key_value') {
    const kvContainer = card.querySelector('.kv-rows-container');
    const addRowBtn = card.querySelector('.btn-add-kv-row');
    const addRow = (k = '', v = '') => {
      const row = document.createElement('div');
      row.className = 'kv-row';
      row.innerHTML = '<input type="text" class="kv-key" placeholder="Key / Label (e.g. SSH Key)" value="' + escapeHtml(k) + '" style="flex:1;">' +
        '<input type="text" class="kv-val mono" placeholder="Value / Secret" value="' + escapeHtml(v) + '" style="flex:2;">' +
        '<button type="button" class="btn-icon btn-delete" style="padding:6px 10px;">✕</button>';
      row.querySelector('.btn-delete').onclick = () => row.remove();
      kvContainer.appendChild(row);
    };
    addRowBtn.onclick = () => addRow();
    if (Array.isArray(data.entries)) {
      data.entries.forEach(e => addRow(e.label || e.key || '', e.value || ''));
    } else if (data.entries && typeof data.entries === 'object') {
      for (const [k, v] of Object.entries(data.entries)) addRow(k, String(v));
    } else {
      addRow('', '');
    }
  }

  container.appendChild(card);
  updateEmptyNotice();
  return card;
}

function getCardsData() {
  const container = document.getElementById('cards-container');
  const cardEls = container.querySelectorAll('.card-item');
  const items = [];

  cardEls.forEach((card, idx) => {
    const type = card.dataset.type;
    const id = card.dataset.id || ('card_' + (idx + 1));
    const titleInput = card.querySelector('.card-title-input');
    const title = (titleInput && titleInput.value.trim()) || getDefaultTitleForType(type);

    if (type === 'password_manager') {
      items.push({
        id,
        type,
        title,
        service: card.querySelector('.pm-service').value,
        hint: card.querySelector('.pm-hint').value.trim() || undefined,
        email: card.querySelector('.pm-email').value.trim(),
        secretKey: card.querySelector('.pm-secret').value.trim(),
        instructions: card.querySelector('.pm-instructions').value.trim() || undefined
      });
    } else if (type === 'backup_codes') {
      const raw = card.querySelector('.codes-textarea').value;
      const codes = raw.match(/\\b[A-Za-z0-9_-]{6,16}\\b/g) || [];
      items.push({
        id,
        type,
        title,
        service: card.querySelector('.codes-service').value,
        codes
      });
    } else if (type === 'seed_phrase') {
      const phrase = card.querySelector('.seed-textarea').value.trim().replace(/\\s+/g, ' ');
      items.push({
        id,
        type,
        title,
        service: card.querySelector('.seed-service').value,
        phrase
      });
    } else if (type === 'totp_group') {
      const seeds = {};
      card.querySelectorAll('.totp-rows-container .kv-row').forEach(row => {
        const acc = row.querySelector('.totp-acc').value.trim();
        const sec = row.querySelector('.totp-sec').value.trim().replace(/\\s+/g, '').toUpperCase();
        if (acc && sec) seeds[acc] = sec;
      });
      items.push({
        id,
        type,
        title,
        seeds
      });
    } else if (type === 'key_value') {
      const entries = [];
      card.querySelectorAll('.kv-rows-container .kv-row').forEach(row => {
        const k = row.querySelector('.kv-key').value.trim();
        const v = row.querySelector('.kv-val').value.trim();
        if (k || v) entries.push({ label: k, value: v });
      });
      items.push({
        id,
        type,
        title,
        entries
      });
    } else if (type === 'notes') {
      items.push({
        id,
        type,
        title,
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

  // Attach legacy root fields for complete backward compatibility
  const firstPm = items.find(it => it.type === 'password_manager');
  if (firstPm) {
    payload.onePassword = {
      email: firstPm.email || '',
      secretKey: firstPm.secretKey || '',
      accountKeyHint: firstPm.hint || 'Personal Emergency Vault'
    };
  }
  const firstCodes = items.find(it => it.type === 'backup_codes');
  if (firstCodes) {
    payload.googleBackupCodes = firstCodes.codes || [];
  }
  const firstTotp = items.find(it => it.type === 'totp_group' || it.type === 'totp');
  if (firstTotp && firstTotp.seeds) {
    payload.totpSeeds = firstTotp.seeds;
  }
  const firstNotes = items.find(it => it.type === 'notes');
  if (firstNotes) {
    payload.notes = firstNotes.content;
  }

  return payload;
}

function normalizeVaultPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { metadata: {}, items: [] };
  }
  const res = { ...payload };
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
        instructions: '1. Go to https://my.1password.com\\n2. Paste email and secret key\\n3. Enter memorized master password.'
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
    instructions: '1. Go to https://my.1password.com in a clean browser tab.\\n2. Paste email and secret key.\\n3. Enter memorized master password.'
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
  showToast('Loaded modular sample cards!');
}

function clearAll() {
  if (!confirm('Are you sure you want to clear all entered credentials and keys?')) return;
  document.getElementById('passphrase').value = '';
  document.getElementById('cards-container').innerHTML = '';
  updateEmptyNotice();
  document.getElementById('canary-code').value = '';
  updatePassphraseUI();
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
    { name: 'AES-GCM', iv },
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
    { name: 'AES-GCM', iv },
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

  const placeholderRegex = /const\\s+EMBEDDED_CIPHERTEXT\\s*=\\s*["'][^"']*["'];/;
  if (!placeholderRegex.test(html)) {
    throw new Error('Template is missing "const EMBEDDED_CIPHERTEXT = ...;" placeholder.');
  }
  html = html.replace(placeholderRegex, \`const EMBEDDED_CIPHERTEXT = "\${ciphertextB64}";\`);

  if (metadata.generatedAt) {
    const genMetaRegex = /<meta\\s+name=["']vault-generated-at["']\\s+content=["'][^"']*["']\\s*\\/?>/i;
    if (genMetaRegex.test(html)) {
      html = html.replace(genMetaRegex, \`<meta name="vault-generated-at" content="\${escapeHtmlAttr(metadata.generatedAt)}">\`);
    }
  }

  if (metadata.staleAfterMonths !== undefined) {
    const staleMetaRegex = /<meta\\s+name=["']vault-stale-after-months["']\\s+content=["'][^"']*["']\\s*\\/?>/i;
    if (staleMetaRegex.test(html)) {
      html = html.replace(staleMetaRegex, \`<meta name="vault-stale-after-months" content="\${escapeHtmlAttr(metadata.staleAfterMonths)}">\`);
    }
  }

  if (domain) {
    const domainMetaRegex = /<meta\\s+name=["']recovery-dns-domain["']\\s+content=["'][^"']*["']\\s*\\/?>/i;
    if (domainMetaRegex.test(html)) {
      html = html.replace(domainMetaRegex, \`<meta name="recovery-dns-domain" content="\${escapeHtmlAttr(domain.trim())}">\`);
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
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function handleBuildVault() {
  const pass = document.getElementById('passphrase').value;
  const entropy = evaluatePassphraseEntropy(pass);
  if (!entropy.valid) {
    alert('Passphrase error: ' + entropy.reason);
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
    await new Promise(r => setTimeout(r, 40));

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

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('passphrase').addEventListener('input', updatePassphraseUI);

  document.getElementById('btn-toggle-passphrase').addEventListener('click', () => {
    const p = document.getElementById('passphrase');
    p.type = p.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('btn-generate-diceware').addEventListener('click', generateDiceware);
  document.getElementById('btn-random-canary').addEventListener('click', generateCanaryCode);
  document.getElementById('btn-load-sample').addEventListener('click', loadSampleData);
  document.getElementById('btn-reset-all').addEventListener('click', clearAll);

  document.getElementById('btn-select-template').addEventListener('click', () => {
    document.getElementById('input-template-file').click();
  });

  document.getElementById('input-template-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      activeTemplate = evt.target.result;
      const statusBadge = document.getElementById('template-status');
      statusBadge.innerText = \`✓ Custom (\${file.name})\`;
      statusBadge.className = 'badge badge-green';
      showToast('Loaded custom template: ' + file.name);
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-import-json').addEventListener('click', () => {
    document.getElementById('input-json-file').click();
  });

  document.getElementById('input-json-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        const normalized = normalizeVaultPayload(json);

        document.getElementById('cards-container').innerHTML = '';

        (normalized.items || []).forEach(item => {
          addCard(item.type, item);
        });

        if (normalized.metadata) {
          if (normalized.metadata.canaryCode) document.getElementById('canary-code').value = normalized.metadata.canaryCode;
          if (normalized.metadata.staleAfterMonths) document.getElementById('stale-months').value = normalized.metadata.staleAfterMonths;
        }

        updateEmptyNotice();
        showToast('Successfully imported ' + file.name);
      } catch (err) {
        alert('Invalid JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-export-plaintext').addEventListener('click', () => {
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

  document.getElementById('btn-download-html').addEventListener('click', () => {
    if (!generatedHtml) {
      alert('No vault generated yet.');
      return;
    }
    triggerDownload('index.html', generatedHtml);
  });

  document.getElementById('btn-copy-ciphertext').addEventListener('click', () => {
    if (generatedCiphertextB64) {
      copyText(generatedCiphertextB64);
    }
  });

  document.getElementById('btn-copy-dns-name').addEventListener('click', () => {
    copyText(document.getElementById('dns-record-name').innerText);
  });

  document.getElementById('btn-copy-git-snippet').addEventListener('click', () => {
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
    [tabCfBtn, tabNetlifyBtn, tabVercelBtn, tabGitBtn].forEach(btn => btn.classList.remove('active'));
    [tabCfContent, tabNetlifyContent, tabVercelContent, tabGitContent].forEach(c => c.style.display = 'none');
    activeBtn.classList.add('active');
    activeContent.style.display = 'block';
  }

  tabCfBtn.addEventListener('click', () => selectTab(tabCfBtn, tabCfContent));
  tabNetlifyBtn.addEventListener('click', () => selectTab(tabNetlifyBtn, tabNetlifyContent));
  tabVercelBtn.addEventListener('click', () => selectTab(tabVercelBtn, tabVercelContent));
  tabGitBtn.addEventListener('click', () => selectTab(tabGitBtn, tabGitContent));

  document.getElementById('btn-back-to-edit').addEventListener('click', () => {
    document.getElementById('view-deploy').style.display = 'none';
    document.getElementById('view-form').style.display = 'block';
  });

  document.getElementById('btn-purge-and-lock').addEventListener('click', () => {
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
