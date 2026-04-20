import { create } from 'zustand';

export type Platform = 'brain' | 'note' | 'x';
export type BlockType = 'title' | 'h2' | 'h3' | 'text' | 'cta';

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: string;
}

interface EditorState {
  platform: Platform;
  setPlatform: (platform: Platform) => void;
  blocks: ContentBlock[];
  setBlocks: (blocks: ContentBlock[]) => void;
  addBlock: (type: BlockType, content?: string) => void;
  updateBlock: (id: string, content: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  platform: 'brain',
  setPlatform: (platform) => set({ platform }),
  blocks: [
    { id: '1', type: 'title', content: 'AIが教える、最強のコンテンツ作成術' },
    { id: '2', type: 'h2', content: 'なぜ今、AIツールが必要なのか？' },
    { id: '3', type: 'text', content: '現代のクリエイターは、複数のプラットフォームを使い分ける必要があります...' },
  ],
  setBlocks: (blocks) => set({ blocks }),
  addBlock: (type, content = '') =>
    set((state) => ({
      blocks: [...state.blocks, { id: Math.random().toString(36).substr(2, 9), type, content }],
    })),
  updateBlock: (id, content) =>
    set((state) => ({
      blocks: state.blocks.map((b) => (b.id === id ? { ...b, content } : b)),
    })),
}));
