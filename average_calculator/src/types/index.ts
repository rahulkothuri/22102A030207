export type NumberId = 'p' | 'f' | 'e' | 'r';

export interface AverageResponse {
  windowPrevState: number[];
  windowCurrState: number[];
  numbers: number[];
  avg: number;
}
