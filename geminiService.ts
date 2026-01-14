
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
    
    EXPANSÃO TEMÁTICA ATUAL: ${theme}
    TIPO DE TIRAGEM: ${spreadType === 'mesa-real' ? 'Mesa Real (36 casas)' : 'Tiragem em Relógio (12 meses/casas)'}
    CONTEXTO TÉCNICO: ${JSON.stringify(context, null, 2)}
    
    INSTRUÇÕES PARA TIRAGEM EM RELÓGIO:
    1. Analise a OPOSIÇÃO (180°): Identifique a carta oposta ("${context.geometries.oposto}") e explique a tensão ou complemento.
    2. Analise o EIXO CONCEITUAL: Se a casa pertencer a um eixo (Social, Emocional, etc), explique o impacto.
    3. Carta Central ("${context.geometries.carta_central_reguladora}"): Explique como ela atua como REGULADORA de todo o ciclo anual.
    
    ESTRUTURA DA RESPOSTA (Markdown):
    
    1. **Foco Temático: ${theme}**: Manifestação da energia na casa "${house.name}".
    
    2. **Análise de Eixo e Oposição**: 
       Explique o diálogo técnico entre a carta selecionada e sua oposta. Como elas se equilibram?
    
    3. **Dinamismo e Tempo Comparado**: Compare a velocidade da carta atual com a oposta. O processo antecipa ou atrasa?
    
    4. **SÍNTESE TÉCNICA (O Veredito do Mentor)**: 
       Combine: Carta + Casa + Eixo + Carta Central. Gere uma frase curta de impacto pedagógico.
    
    5. **A Voz do Mentor**: 
       - Uma provocação ética sobre o ciclo.
       - 2 perguntas-guia para o nível ${level}.

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
