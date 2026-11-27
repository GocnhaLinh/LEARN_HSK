import { create } from "zustand";
import type { FlashcardStore } from "@/features/flashcard/types";

export const useFlashcardStore = create<FlashcardStore>((set) => ({
  indexByFilter: {},
  flipped: false,
  cardAnim: "",
  autoRead: false,
  setCardAnim: (cardAnim) => set({ cardAnim }),
  setAutoRead: (autoRead) => set({ autoRead }),
  completeFlip: () =>
    set((s) => {
      const next = !s.flipped;
      return {
        flipped: next,
        cardAnim: next ? "card-flip-in-fwd" : "card-flip-in-back",
      };
    }),
  goToCard: (deckKey, index, cardAnim) =>
    set((s) => ({
      flipped: false,
      cardAnim,
      indexByFilter: { ...s.indexByFilter, [deckKey]: index },
    })),
  resetFace: () => set({ flipped: false, cardAnim: "" }),
}));
