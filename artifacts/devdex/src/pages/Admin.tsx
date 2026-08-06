import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useAdminUsers, useUpdateAdminUser, useBanUser, useUnbanUser, useAdminReports, useDismissReport, useAdminDeleteGame } from "@/lib/extra-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Coins, Flag, Trash2, X } from "lucide-react";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: users, isLoading } = useAdminUsers();
  const updateUser = useUpdateAdminUser();
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();
  const [dexbuxDraft, setDexbuxDraft] = useState<Record<number, string>>({});
  const { data: reports, isLoading: reportsLoading } = useAdminReports();
  const dismissReport = useDismissReport();
  const adminDeleteGame = useAdminDeleteGame();

  React.useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  if (authLoading || !user?.isAdmin) {
    return <div className="flex-1 flex items-center justify-center min-h-[60vh]"><Loader /></div>;
  }

  function toggleAdmin(id: number, current: boolean) {
    updateUser.mutate(
      { id, isAdmin: !current },
      {
        onSuccess: () => toast({ title: "Güncellendi" }),
        onError: (err: any) => toast({ title: "Güncellenemedi", description: err?.data?.error, variant: "destructive" }),
      },
    );
  }

  function handleBan(id: number) {
    banUser.mutate(
      { id, hours: 24 },
      {
        onSuccess: () => toast({ title: "Kullanıcı 24 saatliğine banlandı" }),
        onError: (err: any) => toast({ title: "Banlanamadı", description: err?.data?.error, variant: "destructive" }),
      },
    );
  }

  function handleUnban(id: number) {
    unbanUser.mutate(id, {
      onSuccess: () => toast({ title: "Ban kaldırıldı" }),
      onError: () => toast({ title: "Kaldırılamadı", variant: "destructive" }),
    });
  }

  function setDexbux(id: number) {
    const raw = dexbuxDraft[id];
    const value = parseInt(raw, 10);
    if (isNaN(value) || value < 0) {
      toast({ title: "Geçerli bir sayı gir", variant: "destructive" });
      return;
    }
    updateUser.mutate(
      { id, dexbux: value },
      {
        onSuccess: () => toast({ title: "DexBux güncellendi" }),
        onError: () => toast({ title: "Güncellenemedi", variant: "destructive" }),
      },
    );
  }

  function handleDismissReport(id: number) {
    dismissReport.mutate(id, {
      onSuccess: () => toast({ title: "Rapor kapatıldı" }),
      onError: () => toast({ title: "Kapatılamadı", variant: "destructive" }),
    });
  }

  function handleDeleteReportedGame(reportId: number, gameId: number) {
    adminDeleteGame.mutate(gameId, {
      onSuccess: () => {
        toast({ title: "Oyun silindi" });
        dismissReport.mutate(reportId);
      },
      onError: () => toast({ title: "Silinemedi", variant: "destructive" }),
    });
  }

  return (
    <div className="container mx-auto px-4 py-12 flex-1">
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3 mb-10">
        <ShieldCheck className="w-8 h-8 text-amber-500" />
        Admin Panel
      </h1>

      <div className="mb-10">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Flag className="w-5 h-5 text-destructive" /> Reports
          {reports && reports.length > 0 && (
            <span className="text-xs font-bold bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">
              {reports.length}
            </span>
          )}
        </h2>

        {reportsLoading ? (
          <div className="flex items-center justify-center py-10"><Loader /></div>
        ) : reports && reports.length > 0 ? (
          <div className="space-y-3">
            {reports.map((r: any) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-secondary shrink-0">
                  {r.game.coverImageUrl && (
                    <img src={r.game.coverImageUrl} alt={r.game.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/games/${r.game.id}`} className="font-bold text-foreground hover:text-primary transition-colors">
                    {r.game.title}
                  </Link>
                  <p className="text-sm text-muted-foreground truncate">
                    <span className="font-medium">{r.reporter.username}</span>: {r.reason}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handleDismissReport(r.id)} disabled={dismissReport.isPending}>
                    <X className="w-3.5 h-3.5 mr-1" /> Reddet
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteReportedGame(r.id, r.game.id)} disabled={adminDeleteGame.isPending}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Oyunu Sil
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Bekleyen rapor yok.</p>
        )}
      </div>

      <h2 className="text-xl font-bold text-foreground mb-4">Users</h2>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader /></div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-4">Kullanıcı</th>
                <th className="p-4">Email</th>
                <th className="p-4">DexBux</th>
                <th className="p-4">Admin</th>
                <th className="p-4">Ban</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="p-4 font-semibold text-foreground">{u.username}</td>
                  <td className="p-4 text-muted-foreground">{u.email}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-500" />
                      <Input
                        type="number"
                        className="w-24 h-8"
                        defaultValue={u.dexbux}
                        onChange={(e) =>
                          setDexbuxDraft((prev) => ({ ...prev, [u.id]: e.target.value }))
                        }
                      />
                      <Button size="sm" variant="outline" onClick={() => setDexbux(u.id)} disabled={updateUser.isPending}>
                        Kaydet
                      </Button>
                    </div>
                  </td>
                  <td className="p-4">
                    <Button
                      size="sm"
                      variant={u.isAdmin ? "default" : "outline"}
                      onClick={() => toggleAdmin(u.id, u.isAdmin)}
                      disabled={updateUser.isPending}
                    >
                      {u.isAdmin ? "Admin ✓" : "Admin yap"}
                    </Button>
                  </td>
                  <td className="p-4">
                    {u.isAdmin ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (u as any).bannedUntil && new Date((u as any).bannedUntil) > new Date() ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-destructive font-semibold">
                          {new Date((u as any).bannedUntil).toLocaleString("tr-TR")}'e kadar
                        </span>
                        <Button size="sm" variant="outline" onClick={() => handleUnban(u.id)} disabled={unbanUser.isPending}>
                          Banı Kaldır
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="destructive" onClick={() => handleBan(u.id)} disabled={banUser.isPending}>
                        24s Banla
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
