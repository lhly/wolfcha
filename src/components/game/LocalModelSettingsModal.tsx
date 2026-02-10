"use client";

import { useEffect, useState } from "react";
import { Eye, EyeSlash, Wrench } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  getLocalLlmApiKey,
  getLocalLlmBaseUrl,
  getLocalLlmModel,
  setLocalLlmApiKey,
  setLocalLlmBaseUrl,
  setLocalLlmModel,
  LOCAL_LLM_DEFAULTS,
} from "@/lib/local-llm-settings";

interface LocalModelSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function LocalModelSettingsModal({ open, onOpenChange, onSaved }: LocalModelSettingsModalProps) {
  const t = useTranslations();
  const [baseUrl, setBaseUrl] = useState(LOCAL_LLM_DEFAULTS.baseUrl);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(LOCAL_LLM_DEFAULTS.model);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBaseUrl(getLocalLlmBaseUrl());
    setApiKey(getLocalLlmApiKey());
    setModel(getLocalLlmModel());
  }, [open]);

  const handleSave = () => {
    if (!baseUrl.trim() || !model.trim() || !apiKey.trim()) {
      toast.error(t("localLlmSettings.errors.missing"));
      return;
    }

    setLocalLlmBaseUrl(baseUrl.trim());
    setLocalLlmApiKey(apiKey.trim());
    setLocalLlmModel(model.trim());
    toast.success(t("localLlmSettings.toasts.saved"));
    onSaved?.();
    onOpenChange(false);
  };

  const handleTest = async () => {
    if (isTesting) return;
    if (!baseUrl.trim() || !model.trim() || !apiKey.trim()) {
      toast.error(t("localLlmSettings.errors.missing"));
      return;
    }
    setIsTesting(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim(),
          model: model.trim(),
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
            <Input
              id="llm-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={LOCAL_LLM_DEFAULTS.model}
            />
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
