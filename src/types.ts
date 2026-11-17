export type Word = { id: number; english: string; turkish: string; exampleEn: string; exampleTr: string; sourceNumber?: number; sourcePage?: number; };
export type Progress = { status: "new" | "learning" | "known"; dueAt: number; correct: number; wrong: number; lastSeen?: number; newSeenAt?: number; };
export type ProgressMap = Record<number, Progress>;
