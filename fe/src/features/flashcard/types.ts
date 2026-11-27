export type CardAnim =
  | ""
  | "card-flip-out-fwd"
  | "card-flip-in-fwd"
  | "card-flip-out-back"
  | "card-flip-in-back"
  | "card-slide-next"
  | "card-slide-prev";

export interface FlashcardStore {
  indexByFilter: Record<string, number>;
  flipped: boolean;
  cardAnim: CardAnim;
  autoRead: boolean;
  setCardAnim: (anim: CardAnim) => void;
  setAutoRead: (autoRead: boolean) => void;
  completeFlip: () => void;
  goToCard: (deckKey: string, index: number, anim: CardAnim) => void;
  resetFace: () => void;
}
