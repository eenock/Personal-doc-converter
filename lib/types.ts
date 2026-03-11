export type Status = 'idle' | 'queued' | 'processing' | 'done' | 'error';

export interface ConversionJob {
  jobId: string;
  filename: string;
  status: Status;
  error?: string;
}

export interface FormatOption {
  mode: string;
  label: string;
  from: string;
  to: string;
  accept: string;
  icon: string;
}

export interface FormatGroup {
  label: string;
  options: FormatOption[];
}
