// utils/fileNormalize.ts
import * as FileSystem from 'expo-file-system/legacy';

export type RnFile = { uri: string; name: string; type: string };

function guessMimeByName(name: string) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (['jpg','jpeg'].includes(ext)) return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'heic') return 'image/heic';
  return 'application/octet-stream';
}

export async function toRnFileFromPickerAsset(asset: {
  uri: string;
  name?: string;         // DocumentPicker
  fileName?: string;     // ImagePicker
  mimeType?: string;     // DocumentPicker
  type?: string;         // ImagePicker: 'image' | 'video' 등 (MIME 아님)
}): Promise<RnFile> {
  const name = asset.name ?? asset.fileName ?? asset.uri.split('/').pop() ?? `upload_${Date.now()}`;
  const type = asset.mimeType || (asset.type === 'image' ? guessMimeByName(name) : guessMimeByName(name));
  let uri = asset.uri;

  if (uri.startsWith('content://')) {
    const dest = `${FileSystem.cacheDirectory}${name}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    uri = dest; // file://...
  }
  return { uri, name, type };
}

function toAsciiFilename(name: string) {
  // 한글/특수문자 → ASCII 대체. 길이도 제한.
  const base = (name || `upload_${Date.now()}`).replace(/[\\/:*?"<>|\x00-\x1F]/g, '_');
  // NFKD 정규화 후 비-ASCII 제거
  const ascii = base.normalize('NFKD').replace(/[^\x20-\x7E]/g, '_');
  return ascii.slice(0, 120);
}

export async function normalizeRnFile(input: RnFile): Promise<RnFile> {
  // 1) content:// → file:// 로 복사
  let uri = input.uri;
  const safeName = toAsciiFilename(input.name);
  const type = input.type || 'application/octet-stream';

  if (uri.startsWith('content://')) {
    const dest = `${FileSystem.cacheDirectory}${safeName}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    uri = dest; // file://...
  }

  // 2) 실제 파일 존재 & 크기 사전 확인 (여기서 에러나면 곧장 status:0로 떨어졌던 케이스)
  const stat = await FileSystem.getInfoAsync(uri);
  if (!stat.exists || stat.isDirectory) {
    throw new Error(`File not found or is a directory: ${uri}`);
  }

  return { uri, name: safeName, type };
}
