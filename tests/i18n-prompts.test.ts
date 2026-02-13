import { test } from "node:test";
import assert from "node:assert/strict";
import { getI18n } from "@/i18n/translator";

test("daySpeech user prompt renders without ICU errors (zh/en)", () => {
  const zh = getI18n("zh").t("prompts.daySpeech.user", {
    gameContext: "GC",
    todayTranscript: "TT",
    selfSpeech: "SS",
    phaseHintSection: "",
    speakOrderHint: "SO",
  });
  const en = getI18n("en").t("prompts.daySpeech.user", {
    gameContext: "GC",
    todayTranscript: "TT",
    selfSpeech: "SS",
    phaseHintSection: "",
    speakOrderHint: "SO",
  });

  assert.notEqual(zh, "prompts.daySpeech.user");
  assert.notEqual(en, "prompts.daySpeech.user");
  assert.match(zh, /GC/);
  assert.match(en, /GC/);
});

test("publicClaims system prompt renders without ICU errors (zh/en)", () => {
  const zh = getI18n("zh").t("gameMaster.publicClaims.systemPrompt", {});
  const en = getI18n("en").t("gameMaster.publicClaims.systemPrompt", {});

  assert.notEqual(zh, "gameMaster.publicClaims.systemPrompt");
  assert.notEqual(en, "gameMaster.publicClaims.systemPrompt");
});
