import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth";
import { useCreateGame, getListGamesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Wrench, Image as ImageIcon, Link as LinkIcon, Tag } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  description: z.string().optional(),
  gameUrl: z.string().url("Must be a valid URL"),
  coverImageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  category: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function SubmitGame() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createGame = useCreateGame();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to submit a game.",
        variant: "destructive",
      });
      setLocation("/login");
    }
  }, [user, isAuthLoading, setLocation, toast]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      gameUrl: "",
      coverImageUrl: "",
      category: "Action",
    },
  });

  const onSubmit = (values: FormValues) => {
    // Convert empty strings to undefined to match API schema
    const submitData = {
      ...values,
      description: values.description || undefined,
      coverImageUrl: values.coverImageUrl || undefined,
      category: values.category || undefined,
    };

    createGame.mutate(
      { data: submitData },
      {
        onSuccess: (game) => {
          queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
          toast({
            title: "Game Submitted!",
            description: "Your game has been published to DevDex.",
          });
          setLocation(`/games/${game.id}`);
        },
        onError: (error) => {
          toast({
            title: "Submission Failed",
            description: error.data?.error || "Failed to submit game. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isAuthLoading || !user) {
    return null; // or a loader
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-foreground mb-2">
          Submit a Game
        </h1>
        <p className="text-muted-foreground text-lg">
          Share your creation with the DevDex community.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-muted-foreground" /> Game Title
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Game" className="h-12 bg-background font-medium text-lg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gameUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-muted-foreground" /> Play URL
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://your-game-domain.com" className="h-12 bg-background" {...field} />
                  </FormControl>
                  <FormDescription>
                    The direct link to play your web game (itch.io embed, custom domain, etc).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold flex items-center gap-2">
                      <Tag className="w-4 h-4 text-muted-foreground" /> Category
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Action, Puzzle, RPG..." className="h-12 bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coverImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" /> Cover Image URL
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." className="h-12 bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold">Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the objective, controls, and features..." 
                      className="min-h-[150px] resize-y bg-background" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-6 border-t border-border flex justify-end">
              <Button 
                type="submit" 
                disabled={createGame.isPending}
                size="lg"
                className="w-full md:w-auto font-bold h-14 px-10"
              >
                {createGame.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish Game"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
