import { create } from "zustand";

export interface ListeningSessionInput {
  roomId: string;
  /** The other participant: the invitee for the host, the host for a member. */
  peerName: string | null;
}

export interface ListeningSessionState {
  roomId: string | null;
  peerName: string | null;
  open: (input: ListeningSessionInput) => void;
  close: () => void;
}

/**
 * Which shared listening session the floating window should show.
 *
 * The window itself is mounted once in the app shell so it survives client-side
 * navigation; the friends page only opens or closes it through this store.
 */
export const useListeningSessionStore = create<ListeningSessionState>((set) => ({
  roomId: null,
  peerName: null,
  open: ({ roomId, peerName }) => set({ roomId, peerName }),
  close: () => set({ roomId: null, peerName: null }),
}));
