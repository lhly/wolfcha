export type AISpeechMode = "stream" | "hard";

export function resolveAISpeechMode(config: {
  enabled: boolean;
  disableStreamingSpeech: boolean;
}): AISpeechMode {
  return config.enabled && config.disableStreamingSpeech ? "hard" : "stream";
}
