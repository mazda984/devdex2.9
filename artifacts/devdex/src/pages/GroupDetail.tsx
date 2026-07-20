import React from "react";
import { Link, useParams, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { 
  useGetGroup, 
  getGetGroupQueryKey,
  useJoinGroup,
  useLeaveGroup
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/button";
import { Users, Image as ImageIcon, Lock, Globe, ArrowLeft, Calendar, UserCircle, Shield } from "lucide-react";
import { format } from "date-fns";

export default function GroupDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: group, isLoading, error } = useGetGroup(id, {
    query: {
      enabled: id > 0,
      queryKey: getGetGroupQueryKey(id)
    }
  });

  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="container mx-auto px-4 py-24 flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
          <Users className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Group not found</h2>
        <p className="text-muted-foreground mb-8 max-w-sm">
          The group you're looking for doesn't exist or has been removed.
        </p>
        <Link href="/groups">
          <Button variant="secondary" className="font-bold rounded-lg gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Groups
          </Button>
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === group.authorId;

  const handleJoin = () => {
    if (!user) {
      setLocation("/login");
      return;
    }
    joinGroup.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Joined group!" });
        queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(id) });
      },
      onError: () => {
        toast({ title: "Failed to join group", variant: "destructive" });
      }
    });
  };

  const handleLeave = () => {
    leaveGroup.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Left group." });
        queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(id) });
      },
      onError: () => {
        toast({ title: "Failed to leave group", variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <div className="relative w-full h-64 md:h-80 bg-secondary overflow-hidden border-b border-border">
        {group.coverImageUrl ? (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl scale-110"
              style={{ backgroundImage: `url(${group.coverImageUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
            <div className="container mx-auto px-4 h-full relative flex items-end pb-8">
              <div className="flex flex-col md:flex-row md:items-end gap-6 w-full">
                <div className="w-28 h-28 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 border-background bg-card shadow-xl shrink-0 z-10">
                  <img src={group.coverImageUrl} alt={group.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 mb-2">
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2 md:mb-3">
                    {group.isPublic ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/80 text-secondary-foreground border border-border/50 backdrop-blur-sm">
                        <Globe className="w-3.5 h-3.5" /> Public Group
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/80 text-secondary-foreground border border-border/50 backdrop-blur-sm">
                        <Lock className="w-3.5 h-3.5" /> Private Group
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/80 text-secondary-foreground border border-border/50 backdrop-blur-sm">
                      <Users className="w-3.5 h-3.5" /> {group.memberCount} Members
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-extrabold text-foreground drop-shadow-sm mb-1 line-clamp-1">{group.name}</h1>
                  <p className="text-muted-foreground font-medium text-sm md:text-base">Created by <span className="text-foreground">{group.author.username}</span></p>
                </div>
                <div className="md:mb-2 shrink-0 self-start md:self-end mt-4 md:mt-0 w-full md:w-auto">
                  {!isOwner && (
                    group.isMember ? (
                      <Button variant="outline" onClick={handleLeave} disabled={leaveGroup.isPending} className="font-bold rounded-lg shadow-sm w-full md:w-auto border-border">
                        {leaveGroup.isPending ? "Leaving..." : "Leave Group"}
                      </Button>
                    ) : (
                      <Button onClick={handleJoin} disabled={joinGroup.isPending} className="font-bold rounded-lg shadow-sm w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                        {joinGroup.isPending ? "Joining..." : "Join Group"}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 bg-gradient-to-b from-secondary/50 to-background relative">
              <div className="absolute inset-0 bg-grid-white/5 bg-[length:32px_32px]" />
            </div>
            <div className="container mx-auto px-4 h-full relative flex items-end pb-8 -mt-20">
               <div className="flex flex-col md:flex-row md:items-end gap-6 w-full">
                <div className="w-28 h-28 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 border-background bg-secondary flex items-center justify-center shadow-xl shrink-0 z-10">
                  <ImageIcon className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground/30" />
                </div>
                <div className="flex-1 mb-2">
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2 md:mb-3">
                    {group.isPublic ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/80 text-secondary-foreground border border-border/50 backdrop-blur-sm">
                        <Globe className="w-3.5 h-3.5" /> Public Group
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/80 text-secondary-foreground border border-border/50 backdrop-blur-sm">
                        <Lock className="w-3.5 h-3.5" /> Private Group
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/80 text-secondary-foreground border border-border/50 backdrop-blur-sm">
                      <Users className="w-3.5 h-3.5" /> {group.memberCount} Members
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-extrabold text-foreground drop-shadow-sm mb-1 line-clamp-1">{group.name}</h1>
                  <p className="text-muted-foreground font-medium text-sm md:text-base">Created by <span className="text-foreground">{group.author.username}</span></p>
                </div>
                <div className="md:mb-2 shrink-0 self-start md:self-end mt-4 md:mt-0 w-full md:w-auto">
                  {!isOwner && (
                    group.isMember ? (
                      <Button variant="outline" onClick={handleLeave} disabled={leaveGroup.isPending} className="font-bold rounded-lg shadow-sm w-full md:w-auto border-border">
                        {leaveGroup.isPending ? "Leaving..." : "Leave Group"}
                      </Button>
                    ) : (
                      <Button onClick={handleJoin} disabled={joinGroup.isPending} className="font-bold rounded-lg shadow-sm w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                        {joinGroup.isPending ? "Joining..." : "Join Group"}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 py-8">
        <Link href="/groups" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Groups
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-2xl font-bold mb-4">About</h2>
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {group.description || "This group hasn't provided a description yet."}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Members</h2>
                <span className="px-2.5 py-1 bg-secondary text-secondary-foreground rounded-md text-sm font-semibold">
                  {group.members?.length || 0}
                </span>
              </div>
              
              {group.members && group.members.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {group.members.map((member) => {
                    const isGroupOwner = member.userId === group.authorId;
                    return (
                      <div key={member.id} className="flex items-center gap-4 bg-card border border-border p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <Link href={`/profile/${member.userId}`} className="shrink-0">
                          <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center overflow-hidden">
                            {member.user?.avatarUrl ? (
                              <img src={member.user.avatarUrl} alt={member.user.username} className="w-full h-full object-cover" />
                            ) : (
                              <UserCircle className="w-8 h-8 text-muted-foreground" />
                            )}
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/profile/${member.userId}`}>
                            <h4 className="font-bold text-base truncate hover:text-primary transition-colors">
                              {member.user?.username || "Unknown User"}
                            </h4>
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            {isGroupOwner ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">
                                <Shield className="w-3 h-3" /> Owner
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                                Member
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs text-muted-foreground flex items-center gap-1" title={new Date(member.joinedAt).toLocaleString()}>
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(member.joinedAt), "MMM d, yyyy")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-card rounded-xl border border-border">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground font-medium">No members yet.</p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm sticky top-24">
              <h3 className="font-bold text-lg mb-4">Group Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" /> Members
                  </span>
                  <span className="font-semibold text-sm">{group.memberCount}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4" /> Created
                  </span>
                  <span className="font-semibold text-sm">{format(new Date(group.createdAt), "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground flex items-center gap-2 text-sm">
                    {group.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    Privacy
                  </span>
                  <span className="font-semibold text-sm">{group.isPublic ? "Public" : "Private"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
