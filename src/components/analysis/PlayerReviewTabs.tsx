"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameAnalysisData, PlayerReviewCard } from "@/types/analysis";
import { buildSimpleAvatarUrl } from "@/lib/avatar-config";

interface PlayerReviewTabsProps {
  data: GameAnalysisData;
}

type ReviewState = {
  items: PlayerReviewCard[];
};

function getSeatKey(seat: number, reviewerId: string) {
  return `${seat}-${reviewerId}`;
}

function ReviewCard({ seat, review }: { seat: number; review: PlayerReviewCard }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((v) => !v), []);
  return (
    <div className="analysis-card p-5 rounded-xl relative w-full text-left">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full border border-[var(--color-gold)]/20 p-0.5 bg-black/20">
          <img
            src={buildSimpleAvatarUrl(review.reviewerAvatar)}
            alt={review.reviewerName}
            className="w-full h-full rounded-full grayscale"
          />
        </div>
        <div className="flex flex-col">
          <div className="text-xs text-[var(--text-muted)]">{review.reviewerSeat}号点评</div>
          <div className="text-sm font-bold text-[var(--text-primary)]">{review.reviewerName}</div>
        </div>
      </div>

      <p
        className={`text-xs text-[var(--text-secondary)] leading-relaxed border-l-2 border-[var(--color-gold)]/20 pl-3 whitespace-pre-wrap break-words ${
          expanded ? "" : "line-clamp-6"
        }`}
      >
        {review.content}
      </p>

      <button
        type="button"
        onClick={toggle}
        className="mt-3 text-[10px] text-[var(--color-gold)] hover:opacity-80"
      >
        {expanded ? "收起" : "展开"}
      </button>
    </div>
  );
}

export function PlayerReviewTabs({ data }: PlayerReviewTabsProps) {
  const players = data.players;
  const defaultSeat = 1;
  const [selectedSeat, setSelectedSeat] = useState(defaultSeat);
  const [reviewMap, setReviewMap] = useState<Record<number, ReviewState>>({});
  const [loadingSeat, setLoadingSeat] = useState<number | null>(null);
  const [errorSeat, setErrorSeat] = useState<number | null>(null);
  const requestIdRef = useRef(0);

  const selectedReviews = reviewMap[selectedSeat]?.items ?? [];

  const seatOptions = useMemo(() => {
    return players.map((p) => ({
      seat: p.seat + 1,
      playerId: p.playerId,
      name: p.name,
      avatar: p.avatar,
    }));
  }, [players]);

  const fetchReviews = useCallback(
    async (seat: number) => {
      if (reviewMap[seat]?.items?.length) return;
      setLoadingSeat(seat);
      setErrorSeat(null);
      const requestId = ++requestIdRef.current;
      const params = new URLSearchParams({
        game_id: data.gameId,
        target_seat: String(seat),
      });

      try {
        const res = await fetch(`/api/player-reviews?${params.toString()}`);
        const json = await res.json();
        if (requestId !== requestIdRef.current) return;
        const existing = Array.isArray(json?.data) ? (json.data as PlayerReviewCard[]) : [];
        if (existing.length > 0) {
          setReviewMap((prev) => ({ ...prev, [seat]: { items: existing } }));
          return;
        }

        const genRes = await fetch("/api/player-reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game_id: data.gameId, target_seat: seat }),
        });
        const genJson = await genRes.json();
        if (requestId !== requestIdRef.current) return;
        const generated = Array.isArray(genJson?.data) ? (genJson.data as PlayerReviewCard[]) : [];
        setReviewMap((prev) => ({ ...prev, [seat]: { items: generated } }));
      } catch {
        if (requestId !== requestIdRef.current) return;
        setErrorSeat(seat);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingSeat(null);
        }
      }
    },
    [data.gameId, reviewMap]
  );

  useEffect(() => {
    void fetchReviews(selectedSeat);
  }, [fetchReviews, selectedSeat]);

  return (
    <section>
      <h3 className="text-center font-bold text-[var(--color-gold)]/40 text-xs mb-6 tracking-[0.3em] analysis-ornament-border pb-3">
        选手评价
      </h3>

      <div className="flex gap-3 overflow-x-auto pb-3 -mx-2 px-2">
        {seatOptions.map((p) => {
          const isActive = p.seat === selectedSeat;
          return (
            <button
              key={p.playerId}
              type="button"
              onClick={() => setSelectedSeat(p.seat)}
              className={`flex flex-col items-center gap-2 min-w-[64px] px-2 py-2 rounded-xl border transition-colors ${
                isActive
                  ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10"
                  : "border-white/10 hover:bg-white/5"
              }`}
            >
              <div className="w-12 h-12 rounded-full border border-[var(--color-gold)]/20 p-0.5 bg-black/20">
                <img
                  src={buildSimpleAvatarUrl(p.avatar)}
                  alt={p.name}
                  className="w-full h-full rounded-full"
                />
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">{p.seat}号</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4">
        {loadingSeat === selectedSeat && (
          <div className="text-xs text-[var(--text-secondary)]">正在生成点评...</div>
        )}
        {errorSeat === selectedSeat && (
          <button
            type="button"
            className="text-xs text-[var(--color-gold)]"
            onClick={() => fetchReviews(selectedSeat)}
          >
            生成失败，点击重试
          </button>
        )}
        {!loadingSeat && selectedReviews.length === 0 && errorSeat !== selectedSeat && (
          <div className="text-xs text-[var(--text-secondary)]">暂无点评</div>
        )}
        {selectedReviews.map((review) => (
          <ReviewCard
            key={getSeatKey(selectedSeat, review.reviewerPlayerId)}
            seat={selectedSeat}
            review={review}
          />
        ))}
      </div>
    </section>
  );
}
