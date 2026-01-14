
import { GoogleGenAI } from "@google/genai";
import { LENORMAND_CARDS, LENORMAND_HOUSES } from "./constants";
import { SpreadType, StudyLevel, ReadingTheme } from "./types";
import * as Geometry from "./geometryService";

const getCardName = (id: number | null) => {
  if (id === null) return "Vazio";
  return LENORMAND_CARDS.find(c => c.id === id)?.name || "Desconhecido";
};

export const getDetailedCardAnalysis = async (
  boardState: (number | null)[], 
  selectedIndex: number, 
  theme: ReadingTheme = 'Geral',
  spreadType: SpreadType = 'mesa-real',
  level: StudyLevel = 'Iniciante'
) => {
  if (!process.env.API_KEY) return "Configuração de API pendente.";
  
  const selectedCardId = boardState[selectedIndex];
  if (selectedCardId === null) return "Selecione uma casa ocupada para análise.";

  const card = LENORMAND_CARDS.find(c => c.id === selectedCardId);
  
  let house;
  if (spreadType === 'relogio') {
    house = LENORMAND_HOUSES.find(h => h.id === (101 + selectedIndex));
  } else {
    house = LENORMAND_HOUSES[selectedIndex];
  }

  if (!house) return "Erro ao localizar contexto da casa.";

  const row = Math.floor(selectedIndex / 8), col = selectedIndex % 8;
  
  const context = {
    spreadType,
    level,
    selected: { 
        card: card?.name, 
        house: house.name, 
        house_theme_original: house.theme,
        polarity: card?.polarity,
        timing: card?.timingSpeed 
    },
    reading_expansion_theme: theme,
    geometries: spreadType === 'mesa-real' ? {
        molduras: [0, 7, 24, 31].map(idx => getCardName(boardState[idx])),
        espelho_h: getCardName(boardState[row * 8 + (7 - col)]),
        veredito: boardState.slice(32, 36).map(id => getCardName(id)),
        diagonal_superior_ascendente: Geometry.getDiagonaisSuperiores(selectedIndex).map(idx => getCardName(boardState[idx])),
        diagonal_inferior_descendente: Geometry.getDiagonaisInferiores(selectedIndex).map(idx => getCardName(boardState[idx]))
    } : {
        oposto: getCardName(boardState[(selectedIndex + 6) % 12]),
        eixo: `${selectedIndex + 1} <-> ${(selectedIndex + 6) % 12 + 1}`
    }
  };

  const prompt = `
    Você é o Mentor Virtual de Baralho Cigano do ecossistema LUMINA.
    Sua missão é gerar uma SÍNTESE PEDAGÓGICA para um estudante de nível ${level}.
    
    EXPANSÃO TEMÁTICA ATUAL: ${theme}
    TIPO DE TIRAGEM: ${spreadType === 'mesa-real' ? 'Mesa Real (36 casas)' : 'Tiragem em Relógio (12 meses/casas)'}
    CONTEXTO TÉCNICO: ${JSON.stringify(context, null, 2)}
    
    INSTRUÇÕES ESPECÍFICAS PARA NÍVEIS SUPERIORES:
    Ao analisar as Diagonais na Mesa Real:
    - A Diagonal Superior representa a INFLUÊNCIA ASCENDENTE: O que está sendo construído acima, o que ganha força. Responda: "O que se aproxima do topo desta situação no tema ${theme}?"
    - A Diagonal Inferior representa a INFLUÊNCIA DESCENDENTE: Raízes, o subterrâneo, o que sustenta ou drena silenciosamente. Responda: "O que sustenta ou enfraquece estruturalmente esta situação por baixo?"
    
    ESTRUTURA DA RESPOSTA (Markdown):
    
    1. **Foco Temático: ${theme}**: Como a energia de "${card?.name}" se manifesta especificamente nesta área sob a influência da casa "${house.name}".
    
    2. **Análise das Diagonais (Modulação Técnica)**: 
       Explique como as cartas nas diagonais ajustam a força, o tempo e o grau de estabilidade da carta central ("${card?.name}").
       Use os termos "Campo de Ascensão" (Superior) e "Campo de Sustentação ou Erosão" (Inferior).
    
    3. **Dinamismo e Tempo**: No contexto de ${theme}, o processo está bloqueado, fluindo ou acelerando? Refine usando as diagonais (Pressão de Destino).
    
    4. **SÍNTESE TÉCNICA (O Veredito do Mentor)**: 
       Combine: Carta + Casa + Diagonais. Gere uma frase curta de impacto pedagógico.
    
    5. **A Voz do Mentor**: 
       - Uma provocação ética ou filosófica relacionada a ${theme}.
       - 2 perguntas-guia para o nível ${level}.

    DIRETRIZES ÉTICAS:
    - JAMAIS preveja morte, doenças ou fatalidades.
    - Foco em TENDÊNCIA e CAMPO DE APRENDIZADO.
    - Linguagem DIDÁTICA, MÍSTICA e TÉCNICA.
  `;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
    });
    return response.text || "Erro na síntese.";
  } catch (error) {
    return "Erro de conexão com o Mentor.";
  }
};
