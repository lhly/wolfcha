import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTranslator } from "next-intl";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function readFile(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function readJson(relPath) {
  return JSON.parse(readFile(relPath));
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function checkDoesNotThrow(fn, message) {
  try {
    fn();
  } catch (error) {
    errors.push(`${message}: ${error?.message ?? String(error)}`);
  }
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
check(
  readFile("src/components/game/LocalModelSettingsModal.tsx").includes("modelTags"),
  "LocalModelSettingsModal should manage modelTags."
);

check(exists("src/lib/sqlite.ts"), "Missing sqlite helper.");
check(
  readFile("src/lib/sqlite.ts").includes("last_checkpoint_state_json"),
  "Missing game_history checkpoint column"
);
check(
  readFile("src/lib/sqlite.ts").includes("models_json"),
  "Missing llm_config models_json column"
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
    customCharacters.includes("/api/custom-characters"),
    "Custom characters should use API endpoint."
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

if (exists("src/lib/llm.ts")) {
  const llmFile = readFile("src/lib/llm.ts");
  check(
    !llmFile.includes("getProviderForModel("),
    "llm.ts should not reference getProviderForModel."
  );
} else {
  errors.push("Missing llm.ts.");
}
check(
  readFile("src/lib/character-generator.ts").includes("getSelectedModels"),
  "sampleModelRefs should use getSelectedModels."
);

const apiFiles = [
  "src/app/api/local-config/route.ts",
  "src/app/api/llm-models/route.ts",
  "src/app/api/game-state/route.ts",
  "src/app/api/custom-characters/route.ts",
  "src/app/api/game-history/route.ts",
  "src/app/api/meta/route.ts",
];
for (const file of apiFiles) {
  check(exists(file), `Missing API route: ${file}`);
}

check(
  readFile("src/app/api/game-history/route.ts").includes("checkpoint"),
  "Missing checkpoint action"
);
check(
  readFile("src/app/api/local-config/route.ts").includes("models_json"),
  "local-config route should handle models_json"
);
check(
  readFile("src/app/api/llm-models/route.ts").includes("/models"),
  "llm-models route should call /models"
);
check(
  readFile("src/lib/game-history.ts").includes("checkpointGameHistory"),
  "Missing game history checkpoint helper"
);
check(
  readFile("src/hooks/useGameLogic.ts").includes("startGameHistory"),
  "Missing game history integration"
);
check(
  exists("src/app/api/auth/totp/route.ts"),
  "Missing TOTP auth route"
);
check(
  readFile("src/middleware.ts").includes("totp"),
  "Middleware should protect with totp cookie"
);
check(
  readFile("src/lib/totp.ts").includes("TOTP_DIGITS"),
  "totp.ts should read TOTP_DIGITS."
);
check(
  readFile("src/lib/totp.ts").includes("TOTP_ALGORITHM"),
  "totp.ts should read TOTP_ALGORITHM."
);
check(
  readFile("src/lib/totp.ts").includes("createHmacKeyRaw"),
  "totp.ts should use raw HMAC key derivation."
);
check(
  readFile(".env.example").includes("TOTP_DIGITS"),
  "Missing TOTP_DIGITS in .env.example."
);
check(
  readFile(".env.example").includes("TOTP_ALGORITHM"),
  "Missing TOTP_ALGORITHM in .env.example."
);

const pageFile = readFile("src/app/page.tsx");
check(!pageFile.includes("\"use client\""), "page.tsx should be server component.");
check(
  pageFile.includes("async function Page"),
  "page.tsx should be async to await cookies()."
);
check(
  pageFile.includes("await cookies("),
  "page.tsx should await cookies()."
);
check(exists("src/app/HomeClient.tsx"), "Missing HomeClient.tsx.");
const welcomeScreenFile = readFile("src/components/game/WelcomeScreen.tsx");
const canConfirmIndex = welcomeScreenFile.indexOf("const canConfirm");
check(canConfirmIndex !== -1, "Missing canConfirm in WelcomeScreen.");
const canConfirmSlice = welcomeScreenFile.slice(canConfirmIndex, canConfirmIndex + 300);
check(
  canConfirmSlice.includes("mounted"),
  "WelcomeScreen should gate canConfirm with mounted to prevent hydration mismatch."
);
check(
  exists("src/components/game/RecentGamesModal.tsx"),
  "Missing RecentGamesModal component"
);
check(
  readFile("src/app/HomeClient.tsx").includes("RecentGamesModal"),
  "HomeClient should use RecentGamesModal"
);
check(
  readFile("src/store/game-machine.ts").includes("game-state-storage"),
  "game-machine should use sqlite storage helper."
);
check(
  readFile("src/hooks/useCustomCharacters.ts").includes("/api/custom-characters"),
  "custom characters should use API"
);
check(
  exists("src/hooks/useLocalStorageMigration.ts"),
  "Missing local storage migration hook"
);
if (exists("src/app/landing/LandingContent.tsx")) {
  const landing = readFile("src/app/landing/LandingContent.tsx");
  check(
    !landing.includes("profile center"),
    "Landing FAQ still references profile center."
  );
} else {
  errors.push("Missing LandingContent.tsx.");
}

check(
  readFile("src/types/game.ts").includes("phaseSpeechSummaries"),
  "GameState should include phaseSpeechSummaries."
);
check(
  readFile("src/lib/prompt-utils.ts").includes("phase_summaries"),
  "prompt-utils should build <phase_summaries> section."
);
check(
  readFile("src/lib/game-master.ts").includes("generatePhaseSpeechSummary"),
  "Missing phase speech summary generator."
);
check(
  readFile("src/hooks/useGameLogic.ts").includes("phaseSpeechSummaries"),
  "Missing phase summaries integration in useGameLogic."
);

const gameLogicFile = readFile("src/hooks/useGameLogic.ts");
const hasRestoredReturnIndex = gameLogicFile.indexOf("if (hasRestoredRef.current) return;");
const inProgressCheckIndex = gameLogicFile.indexOf(
  "if (isGameInProgress(gameState) && gameState.players.length > 0)"
);
const persistedGuardIndex = gameLogicFile.indexOf(
  "if (!isGameInProgress(persistedState) || persistedState.players.length === 0) return;"
);
const firstMarkRestoredIndex = gameLogicFile.indexOf("hasRestoredRef.current = true;");
const secondMarkRestoredIndex = gameLogicFile.indexOf("hasRestoredRef.current = true;", firstMarkRestoredIndex + 1);
check(
  hasRestoredReturnIndex !== -1 &&
    inProgressCheckIndex !== -1 &&
    persistedGuardIndex !== -1 &&
    firstMarkRestoredIndex !== -1 &&
    secondMarkRestoredIndex !== -1 &&
    hasRestoredReturnIndex < inProgressCheckIndex &&
    inProgressCheckIndex < firstMarkRestoredIndex &&
    persistedGuardIndex < secondMarkRestoredIndex,
  "useGameLogic should only mark restored after in-progress state is available."
);
check(
  gameLogicFile.includes("fetchPersistedGameState") && gameLogicFile.includes("hasFetchedRestoreRef"),
  "useGameLogic should attempt a persisted-state fetch fallback when restore check misses."
);
check(
  readFile("src/i18n/messages/zh.json").includes("phaseSpeechSummary"),
  "Missing phase speech summary i18n keys (zh)."
);
check(
  readFile("src/i18n/messages/en.json").includes("phaseSpeechSummary"),
  "Missing phase speech summary i18n keys (en)."
);

const zhMessages = readJson("src/i18n/messages/zh.json");
const enMessages = readJson("src/i18n/messages/en.json");
const zhSystemPrompt = zhMessages?.gameMaster?.phaseSpeechSummary?.systemPrompt;
const enSystemPrompt = enMessages?.gameMaster?.phaseSpeechSummary?.systemPrompt;
const zhT = createTranslator({ locale: "zh", messages: zhMessages });
const enT = createTranslator({ locale: "en", messages: enMessages });
check(
  typeof zhSystemPrompt === "string" && zhSystemPrompt.includes("输出 JSON 格式：'"),
  "i18n zh systemPrompt should quote JSON example to avoid ICU parsing"
);
check(
  typeof enSystemPrompt === "string" && enSystemPrompt.includes("Output JSON: '"),
  "i18n en systemPrompt should quote JSON example to avoid ICU parsing"
);
checkDoesNotThrow(
  () => zhT("gameMaster.phaseSpeechSummary.systemPrompt"),
  "i18n zh systemPrompt should not throw"
);
checkDoesNotThrow(
  () => enT("gameMaster.phaseSpeechSummary.systemPrompt"),
  "i18n en systemPrompt should not throw"
);

if (errors.length > 0) {
  console.error("Smoke test failed:");
  for (const message of errors) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log("Smoke test passed.");
