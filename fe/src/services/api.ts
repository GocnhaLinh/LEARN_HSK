// Temporary compatibility facade aggregating per-domain API modules.
// Will be removed in Phase 8 once AppContext is fully retired.
import { coursesApi } from "@/features/courses/api/courses.api";
import { scoresApi } from "@/features/game/api/scores.api";
import { notesApi } from "@/features/notes/api/notes.api";
import { profileApi } from "@/features/profile/api/profile.api";
import { vocabApi } from "@/features/vocab/api/vocab.api";
import { handwritingApi } from "@/features/writing/api/handwriting.api";

export const api = {
  ...profileApi,
  ...coursesApi,
  ...vocabApi,
  ...notesApi,
  ...handwritingApi,
  ...scoresApi,
};
