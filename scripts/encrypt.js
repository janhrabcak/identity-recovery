#!/usr/bin/env node
/**
 * Cold-Start Identity Recovery Protocol - Offline Encryption Utility
 * Specification: SPEC.md
 *
 * Cryptography:
 *   - Cipher: AES-GCM-256 (12-byte IV)
 *   - KDF: PBKDF2 with SHA-256, 600,000 iterations, 16-byte random salt
 *   - Output format: Base64([16-byte salt][12-byte IV][ciphertext+tag])
 *   - Strict zero-dependency: uses built-in Node 18+ WebCrypto (crypto.subtle)
 */

import { subtle, getRandomValues } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const PBKDF2_ITERATIONS = 600000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

/**
 * Escapes HTML attributes to prevent template injection.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtmlAttr(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Normalizes a passphrase: trims whitespace, normalizes Unicode to NFKC, and collapses multiple spaces into a single space.
 * @param {string} passphrase 
 * @returns {string}
 */
export function normalizePassphrase(passphrase) {
  if (!passphrase || typeof passphrase !== 'string') return '';
  return passphrase.trim().normalize('NFKC').replace(/\s+/g, ' ');
}

/**
 * Evaluates the entropy and complexity of a Diceware passphrase.
 * Enforces >= 6 words (minimum), recommended >= 8 words (~80 bits entropy with built-in list),
 * >= 20 characters, >= 4 unique words, and min 2 chars per token.
 * @param {string} passphrase 
 * @returns {{ valid: boolean, reason?: string, wordCount: number, normalized?: string, strength?: 'valid'|'strong' }}
 */
export function evaluatePassphraseEntropy(passphrase) {
  if (!passphrase || typeof passphrase !== 'string' || passphrase.trim().length === 0) {
    return { valid: false, reason: 'Passphrase must be a non-empty string.', wordCount: 0 };
  }
  const normalized = normalizePassphrase(passphrase);
  const words = normalized.split(' ').filter(w => w.length > 0);

  if (words.length < 6) {
    return {
      valid: false,
      reason: `Insufficient words (${words.length}/6). A minimum 6-word Diceware phrase is required (8 words recommended with built-in dictionary).`,
      wordCount: words.length
    };
  }

  if (normalized.length < 20) {
    return {
      valid: false,
      reason: `Passphrase too short (${normalized.length} chars). Minimum 20 characters required.`,
      wordCount: words.length
    };
  }

  const unique = new Set(words.map(w => w.toLowerCase()));
  if (unique.size < 4) {
    return {
      valid: false,
      reason: 'Too many repeated words. Use distinct Diceware words to maintain entropy.',
      wordCount: words.length
    };
  }

  if (words.some(w => w.length < 2)) {
    return {
      valid: false,
      reason: 'Passphrase contains single-letter words. Diceware words should each be at least 2 characters.',
      wordCount: words.length
    };
  }

  return {
    valid: true,
    normalized,
    wordCount: words.length,
    strength: words.length >= 8 ? 'strong' : 'valid'
  };
}

/**
 * Derives an AES-GCM-256 key from a passphrase and salt using PBKDF2-SHA-256.
 * Automatically normalizes passphrase whitespace and Unicode before derivation.
 * @param {string} passphrase 
 * @param {Uint8Array} salt 
 * @param {string[]} usages - e.g. ['encrypt'] or ['decrypt']
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(passphrase, salt, usages) {
  const enc = new TextEncoder();
  const normalized = normalizePassphrase(passphrase);
  const passphraseBytes = enc.encode(normalized);

  const keyMaterial = await subtle.importKey(
    'raw',
    passphraseBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await subtle.deriveKey(
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

/**
 * Encrypts a payload string/object with a passphrase.
 * @param {string|object} payload - JSON string or object matching SPEC schema
 * @param {string} passphrase - Diceware passphrase
 * @param {object} [options] - Optional settings
 * @param {boolean} [options.allowLowEntropy=false] - Bypass entropy validation
 * @returns {Promise<string>} Base64 encoded [salt (16b)][iv (12b)][ciphertext+tag]
 */
export async function encryptPayload(payload, passphrase, options = {}) {
  const allowLowEntropy = options.allowLowEntropy === true;
  const entropy = evaluatePassphraseEntropy(passphrase);
  if (!entropy.valid && !allowLowEntropy) {
    throw new Error(`Passphrase validation failed: ${entropy.reason}`);
  }

  let jsonString;
  if (typeof payload === 'object') {
    jsonString = JSON.stringify(payload, null, 2);
  } else if (typeof payload === 'string') {
    // Validate JSON format
    JSON.parse(payload);
    jsonString = payload;
  } else {
    throw new Error('Payload must be a JSON string or object.');
  }

  const salt = getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt, ['encrypt']);

  const enc = new TextEncoder();
  const plaintextBytes = enc.encode(jsonString);

  const ciphertextBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintextBytes
  );

  // Zero-fill plaintext buffer from memory
  plaintextBytes.fill(0);

  const ciphertextBytes = new Uint8Array(ciphertextBuffer);
  const combined = new Uint8Array(SALT_BYTES + IV_BYTES + ciphertextBytes.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_BYTES);
  combined.set(ciphertextBytes, SALT_BYTES + IV_BYTES);

  return Buffer.from(combined).toString('base64');
}

/**
 * Decrypts a base64 ciphertext using the passphrase.
 * @param {string} base64Ciphertext 
 * @param {string} passphrase 
 * @returns {Promise<object>} Parsed payload object
 */
export async function decryptPayload(base64Ciphertext, passphrase) {
  if (!passphrase || typeof passphrase !== 'string' || passphrase.trim().length === 0) {
    throw new Error('Passphrase must be a non-empty string.');
  }

  const cleanB64 = base64Ciphertext.trim();
  const combined = Buffer.from(cleanB64, 'base64');

  if (combined.byteLength < SALT_BYTES + IV_BYTES + 16) {
    throw new Error('Ciphertext payload is too short or malformed.');
  }

  const salt = combined.subarray(0, SALT_BYTES);
  const iv = combined.subarray(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = combined.subarray(SALT_BYTES + IV_BYTES);

  const key = await deriveKey(passphrase, salt, ['decrypt']);

  try {
    const decryptedBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decryptedBuffer));
  } catch (err) {
    throw new Error('Decryption failed. Incorrect passphrase or corrupted payload.');
  }
}

/**
 * Creates a sample payload object matching SPEC.md
 */
export function createSamplePayload(isFresh = true) {
  const now = new Date();
  let generatedAt;
  if (isFresh) {
    // Generated 5 days ago
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    generatedAt = fiveDaysAgo.toISOString();
  } else {
    // Generated 7 months ago (stale)
    const sevenMonthsAgo = new Date(now.getTime() - 210 * 24 * 60 * 60 * 1000);
    generatedAt = sevenMonthsAgo.toISOString();
  }

  return {
    metadata: {
      generatedAt: generatedAt,
      staleAfterMonths: 6,
      canaryCode: "12345678"
    },
    items: [
      {
        id: "pm-1",
        type: "password_manager",
        title: "Root of Trust: 1Password",
        service: "1Password",
        email: "user@example.com",
        secretKey: "A3-XXXXXX-XXXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
        hint: "Personal Emergency Vault",
        instructions: "1. Go to https://my.1password.com in a clean browser tab.\n2. Paste email and secret key.\n3. Enter memorized master password."
      },
      {
        id: "codes-google",
        type: "backup_codes",
        title: "Google 2SV Backup Codes",
        service: "Google",
        codes: [
          "23456789",
          "34567890",
          "45678901",
          "56789012",
          "67890123",
          "78901234",
          "89012345",
          "90123456",
          "01234567",
          "12345670"
        ]
      },
      {
        id: "totp-1",
        type: "totp_group",
        title: "Live Authenticator (TOTP)",
        seeds: {
          "Google": "JBSWY3DPEHPK3PXP",
          "GitHub": "KVKFKRCPI5UHIZKS"
        }
      },
      {
        id: "notes-1",
        type: "notes",
        title: "Emergency Instructions & Contacts",
        content: "Emergency contact: Alice (+1-555-0199). Recovery protocol: Recover primary email first using backup codes, then sign in to password manager."
      }
    ],
    onePassword: {
      email: "user@example.com",
      secretKey: "A3-XXXXXX-XXXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
      accountKeyHint: "Personal Emergency Vault"
    },
    googleBackupCodes: [
      "23456789",
      "34567890",
      "45678901",
      "56789012",
      "67890123",
      "78901234",
      "89012345",
      "90123456",
      "01234567",
      "12345670"
    ],
    notes: "Emergency contact: Alice (+1-555-0199). Recovery protocol: Recover primary email first using backup codes, then sign in to password manager."
  };
}

/**
 * Prompts user on CLI
 */
function promptUser(query, hideInput = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    if (!hideInput) {
      rl.question(query, (ans) => {
        rl.close();
        resolve(ans);
      });
    } else {
      // Basic masked prompt
      process.stdout.write(query);
      let input = '';
      const onData = (data) => {
        const str = data.toString();
        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          if (char === '\n' || char === '\r' || char === '\u0004') {
            process.stdin.removeListener('data', onData);
            process.stdin.setRawMode(false);
            rl.close();
            process.stdout.write('\n');
            resolve(input);
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

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', onData);
      } else {
        rl.question('', (ans) => {
          rl.close();
          resolve(ans);
        });
      }
    }
  });
}

function printUsage() {
  console.log(`
Cold-Start Identity Recovery Protocol - Encryption CLI

Usage:
  node encrypt.js [options]

Options:
  -i, --input <file>         Path to JSON payload file to encrypt
  -p, --passphrase <phrase>  Diceware passphrase (prompted securely if omitted)
                             Prefer ENCRYPT_PASSPHRASE env var to avoid process list exposure
  -o, --output <file>        Output file for base64 ciphertext (prints to stdout if omitted)
  -d, --domain <domain>      Recovery DNS domain name (embeds into recovery-dns-domain meta tag)
  --allow-low-entropy        Allow passphrases that do not meet 6-word Diceware entropy rules
  --embed-html <file>        Inject encrypted base64 payload into specified index.html
  --sample [fresh|stale]     Generate a sample payload.json in current directory
  --decrypt <base64>         Decrypt and display a ciphertext payload
  -h, --help                 Show this help screen

Examples:
  node encrypt.js --sample fresh
  node encrypt.js -i sample-payload.json -p "correct horse battery staple zebra guitar"
  node encrypt.js -i sample-payload.json --embed-html index.html
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('-h') || args.includes('--help')) {
    printUsage();
    return;
  }

  const allowLowEntropy = args.includes('--allow-low-entropy');

  // Handle sample generation
  const sampleIdx = args.findIndex(a => a === '--sample');
  if (sampleIdx !== -1) {
    const type = args[sampleIdx + 1] === 'stale' ? 'stale' : 'fresh';
    const sample = createSamplePayload(type === 'fresh');
    const targetDir = fs.existsSync(path.resolve(process.cwd(), 'templates'))
      ? path.resolve(process.cwd(), 'templates')
      : process.cwd();
    const outPath = path.resolve(targetDir, 'sample-payload.json');
    fs.writeFileSync(outPath, JSON.stringify(sample, null, 2), 'utf8');
    console.log(`✓ Sample payload (${type}) written to: ${outPath}`);
    return;
  }

  // Handle Decryption check
  const decryptIdx = args.findIndex(a => a === '--decrypt');
  if (decryptIdx !== -1) {
    const b64 = args[decryptIdx + 1];
    if (!b64) {
      console.error('Error: Missing base64 ciphertext after --decrypt');
      process.exit(1);
    }
    const pIdx = args.findIndex(a => a === '-p' || a === '--passphrase');
    let pass = pIdx !== -1 ? args[pIdx + 1] : null;
    if (!pass) {
      pass = await promptUser('Enter passphrase: ', true);
    }
    try {
      const decrypted = await decryptPayload(b64, pass);
      console.log('\n✓ Decryption successful:\n', JSON.stringify(decrypted, null, 2));
    } catch (err) {
      console.error(`\n✗ ${err.message}`);
      process.exit(1);
    }
    return;
  }

  // Handle Encryption
  let inputPath = null;
  const inputIdx = args.findIndex(a => a === '-i' || a === '--input');
  if (inputIdx !== -1) {
    inputPath = args[inputIdx + 1];
  }

  let payloadContent = null;
  if (inputPath) {
    if (!fs.existsSync(inputPath)) {
      console.error(`Error: File not found: ${inputPath}`);
      process.exit(1);
    }
    payloadContent = fs.readFileSync(inputPath, 'utf8');
  } else if (!process.stdin.isTTY) {
    // Read from pipe / stdin
    payloadContent = fs.readFileSync(0, 'utf-8');
  } else {
    // If no input file specified, check if payload.json or templates/sample-payload.json exists
    if (fs.existsSync(path.resolve(process.cwd(), 'payload.json'))) {
      inputPath = path.resolve(process.cwd(), 'payload.json');
      payloadContent = fs.readFileSync(inputPath, 'utf8');
      console.log(`Using existing payload file: ${inputPath}`);
    } else if (fs.existsSync(path.resolve(process.cwd(), 'templates/sample-payload.json'))) {
      inputPath = path.resolve(process.cwd(), 'templates/sample-payload.json');
      payloadContent = fs.readFileSync(inputPath, 'utf8');
      console.log(`Using existing template file: ${inputPath}`);
    } else {
      console.log('No input file provided. Creating fresh sample payload...');
      payloadContent = JSON.stringify(createSamplePayload(true), null, 2);
    }
  }

  // Validate JSON schema
  let parsedPayload;
  try {
    parsedPayload = JSON.parse(payloadContent);
  } catch (e) {
    console.error('Error: Payload is not valid JSON:', e.message);
    process.exit(1);
  }

  // Validate recommended fields
  if (!parsedPayload.items && (!parsedPayload.onePassword || !parsedPayload.googleBackupCodes)) {
    console.warn('Warning: Payload missing recommended fields (items or legacy onePassword/googleBackupCodes).');
  }

  // Passphrase: prefer env var (avoids exposure in process list), then -p flag, then interactive prompt
  const pIdx = args.findIndex(a => a === '-p' || a === '--passphrase');
  let pass = process.env.ENCRYPT_PASSPHRASE || (pIdx !== -1 ? args[pIdx + 1] : null);
  if (pass && pIdx !== -1 && !process.env.ENCRYPT_PASSPHRASE) {
    console.warn('Warning: Passphrase passed via CLI argument is visible in process list. Consider using ENCRYPT_PASSPHRASE env var.');
  }
  if (!pass) {
    while (true) {
      pass = await promptUser('Enter Diceware passphrase (min 6 words, 8 recommended): ', true);
      if (!pass || pass.trim().length === 0) {
        console.error('Error: Passphrase cannot be empty.');
        continue;
      }
      const entropy = evaluatePassphraseEntropy(pass);
      if (!entropy.valid && !allowLowEntropy) {
        console.error(`\n✗ Entropy warning: ${entropy.reason}`);
        console.error('Please enter a valid Diceware passphrase (minimum 6 words, 8 recommended for ~80 bits entropy).\n');
        continue;
      }
      break;
    }
  } else {
    const entropy = evaluatePassphraseEntropy(pass);
    if (!entropy.valid && !allowLowEntropy) {
      console.error(`\n✗ Error: ${entropy.reason}`);
      console.error('To override entropy validation, pass --allow-low-entropy.');
      process.exit(1);
    }
  }

  console.log(`Deriving key (PBKDF2 SHA-256, ${PBKDF2_ITERATIONS.toLocaleString()} iterations) and encrypting AES-GCM-256...`);
  const t0 = Date.now();
  const ciphertextB64 = await encryptPayload(parsedPayload, pass, { allowLowEntropy });
  const duration = Date.now() - t0;
  console.log(`✓ Encryption complete in ${duration}ms (${ciphertextB64.length} base64 chars).`);

  // Handle Embed into HTML
  const embedIdx = args.findIndex(a => a === '--embed-html');
  if (embedIdx !== -1) {
    let targetHtml = args[embedIdx + 1];
    if (!targetHtml) {
      targetHtml = fs.existsSync(path.resolve(process.cwd(), 'public/index.html'))
        ? 'public/index.html'
        : 'index.html';
    }
    const htmlPath = path.resolve(process.cwd(), targetHtml);
    if (!fs.existsSync(htmlPath)) {
      console.error(`Error: Target HTML file not found: ${htmlPath}`);
      process.exit(1);
    }
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const placeholderRegex = /const\s+EMBEDDED_CIPHERTEXT\s*=\s*["'][^"']*["'];/;
    if (placeholderRegex.test(htmlContent)) {
      htmlContent = htmlContent.replace(
        placeholderRegex,
        `const EMBEDDED_CIPHERTEXT = "${ciphertextB64}";`
      );

      // Update metadata meta tags if present in parsed payload
      if (parsedPayload.metadata) {
        if (parsedPayload.metadata.generatedAt) {
          const genMetaRegex = /<meta\s+name=["']vault-generated-at["']\s+content=["'][^"']*["']\s*\/?>/i;
          if (genMetaRegex.test(htmlContent)) {
            htmlContent = htmlContent.replace(
              genMetaRegex,
              `<meta name="vault-generated-at" content="${escapeHtmlAttr(parsedPayload.metadata.generatedAt)}">`
            );
          }
        }
        if (parsedPayload.metadata.staleAfterMonths !== undefined) {
          const staleMetaRegex = /<meta\s+name=["']vault-stale-after-months["']\s+content=["'][^"']*["']\s*\/?>/i;
          if (staleMetaRegex.test(htmlContent)) {
            htmlContent = htmlContent.replace(
              staleMetaRegex,
              `<meta name="vault-stale-after-months" content="${escapeHtmlAttr(parsedPayload.metadata.staleAfterMonths)}">`
            );
          }
        }
      }

      // Handle optional recovery DNS domain update
      const domainIdx = args.findIndex(a => a === '-d' || a === '--domain');
      const targetDomain = domainIdx !== -1 ? args[domainIdx + 1] : process.env.RECOVERY_DOMAIN;
      if (targetDomain) {
        const domainMetaRegex = /<meta\s+name=["']recovery-dns-domain["']\s+content=["'][^"']*["']\s*\/?>/i;
        if (domainMetaRegex.test(htmlContent)) {
          htmlContent = htmlContent.replace(
            domainMetaRegex,
            `<meta name="recovery-dns-domain" content="${escapeHtmlAttr(targetDomain.trim())}">`
          );
        }
      }

      fs.writeFileSync(htmlPath, htmlContent, 'utf8');
      console.log(`✓ Injected encrypted payload and metadata into ${htmlPath}`);
    } else {
      console.warn(`Warning: Could not find 'const EMBEDDED_CIPHERTEXT = "...";' in ${htmlPath}`);
    }
  }

  // Handle file output
  const outIdx = args.findIndex(a => a === '-o' || a === '--output');
  if (outIdx !== -1) {
    const outPath = path.resolve(process.cwd(), args[outIdx + 1]);
    fs.writeFileSync(outPath, ciphertextB64, 'utf8');
    console.log(`✓ Base64 ciphertext written to: ${outPath}`);
  } else if (embedIdx === -1) {
    console.log('\n--- BASE64 ENCRYPTED PAYLOAD ---');
    console.log(ciphertextB64);
    console.log('--------------------------------\n');
  }
}

// Only run CLI when invoked directly
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
