import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2 } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || newPassword.length < 6) {
      toast({ title: "Email gir ve en az 6 karakterlik bir şifre yaz", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      const res = await fetch(`${apiUrl}/api/system/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), newPassword }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast({ title: "Şifre değiştirildi! Şimdi giriş yapabilirsin." });
        setLocation("/login");
      } else {
        toast({ title: "Sıfırlanamadı", description: data.error || "Bilinmeyen bir hata oluştu.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({
        title: "Bağlantı hatası",
        description: `${err?.name || "Error"}: ${err?.message || String(err)}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-primary p-4 rounded-2xl text-primary-foreground shadow-sm">
            <KeyRound className="w-10 h-10" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-foreground">
          Şifre Sıfırla
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Sadece site sahibi hesaplar için çalışır.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-border space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground">Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12 bg-background border-border mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground">Yeni Şifre</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="En az 6 karakter"
              className="h-12 bg-background border-border mt-1"
            />
          </div>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full font-bold h-12 text-base">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Şifreyi Sıfırla"}
          </Button>
        </div>
      </div>
    </div>
  );
}
