// DevDex Arayüz Stilleri (Interface Styles / Skins)
//
// Burası genişletilebilir bir "stil" (skin) kayıt defteridir. Her stil,
// arayüzün tamamının rengini/temasını değiştiren bir CSS değişkenleri
// paketi + isteğe bağlı bir "efekt sınıfı"ndan oluşur.
//
// Yeni bir stil eklemek için sadece bu diziye yeni bir INTERFACE_STYLE
// objesi ekle. UI (Catalog > Stiller sekmesi) burayı otomatik okur.
// Stiller ücretsizdir ve herkes tarafından seçilip uygulanabilir; yalnızca
// buraya kod ile yeni stil eklemek geliştirici/admin yetkisi gerektirir.

export interface InterfaceStyle {
  id: string;
  name: string;
  description: string;
  // Önizleme için küçük renk paleti (swatch olarak gösterilir)
  swatch: [string, string, string];
  // "aero" gibi ek görsel efektler (cam/gloss) uygulamak için opsiyonel sınıf
  effectClass?: string;
}

export const DEFAULT_STYLE_ID = "classic";

export const INTERFACE_STYLES: InterfaceStyle[] = [
  {
    id: "classic",
    name: "Klasik DevDex",
    description: "Varsayılan DevDex görünümü. Sade ve nötr.",
    swatch: ["#1e6fff", "#f7f8fa", "#12151c"],
  },
  {
    id: "frutiger-aero",
    name: "Frutiger Aero",
    description: "2000'lerin parlak, camsı, mavi-yeşil 'aero' estetiği: yansımalar, gradyanlar ve gloss düğmeler.",
    swatch: ["#0ea8e0", "#eafcff", "#0a3d5c"],
    effectClass: "style-frutiger-aero",
  },
];

export function getStyleById(id: string | null | undefined): InterfaceStyle {
  return INTERFACE_STYLES.find((s) => s.id === id) ?? INTERFACE_STYLES[0];
}
