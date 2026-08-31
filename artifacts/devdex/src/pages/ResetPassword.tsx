import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2, Mail, CheckCircle2, XCircle } from "lucide-react";

function apiBase() {
  return (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
}

// Step 1: request a reset email (no token in the URL yet).
function RequestResetForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast({ title: "Bir email adresi gir", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiBase()}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      // Always treat this as success from the UI's point of view - the backend
      // deliberately never reveals whether an email is registered/eligible.
      await res.json().catch(() => null);
      setSent(true);
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

  if (sent) {
    return (
      <div className="bg-card py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-border text-center space-y-3">
        <Mail className="w-10 h-10 mx-auto text-primary" />
        <p className="text-foreground font-semibold">Email'ini kontrol et</p>
        <p className="text-sm text-muted-foreground">
          Bu email adresine kayıtlı ve sıfırlama için uygun bir hesap varsa, birkaç dakika içinde bir
          doğrulama bağlantısı alacaksın. Bağlantı 30 dakika geçerli.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-border space-y-4">
      <div>
        <label className="text-sm font-semibold text-foreground">Email</label>
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="you@example.com"
          className="h-12 bg-background border-border mt-1"
        />
      </div>
      <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full font-bold h-12 text-base">
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sıfırlama Bağlantısı Gönder"}
      </Button>
    </div>
  );
}

// Step 2: a token is present in the URL (from the emailed link) - verify it,
// then let the person actually set a new password.
function SetNewPasswordForm({ token }: { token: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBase()}/api/auth/reset-password/verify?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        setValid(!!data.valid);
      } catch {
        setValid(false);
      } finally {
        setChecking(false);
      }
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Şifre en az 6 karakter olmalı", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiBase()}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
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

  if (checking) {
    return (
      <div className="bg-card py-10 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-border flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="bg-card py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-border text-center space-y-3">
        <XCircle className="w-10 h-10 mx-auto text-destructive" />
        <p className="text-foreground font-semibold">Bu bağlantının süresi dolmuş</p>
        <p className="text-sm text-muted-foreground">
          Bağlantı geçersiz, süresi dolmuş ya da zaten kullanılmış olabilir. Yeniden bir sıfırlama isteği
          gönder.
        </p>
        <Button variant="outline" className="w-full" onClick={() => setLocation("/reset-password")}>
          Yeniden İste
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-border space-y-4">
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500">
        <CheckCircle2 className="w-4 h-4" />
        Doğrulandı - yeni şifreni belirleyebilirsin.
      </div>
      <div>
        <label className="text-sm font-semibold text-foreground">Yeni Şifre</label>
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="En az 6 karakter"
          className="h-12 bg-background border-border mt-1"
        />
      </div>
      <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full font-bold h-12 text-base">
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Şifreyi Değiştir"}
      </Button>
    </div>
  );
}

export default function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get("token");

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
          {token ? "Yeni şifreni belirle." : "Email adresine bir doğrulama bağlantısı göndereceğiz."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {token ? <SetNewPasswordForm token={token} /> : <RequestResetForm />}
      </div>
    </div>
  );
}
