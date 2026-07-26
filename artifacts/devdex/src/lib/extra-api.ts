import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch, type User } from "@workspace/api-client-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CatalogItem {
  id: number;
  name: string;
  imageUrl: string;
  price: number;
  creatorId: number;
  creator: User;
  createdAt: string;
}

export interface GroupPost {
  id: number;
  groupId: number;
  authorId: number;
  content: string;
  author: User;
  createdAt: string;
}

export interface GameComment {
  id: number;
  gameId: number;
  authorId: number;
  content: string;
  author: User;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const catalogKeys = {
  list: () => ["catalog"] as const,
  mine: () => ["catalog", "mine"] as const,
};

export const groupPostKeys = {
  list: (groupId: number) => ["group-posts", groupId] as const,
};

export const gameCommentKeys = {
  list: (gameId: number) => ["game-comments", gameId] as const,
};

export const adminKeys = {
  users: () => ["admin", "users"] as const,
};

export const studioSceneKeys = {
  mine: () => ["studio-scenes", "mine"] as const,
  bySlug: (slug: string) => ["studio-scenes", slug] as const,
};

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export function useCatalogItems() {
  return useQuery({
    queryKey: catalogKeys.list(),
    queryFn: () => customFetch<CatalogItem[]>("/api/catalog"),
  });
}

export function useMyCatalogItems() {
  return useQuery({
    queryKey: catalogKeys.mine(),
    queryFn: () => customFetch<CatalogItem[]>("/api/catalog/mine"),
  });
}

export function useCreateCatalogItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; imageUrl: string; price: number }) =>
      customFetch<CatalogItem>("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.list() });
      queryClient.invalidateQueries({ queryKey: catalogKeys.mine() });
    },
  });
}

export function useBuyCatalogItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      customFetch<{ success: boolean; user: User }>(`/api/catalog/${itemId}/buy`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.mine() });
    },
  });
}

export function useEquipCatalogItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      customFetch<{ user: User }>(`/api/catalog/${itemId}/equip`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.mine() });
    },
  });
}

export interface DiscoveryData {
  activelyPlayed: any[];
  popular: any[];
  recommended: any[];
}

export function useGameDiscovery() {
  return useQuery({
    queryKey: ["games", "discovery"] as const,
    queryFn: () => customFetch<DiscoveryData>("/api/games/discovery"),
  });
}

// ---------------------------------------------------------------------------
// Group posts
// ---------------------------------------------------------------------------

export function useGroupPosts(groupId: number) {
  return useQuery({
    queryKey: groupPostKeys.list(groupId),
    queryFn: () => customFetch<GroupPost[]>(`/api/groups/${groupId}/posts`),
    enabled: !!groupId,
  });
}

export function useCreateGroupPost(groupId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      customFetch<GroupPost>(`/api/groups/${groupId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupPostKeys.list(groupId) });
    },
  });
}

export function useDeleteGroupPost(groupId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: number) =>
      customFetch<{ success: boolean }>(`/api/groups/${groupId}/posts/${postId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupPostKeys.list(groupId) });
    },
  });
}

export function useDeleteGroup() {
  return useMutation({
    mutationFn: (groupId: number) =>
      customFetch<{ success: boolean }>(`/api/groups/${groupId}`, { method: "DELETE" }),
  });
}

export function useGroupGames(groupId: number) {
  return useQuery({
    queryKey: ["group-games", groupId] as const,
    queryFn: () => customFetch<any[]>(`/api/groups/${groupId}/games`),
    enabled: !!groupId,
  });
}

export function useAddGroupGame(groupId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gameId: number) =>
      customFetch<any>(`/api/groups/${groupId}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-games", groupId] });
    },
  });
}

export function useRemoveGroupGame(groupId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gameId: number) =>
      customFetch<{ success: boolean }>(`/api/groups/${groupId}/games/${gameId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-games", groupId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Game comments
// ---------------------------------------------------------------------------

export function useGameComments(gameId: number) {
  return useQuery({
    queryKey: gameCommentKeys.list(gameId),
    queryFn: () => customFetch<GameComment[]>(`/api/games/${gameId}/comments`),
    enabled: !!gameId,
  });
}

export function useCreateGameComment(gameId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      customFetch<GameComment>(`/api/games/${gameId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameCommentKeys.list(gameId) });
    },
  });
}

export function useDeleteGameComment(gameId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) =>
      customFetch<{ success: boolean }>(`/api/games/${gameId}/comments/${commentId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameCommentKeys.list(gameId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn: () => customFetch<User[]>("/api/admin/users"),
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: number; isAdmin?: boolean; dexbux?: number }) =>
      customFetch<User>(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useAdminDeleteGame() {
  return useMutation({
    mutationFn: (gameId: number) =>
      customFetch<{ success: boolean }>(`/api/admin/games/${gameId}`, { method: "DELETE" }),
  });
}

export function useAdminDeleteGroup() {
  return useMutation({
    mutationFn: (groupId: number) =>
      customFetch<{ success: boolean }>(`/api/admin/groups/${groupId}`, { method: "DELETE" }),
  });
}

// ---------------------------------------------------------------------------
// Studio 3D — publish a scene as a free, public space with a random slug
// ---------------------------------------------------------------------------

export interface PublishedScene {
  slug: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StudioSceneWithData extends PublishedScene {
  data: any[];
  author?: User;
}

export function useMyPublishedScenes() {
  return useQuery({
    queryKey: studioSceneKeys.mine(),
    queryFn: () => customFetch<PublishedScene[]>("/api/studio/scenes/mine"),
  });
}

export function usePublishStudioScene() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (objects: unknown[]) =>
      customFetch<StudioSceneWithData>("/api/studio/scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objects }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studioSceneKeys.mine() });
    },
  });
}

export function useStudioSceneBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: studioSceneKeys.bySlug(slug ?? ""),
    queryFn: () => customFetch<StudioSceneWithData>(`/api/studio/scenes/${slug}`),
    enabled: !!slug,
    retry: false,
  });
}
