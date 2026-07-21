import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  useCatalogItems,
  useMyCatalogItems,
  useCreateCatalogItem,
  useBuyCatalogItem,
  useEquipCatalogItem,
  type CatalogItem,
} from "@/lib/extra-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Coins, ShoppingBag, PlusSquare, Check } from "lucide-react";

const CREATE_COST = 5;

export default function Catalog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: items, isLoading } = useCatalogItems();
  const { data: myItems } = useMyCatalogItems();
  const createItem = useCreateCatalogItem();
  const buyItem = useBuyCatalogItem();
  const equipItem = useEquipCatalogItem();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("2");

  const ownedIds = new Set((myItems ?? []).map((i) => i.id));

  function handleCreate() {
    const priceNum = parseInt(price, 10);
    if (!name.trim() || !imageUrl.trim() || isNaN(priceNum) || priceNum < 0) {
      toast({ title: "Formu eksiksiz doldur", variant: "destructive" });
      return;
    }
    createItem.mutate(
      { name: name.trim(), imageUrl: imageUrl.trim(), price: priceNum },
      {
        onSuccess: () => {
          toast({ title: "Katalog öğesi oluşturuldu" });
          setOpen(false);
          setName("");
          setImageUrl("");
          setPrice("2");
        },
        onError: (err: any) => {
          toast({
            title: "Oluşturulamadı",
            description: err?.data?.error || "Bir hata oluştu.",
            variant: "destructive",
          });
        },
      },
    );
  }

  function handleBuy(item: CatalogItem) {
    buyItem.mutate(item.id, {
      onSuccess: () => toast({ title: `${item.name} satın alındı!` }),
      onError: (err: any) => {
        toast({
          title: "Satın alınamadı",
          description: err?.data?.error || "Bir hata oluştu.",
          variant: "destructive",
        });
      },
    });
  }

  function handleEquip(item: CatalogItem) {
    equipItem.mutate(item.id, {
      onSuccess: () => toast({ title: `${item.name} avatarına eklendi` }),
      onError: (err: any) => {
        toast({
          title: "Uygulanamadı",
          description: err?.data?.error || "Bir hata oluştu.",
          variant: "destructive",
        });
      },
    });
  }

  return (
    <div className="container mx-auto px-4 py-12 flex-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <ShoppingBag className="w-8 h-8" />
            Catalog
          </h1>
          <p className="text-muted-foreground mt-2">
            Avatar öğeleri oluştur, satın al, profiline ekle.
          </p>
        </div>

        {user && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="font-bold shadow-sm">
                <PlusSquare className="w-4 h-4 mr-2" />
                Öğe Oluştur ({CREATE_COST} DexBux)
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni avatar öğesi</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-sm font-medium text-foreground">İsim</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ör. Uzay Kaskı" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Görsel URL</label>
                  <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Satış fiyatı (DexBux)</label>
                  <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Oluşturma ücreti: {CREATE_COST} DexBux (bakiyen: {user.dexbux.toLocaleString()}).
                  Başkaları bu öğeyi belirlediğin fiyattan satın alabilir, ücret sana geçer.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={createItem.isPending} className="w-full font-bold">
                  {createItem.isPending ? "Oluşturuluyor..." : "Oluştur"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader /></div>
      ) : items && items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {items.map((item) => {
            const owned = ownedIds.has(item.id);
            const isEquipped = user?.avatarItemId === item.id;
            return (
              <div key={item.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col shadow-sm">
                <div className="aspect-square bg-secondary overflow-hidden">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-3 flex-1 flex flex-col gap-2">
                  <h3 className="font-bold text-sm line-clamp-1 text-foreground">{item.name}</h3>
                  <p className="text-xs text-muted-foreground">by {item.creator.username}</p>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-sm font-bold text-foreground">
                      <Coins className="w-4 h-4 text-amber-500" />
                      {item.price}
                    </span>
                    {!user ? null : owned ? (
                      isEquipped ? (
                        <span className="text-xs font-semibold text-primary flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Takılı
                        </span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleEquip(item)} disabled={equipItem.isPending}>
                          Kullan
                        </Button>
                      )
                    ) : (
                      <Button size="sm" onClick={() => handleBuy(item)} disabled={buyItem.isPending}>
                        Satın Al
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">Henüz hiç katalog öğesi yok.</p>
        </div>
      )}
    </div>
  );
}
