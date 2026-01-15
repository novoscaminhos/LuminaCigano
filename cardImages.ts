// ================================
// FALLBACKS (compatibilidade total)
// ================================

// Fallback base64 (textura cinza neutra)
export const BASE64_FALLBACK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

// Fallback externo estável (usado se tudo falhar)
export const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1572021335469-31706a17aaef?q=80&w=300&auto=format&fit=crop";


// ================================
// SUPABASE CONFIG
// ================================

export const SUPABASE_CARDS_BASE_URL =
  "https://kehebufapvrmuzaovnzh.supabase.co/storage/v1/object/public/lenormand-cards/";


// ================================
// CARD FILE KEYS
// ================================

export const CARD_IMAGE_KEYS: Record<number, string> = {
  1: "01-cavaleiro.png",
  2: "02-trevo.png",
  3: "03-navio.png",
  4: "04-casa.png",
  5: "05-arvore.png",
  6: "06-nuvens.png",
  7: "07-cobra.png",
  8: "08-caixao.png",
  9: "09-buque.png",
  10: "10-foice.png",
  11: "11-chicote.png",
  12: "12-passaros.png",
  13: "13-crianca.png",
  14: "14-raposa.png",
  15: "15-urso.png",
  16: "16-estrela.png",
  17: "17-cegonha.png",
  18: "18-cao.png",
  19: "19-torre.png",
  20: "20-jardim.png",
  21: "21-montanha.png",
  22: "22-caminho.png",
  23: "23-ratos.png",
  24: "24-coracao.png",
  25: "25-anel.png",
  26: "26-livro.png",
  27: "27-carta.png",
  28: "28-homem.png",
  29: "29-mulher.png",
  30: "30-lirios.png",
  31: "31-sol.png",
  32: "32-lua.png",
  33: "33-chave.png",
  34: "34-peixes.png",
  35: "35-ancora.png",
  36: "36-cruz.png",
};


// ================================
// MAIN EXPORT (API LEGADA)
// ================================

// ⚠️ NÃO REMOVER — usado por vários componentes
export const CARD_IMAGES: Record<number, string> = Object.fromEntries(
  Object.entries(CARD_IMAGE_KEYS).map(([key, file]) => [
    Number(key),
    SUPABASE_CARDS_BASE_URL + file,
  ])
);
