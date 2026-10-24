export async function pickLocalFile(accept: string, maximum = 1024 * 1024) {
  const DocumentPicker = await import('expo-document-picker');
  const { File } = await import('expo-file-system');
  void accept;
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0]!;
  if ((asset.size ?? maximum + 1) > maximum) throw new Error('Selected file is too large.');
  const bytes = await new File(asset.uri).bytes();
  if (bytes.length > maximum) throw new Error('Selected file is too large.');
  return { name: asset.name, bytes };
}
export async function saveLocalText(name: string, text: string, mime = 'text/plain') {
  const Sharing = await import('expo-sharing');
  const { File, Paths } = await import('expo-file-system');
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('File sharing is unavailable on this device.');
  const file = new File(Paths.cache, name);
  await file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: mime });
}
