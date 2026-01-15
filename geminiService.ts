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

  // Cálculo da Ponte para o contexto da IA
  const bridgeIndex = spreadType === 'mesa-real' ? boardState.findIndex(id => id === (selectedIndex + 1)) : -1;
  const bridgeCardName = bridgeIndex !== -1 ? getCardName(boardState[bridgeIndex]) : null;
  const bridgeHouseName = bridgeIndex !== -1 ? LENORMAND_HOUSES[bridgeIndex]?.name : null;

  const context = {
    spreadType,
    level,
    selected: { 
        card: card?.name, 
        house: house.name, 
        house_theme_original: house.theme,
        polarity: card?.polarity,
        timing: {
          speed: card?.timingSpeed,
          scale: card?.timingScale,
          category: card?.timingCategory
        }
    },
    reading_expansion_theme: theme,
    geometries: spreadType === 'mesa-real' ? {
        ponte_causa_raiz: {
          target_card: bridgeCardName,
          target_house: bridgeHouseName,
          explanation: "O dono da casa selecionada está nesta outra posição."
        },
        molduras: [0, 7, 24, 31].map(idx => getCardName(boardState[idx])),
        espelho_h: getCardName(boardState[selectedIndex >= 32 ? selectedIndex : (Math.floor(selectedIndex/8)*8 + (7-(selectedIndex%8)))]),
        veredito: boardState.slice(32, 36).map(id => getCardName(id)),
        diagonal_superior_ascendente: Geometry.getDiagonaisSuperiores(selectedIndex).map(idx => getCardName(boardState[idx])),
        diagonal_inferior_descendente: Geometry.getDiagonaisInferiores(selectedIndex).map(idx => getCardName(boardState[idx]))
    } : {
        oposto: getCardName(boardState[Geometry.getOposicaoRelogio(selectedIndex)]),
        eixo_conceitual: Geometry.getEixoConceitualRelogio(selectedIndex),
        carta_central_reguladora: getCardName(boardState[12])
    }
  };

  const prompt = `
    Você é o Mentor Virtual de Baralho Cigano do ecossistema LUMINA.
    Sua missão é gerar uma SÍNTESE PEDAGÓGICA para um estudante de nível ${level}.
    
    EXPANSÃO TEMÁTICA ATUAL (FOCO): ${theme}
    TIPO DE TIRAGEM: ${spreadType === 'mesa-real' ? 'Mesa Real (36 casas)' : 'Tiragem em Relógio (12 meses/casas)'}
    CONTEXTO TÉCNICO: ${JSON.stringify(context, null, 2)}
    
    INSTRUÇÕES ESPECÍFICAS SOBRE O TEMPO:
    - A carta atual possui a velocidade "${card?.timingSpeed}", escala "${card?.timingScale}" e impacto "${card?.timingCategory}".
    - Explique como essa dinâmica de tempo afeta o tema "${theme}".
    - Exemplo: Se a categoria é "Acelera" em um tema de "Amor", as coisas acontecem rápido. Se "Bloqueia", o consulente precisa esperar.

    ESTRUTURA DA RESPOSTA (Markdown):
    
    1. **Dinâmica Temporal e Fluxo**: 
       Explique a escala de tempo (${card?.timingScale}) e como a categoria (${card?.timingCategory}) modula a rapidez dos acontecimentos no tema ${theme}.
    
    2. **Foco Temático: ${theme}**: Manifestação da energia na casa "${house.name}".
    
    3. **A Origem do Tema (Técnica da Ponte)**: 
       Explique o que a posição do dono da casa revela sobre a causa raiz sobre o prisma do tema "${theme}".
    
    4. **Análise de Campo e Geometria**: 
       Como os espelhamentos ou diagonais modulam essa energia focada em "${theme}"?
    
    5. **SÍNTESE TÉCNICA (O Veredito do Mentor)**: 
       Gere uma frase curta de impacto pedagógico integrando o significado base ao tema.
    
    6. **A Voz do Mentor**: 
       - Uma provocação ética sobre o ciclo.
       - 2 perguntas-guia para o nível ${level} específicas para o tema "${theme}".

    DIRETRIZES ÉTICAS:
    - JAMAIS preveja morte ou fatalidades.
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