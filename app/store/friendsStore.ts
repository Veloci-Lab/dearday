// app/store/friendsStore.ts
import { create } from "zustand";

interface Friend {
  profile_id: number;
  nickname: string;
  avatar_url: string | null;
}

interface FriendsState {
  friends: Friend[];
  addFriend: (friend: Friend) => void;
  removeFriend: (profile_id: number) => void;
}

export const useFriendsStore = create<FriendsState>((set) => ({
  friends: [],
  addFriend: (friend: Friend) =>
    set((state: FriendsState) => ({ friends: [friend, ...state.friends] })),
  removeFriend: (profile_id: number) =>
    set((state: FriendsState) => ({
      friends: state.friends.filter((f: Friend) => f.profile_id !== profile_id),
    })),
}));
