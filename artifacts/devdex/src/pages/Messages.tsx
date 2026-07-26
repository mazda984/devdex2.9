import React, { useState, useEffect, useRef } from "react";
import { Link, useParams } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  useInbox,
  useConversation,
  useSendMessage,
  useFriendRequests,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useMyFriends,
} from "@/lib/extra-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/Loader";
import { UserCircle, Send, MessageCircle, UserPlus2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Messages() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();

  if (userId) {
    return <Conversation otherUserId={parseInt(userId, 10)} />;
  }

  return <Inbox />;
}

function Inbox() {
  const { data: inbox, isLoading: inboxLoading } = useInbox();
  const { data: requests, isLoading: requestsLoading } = useFriendRequests();
  const { data: friends } = useMyFriends();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();

  const conversationUserIds = new Set((inbox ?? []).map((c: any) => c.user.id));
  const friendsWithoutConvo = (friends ?? []).filter((f: any) => !conversationUserIds.has(f.id));

  return (
    <div className="container mx-auto px-4 py-12 flex-1 max-w-3xl">
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-8 flex items-center gap-3">
        <MessageCircle className="w-8 h-8" /> Messages
      </h1>

      {requestsLoading ? null : requests && requests.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <UserPlus2 className="w-5 h-5" /> Friend Requests
          </h2>
          <div className="space-y-3">
            {requests.map((r: any) => (
              <div key={r.friendshipId} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                <Link href={`/profile/${r.from.id}`} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center">
                    {r.from.avatarUrl ? <img src={r.from.avatarUrl} className="w-full h-full object-cover" /> : <UserCircle className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <span className="font-semibold text-foreground">{r.from.username}</span>
                </Link>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => acceptRequest.mutate(r.friendshipId)}>Kabul Et</Button>
                  <Button size="sm" variant="outline" onClick={() => declineRequest.mutate(r.friendshipId)}>Reddet</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-lg font-bold text-foreground mb-3">Conversations</h2>
      {inboxLoading ? (
        <div className="py-12 flex justify-center"><Loader /></div>
      ) : (
        <div className="space-y-2">
          {inbox?.map((c: any) => (
            <Link key={c.user.id} href={`/messages/${c.user.id}`}>
              <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary transition-colors cursor-pointer">
                <div className="w-11 h-11 rounded-full bg-secondary overflow-hidden flex items-center justify-center shrink-0">
                  {c.user.avatarUrl ? <img src={c.user.avatarUrl} className="w-full h-full object-cover" /> : <UserCircle className="w-6 h-6 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{c.user.username}</p>
                  <p className="text-sm text-muted-foreground truncate">{c.lastMessage}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                </span>
              </div>
            </Link>
          ))}

          {friendsWithoutConvo.map((f: any) => (
            <Link key={f.id} href={`/messages/${f.id}`}>
              <div className="bg-card border border-dashed border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary transition-colors cursor-pointer">
                <div className="w-11 h-11 rounded-full bg-secondary overflow-hidden flex items-center justify-center shrink-0">
                  {f.avatarUrl ? <img src={f.avatarUrl} className="w-full h-full object-cover" /> : <UserCircle className="w-6 h-6 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{f.username}</p>
                  <p className="text-sm text-muted-foreground">Henüz mesaj yok — sohbeti başlat</p>
                </div>
              </div>
            </Link>
          ))}

          {(!inbox || inbox.length === 0) && friendsWithoutConvo.length === 0 && (
            <p className="text-muted-foreground text-center py-12">Henüz arkadaşın yok. Bir profile gidip arkadaşlık isteği gönder.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Conversation({ otherUserId }: { otherUserId: number }) {
  const { data: messages, isLoading } = useConversation(otherUserId);
  const sendMessage = useSendMessage(otherUserId);
  const { user: currentUser } = useAuth();
  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const handleSend = () => {
    if (!content.trim()) return;
    sendMessage.mutate(content.trim(), { onSuccess: () => setContent("") });
  };

  return (
    <div className="container mx-auto px-4 py-8 flex-1 max-w-2xl flex flex-col h-[calc(100dvh-64px)]">
      <Link href="/messages" className="text-sm text-muted-foreground hover:text-foreground mb-4">← Back to Messages</Link>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader /></div>
        ) : messages && messages.length > 0 ? (
          messages.map((m: any) => {
            const isMine = m.senderId === currentUser?.id;
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  {m.content}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-muted-foreground text-center py-12">Henüz mesaj yok, ilk mesajı sen gönder.</p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Bir mesaj yaz..."
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={sendMessage.isPending || !content.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
