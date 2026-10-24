export type SyncProgress = {
  phase: 'uploading' | 'downloading' | 'complete' | 'attention';
  total: number;
  confirmed: number;
  remaining: number;
};
