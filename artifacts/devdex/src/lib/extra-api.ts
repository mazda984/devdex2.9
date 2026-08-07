import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch, getGetMeQueryKey, type User } from "@workspace/api-client-react";

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.mine() });
      queryClient.setQueryData(getGetMeQueryKey(), data.user);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
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
// Badges
// ---------------------------------------------------------------------------

export interface Badge {
  badgeId: string;
  label: string;
  threshold: number;
  gameId: number;
  gameTitle: string;
  gameCoverImageUrl: string | null;
  gameSlug: string;
  playCount: number;
}

export function useUserBadges(userId: number) {
  return useQuery({
    queryKey: ["badges", userId] as const,
    queryFn: () => customFetch<Badge[]>(`/api/users/${userId}/badges`),
    enabled: !!userId,
  });
}

// ---------------------------------------------------------------------------
// Reports / content safety
// ---------------------------------------------------------------------------

export function useReportGame() {
  return useMutation({
    mutationFn: ({ gameId, reason }: { gameId: number; reason: string }) =>
      customFetch<{ success: boolean }>(`/api/games/${gameId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }),
  });
}

export function useAdminReports() {
  return useQuery({
    queryKey: ["admin-reports"] as const,
    queryFn: () => customFetch<any[]>("/api/admin/reports"),
  });
}

export function useDismissReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch<{ success: boolean }>(`/api/admin/reports/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reports"] }),
  });
}

export function useUserProfile(userId: number) {
  return useQuery({
    queryKey: ["users", userId] as const,
    queryFn: () => customFetch<User>(`/api/users/${userId}`),
    enabled: !!userId,
    retry: false,
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
// Play history
// ---------------------------------------------------------------------------

export function usePlayHistory(userId: number) {
  return useQuery({
    queryKey: ["play-history", userId] as const,
    queryFn: () => customFetch<any[]>(`/api/users/${userId}/play-history`),
    enabled: !!userId,
  });
}

// ---------------------------------------------------------------------------
// Friends
// ---------------------------------------------------------------------------

export type FriendStatus = "self" | "none" | "pending_sent" | "pending_received" | "friends";

export function useFriendStatus(userId: number) {
  return useQuery({
    queryKey: ["friend-status", userId] as const,
    queryFn: () => customFetch<{ status: FriendStatus; friendshipId?: number }>(`/api/friends/status/${userId}`),
    enabled: !!userId,
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) =>
      customFetch<any>("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      }),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ["friend-status", userId] });
    },
  });
}

export function useFriendRequests() {
  return useQuery({
    queryKey: ["friend-requests"] as const,
    queryFn: () => customFetch<any[]>("/api/friends/requests"),
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: number) => customFetch<any>(`/api/friends/${friendshipId}/accept`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["friends-mine"] });
    },
  });
}

export function useDeclineFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: number) => customFetch<any>(`/api/friends/${friendshipId}/decline`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friend-requests"] }),
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: number) => customFetch<any>(`/api/friends/${friendshipId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends-mine"] }),
  });
}

export function useMyFriends() {
  return useQuery({
    queryKey: ["friends-mine"] as const,
    queryFn: () => customFetch<User[]>("/api/friends/mine"),
  });
}

// ---------------------------------------------------------------------------
// Direct messages
// ---------------------------------------------------------------------------

export function useConversation(userId: number) {
  return useQuery({
    queryKey: ["messages", userId] as const,
    queryFn: () => customFetch<any[]>(`/api/messages/${userId}`),
    enabled: !!userId,
    refetchInterval: 4000,
  });
}

export function useSendMessage(userId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      customFetch<any>(`/api/messages/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", userId] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useInbox() {
  return useQuery({
    queryKey: ["inbox"] as const,
    queryFn: () => customFetch<any[]>("/api/messages"),
  });
}

// ---------------------------------------------------------------------------
// Admin — ban/unban
// ---------------------------------------------------------------------------

export function useBanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hours }: { id: number; hours: number }) =>
      customFetch<User>(`/api/admin/users/${id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.users() }),
  });
}

export function useUnbanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch<User>(`/api/admin/users/${id}/unban`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.users() }),
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
