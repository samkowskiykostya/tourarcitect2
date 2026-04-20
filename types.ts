
export interface Hint {
  text: string;
  price: number;
}

export type QuestionHint = Hint;

export interface Question {
  id: string;
  text: string;
  price: number;
  hints: Hint[];
}

export interface Card {
  id: string;
  name: string;
  description: string;
  task: string;
  taskHints: Hint[];
  questions: Question[];
  lat: number | null;
  lng: number | null;
  images: string[]; // Base64 strings
  isCollapsed: boolean;
}

export interface Tour {
  id: string;
  name: string;
  createdAt: number;
  cards: Card[];
}

export type HistoryState = Tour[];
