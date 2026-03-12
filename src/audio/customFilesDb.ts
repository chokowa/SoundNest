import { set, get, del, keys } from 'idb-keyval';

export interface StoredCustomFile {
    id: string;
    name: string;
    blob: Blob;
}

export const customFilesDb = {
    async save(id: string, name: string, file: File | Blob): Promise<void> {
        const data: StoredCustomFile = { id, name, blob: file };
        await set(`custom_audio_${id}`, data);
    },

    async loadAll(): Promise<StoredCustomFile[]> {
        const allKeys = await keys();
        const fileKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith('custom_audio_'));
        const files: StoredCustomFile[] = [];
        for (const key of fileKeys) {
            const data = await get<StoredCustomFile>(key);
            if (data) files.push(data);
        }
        return files;
    },

    async delete(id: string): Promise<void> {
        await del(`custom_audio_${id}`);
    }
};
