/**
 * Download a file from a URL with progress tracking.
 * Returns a cleanup function (no-op on success).
 */
export async function downloadFileWithProgress(
  url: string,
  filename: string,
  onProgress: (progress: number) => void
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Download failed');

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Unable to read response');

  const chunks: Uint8Array[] = [];
  let receivedLength = 0;

  // Simulate progress when content-length is unknown
  let simulatedProgress = 0;
  const progressInterval =
    total === 0
      ? setInterval(() => {
          if (simulatedProgress < 90) {
            simulatedProgress += Math.random() * 3;
            onProgress(Math.min(90, Math.round(simulatedProgress)));
          }
        }, 200)
      : null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      receivedLength += value.length;
      if (total > 0) {
        onProgress(Math.round((receivedLength / total) * 100));
      }
    }
  } finally {
    if (progressInterval) clearInterval(progressInterval);
  }

  const blob = new Blob(chunks as BlobPart[]);
  const objectUrl = window.URL.createObjectURL(blob);
  onProgress(100);

  await new Promise(resolve => setTimeout(resolve, 300));

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(objectUrl);
}
