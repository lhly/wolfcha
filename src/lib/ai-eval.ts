export type VoteDecision = {
  seat?: number;
  reason?: string;
  evidence_tags?: string[];
  counter?: string;
  consistency?: string;
  confidence?: number;
};

export type SpeechDecision = {
  speech?: string[];
  rationale?: {
    evidence_tags?: string[];
    counter?: string;
    consistency?: string;
    confidence?: number;
  };
};

export type EvalResult = { ok: boolean; reasons: string[] };

const ATTACKINESS_KEYWORDS = [
  "攻击性",
  "攻击",
  "情绪",
  "情绪化",
  "语气",
  "态度",
  "咄咄逼人",
  "强硬",
  "激进",
];

const EMPTY_COUNTER_WORDS = new Set(["无", "没有", "暂无", "不知道", "不确定", "无反证"]);

const isNonEmpty = (value?: string) => typeof value === "string" && value.trim().length > 0;

const isLikelyEmptyCounter = (value?: string) => {
  if (!isNonEmpty(value)) return true;
  const trimmed = value.trim();
  return trimmed.length < 2 || EMPTY_COUNTER_WORDS.has(trimmed);
};

const hasEnoughEvidence = (tags?: string[]) => Array.isArray(tags) && tags.length >= 2;

const isAttackinessOnly = (reason?: string, tags?: string[]) => {
  if (!isNonEmpty(reason)) return false;
  const hasAttackKeyword = ATTACKINESS_KEYWORDS.some((k) => reason!.includes(k));
  if (!hasAttackKeyword) return false;
  const safeTags = Array.isArray(tags) ? tags : [];
  const nonSpeechTags = safeTags.filter((t) => !["speech_consistency", "today_transcript"].includes(t));
  return nonSpeechTags.length === 0;
};

const validateCommon = (
  tags: string[] | undefined,
  counter: string | undefined,
  consistency: string | undefined,
  confidence: number | undefined
): string[] => {
  const reasons: string[] = [];
  if (!hasEnoughEvidence(tags)) reasons.push("evidence_tags_insufficient");
  if (isLikelyEmptyCounter(counter)) reasons.push("counter_missing");
  if (!isNonEmpty(consistency)) reasons.push("consistency_missing");
  if (confidence !== undefined) {
    if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      reasons.push("confidence_invalid");
    }
  }
  return reasons;
};

export const evaluateVoteDecision = (decision: VoteDecision): EvalResult => {
  const reasons: string[] = [];
  if (typeof decision.seat !== "number" || !Number.isFinite(decision.seat) || decision.seat <= 0) {
    reasons.push("seat_invalid");
  }
  if (!isNonEmpty(decision.reason)) {
    reasons.push("reason_missing");
  }
  reasons.push(...validateCommon(decision.evidence_tags, decision.counter, decision.consistency, decision.confidence));
  if (isAttackinessOnly(decision.reason, decision.evidence_tags)) {
    reasons.push("attackiness_only");
  }
  return { ok: reasons.length === 0, reasons };
};

export const evaluateSpeechDecision = (decision: SpeechDecision): EvalResult => {
  const reasons: string[] = [];
  if (!Array.isArray(decision.speech) || decision.speech.length === 0) {
    reasons.push("speech_missing");
  }
  const rationale = decision.rationale || {};
  reasons.push(...validateCommon(rationale.evidence_tags, rationale.counter, rationale.consistency, rationale.confidence));
  return { ok: reasons.length === 0, reasons };
};
