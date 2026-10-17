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

interface FavoritesState {
  favorites: FavoriteApp[];
  loaded: boolean;
  load: () => Promise<void>;
  importFromFile: () => Promise<FavoriteApp | null>;
  importFromUrl: (url: string, name?: string) => Promise<FavoriteApp | null>;
  importFromListFile: () => Promise<number>;
  exportToFile: () => Promise<string | null>;
  addRepoApp: (app: { name: string; bundleIdentifier: string; version: string; downloadURL: string; size?: number; iconURL?: string }) => Promise<FavoriteApp | null>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  shareIpa: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

async function persist(list: FavoriteApp[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  loaded: false,
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const list: FavoriteApp[] = raw ? JSON.parse(raw) : [];
      const valid: FavoriteApp[] = [];
      for (const f of list) {
        try {
          const file = new File(f.fileUri);
          if (file.exists) valid.push(f);
        } catch { }
      }
      if (valid.length !== list.length) await persist(valid);
      set({ favorites: valid, loaded: true });
    } catch {
      set({ favorites: [], loaded: true });
    }
  },
  importFromFile: async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/octet-stream', 'application/x-ios-app'],
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled || !result.assets?.length) return null;
    const dir = await ensureDir();
    const imported: FavoriteApp[] = [];
    for (const asset of result.assets) {
      if (!asset.name.toLowerCase().endsWith('.ipa') && !asset.uri.toLowerCase().endsWith('.ipa')) {
        continue;
      }
      const id = `fav-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const dest = new File(dir, `${id}.ipa`);
      const src = new File(asset.uri);
      src.copy(dest);
      const iconUri = await extractIconFromIpa(dest, dir, id);
      imported.push({
        id,
        name: cleanName(asset.name),
        bundleIdentifier: `local.favorite.${id}`,
        version: extractVersion(asset.name),
        fileUri: dest.uri,
        size: asset.size ?? dest.size ?? 0,
        importDate: new Date().toISOString(),
        ...(iconUri ? { iconUri } : {}),
      });
    }
    if (!imported.length) throw new Error('所选文件中没有 .ipa');
    const list = [...get().favorites, ...imported];
    await persist(list);
    set({ favorites: list });
    return imported[imported.length - 1];
  },
  importFromUrl: async (url: string, name?: string) => {
    const clean = url.trim();
    if (!/^https?:\/\//i.test(clean)) throw new Error('链接须以 http(s):// 开头');
    const dir = await ensureDir();
    const id = `fav-${Date.now()}`;
    const dest = new File(dir, `${id}.ipa`);
    const downloaded = await robustDownload(clean, dest);
    const filename = name || clean.split('/').pop()?.split('?')[0] || `${id}.ipa`;
    const iconUri = await extractIconFromIpa(downloaded, dir, id);
    const fav: FavoriteApp = {
      id,
      name: cleanName(filename),
      bundleIdentifier: `local.favorite.${id}`,
      version: extractVersion(filename),
      fileUri: downloaded.uri,
      size: downloaded.size ?? 0,
      importDate: new Date().toISOString(),
      sourceUrl: clean,
      ...(iconUri ? { iconUri } : {}),
    };
    const list = [...get().favorites, fav];
    await persist(list);
    set({ favorites: list });
    return fav;
  },
  remove: async (id: string) => {
    const fav = get().favorites.find(f => f.id === id);
    if (fav) {
      try { new File(fav.fileUri).delete(); } catch { }
      try { if (fav.iconUri) new File(fav.iconUri).delete(); } catch { }
    }
    const list = get().favorites.filter(f => f.id !== id);
    await persist(list);
    set({ favorites: list });
  },
  shareIpa: async (id: string) => {
    const fav = get().favorites.find(f => f.id === id);
    if (!fav) throw new Error('找不到该收藏');
    const file = new File(fav.fileUri);
    if (!file.exists) throw new Error('IPA 文件已不存在');
    const Sharing = await import('expo-sharing');
    if (!(await Sharing.isAvailableAsync())) throw new Error('当前设备不支持分享');
    await Sharing.shareAsync(file.uri, {
      dialogTitle: `分享 ${fav.name}`,
      mimeType: 'application/octet-stream',
    });
  },
  addRepoApp: async (app) => {
    const existing = get().favorites.find(f => f.bundleIdentifier === app.bundleIdentifier);
    if (existing) return existing;
    if (!/^https?:\/\//i.test(app.downloadURL)) throw new Error('该应用没有有效的 IPA 下载链接');
    const dir = await ensureDir();
    const id = `fav-${Date.now()}`;
    const dest = new File(dir, `${id}.ipa`);
    const downloaded = await robustDownload(app.downloadURL, dest);
    const fav: FavoriteApp = {
      id,
      name: app.name,
      bundleIdentifier: app.bundleIdentifier,
      version: app.version || '1.0',
      fileUri: downloaded.uri,
      size: downloaded.size ?? app.size ?? 0,
      importDate: new Date().toISOString(),
      sourceUrl: app.downloadURL,
      iconUri: app.iconURL || undefined,
    };
    const list = [...get().favorites, fav];
    await persist(list);
    set({ favorites: list });
    return fav;
  },
  exportToFile: async () => {
    const list = get().favorites;
    if (!list.length) throw new Error('收藏是空的，没有可导出的');
    const lines = [
      `# ryP0 我的收藏 (${new Date().toISOString().slice(0, 10)})`,
      `# 格式：名称|版本|链接（# 开头为注释）`,
    ];
    for (const f of list) {
      const name = f.name.replace(/\|/g, ' ');
      const ver = (f.version || '').replace(/\|/g, '');
      const url = (f.sourceUrl || '').replace(/\|/g, '');
      lines.push(`${name}|${ver}|${url}`);
    }
    const dir = await ensureDir();
    const file = new File(dir, `ryp0-favorites-${Date.now()}.txt`);
    file.write(lines.join('\n'));
    const Sharing = await import('expo-sharing');
    if (!(await Sharing.isAvailableAsync())) throw new Error('当前设备不支持分享');
    await Sharing.shareAsync(file.uri, { dialogTitle: '导出我的收藏' });
    return file.uri;
  },
  importFromListFile: async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/plain', 'application/octet-stream'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return 0;
    const asset = result.assets[0];
    const text = await new File(asset.uri).text();
    const dir = await ensureDir();
    let count = 0;
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const parts = line.split('|').map(p => p.trim());
      const url = parts[parts.length - 1];
      if (!/^https?:\/\//i.test(url)) continue;
      const name = parts.length >= 3 ? parts.slice(0, -2).join('|') : undefined;
      const version = parts.length >= 3 ? parts[parts.length - 2] : undefined;
      try {
        const id = `fav-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const dest = new File(dir, `${id}.ipa`);
        const downloaded = await robustDownload(url, dest);
        const filename = name || url.split('/').pop()?.split('?')[0] || `${id}.ipa`;
        const fav: FavoriteApp = {
          id,
          name: name || cleanName(filename),
          bundleIdentifier: `local.favorite.${id}`,
          version: version || extractVersion(filename),
          fileUri: downloaded.uri,
          size: downloaded.size ?? 0,
          importDate: new Date().toISOString(),
          sourceUrl: url,
        };
        const list = [...get().favorites, fav];
        await persist(list);
        set({ favorites: list });
        count++;
      } catch { }
    }
    if (!count) throw new Error('文件中没有可导入的有效链接');
    return count;
  },
  rename: async (id: string, name: string) => {
    const list = get().favorites.map(f => f.id === id ? { ...f, name } : f);
    await persist(list);
    set({ favorites: list });
  },
  clear: async () => {
    for (const f of get().favorites) {
      try { new File(f.fileUri).delete(); } catch { }
    }
    await persist([]);
    set({ favorites: [] });
  },
}));
