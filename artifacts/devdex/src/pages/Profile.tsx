import React from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetUserGames,
  getGetUserGamesQueryKey,
  useDeleteGame,
  getListGamesQueryKey,
  type Game,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useUserProfile, usePlayHistory, useFriendStatus, useSendFriendRequest, useAcceptFriendRequest, useDeclineFriendRequest, useRemoveFriend, useUserBadges } from "@/lib/extra-api";
import CharacterViewer from "@/components/ui/CharacterViewer";
import GameCard from "@/components/ui/GameCard";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { UserCircle, Calendar, PlusSquare, Gamepad2, UserPlus, MessageCircle, Award } from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const { id } = useParams();
  const userId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [gameToDelete, setGameToDelete] = React.useState<Game | null>(null);

  const { data: games, isLoading: gamesLoading } = useGetUserGames(userId, {
    query: {
      enabled: !!userId,
      queryKey: getGetUserGamesQueryKey(userId)
    }
  });

  const { data: user, isLoading: userLoading, error } = useUserProfile(userId);
  const isLoading = userLoading || gamesLoading;

  const deleteGame = useDeleteGame({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUserGamesQueryKey(userId) });
        queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
        toast({ title: "Oyun silindi" });
        setGameToDelete(null);
      },
      onError: () => {
        toast({
          title: "Oyun silinemedi",
          description: "Bir hata oluştu, lütfen tekrar dene.",
          variant: "destructive",
        });
      },
    },
  });

  const isOwnProfile = currentUser?.id === userId;

  const { data: playHistory } = usePlayHistory(userId);
  const { data: badges } = useUserBadges(userId);
  const { data: friendStatus } = useFriendStatus(userId);
  const sendFriendRequest = useSendFriendRequest();
  const acceptFriendRequest = useAcceptFriendRequest();
  const declineFriendRequest = useDeclineFriendRequest();
  const removeFriend = useRemoveFriend();

  const handleSendFriendRequest = () => {
    sendFriendRequest.mutate(userId, {
      onSuccess: () => toast({ title: "Arkadaşlık isteği gönderildi" }),
      onError: (err: any) => toast({ title: "Gönderilemedi", description: err?.data?.error, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center min-h-[60vh]"><Loader /></div>;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4 text-foreground">User Not Found</h1>
        <p className="text-muted-foreground">The requested profile could not be located.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 flex-1">
      {/* Profile Header */}
      <div className="bg-card border border-border rounded-3xl p-8 mb-12 flex flex-col md:flex-row items-center md:items-start gap-8 shadow-sm">
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-secondary border-4 border-background overflow-hidden shadow-sm flex-shrink-0">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <UserCircle className="w-20 h-20 text-muted-foreground" />
            </div>
          )}
        </div>

        {user?.avatarItemId && (
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-secondary/50 border border-border overflow-hidden shadow-sm">
              <CharacterViewer equippedImageUrl={user.avatarUrl} className="w-full h-full" />
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">3D Önizleme</span>
          </div>
        )}
        
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight text-foreground">
            {user?.username || (isOwnProfile ? currentUser?.username : "Unknown User")}
          </h1>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-muted-foreground font-medium">
            <div className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full border border-border">
              <Calendar className="w-4 h-4" />
              Joined {user ? format(new Date(user.createdAt), "yyyy") : "Unknown"}
            </div>
            <div className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full border border-border">
              <Gamepad2 className="w-4 h-4" />
              {games?.length || 0} Games
            </div>
          </div>
        </div>
        
        {isOwnProfile ? (
          <div>
            <Button className="font-bold shadow-sm" onClick={() => setLocation("/submit")}>
              <PlusSquare className="w-4 h-4 mr-2" />
              Submit Game
            </Button>
          </div>
        ) : currentUser ? (
          <div className="flex flex-col gap-2">
            {friendStatus?.status === "none" && (
              <Button className="font-bold shadow-sm" onClick={handleSendFriendRequest} disabled={sendFriendRequest.isPending}>
                <UserPlus className="w-4 h-4 mr-2" /> Add Friend
              </Button>
            )}
            {friendStatus?.status === "pending_sent" && (
              <Button variant="outline" disabled className="font-bold">
                İstek Gönderildi
              </Button>
            )}
            {friendStatus?.status === "pending_received" && friendStatus.friendshipId && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => acceptFriendRequest.mutate(friendStatus.friendshipId!, { onSuccess: () => toast({ title: "Arkadaş oldunuz" }) })}
                >
                  Kabul Et
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => declineFriendRequest.mutate(friendStatus.friendshipId!)}
                >
                  Reddet
                </Button>
              </div>
            )}
            {friendStatus?.status === "friends" && (
              <div className="flex gap-2">
                <Button className="font-bold shadow-sm" onClick={() => setLocation(`/messages/${userId}`)}>
                  <MessageCircle className="w-4 h-4 mr-2" /> Message
                </Button>
                {friendStatus.friendshipId && (
                  <Button
                    variant="outline"
                    onClick={() => removeFriend.mutate(friendStatus.friendshipId!, { onSuccess: () => toast({ title: "Arkadaşlıktan çıkarıldı" }) })}
                  >
                    Arkadaşlıktan Çıkar
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {badges && badges.length > 0 && (
        <div className="space-y-6 mb-12">
          <h2 className="text-2xl font-bold text-foreground">Badges</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {badges.map((badge: any) => (
              <div key={`${badge.badgeId}-${badge.gameId}`} className="relative rounded-xl overflow-hidden border border-border shadow-sm group aspect-square">
                {badge.gameCoverImageUrl ? (
                  <img src={badge.gameCoverImageUrl} alt={badge.gameTitle} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center">
                    <Gamepad2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <p className="text-white text-xs font-bold leading-tight">{badge.label}</p>
                  <p className="text-white/70 text-[10px] truncate">{badge.gameTitle}</p>
                </div>
                <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full p-1 shadow-sm">
                  <Award className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {playHistory && playHistory.length > 0 && (
        <div className="space-y-6 mb-12">
          <h2 className="text-2xl font-bold text-foreground">Recently Played</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {playHistory.map((game: any) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      )}

      {/* User Games */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">
          Published Games
        </h2>
        
        {games && games.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {games.map((game: any) => (
              <GameCard
                key={game.id}
                game={game}
                onDelete={isOwnProfile ? (g) => setGameToDelete(g) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Gamepad2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">No Games Found</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              This user hasn't published any games yet.
            </p>
            {isOwnProfile && (
              <Button variant="outline" className="bg-background" onClick={() => setLocation("/submit")}>
                Publish First Game
              </Button>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={!!gameToDelete} onOpenChange={(open) => !open && setGameToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bu oyunu silmek istediğine emin misin?</AlertDialogTitle>
            <AlertDialogDescription>
              "{gameToDelete?.title}" kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteGame.isPending}
              onClick={() => {
                if (gameToDelete) {
                  deleteGame.mutate({ id: gameToDelete.id });
                }
              }}
            >
              {deleteGame.isPending ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
