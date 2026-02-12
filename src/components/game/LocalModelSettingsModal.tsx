"use client";

import { useEffect, useState } from "react";
import { Eye, EyeSlash, Wrench, X } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  fetchLlmConfig,
  getLlmConfig,
  getLlmConfigWithDefaults,
  saveLlmConfig,
} from "@/lib/llm-config";
import { LOCAL_LLM_DEFAULTS } from "@/lib/local-llm-settings";

interface LocalModelSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function LocalModelSettingsModal({ open, onOpenChange, onSaved }: LocalModelSettingsModalProps) {
  const t = useTranslations();
  const [baseUrl, setBaseUrl] = useState(LOCAL_LLM_DEFAULTS.baseUrl);
  const [apiKey, setApiKey] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [modelTags, setModelTags] = useState<string[]>([]);
  const [primaryModel, setPrimaryModel] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const normalizeTags = (values: string[]) =>
    Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

  const resolvePrimaryModel = (models: string[], fallback?: string) => {
    if (fallback && models.includes(fallback)) return fallback;
    return models[0] ?? "";
  };

  const addTags = (raw: string) => {
    const parts = raw.split(/[,\s]+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setModelTags((prev) => {
      const next = normalizeTags([...prev, ...parts]);
      setPrimaryModel((current) => resolvePrimaryModel(next, current));
      return next;
    });
    setModelInput("");
  };

  useEffect(() => {
    if (!open) return;
    const existing = getLlmConfig() ?? getLlmConfigWithDefaults();
    setBaseUrl(existing.baseUrl);
    setApiKey(existing.apiKey);
    const initialModels =
      Array.isArray(existing.models) && existing.models.length > 0
        ? existing.models
        : existing.model
          ? [existing.model]
          : [LOCAL_LLM_DEFAULTS.model];
    setModelTags(initialModels);
    setPrimaryModel(resolvePrimaryModel(initialModels, existing.model));
    setModelInput("");
    void fetchLlmConfig().then((cfg) => {
      if (!cfg) return;
      setBaseUrl(cfg.baseUrl);
      setApiKey(cfg.apiKey);
      const nextModels =
        Array.isArray(cfg.models) && cfg.models.length > 0
          ? cfg.models
          : cfg.model
            ? [cfg.model]
            : [LOCAL_LLM_DEFAULTS.model];
      setModelTags(nextModels);
      setPrimaryModel(resolvePrimaryModel(nextModels, cfg.model));
      setModelInput("");
    });
  }, [open]);

  const handleSave = async () => {
    const baseUrlValue = baseUrl.trim();
    const apiKeyValue = apiKey.trim();
    const candidates = normalizeTags([...modelTags, modelInput]);
    if (!baseUrlValue || !apiKeyValue || candidates.length === 0) {
      toast.error(t("localLlmSettings.errors.missing"));
      return;
    }

    let validatedModels = [...candidates];
    let removedModels: string[] = [];
    let validationSkipped = false;

    try {
      const res = await fetch("/api/llm-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: baseUrlValue, api_key: apiKeyValue }),
      });
      if (res.ok) {
        const json = (await res.json()) as { models?: string[] };
        const providerModels = Array.isArray(json.models) ? json.models : [];
        if (providerModels.length > 0) {
          const map = new Map(providerModels.map((model) => [model.toLowerCase(), model]));
          const matched = candidates
            .map((model) => map.get(model.toLowerCase()))
            .filter((model): model is string => Boolean(model));
          removedModels = candidates.filter((model) => !map.has(model.toLowerCase()));
          validatedModels = normalizeTags(matched);
        }
      } else {
        validationSkipped = true;
      }
    } catch {
      validationSkipped = true;
    }

    if (validationSkipped) {
      toast(t("localLlmSettings.toasts.validationSkipped"), {
        description: t("localLlmSettings.toasts.validationSkippedDesc"),
      });
    }

    if (removedModels.length > 0) {
      toast(t("localLlmSettings.toasts.modelsAdjusted"), {
        description: t("localLlmSettings.toasts.modelsAdjustedDesc", {
          models: removedModels.join(", "),
        }),
      });
    }

    if (validatedModels.length === 0) {
      toast.error(t("localLlmSettings.errors.missing"));
      return;
    }

    const nextPrimary = resolvePrimaryModel(validatedModels, primaryModel);

    await saveLlmConfig({
      baseUrl: baseUrlValue,
      apiKey: apiKeyValue,
      model: nextPrimary,
      models: validatedModels,
    });
    toast.success(t("localLlmSettings.toasts.saved"));
    setModelTags(validatedModels);
    setPrimaryModel(nextPrimary);
    setModelInput("");
    onSaved?.();
    onOpenChange(false);
  };

  const handleTest = async () => {
    if (isTesting) return;
    const baseUrlValue = baseUrl.trim();
    const apiKeyValue = apiKey.trim();
    const testModel = normalizeTags([...modelTags, modelInput])[0];
    if (!baseUrlValue || !apiKeyValue || !testModel) {
      toast.error(t("localLlmSettings.errors.missing"));
      return;
    }
    setIsTesting(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrlValue,
          apiKey: apiKeyValue,
          model: testModel,
          messages: [{ role: "user", content: "ping" }],
          temperature: 0,
          max_tokens: 1,
        }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Test failed");
      }
      toast.success(t("localLlmSettings.toasts.testSuccess"));
    } catch (error) {
      toast.error(t("localLlmSettings.toasts.testFail"), {
        description: String(error ?? ""),
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench size={18} />
            {t("localLlmSettings.title")}
          </DialogTitle>
          <DialogDescription>{t("localLlmSettings.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="llm-base-url" className="text-xs">
              {t("localLlmSettings.fields.baseUrl")}
            </Label>
            <Input
              id="llm-base-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={LOCAL_LLM_DEFAULTS.baseUrl}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="llm-api-key" className="text-xs">
              {t("localLlmSettings.fields.apiKey")}
            </Label>
            <div className="flex gap-2">
              <Input
                id="llm-api-key"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t("localLlmSettings.placeholders.apiKey")}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowApiKey((v) => !v)}
                aria-label={showApiKey ? t("localLlmSettings.actions.hideKey") : t("localLlmSettings.actions.showKey")}
              >
                {showApiKey ? <EyeSlash size={16} /> : <Eye size={16} />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="llm-model" className="text-xs">
              {t("localLlmSettings.fields.model")}
            </Label>
            <div className="flex flex-wrap gap-2 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm">
              {modelTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-primary)]"
                >
                  <span className="max-w-[160px] truncate">{tag}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setModelTags((prev) => {
                        const next = prev.filter((item) => item !== tag);
                        setPrimaryModel((current) => resolvePrimaryModel(next, current));
                        return next;
                      })
                    }
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    aria-label={`Remove ${tag}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                id="llm-model"
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === ",") {
                    event.preventDefault();
                    if (modelInput.trim()) addTags(modelInput);
                  }
                }}
                placeholder={modelTags.length ? "" : LOCAL_LLM_DEFAULTS.model}
                className="min-w-[120px] flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{t("localLlmSettings.fields.primaryModel")}</Label>
            <Select value={primaryModel} onValueChange={setPrimaryModel} disabled={modelTags.length === 0}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={LOCAL_LLM_DEFAULTS.model} />
              </SelectTrigger>
              <SelectContent>
                {modelTags.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleTest} disabled={isTesting} className="flex-1">
              {isTesting ? t("localLlmSettings.actions.testing") : t("localLlmSettings.actions.test")}
            </Button>
            <Button type="button" onClick={handleSave} className="flex-1">
              {t("localLlmSettings.actions.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
