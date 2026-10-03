/** Score given to one rubric criterion when grading an assignment. */
export interface IRubricScore {
  criterionId: string;
  score: number;
  comment?: string;
}

export type TGradebookItemType = 'quiz' | 'assignment';

/** A column of the gradebook: a quiz or assignment block of the course. */
export interface IGradebookItem {
  blockId: string;
  lessonId: string;
  type: TGradebookItemType;
  title: string;
  /** Weight in the course grade (0 leaves the column out). */
  weight: number;
}

/** graded, pending (delivered, not graded yet) or missing. */
export type TGradebookCellState = 'graded' | 'pending' | 'missing';

export interface IGradebookCell {
  blockId: string;
  score: number | null;
  state: TGradebookCellState;
  attempts: number;
  submissionId?: string;
}

export interface IGradebookRow {
  studentId: string;
  enrollmentId: string;
  enrollmentStatus: string;
  cells: IGradebookCell[];
  /** Weighted average of what is already graded. */
  currentGrade: number | null;
  /** Weighted average counting missing and pending work as 0. */
  finalGrade: number | null;
}

export interface IGradebook {
  courseId: string;
  items: IGradebookItem[];
  rows: IGradebookRow[];
}
