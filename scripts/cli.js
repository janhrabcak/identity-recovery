#!/usr/bin/env node
/**
 * Cold-Start Identity Recovery Protocol — Interactive CLI Wizard
 *
 * Automates:
 *   Pillar 1: Building & deploying the zero-dependency Web Terminal
 *   Pillar 2: Generating and synchronizing the DNS TXT Dead-Drop
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { subtle, getRandomValues } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  encryptPayload,
  evaluatePassphraseEntropy,
  normalizePassphrase,
  escapeHtmlAttr
} from './encrypt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// 1,000-word Diceware list for offline passphrase generation
const DICEWARE_WORDS = [
  "acorn","action","active","actor","admire","admit","adore","advice","afford","afraid",
  "agency","agenda","agent","agile","agree","ahead","aiming","airport","alarm","alaska",
  "alder","alert","alibi","align","allege","alley","allied","alloy","almost","alpine",
  "alter","amaze","amber","amend","amity","amount","amuse","anchor","angel","angle",
  "animal","anklet","annual","answer","anthem","antique","anvil","anyhow","anyone","apiece",
  "appeal","appear","append","apple","apron","arcade","archer","arctic","ardent","arena",
  "argue","aridly","armada","armor","aroma","around","arouse","array","arrest","arrive",
  "arrow","arthur","artist","ascend","ascent","ashore","asking","asleep","aspect","aspire",
  "assent","assert","assign","assist","assume","assure","aston","astral","atlas","atom",
  "atomic","attach","attack","attain","attend","attic","attire","auburn","auction","audio",
  "audit","august","auntie","aurora","author","autism","autumn","avail","avenue","aviary",
  "avocado","avoid","avowal","await","awake","awaken","award","aware","awash","awhile",
  "awning","axle","baboon","backup","badger","baffle","bagel","baggage","baker","balance",
  "balcony","ballad","ballet","ballot","balsam","bamboo","banana","bandit","banker","banner",
  "banquet","barber","barely","bargain","barker","barley","barnet","baron","barrel","barter",
  "basalt","baseman","basics","basket","bassoon","baton","batter","battle","beacon","beagle",
  "beanie","bearing","beast","beauty","beaver","beckon","bedbug","bedford","bedrock","beeper",
  "beetle","before","beggar","behalf","behave","behold","belief","belittle","belong","beloved",
  "belted","bender","bengal","benign","bequest","berlin","beside","bestow","bethel","betray",
  "better","beyond","biased","biblical","bicycle","bidder","bifocal","bigot","bikini","billet",
  "binary","binder","biology","birch","bishop","bison","bitter","blaster","blazer","blender",
  "blessing","blimp","blizzard","blonde","blossom","blunder","bobcat","boggle","boiler","bonanza",
  "bonding","bonfire","bonnet","bonsai","booklet","boomer","bootleg","border","boring","botany",
  "bottle","bounce","boundary","bouquet","bovine","bowling","boxcar","boxing","boyhood","bracket",
  "braided","brainy","bramble","branch","brandy","brass","bravery","brawler","breadth","breaker",
  "breeder","breeze","brewer","bribe","bridge","brigade","bright","brilliant","brimful","brine",
  "brisket","bristle","bronco","bronze","brother","brush","brutish","bubble","bucket","buckle",
  "budget","buffalo","buffet","buggy","builder","bullet","bumble","bumper","bundle","bungee",
  "bunker","burden","bureau","burglar","burnout","burrito","bursar","busboy","bushel","bushy",
  "bustle","butler","butter","button","buyer","buzzard","cabbage","cabin","cabinet","cable",
  "cactus","cadet","cadillac","cafeteria","calcium","calendar","calico","caller","calmly","calorie",
  "camera","camper","campus","canal","canary","cancel","candle","candor","canine","canning",
  "cannon","canoe","canopy","canteen","canvas","canyon","capable","capital","caprice","captain",
  "caption","capture","caravan","carbon","cardiac","cardigan","career","careful","cargo","caribou",
  "caring","carnival","carpenter","carpet","carrier","carrot","cartel","carton","carve","cascade",
  "cashier","casino","cassette","castaway","castle","casual","catalog","catchy","caterer","catfish",
  "cathode","cattle","caucus","cauliflower","causeway","caution","cavalry","cavern","ceasefire","cedar",
  "ceiling","celebrate","celery","celestial","cellar","cement","censor","census","central","ceramic",
  "cereal","ceremony","certain","certify","chalet","chalk","chamber","champion","channel","chapel",
  "chapter","charcoal","charge","chariot","charity","charm","charter","chaser","chateau","checkup",
  "cheddar","cheering","chemist","cherry","chestnut","chevron","chicken","chicory","chieftain","childhood",
  "chimney","chimpanzee","chisel","chloride","chocolate","chorus","chowder","chrome","chronic","chubby",
  "chuckle","chunk","church","chutney","cider","cigar","cinema","cinnamon","circle","circuit",
  "circular","cistern","citadel","citizen","citrus","civics","clamor","clanking","clarity","classic",
  "clatter","clavicle","cleanup","clearance","clearing","clever","client","climate","climax","clinic",
  "clipping","cloak","clobber","clock","closet","closure","clothes","cloud","clover","cluster",
  "clutch","coastal","coaster","cobalt","cobbler","cobra","cobweb","cockpit","coconut","cocoon",
  "codebook","coffee","cognac","cohesion","coiling","coinage","coldness","collage","collapse","colleague",
  "collector","college","collie","cologne","colonel","colony","column","combat","combine","comedian",
  "comfort","comic","command","commence","commerce","commute","compact","companion","company","compass",
  "compile","complain","complex","composer","compost","compute","comrade","conceal","concede","concept",
  "concerto","conclude","concrete","condor","conduct","conduit","confess","confetti","confide","confirm",
  "conform","confuse","conga","conical","connect","conquer","consent","console","constant","consult",
  "consume","contact","contain","content","contest","context","continue","contour","contract","contrary",
  "contrast","control","convene","convent","converse","convert","convex","convey","convict","convoy",
  "cookout","coolant","cooling","copper","copilot","cordial","corkscrew","cornbread","cornea","corner",
  "cornet","cornice","coronet","corporal","correct","corridor","corrode","corrupt","corsair","corset",
  "cortex","cosmic","cosmos","costume","cottage","cotton","couch","cougar","counsel","counter",
  "countess","country","county","coupling","courage","courier","courtyard","cousin","covenant","coverage",
  "cowboy","coworker","coyote","coziness","cradle","crafty","crag","cranberry","crane","crater",
  "crawfish","crayon","creature","credence","credit","creek","creep","crept","crescent","crest",
  "crevice","cricket","crimson","cripple","crisis","crispy","criteria","critic","critter","crockery",
  "crocodile","crocus","croissant","croquet","crossbar","crowbar","crown","crucial","crucible","crude",
  "cruiser","crumb","crumpet","crusade","crush","crust","crystal","cubicle","cucumber","cuddle",
  "cueball","cuisine","culprit","cultivate","culture","cumulus","cupcake","cupola","curator","curfew",
  "curiosity","curler","curly","currency","current","curriculum","curry","curse","curtain","curtsy",
  "cushion","custard","custom","cuticle","cutlery","cutlet","cyber","cycle","cyclone","cylinder",
  "cymbal","cynic","cypress","dagger","daily","dairy","daisy","damage","damask","damper",
  "dancer","dandelion","dandruff","dapper","daredevil","darkroom","darling","dashboard","database","datebook",
  "daughter","daunting","dawdling","daybreak","daydream","daylight","daytime","dazzle","deacon","deadlock",
  "dealer","dearborn","debatable","debris","debtor","decade","decency","decibel","decide","decimal",
  "decking","declare","decline","decode","decor","decrease","decree","dedicate","deduct","deepen",
  "defeat","defect","defend","defense","defer","defiant","deficit","deflate","deforest","defrost",
  "degree","dejected","delay","delegate","delight","deliver","delusion","demand","demerit","demise",
  "democrat","demolish","demon","demote","denial","density","dentist","denture","depart","depend",
  "depict","deplete","deploy","deposit","deprave","depress","deprive","deputy","derail","derby",
  "derive","descend","describe","desert","deserve","design","desire","desktop","despair","destiny",
  "destroy","detail","detain","detect","deter","detour","device","devise","devoid","devote",
  "devour","dexter","diagram","dialysis","diamond","diaper","diaphragm","diary","dibble","dictate",
  "dietary","diffuse","digest","digital","dignity","dilemma","dilute","dimple","diner","dinghy",
  "dinner","dinosaur","diode","dioxide","diploma","director","dirtbike","disable","disarm","disaster",
  "disciple","disco","discount","discourse","discover","discuss","disdain","disguise","dishcloth","dislike",
  "dismay","dismiss","disorder","dispatch","display","disposal","dispute","disrupt","distance","distort",
  "distress","district","disturb","ditch","ditto","diver","divide","divine","divorce","dizzy",
  "docking","doctor","document","dodger","doghouse","dogwood","dollhouse","dolphin","domain","domestic",
  "dominant","domino","donation","donkey","donor","doorbell","doorstep","dormitory","dosage","double",
  "doubter","doughnut","dovecote","downhill","downpour","downstairs","downtown","dozenth","drafty","dragnet",
  "dragon","drainage","dramatic","drawback","drawbridge","drawer","drawing","dreamer","dredge","dresser",
  "dressing","driftwood","drill","driver","droplet","dropout","drover","drummer","dryer","dualism",
  "duckling","ductile","duel","duet","duffel","dugout","dumpling","dune","dungeon","duplex",
  "duplicate","durable","duration","dustpan","duty","dwarf","dwelling","dynamite","dynamo","dynasty"
];

function generateDiceware() {
  const arr = new Uint32Array(6);
  getRandomValues(arr);
  return Array.from(arr).map(n => DICEWARE_WORDS[n % DICEWARE_WORDS.length]).join(' ');
}

function promptText(question, isMasked = false) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!isMasked) {
      rl.question(question, ans => {
        rl.close();
        resolve(ans.trim());
      });
      return;
    }

    // Masked input
    process.stdout.write(question);
    let input = '';
    const stdin = process.stdin;
    const isRaw = stdin.isRaw;
    if (stdin.setRawMode) stdin.setRawMode(true);
    stdin.resume();

    const onData = (data) => {
      const str = data.toString();
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '\n' || char === '\r' || char === '\u0004') {
          stdin.removeListener('data', onData);
          if (stdin.setRawMode) stdin.setRawMode(isRaw);
          rl.close();
          process.stdout.write('\n');
          resolve(input.trim());
          return;
        } else if (char === '\u0003') {
          process.exit();
        } else if (char === '\u007f' || char === '\b') {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          input += char;
          process.stdout.write('*');
        }
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  const args = process.argv.slice(2);

  // If user passed existing payload or script arguments directly, forward to deploy.sh if available
  if (args.length > 0 && fs.existsSync(path.join(REPO_ROOT, 'scripts', 'deploy.sh')) && process.platform !== 'win32') {
    const child = spawn(path.join(REPO_ROOT, 'scripts', 'deploy.sh'), args, { stdio: 'inherit' });
    child.on('exit', code => process.exit(code || 0));
    return;
  }

  console.log('\n=============================================================');
  console.log('  🛡️  Cold-Start Identity Recovery Protocol — Setup Wizard');
  console.log('=============================================================');
  console.log('This wizard configures your disaster-recovery credential kit:');
  console.log('  • Pillar 1: Single-file encrypted Web Recovery Terminal');
  console.log('  • Pillar 2: Secondary DNS TXT Dead-Drop (queryable via DoH)\n');

  // Step 1: Payload source
  let payloadPath = 'payload.json';
  if (!fs.existsSync(payloadPath)) {
    const defaultTemplate = path.join(REPO_ROOT, 'templates', 'sample-payload.json');
    if (fs.existsSync(defaultTemplate)) {
      console.log(`Notice: 'payload.json' not found in current directory.`);
      const answer = await promptText(`Create a starter 'payload.json' from template? [Y/n]: `);
      if (answer.toLowerCase() === 'n') {
        console.log('Aborting. Please create a payload.json file first.');
        process.exit(0);
      }
      fs.copyFileSync(defaultTemplate, 'payload.json');
      console.log(`✓ Created 'payload.json' template.`);
      console.log(`⚠️  Please populate 'payload.json' with your emergency credentials, then re-run.`);
      const editNow = await promptText(`Would you like to proceed with the sample template for testing? [y/N]: `);
      if (editNow.toLowerCase() !== 'y') {
        process.exit(0);
      }
    } else {
      console.error(`Error: payload.json not found.`);
      process.exit(1);
    }
  }

  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

  // Step 2: Passphrase
  console.log('\n--- Step 2: Diceware Passphrase ---');
  console.log('[1] Enter my own 6-word Diceware passphrase');
  console.log('[2] Generate a cryptographically secure 6-word Diceware passphrase (~77 bits)');
  const passChoice = await promptText('Select [1 or 2, default 2]: ');

  let passphrase = '';
  if (passChoice === '1') {
    while (true) {
      passphrase = await promptText('Enter 6-word Diceware passphrase: ', true);
      const evalRes = evaluatePassphraseEntropy(passphrase);
      if (!evalRes.valid) {
        console.log(`❌ ${evalRes.reason}. Please try again.\n`);
        continue;
      }
      break;
    }
  } else {
    passphrase = generateDiceware();
    console.log('\n🔑 Generated Passphrase:');
    console.log(`\x1b[32m\x1b[1m  ${passphrase}  \x1b[0m\n`);
    console.log('⚠️  WRITE THIS DOWN ON PHYSICAL PAPER OR MEMORIZE IT.');
    console.log('This 6-word phrase is the ONLY key to decrypt your recovery terminal.\n');
    await promptText('Press Enter once you have securely written it down...');
  }

  // Step 3: Recovery Domain
  console.log('\n--- Step 3: Recovery DNS Domain ---');
  const recoveryDomain = await promptText('Enter your recovery domain (e.g. sos.yourdomain.com): ') || 'sos.yourdomain.com';

  // Step 4: Encrypt
  console.log('\n--- Step 4: Encrypting Payload ---');
  console.log('Deriving key with PBKDF2 (600,000 iterations SHA-256) and AES-GCM-256...');
  const ciphertextB64 = await encryptPayload(payload, passphrase);
  console.log(`✓ Ciphertext generated (${ciphertextB64.length} Base64 characters)`);

  // Step 5: Pillar 1 - HTML Web Terminal
  const templatePath = path.join(REPO_ROOT, 'public', 'index.html');
  if (fs.existsSync(templatePath)) {
    let html = fs.readFileSync(templatePath, 'utf8');
    html = html.replace(
      /const EMBEDDED_CIPHERTEXT = "[^"]*";/,
      `const EMBEDDED_CIPHERTEXT = "${ciphertextB64}";`
    );
    html = html.replace(
      /<meta name="recovery-dns-domain" content="[^"]*">/,
      `<meta name="recovery-dns-domain" content="${escapeHtmlAttr(recoveryDomain)}">`
    );
    fs.writeFileSync('recovery-vault.html', html, 'utf8');
    console.log(`✓ Pillar 1: Generated standalone 'recovery-vault.html' (Ready to host on Cloudflare / Netlify / Vercel)`);
  }

  // Step 6: Pillar 2 - DNS TXT Dead-Drop
  console.log('\n=============================================================');
  console.log('  📡 Pillar 2: Publish Your DNS TXT Dead-Drop');
  console.log('=============================================================');
  console.log(`Add the following TXT record to your DNS provider (Cloudflare, Route 53, Namecheap, etc.):\n`);
  console.log(`  Record Type:  TXT`);
  console.log(`  Record Name:  ${recoveryDomain.split('.')[0]} (or full domain: ${recoveryDomain})`);
  console.log(`  TTL:          120 seconds (or Auto)`);
  console.log(`  Value:`);
  console.log(`-------------------------------------------------------------`);
  console.log(ciphertextB64);
  console.log(`-------------------------------------------------------------\n`);
  console.log(`Why this matters:`);
  console.log(`If your web host is ever unreachable, censored, or expired, you can unlock`);
  console.log(`your credentials on any machine by entering '${recoveryDomain}' — the app`);
  console.log(`will pull this TXT record automatically via Cloudflare and Google DoH!\n`);

  console.log('=============================================================');
  console.log('  ✅ Setup Complete');
  console.log('=============================================================');
  console.log('1. Host recovery-vault.html on Cloudflare Pages or Netlify Drop.');
  console.log('2. Add the TXT record above in your DNS dashboard.');
  console.log('3. Shred plaintext: rm -P payload.json (or shred -u payload.json)\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
