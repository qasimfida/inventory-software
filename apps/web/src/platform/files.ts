/** User-initiated local files only. No remote URLs or business upload side effects. */
export async function pickLocalFile(accept: string, maximum = 1024 * 1024) {
  return new Promise<{ name: string; bytes: Uint8Array } | null>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.oncancel = () => resolve(null);
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      if (file.size > maximum) {
        reject(new Error('Selected file is too large.'));
        return;
      }
      void file
        .arrayBuffer()
        .then((buffer) => resolve({ name: file.name, bytes: new Uint8Array(buffer) }), reject);
    };
    input.click();
  });
}
export async function saveLocalText(name: string, text: string, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: mime })),
    link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
