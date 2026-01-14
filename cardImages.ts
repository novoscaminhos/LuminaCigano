// Registro explícito das imagens disponíveis
// Usamos document.baseURI como base segura para garantir que a URL seja sempre válida e absoluta
export const CARD_IMAGES: Record<number, string> = {
  1: new URL('./assets/01.jpg', document.baseURI).href,
};

// Fallback local garantido
export const FALLBACK_IMAGE = new URL(
  './assets/fallback.jpg',
  document.baseURI
).href;
