import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function shareAccountExport(contents: string) {
  if (!await Sharing.isAvailableAsync()) throw new Error('Sharing unavailable');
  const file = new File(Paths.cache, `skincycle-data-${Date.now()}.json`);
  try {
    file.create();
    file.write(contents);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'บันทึกข้อมูล SkinCycle' });
  } finally {
    if (file.exists) file.delete();
  }
}
