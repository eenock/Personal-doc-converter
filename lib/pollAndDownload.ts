import type { Status } from './types';

export async function pollAndDownload(
  jobId: string,
  onUpdate: (status: Status, error?: string) => void,
): Promise<void> {
  const poll = async (): Promise<void> => {
    const res = await fetch(`/api/convert?id=${jobId}`);

    if (res.ok && res.headers.get('Content-Type') !== 'application/json') {
      // File is ready — trigger download
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? 'output';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      onUpdate('done');
      return;
    }

    const data = await res.json();

    if (!res.ok || data.status === 'error') {
      onUpdate('error', data.error ?? 'Conversion failed');
      return;
    }

    if (data.status === 'queued' || data.status === 'processing') {
      onUpdate(data.status);
      await new Promise((r) => setTimeout(r, 1500));
      return poll();
    }

    // status === 'done' but came back as JSON (edge case) — re-fetch as file
    onUpdate('done');
    window.location.href = `/api/convert?id=${jobId}`;
  };

  return poll();
}
