import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function imagesCacheDirectory(): Directory {
  return new Directory(Paths.cache, 'images');
}

function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const ext = url.split('.').pop()?.split('?')[0] ?? 'jpg';
  return `${Math.abs(hash).toString(36)}.${ext}`;
}

async function ensureCacheDir(): Promise<void> {
  if (Platform.OS === 'web') return;
  const dir = imagesCacheDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
}

export async function getCachedImage(url: string): Promise<string> {
  if (Platform.OS === 'web' || !url) return url;

  try {
    await ensureCacheDir();
    const dir = imagesCacheDirectory();
    const filename = hashUrl(url);
    const file = new File(dir, filename);

    if (file.exists) {
      const mt = file.modificationTime;
      if (mt != null && Date.now() - mt > MAX_CACHE_AGE) {
        file.delete();
      } else {
        return file.uri;
      }
    }

    const downloaded = await File.downloadFileAsync(url, new File(dir, filename), {
      idempotent: true,
    });
    return downloaded.uri;
  } catch {
    return url;
  }
}

export async function prefetchImages(urls: string[]): Promise<void> {
  if (Platform.OS === 'web') return;
  await ensureCacheDir();
  const limited = urls.slice(0, 10);
  await Promise.allSettled(limited.map((url) => getCachedImage(url)));
}

export async function clearImageCache(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const dir = imagesCacheDirectory();
    if (dir.exists) {
      dir.delete();
    }
    await ensureCacheDir();
  } catch {}
}

export async function getCacheSize(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  try {
    const dir = imagesCacheDirectory();
    if (!dir.exists) return 0;
    return dir.size ?? 0;
  } catch {
    return 0;
  }
}

export async function pruneCache(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const dir = imagesCacheDirectory();
    if (!dir.exists) return;

    const entries = dir.list();
    const files = entries.filter((e): e is File => e instanceof File);

    const fileInfos = files.map((f) => ({
      file: f,
      modificationTime: f.modificationTime ?? 0,
      size: f.size ?? 0,
    }));

    fileInfos.sort((a, b) => a.modificationTime - b.modificationTime);

    let totalSize = fileInfos.reduce((sum, f) => sum + f.size, 0);
    for (const entry of fileInfos) {
      if (totalSize <= MAX_CACHE_SIZE) break;
      try {
        entry.file.delete();
        totalSize -= entry.size;
      } catch {}
    }
  } catch {}
}
