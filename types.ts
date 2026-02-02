
export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  linkedCharIndex: number;
}

export type Grade = '10' | '11' | '12';

export enum AppMode {
  TEACHER_CONFIG = 'TEACHER_CONFIG',
  GAME_PLAY = 'GAME_PLAY'
}

export interface GameState {
  pickedAppleIndices: number[];
  revealedChars: (string | null)[];
  isCompleted: boolean;
  shuffledOrder: number[];
  studentList: string[];
  currentStudent: string | null;
  displayMapping: number[]; // Lưu chỉ số thực tế của ký tự trong từ khóa gốc tương ứng với vị trí hiển thị xáo trộn
}
