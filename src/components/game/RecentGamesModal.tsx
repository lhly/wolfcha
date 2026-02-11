"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useAppLocale } from "@/i18n/useAppLocale";
import { resumeGameHistory } from "@/lib/game-history";
import { savePersistedGameState } from "@/lib/game-state-storage";
import { GAME_STATE_VERSION } from "@/store/game-machine";
import type { GameState } from "@/types/game";

export interface RecentGameItem {
  id: string;
  game_id: string;
  started_at: number | null;
  ended_at: number | null;
  winner: string | null;
  status: "in_progress" | "paused" | "completed";
  updated_at: number;
  created_at: number;
  day: number | null;
  phase: string | null;
}

interface RecentGamesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGameId?: string | null;
  isGameInProgress: boolean;
}

export function RecentGamesModal({
  open,
  onOpenChange,
  currentGameId,
  isGameInProgress,
}: RecentGamesModalProps) {
  const t = useTranslations();
  const { locale } = useAppLocale();
  const [items, setItems] = useState<RecentGameItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResuming, setIsResuming] = useState<string | null>(null);

  const formatter = useMemo(() => {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [locale]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoading(true);
    fetch("/api/game-history?limit=30")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const data = Array.isArray(json?.data) ? (json.data as RecentGameItem[]) : [];
        setItems(data);
      })
      .catch(() => {
        if (cancelled) return;
        toast(t("recentGames.fetchFailed"));
        setItems([]);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, t]);

  const formatTime = useCallback(
    (ts?: number | null) => {
      if (!ts) return "-";
      return formatter.format(new Date(ts));
    },
    [formatter]
  );

  const handleResume = useCallback(async (item: RecentGameItem) => {
    if (isResuming) return;
    if (isGameInProgress && currentGameId && item.game_id !== currentGameId) {
      const ok = window.confirm(t("recentGames.confirmSwitch"));
      if (!ok) return;
    }
    setIsResuming(item.game_id);
    try {
      const detail = await resumeGameHistory(item.game_id);
      if (!detail?.checkpointState) {
        toast(t("recentGames.missingCheckpoint"));
        return;
      }
      await savePersistedGameState(detail.checkpointState as GameState, GAME_STATE_VERSION);
      window.location.reload();
    } catch (error) {
      toast(t("recentGames.resumeFailed"), { description: String(error) });
    } finally {
      setIsResuming(null);
    }
  }, [currentGameId, isGameInProgress, isResuming, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-[var(--text-primary)]">
              {t("recentGames.title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--text-secondary)]">
              {t("recentGames.description")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[70vh]">
          <div className="px-6 py-5 space-y-3 bg-[var(--bg-main)]">
            {isLoading && (
              <div className="text-sm text-[var(--text-secondary)]">{t("recentGames.loading")}</div>
            )}

            {!isLoading && items.length === 0 && (
              <div className="text-sm text-[var(--text-secondary)]">{t("recentGames.empty")}</div>
            )}

            {items.map((item) => {
              const isCompleted = item.status === "completed";
              const isActive = item.status === "in_progress";
              const isCurrent = Boolean(currentGameId && currentGameId === item.game_id);
              const statusLabel = isCompleted
                ? t("recentGames.status.completed")
                : t("recentGames.status.inProgress");
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/70 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {t("recentGames.gameLabel", { id: item.game_id.slice(0, 8) })}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {t("recentGames.lastUpdated", { time: formatTime(item.updated_at) })}
                      </div>
                      {item.day !== null && (
                        <div className="text-xs text-[var(--text-secondary)]">
                          {t("recentGames.dayLabel", { day: item.day })}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--border-color)] text-[var(--text-secondary)]">
                        {statusLabel}
                      </span>
                      {isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-gold)]/20 text-[var(--color-gold)]">
                          {t("recentGames.status.active")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {!isCompleted && (
                      <Button
                        size="sm"
                        onClick={() => handleResume(item)}
                        disabled={isResuming === item.game_id || isCurrent}
                      >
                        {isCurrent ? t("recentGames.status.current") : t("recentGames.resume")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
