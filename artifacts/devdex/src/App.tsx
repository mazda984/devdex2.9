import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import { I18nProvider } from '@/lib/i18n';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Home from '@/pages/Home';
import Games from '@/pages/Games';
import GameDetail from '@/pages/GameDetail';
import SubmitGame from '@/pages/SubmitGame';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Profile from '@/pages/Profile';
import Studio from '@/pages/Studio';
import Studio2D from '@/pages/Studio2D';
import Studio3D from '@/pages/Studio3D';
import Play3D from '@/pages/Play3D';
import Messages from '@/pages/Messages';
import Settings from '@/pages/Settings';
import Groups from '@/pages/Groups';
import GroupDetail from '@/pages/GroupDetail';
import Catalog from '@/pages/Catalog';
import Admin from '@/pages/Admin';
import ResetPassword from '@/pages/ResetPassword';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetMeQueryKey } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function GoogleAuthRedirectHandler() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("googleAuth");
    if (!status) return;

    if (status === "success") {
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "Google ile giriş yapıldı" });
    } else if (status === "banned") {
      toast({ title: "Hesabın askıya alınmış", variant: "destructive" });
    } else {
      toast({ title: "Google ile giriş başarısız oldu", variant: "destructive" });
    }

    params.delete("googleAuth");
    const newSearch = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""));
  }, []);

  return null;
}

function Router() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <Navbar />
      <GoogleAuthRedirectHandler />
      <main className="flex-1 flex flex-col">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/games" component={Games} />
          <Route path="/games/:id" component={GameDetail} />
          <Route path="/submit" component={SubmitGame} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/profile/:id" component={Profile} />
          <Route path="/studio" component={Studio} />
          <Route path="/studio/2d" component={Studio2D} />
          <Route path="/studio/3d" component={Studio3D} />
          <Route path="/play/:slug" component={Play3D} />
          <Route path="/messages" component={Messages} />
          <Route path="/messages/:userId" component={Messages} />
          <Route path="/settings" component={Settings} />
          <Route path="/groups" component={Groups} />
          <Route path="/groups/:id" component={GroupDetail} />
          <Route path="/catalog" component={Catalog} />
          <Route path="/admin" component={Admin} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
