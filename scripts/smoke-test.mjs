import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function readFile(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

const removedPaths = [
  "src/components/game/AuthModal.tsx",
  "src/components/game/AccountModal.tsx",
  "src/components/game/UserProfileModal.tsx",
  "src/components/game/LowCreditModal.tsx",
  "src/components/game/ResetPasswordModal.tsx",
  "src/components/game/SharePanel.tsx",
  "src/hooks/useCredits.ts",
  "src/app/api/credits/consume/route.ts",
  "src/app/api/credits/daily-bonus/route.ts",
  "src/app/api/credits/referral/route.ts",
  "src/app/api/stripe/payment-link/route.ts",
  "src/app/api/stripe/webhook/route.ts",
];

for (const relPath of removedPaths) {
  check(!exists(relPath), `Expected removed file to be absent: ${relPath}`);
}

check(exists("src/lib/local-llm-settings.ts"), "Missing local LLM settings file.");
check(
  exists("src/components/game/LocalModelSettingsModal.tsx"),
  "Missing LocalModelSettingsModal component."
);

if (exists("src/app/api/chat/route.ts")) {
  const chatRoute = readFile("src/app/api/chat/route.ts");
  check(
    chatRoute.includes("chat/completions"),
    "Chat proxy should target /chat/completions."
  );
} else {
  errors.push("Missing /api/chat route.");
}

if (exists("src/hooks/useCustomCharacters.ts")) {
  const customCharacters = readFile("src/hooks/useCustomCharacters.ts");
  check(
    customCharacters.includes("wolfcha_custom_characters"),
    "Custom characters should use localStorage key wolfcha_custom_characters."
  );
} else {
  errors.push("Missing useCustomCharacters.ts.");
}

if (exists("src/lib/supabase.ts")) {
  const supabaseFile = readFile("src/lib/supabase.ts");
  check(
    !supabaseFile.includes("Missing Supabase env vars"),
    "supabase.ts should not throw when env vars are missing."
  );
} else {
  errors.push("Missing supabase.ts.");
}

if (exists("src/app/landing/LandingContent.tsx")) {
  const landing = readFile("src/app/landing/LandingContent.tsx");
  check(
    !landing.includes("profile center"),
    "Landing FAQ still references profile center."
  );
} else {
  errors.push("Missing LandingContent.tsx.");
}

if (errors.length > 0) {
  console.error("Smoke test failed:");
  for (const message of errors) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log("Smoke test passed.");
