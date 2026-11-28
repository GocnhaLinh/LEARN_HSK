export const coursesKeys = {
  all: ['courses'] as const,
  lessons: ['courses', 'lessons'] as const,
};

export const vocabKeys = {
  all: ['vocab'] as const,
  list: ['vocab', 'list'] as const,
};

export const exercisesKeys = {
  all: ['courses', 'exercises'] as const,
  byLevel: (level: number) => ['courses', 'exercises', level] as const,
};

export const notesKeys = {
  all: ['notes'] as const,
  list: ['notes', 'list'] as const,
};

export const handwritingKeys = {
  all: ['writing'] as const,
  list: ['writing', 'handwriting'] as const,
};
