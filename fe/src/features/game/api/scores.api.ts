import apiClient from "@/lib/api/client";
import type { LevelScoreSummary, ScoreHistoryItem } from "@/types";

export interface ScoresOverviewResponse {
  byLevel: LevelScoreSummary[];
  history: ScoreHistoryItem[];
}

export interface RecordScorePayload {
  level: number;
  mode: "quiz" | "listen" | "match" | "exercise" | "writing";
  score: number;
  combo?: number;
  xpEarned?: number;
  detail?: string;
}

export const scoresApi = {
  getScores: async (level?: number): Promise<ScoresOverviewResponse> => {
    const { data } = await apiClient.get<ScoresOverviewResponse>("/scores", {
      params: level ? { level } : undefined,
    });
    return data;
  },

  recordScore: async (
    payload: RecordScorePayload,
  ): Promise<ScoreHistoryItem> => {
    const { data } = await apiClient.post<ScoreHistoryItem>("/scores", payload);
    return data;
  },
};
