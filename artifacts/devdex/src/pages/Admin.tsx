import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useAdminUsers, useUpdateAdminUser } from "@/lib/extra-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Coins } from "lucide-react";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: users, isLoading } = useAdminUsers();
  const updateUser = useUpdateAdminUser();
  const [dexbuxDraft, setDexbuxDraft] = useState<Record<number, string>>({});

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
        onError: () => toast({ title: "Güncellenemedi", variant: "destructive" }),
      },
    );
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

  return (
    <div className="container mx-auto px-4 py-12 flex-1">
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3 mb-10">
        <ShieldCheck className="w-8 h-8 text-amber-500" />
        Admin Panel
      </h1>

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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
