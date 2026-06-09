import { create } from 'zustand';

interface MessageStore {
  messages: string[];
  addMessage: (msg: string) => void;
  resetAll: () => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  messages: [],
  addMessage: (msg) => set((prev) => ({
    messages: [...prev.messages.slice(-3), msg],
  })),
  resetAll: () => set({ messages: [] }),
}));
