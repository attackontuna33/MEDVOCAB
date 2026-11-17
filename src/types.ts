export type Word = { id: number; english: string; turkish: string; exampleEn: string; exampleTr: string; sourcePage?: number; };
export type Progress = { status: "new" | "learning" | "known"; dueAt: number; correct: number; wrong: number; lastSeen?: number; };
export type ProgressMap = Record<number, Progress>;
