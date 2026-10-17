import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import * as DocumentPicker from 'expo-document-picker';
import { File, Directory, Paths } from 'expo-file-system';

export interface FavoriteApp {
  id: string;
  name: string;
  bundleIdentifier: string;
  version: string;
  fileUri: string;
  size: number;
  importDate: string;
  sourceUrl?: string;
  iconUri?: string;
}

const STORAGE_KEY = 'ryp0_favorites_v1';
const FAVORITES_DIR = 'favorites_data';

async function ensureDir(): Promise<Directory> {
  const dir = new Directory(Paths.document, FAVORITES_DIR);
  if (!dir.exists) {
    const staleFile = new File(Paths.document, FAVORITES_DIR);
    if (staleFile.exists) {
      staleFile.delete();
    }
    dir.create({ intermediates: true });
  }
  if (!dir.exists) {
    throw new Error('无法创建收藏目录，请检查存储权限');
  }
  return dir;
}

async function robustDownload(url: string, destFile: File): Promise<File> {
  const tmpFile = new File(Paths.cache, `dl-${Date.now()}-${Math.floor(Math.random() * 100000)}.tmp`);
  try {
    await File.downloadFileAsync(url, tmpFile);
    if (!tmpFile.exists) throw new Error('下载失败，文件为空');
    await tmpFile.copy(destFile);
    if (!destFile.exists) throw new Error('文件保存失败');
    return destFile;
  } finally {
    try { if (tmpFile.exists) tmpFile.delete(); } catch { }
  }
}

function cleanName(filename: string): string {
  return filename
    .replace(/\.ipa$/i, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+v?\d+(\.\d+)*/i, '')
    .trim() || '未知应用';
}

function extractVersion(filename: string): string {
  const m = filename.match(/v?(\d+(\.\d+)+)/);
  return m ? m[1] : '1.0';
}

async function extractIconFromIpa(ipaFile: File, dir: Directory, id: string): Promise<string | null> {
  try {
    const JSZip = (await import('jszip')).default;
    const resp = await fetch(ipaFile.uri);
    const buf = await resp.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const appDirName = Object.keys(zip.files).find(p =>
      p.startsWith('Payload/') && p.endsWith('.app/') && p.split('/').length === 3
    );
    if (!appDirName) return null;
    const iconNames = [
      'AppIcon60x60@3x.png', 'AppIcon60x60@2x.png',
      'AppIcon76x76@2x~ipad.png', 'AppIcon76x76~ipad.png',
      'Icon-60@3x.png', 'Icon-60@2x.png', 'Icon-76@2x.png', 'Icon-76.png',
      'Icon.png', 'icon.png',
    ];
    for (const iconName of iconNames) {
      const path = `${appDirName}${iconName}`;
      const entry = zip.files[path];
      if (entry && !entry.dir) {
        const blob = await entry.async('base64');
        const iconFile = new File(dir, `${id}-icon.png`);
        await iconFile.write(blob, { encoding: 'base64' } as any);
        return iconFile.uri;
      }
    }
    return null;
  } catch {
    return null;
  }
}
