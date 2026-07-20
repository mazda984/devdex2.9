import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { 
  useListGroups, 
  getListGroupsQueryKey,
  useCreateGroup,
  useJoinGroup
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/button";
import { Users, Plus, Image as ImageIcon, Lock, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  coverImageUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  isPublic: z.boolean().default(true),
});

export default function Groups() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: listData, isLoading } = useListGroups(
    { limit: 50, offset: 0 },
    {
      query: {
        queryKey: getListGroupsQueryKey({ limit: 50, offset: 0 })
      }
    }
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      coverImageUrl: "",
      isPublic: true,
    },
  });

  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createGroup.mutate(
      {
        data: {
          name: values.name,
          description: values.description || undefined,
          coverImageUrl: values.coverImageUrl || undefined,
          isPublic: values.isPublic,
        }
      },
      {
        onSuccess: (newGroup) => {
          queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          toast({ title: "Group created successfully!" });
          setIsDialogOpen(false);
          form.reset();
          setLocation(`/groups/${newGroup.id}`);
        },
        onError: () => {
          toast({ title: "Failed to create group", variant: "destructive" });
        }
      }
    );
  };

  const handleJoin = (groupId: number) => {
    if (!user) {
      setLocation('/login');
      return;
    }
    joinGroup.mutate({ id: groupId }, {
      onSuccess: () => {
        toast({ title: "Joined group!" });
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to join group", variant: "destructive" });
      }
    });
  };

  const groups = listData?.groups || [];

  return (
    <div className="container mx-auto px-4 py-12 flex-1 flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">
            Groups
          </h1>
          <p className="text-muted-foreground text-lg">
            Join communities of players and developers.
          </p>
        </div>
        
        {user && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="font-bold rounded-lg gap-2 shadow-sm">
                <Plus className="w-4 h-4" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Group</DialogTitle>
                <DialogDescription>
                  Start a new community. Fill out the details below.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="My Awesome Group" className="bg-secondary/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="What is this group about?" 
                            className="bg-secondary/50 resize-none" 
                            {...field} 
                          />
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
                        <FormLabel>Cover Image URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/image.png" className="bg-secondary/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isPublic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 bg-secondary/50">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Public Group</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Anyone can see and join this group.
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createGroup.isPending} className="font-bold rounded-lg">
                      {createGroup.isPending ? "Creating..." : "Create Group"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="pt-20"><Loader /></div>
        ) : groups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {groups.map((group) => (
              <div key={group.id} className="bg-card rounded-xl border border-border overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group">
                <div 
                  className="aspect-video w-full bg-secondary overflow-hidden relative cursor-pointer"
                  onClick={() => setLocation(`/groups/${group.id}`)}
                >
                  {group.coverImageUrl ? (
                    <img 
                      src={group.coverImageUrl} 
                      alt={group.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary">
                      <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                  )}
                  {!group.isPublic && (
                    <div className="absolute top-2 right-2 bg-background/80 backdrop-blur text-foreground text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Private
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <Link href={`/groups/${group.id}`} className="font-bold text-lg mb-1 hover:text-primary transition-colors line-clamp-1">
                    {group.name}
                  </Link>
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
                    {group.description || "No description provided."}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{group.memberCount} members</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                        by <span className="font-medium text-foreground/80">{group.author.username}</span>
                      </div>
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="rounded-lg font-bold"
                      onClick={() => handleJoin(group.id)}
                      disabled={joinGroup.isPending}
                    >
                      Join
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-card rounded-2xl border border-border">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No groups yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              There are no groups created yet. Be the first to start a community!
            </p>
            {user && (
              <Button onClick={() => setIsDialogOpen(true)} className="font-bold rounded-lg shadow-sm">
                Create the First Group
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
