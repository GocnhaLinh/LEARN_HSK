export interface CreateHandwritingPayload {
  img: string;
  caption?: string;
}

export interface WritingStoreState {
  writeQuickPool: string[];
  setWriteQuickPool: (chars: string[]) => void;
}
