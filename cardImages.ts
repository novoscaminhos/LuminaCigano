// Mapeamento dinâmico para as 36 cartas do baralho
// As imagens estão em /assets/ e seguem o padrão 01.jpg, 02.jpg, ..., 36.jpg

/**
 * Resolve um caminho de asset de forma ultra-robusta.
 * Se o construtor URL falhar (o que causa o erro "Invalid URL"), 
 * retornamos o caminho relativo, que o navegador resolve automaticamente no src da imagem.
 */
const resolveAssetUrl = (path: string): string => {
  try {
    // Tenta usar a base do módulo se disponível e válida
    const base = typeof import.meta !== 'undefined' && import.meta.url ? import.meta.url : window.location.href;
    return new URL(path, base).href;
  } catch (e) {
    // Se falhar, retorna o path relativo (ex: "/assets/01.jpg")
    // O navegador resolverá isso em relação à raiz do site no <img>
    return path;
  }
};

// Imagem do Mensageiro (Carta 01) fornecida pelo usuário
// Nota: Em um ambiente de produção real, esta imagem estaria em /assets/01.jpg
// Aqui garantimos que o mapeamento a encontre corretamente.
const CARD_01_OVERRIDE = resolveAssetUrl('/assets/01.jpg');

export const FALLBACK_IMAGE = resolveAssetUrl('/assets/fallback.jpg');

const generateCardImages = () => {
  const images: Record<number, string> = {};
  for (let i = 1; i <= 36; i++) {
    const paddedId = i.toString().padStart(2, '0');
    // Para a carta 1, garantimos o uso da ilustração de mensageiro
    images[i] = resolveAssetUrl(`/assets/${paddedId}.jpg`);
  }
  return images;
};

export const CARD_IMAGES = generateCardImages();