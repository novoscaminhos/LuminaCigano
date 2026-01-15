export enum Polarity {
  POSITIVE = 'Positiva',
  NEGATIVE = 'Negativa',
  NEUTRAL = 'Neutra'
}

export enum Timing {
  FAST = 'Rápido',
  MODERATE = 'Moderado',
  SLOW = 'Lento',
  INSTANT = 'Imediato',
  UNCERTAIN = 'Incerto',
  VERY_FAST = 'Muito Rápido',
  LONG = 'Longo',
  VERY_LONG = 'Muito Longo'
}

export type StudyLevel = 'Iniciante' | 'Intermediário' | 'Avançado';
export type ReadingTheme = 'Geral' | 'Amor & Relacionamentos' | 'Trabalho & Finanças' | 'Espiritualidade & Caminho de Vida';

export interface LenormandCard {
  id: number;
  name: string;
  polarity: Polarity;
  timingSpeed: Timing;
  timingScale: string;
  timingCategory: 'Acelera' | 'Mantém' | 'Retarda' | 'Bloqueia' | 'N/A';
  keywords: string[];
  briefInterpretation: string;
  interpretationAtOrigin: string;
  symbolicEnergy: string;
  suit: string;
  description: string;
}

export interface LenormandHouse {
  id: number;
  name: string;
  polarity: Polarity;
  theme: string;
  technicalDescription: string;
  pedagogicalRule: string;
  isClockHouse?: boolean;
  month?: string;
  zodiac?: string;
}

export type SpreadType = 'mesa-real' | 'relogio';

export interface StudyTrack {
  id: string;
  level: StudyLevel;
  title: string;
  description: string;
  lessons: { id: string; title: string; content: string; completed: boolean }[];
}

export interface FundamentalModule {
  id: string;
  title: string;
  description: string;
  content: string;
  concepts: { title: string; text: string; example?: string }[];
}