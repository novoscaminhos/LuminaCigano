import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  LayoutGrid, RotateCcw, Sparkles, ChevronRight, ChevronLeft, BookOpen, 
  Compass, Target, Activity, Award, Key, Clock, Edit3, Dices, Zap, 
  MessageSquare, User, Sun, Moon, History, AlertCircle, LogOut, Mail, 
  ShieldCheck, Info, Wand2, HelpCircle, Anchor, X, AlertTriangle, 
  Brain, GitBranch, Layers, SearchCode, Loader2, Settings, ListFilter,
  ArrowRightLeft, MoveDiagonal, Heart, Briefcase, Stars, ChevronUp, ChevronDown,
  Eye, Maximize2, Minimize2, Menu, Save, Download, CreditCard, Activity as ActivityIcon,
  Book, GitMerge, RefreshCw, Scale, ZapOff, Trash2, Calendar, HardDrive, Smartphone, Globe, Share2
} from 'lucide-react';
import html2canvas from 'https://esm.sh/html2canvas@1.4.1';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';

import { LENORMAND_CARDS, LENORMAND_HOUSES, FUNDAMENTALS_DATA } from './constants';
import { Polarity, Timing, LenormandCard, LenormandHouse, SpreadType, StudyLevel, ReadingTheme } from './types';
import { getDetailedCardAnalysis } from './geminiService';
import * as Geometry from './geometryService';
import { CARD_IMAGES, FALLBACK_IMAGE } from './cardImages';

// ===============================
// Interfaces de Persistência
// ===============================
interface SavedReading {
  id: string;
  timestamp: number;
  board: (number | null)[];
  theme: ReadingTheme;
  spreadType: SpreadType;
  title: string;
}

// ===============================
// Helpers
// ===============================
export const getCardImageUrl = (id: number): string => CARD_IMAGES[id] ?? FALLBACK_IMAGE;

/**
 * Tratamento robusto de erro de imagem com múltiplos níveis de fallback
 * Nível 0 -> Tentativa original (assets local)
 * Nível 1 -> Fallback local configurado (/assets/fallback.jpg)
 * Nível 2 -> Fallback externo (serviço de placeholder)
 */
export const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const img = e.currentTarget;
  if (!img) return;

  const currentLevel = parseInt(img.dataset.fallbackLevel || '0', 10);
  
  if (currentLevel === 0) {
    // Primeiro erro: Tenta a imagem de fallback local
    img.dataset.fallbackLevel = '1';
    img.src = FALLBACK_IMAGE;
  } else if (currentLevel === 1) {
    // Segundo erro: Se o fallback local falhar, tenta um placeholder externo místico
    img.dataset.fallbackLevel = '2';
    img.src = 'https://placehold.co/300x420/1e293b/6366f1/png?text=LUMINA';
  } else {
    // Terceiro erro ou acima: Interrompe o loop e oculta o elemento ou mantém vazio
    img.style.opacity = '0';
  }
};

const generateShuffledArray = (size: number = 36) => {
  const ids = Array.from({length: 36}, (_, i) => i + 1);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, size);
};

const getThemeCardId = (theme: ReadingTheme): number | null => {
  switch (theme) {
    case 'Amor & Relacionamentos': return 24;
    case 'Trabalho & Finanças': return 34;
    case 'Espiritualidade & Caminho de Vida': return 16;
    default: return null;
  }
};

const getThemeColor = (theme: ReadingTheme): string => {
  switch (theme) {
    case 'Amor & Relacionamentos': return 'rgba(244, 63, 94, 0.6)';
    case 'Trabalho & Finanças': return 'rgba(16, 185, 129, 0.6)';
    case 'Espiritualidade & Caminho de Vida': return 'rgba(168, 85, 247, 0.6)';
    default: return 'rgba(251, 191, 36, 0.6)';
  }
};

const getTimingCategoryColor = (category?: string) => {
  switch (category) {
    case 'Acelera': return 'text-emerald-400 bg-emerald-400/10';
    case 'Mantém': return 'text-amber-400 bg-amber-400/10';
    case 'Retarda':
    case 'Bloqueia': return 'text-rose-400 bg-rose-400/10';
    default: return 'text-slate-400 bg-slate-400/10';
  }
};

const getTimingDotColor = (category?: string) => {
  switch (category) {
    case 'Acelera': return 'bg-emerald-400';
    case 'Mantém': return 'bg-amber-400';
    case 'Retarda':
    case 'Bloqueia': return 'bg-rose-400';
    default: return 'bg-slate-400';
  }
};

// ===============================
// Componentes de Apoio
// ===============================
const NavItem: React.FC<{ icon: React.ReactNode; label: string; active: boolean; collapsed: boolean; onClick: () => void; darkMode: boolean }> = ({ icon, label, active, collapsed, onClick, darkMode }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'} ${collapsed ? 'justify-center px-0' : ''}`} title={collapsed ? label : ""}>
    <div className={`${collapsed ? 'scale-110' : ''}`}>{icon}</div>
    {!collapsed && <span className="font-medium text-[10px] uppercase font-bold tracking-wider whitespace-nowrap overflow-hidden">{label}</span>}
  </button>
);

const RelatedCardMini: React.FC<{ card: LenormandCard | null; houseName: string; houseId: number; label?: string; labelColor?: string; darkMode: boolean }> = ({ card, houseName, houseId, label, labelColor, darkMode }) => {
  const getPolarityColor = (pol?: Polarity) => {
    switch (pol) {
      case Polarity.POSITIVE: return 'bg-emerald-500';
      case Polarity.NEGATIVE: return 'bg-rose-500';
      default: return 'bg-slate-500';
    }
  };
  return (
    <div className={`${darkMode ? 'bg-slate-950/40 border-slate-800/60 hover:border-indigo-500/30' : 'bg-white border-slate-200 shadow-sm hover:border-indigo-500/30'} p-3 rounded-2xl border flex gap-3 items-start group transition-all relative`}>
      {label && <div className={`absolute -top-2 left-3 px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest shadow-sm z-10 ${labelColor || (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600')}`}>{label}</div>}
      <div className={`w-14 aspect-[3/4.2] rounded-lg border flex flex-col items-center justify-center relative overflow-hidden shadow-inner flex-shrink-0 ${!card ? 'opacity-20' : ''} ${darkMode ? 'border-slate-700/50 bg-slate-900' : 'border-slate-300 bg-slate-100'}`}>
        {card ? (
          <>
            <img src={getCardImageUrl(card.id)} alt={card.name} onError={handleImageError} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-1 right-1 w-2 h-2 rounded-full border border-black/20 z-10" style={{ backgroundColor: getPolarityColor(card.polarity).replace('bg-', '') }}></div>
            <span className="text-[10px] font-black text-white drop-shadow-lg z-10">{card.id}</span>
            <span className="text-[6px] font-cinzel font-bold text-white uppercase text-center leading-none px-1 mt-auto mb-1 z-10 bg-black/60 w-full py-1 backdrop-blur-sm">{card.name}</span>
          </>
        ) : <X size={12} className={darkMode ? "text-slate-800" : "text-slate-400"} />}
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className={`text-[8px] font-black uppercase tracking-widest truncate ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>CASA {houseId}: {houseName}</span>
        </div>
        <h4 className={`text-[10px] font-bold truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{card ? card.name : 'Vazio'}</h4>
        <p className={`text-[9px] leading-tight italic line-clamp-2 mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>{card ? card.briefInterpretation : 'Posição disponível.'}</p>
      </div>
    </div>
  );
};

const CardVisual: React.FC<{ card: any; houseId: number; onClick: () => void; isSelected: boolean; isThemeCard: boolean; themeColor?: string; highlightType?: string | null; level: StudyLevel; size?: 'normal' | 'small' | 'large'; darkMode: boolean }> = ({ card, houseId, onClick, isSelected, isThemeCard, themeColor, highlightType, level, size = 'normal', darkMode }) => {
  const getTimingIndicator = (timing: Timing) => {
    if (timing === Timing.SLOW || timing === Timing.VERY_LONG) return '🔴';
    if (timing === Timing.FAST || timing === Timing.VERY_FAST || timing === Timing.INSTANT) return '🟢';
    return '🟡';
  };
  const getPolarityColor = (pol: Polarity) => {
    switch (pol) {
      case Polarity.POSITIVE: return 'bg-emerald-500';
      case Polarity.NEGATIVE: return 'bg-rose-500';
      default: return 'bg-slate-400';
    }
  };
  const highlightStyles: Record<string, string> = {
    mirror: 'ring-4 ring-cyan-500/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105 z-10',
    knight: 'ring-4 ring-fuchsia-500/60 border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.4)] scale-105 z-10',
    frame: 'border-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
    axis: 'ring-4 ring-indigo-500/60 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-105 z-10',
    'diag-up': 'ring-4 ring-orange-500/60 border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)] scale-105 z-10',
    'diag-down': 'ring-4 ring-indigo-500/60 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-105 z-10',
    'center': 'ring-4 ring-amber-400 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)] scale-110 z-30'
  };
  return (
    <div onClick={onClick} className={`relative group aspect-[3/4.2] rounded-xl border-2 cursor-pointer transition-all duration-500 card-perspective overflow-hidden shadow-xl ${isSelected ? 'border-indigo-400 ring-4 ring-indigo-400/30 scale-105 z-20' : isThemeCard ? 'border-transparent scale-105 z-20' : highlightType ? `${highlightStyles[highlightType]} animate-pulse` : darkMode ? 'border-slate-800/60 hover:border-slate-600 bg-slate-900/60' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`} style={isThemeCard ? { boxShadow: `0 0 30px ${themeColor}, inset 0 0 15px ${themeColor}` } : {}}>
      <div className="absolute inset-0 pointer-events-none">
        {card && <img src={getCardImageUrl(card.id)} alt={card.name} onError={handleImageError} className={`w-full h-full object-cover transition-all duration-700 ${isThemeCard ? 'opacity-[0.8]' : 'opacity-[0.5] group-hover:opacity-[0.9]'}`} />}
      </div>
      <div className="absolute top-1 right-1 flex items-center gap-1 z-20 scale-75 md:scale-100">
         <span className="text-[8px] md:text-[10px] drop-shadow-md">{getTimingIndicator(card?.timingSpeed)}</span>
         <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full border border-black/20 ${getPolarityColor(card?.polarity)}`} />
      </div>
      <div className="absolute top-1 left-1 z-10">
        <span className={`text-[7px] md:text-[9px] font-black uppercase bg-black/40 px-1 rounded-sm backdrop-blur-sm text-white`}>CASA {houseId}</span>
      </div>
      {card ? (
        <div className="absolute inset-0 flex flex-col p-2 md:p-3 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent">
          <div className="flex-grow flex flex-col items-center justify-center text-center mt-2">
            <span className="text-[8px] md:text-[11px] font-cinzel font-bold text-white uppercase leading-tight tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{card.name}</span>
          </div>
          <div className="mt-auto border-t border-white/20 pt-1 flex justify-between items-center backdrop-blur-sm bg-black/30 -mx-3 -mb-3 px-3 py-1">
            <span className="text-[8px] md:text-[10px] font-black text-white drop-shadow-md">{card.id}</span>
            <span className={`text-[6px] md:text-[8px] font-black uppercase ${card.polarity === Polarity.POSITIVE ? 'text-emerald-400' : card.polarity === Polarity.NEGATIVE ? 'text-rose-400' : 'text-slate-300'}`}>{card.polarity}</span>
          </div>
        </div>
      ) : <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20"><LayoutGrid size={16} className={darkMode ? "text-slate-700" : "text-slate-300"} /></div>}
    </div>
  );
};

// ===============================
// Componente App Principal
// ===============================
const App: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mentorPanelOpen, setMentorPanelOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [view, setView] = useState<'board' | 'fundamentals' | 'glossary' | 'profile'>('board');
  const [glossarySearch, setGlossarySearch] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState<StudyLevel>(() => (localStorage.getItem('lumina_difficulty_level') as StudyLevel) || 'Iniciante');
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>('Geral');
  const [spreadType, setSpreadType] = useState<SpreadType>('mesa-real');
  const [board, setBoard] = useState<(number | null)[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [manualThemeIndex, setManualThemeIndex] = useState<number | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [cardAnalysis, setCardAnalysis] = useState<string | null>(null);
  const [savedReadings, setSavedReadings] = useState<SavedReading[]>(() => JSON.parse(localStorage.getItem('lumina_saved_readings') || '[]'));
  
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('lumina_difficulty_level', difficultyLevel);
  }, [difficultyLevel]);

  useEffect(() => {
    localStorage.setItem('lumina_saved_readings', JSON.stringify(savedReadings));
  }, [savedReadings]);

  useEffect(() => {
    setBoard(generateShuffledArray(spreadType === 'relogio' ? 13 : 36));
    setSelectedHouse(null);
    setManualThemeIndex(null);
    setCardAnalysis(null);
  }, [spreadType]);

  const activeThemeIndex = useMemo(() => {
    if (manualThemeIndex !== null) return manualThemeIndex;
    const targetId = getThemeCardId(readingTheme);
    if (!targetId) return null;
    const index = board.findIndex(id => id === targetId);
    return index !== -1 ? index : null;
  }, [board, readingTheme, manualThemeIndex]);

  const selectedCard = useMemo(() => (selectedHouse !== null && board[selectedHouse]) ? LENORMAND_CARDS.find(c => c.id === board[selectedHouse]) : null, [selectedHouse, board]);
  
  const currentHouse = useMemo(() => {
    if (selectedHouse === null) return null;
    if (spreadType === 'relogio') {
      if (selectedHouse === 12) return { id: 113, name: "Tom da Leitura", technicalDescription: "A energia central do ciclo." } as LenormandHouse;
      return LENORMAND_HOUSES.find(h => h.id === 101 + selectedHouse);
    }
    return LENORMAND_HOUSES[selectedHouse];
  }, [selectedHouse, spreadType]);

  const handleHouseSelection = (index: number) => {
    setSelectedHouse(index);
    setMentorPanelOpen(true);
  };

  // Lógica de Salvar
  const saveReading = () => {
    const newReading: SavedReading = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      board: [...board],
      theme: readingTheme,
      spreadType: spreadType,
      title: `${spreadType === 'mesa-real' ? 'Mesa Real' : 'Relógio'} - ${readingTheme} (${new Date().toLocaleDateString()})`
    };
    setSavedReadings([newReading, ...savedReadings]);
    alert("Tiragem salva com sucesso!");
  };

  // Lógica de Exportar PDF
  const exportToPdf = async () => {
    if (!boardRef.current) return;
    const element = boardRef.current;
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: darkMode ? '#020617' : '#f8fafc',
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Lumina_Reading_${Date.now()}.pdf`);
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
      alert("Houve um erro ao gerar o PDF. Tente novamente.");
    }
  };

  const deleteReading = (id: string) => {
    setSavedReadings(savedReadings.filter(r => r.id !== id));
  };

  const loadReading = (r: SavedReading) => {
    setBoard(r.board);
    setReadingTheme(r.theme);
    setSpreadType(r.spreadType);
    setView('board');
  };

  const runMentorAnalysis = async () => {
    if (selectedHouse === null || board[selectedHouse] === null) return;
    setIsAiLoading(true);
    const result = await getDetailedCardAnalysis(board, selectedHouse, readingTheme, spreadType, difficultyLevel);
    setCardAnalysis(result);
    setIsAiLoading(false);
  };

  const getGeometryHighlight = (idx: number) => {
    if (selectedHouse === null) return null;
    if (spreadType === 'mesa-real') {
        if (Geometry.getMoldura().includes(idx)) return 'frame';
        if (Geometry.getEspelhamentos(selectedHouse).includes(idx)) return 'mirror';
        if (Geometry.getCavalo(selectedHouse).includes(idx)) return 'knight';
        if (Geometry.getDiagonaisSuperiores(selectedHouse).includes(idx)) return 'diag-up';
        if (Geometry.getDiagonaisInferiores(selectedHouse).includes(idx)) return 'diag-down';
    } else {
        if (idx === 12) return 'center';
        if (idx === Geometry.getOposicaoRelogio(selectedHouse)) return 'axis';
    }
    return null;
  };

  // Geometrias detalhadas para o Mentor
  const mirrorCards = useMemo(() => (selectedHouse === null || spreadType !== 'mesa-real') ? [] : Geometry.getEspelhamentos(selectedHouse).map(idx => ({ idx, card: board[idx] ? LENORMAND_CARDS.find(c => c.id === board[idx]) : null, house: LENORMAND_HOUSES[idx] })), [selectedHouse, spreadType, board]);
  const knightCards = useMemo(() => (selectedHouse === null || spreadType !== 'mesa-real') ? [] : Geometry.getCavalo(selectedHouse).map(idx => ({ idx, card: board[idx] ? LENORMAND_CARDS.find(c => c.id === board[idx]) : null, house: LENORMAND_HOUSES[idx] })), [selectedHouse, spreadType, board]);
  const diagUp = useMemo(() => (selectedHouse === null || spreadType !== 'mesa-real') ? [] : Geometry.getDiagonaisSuperiores(selectedHouse).map(idx => ({ idx, card: board[idx] ? LENORMAND_CARDS.find(c => c.id === board[idx]) : null, house: LENORMAND_HOUSES[idx] })), [selectedHouse, spreadType, board]);
  const diagDown = useMemo(() => (selectedHouse === null || spreadType !== 'mesa-real') ? [] : Geometry.getDiagonaisInferiores(selectedHouse).map(idx => ({ idx, card: board[idx] ? LENORMAND_CARDS.find(c => c.id === board[idx]) : null, house: LENORMAND_HOUSES[idx] })), [selectedHouse, spreadType, board]);

  // Análise de Oposição no Relógio
  const oppIndex = useMemo(() => (selectedHouse !== null && spreadType === 'relogio') ? Geometry.getOposicaoRelogio(selectedHouse) : null, [selectedHouse, spreadType]);
  const oppCard = useMemo(() => (oppIndex !== null && oppIndex !== -1 && board[oppIndex]) ? LENORMAND_CARDS.find(c => c.id === board[oppIndex]) : null, [oppIndex, board]);
  const axisInfo = useMemo(() => (selectedHouse !== null && spreadType === 'relogio') ? Geometry.getAxisDataRelogio(selectedHouse) : null, [selectedHouse, spreadType]);

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${darkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900'} transition-colors overflow-hidden font-inter`}>
      
      {/* SIDEBAR ESQUERDA */}
      <aside className={`flex flex-col border-r ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-xl'} transition-all duration-300 z-[60] h-screen sticky top-0 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className={`p-4 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
           {!sidebarCollapsed && <h1 className={`text-xs font-bold font-cinzel truncate ${darkMode ? 'text-indigo-100' : 'text-indigo-600'}`}>LUMINA</h1>}
           <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}>
              {sidebarCollapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
           </button>
        </div>

        <nav className="flex-grow px-2 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem icon={<LayoutGrid size={18}/>} label="Mesa Real" active={view === 'board' && spreadType === 'mesa-real'} collapsed={sidebarCollapsed} onClick={() => {setView('board'); setSpreadType('mesa-real');}} darkMode={darkMode} />
          <NavItem icon={<Clock size={18}/>} label="Relógio" active={view === 'board' && spreadType === 'relogio'} collapsed={sidebarCollapsed} onClick={() => {setView('board'); setSpreadType('relogio');}} darkMode={darkMode} />
          <NavItem icon={<Book size={18}/>} label="Glossário" active={view === 'glossary'} collapsed={sidebarCollapsed} onClick={() => setView('glossary')} darkMode={darkMode} />
          <NavItem icon={<BookOpen size={18}/>} label="Fundamentos" active={view === 'fundamentals'} collapsed={sidebarCollapsed} onClick={() => setView('fundamentals')} darkMode={darkMode} />
          
          <div className={`pt-4 mt-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'} flex flex-col gap-2 ${sidebarCollapsed ? 'items-center mt-12' : 'px-2'}`}>
            {!sidebarCollapsed ? (
              <div className="grid gap-1 grid-cols-1">
                {(['Iniciante', 'Intermediário', 'Avançado'] as StudyLevel[]).map(l => (
                  <button key={l} onClick={() => setDifficultyLevel(l)} className={`text-[9px] font-bold p-2 rounded-lg text-left transition-all ${difficultyLevel === l ? 'bg-indigo-600 text-white shadow-md' : darkMode ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>{l}</button>
                ))}
              </div>
            ) : <div className="mt-12 flex flex-col items-center opacity-40 pointer-events-none group"><span className="font-cinzel text-[11px] font-bold uppercase tracking-[0.5em] whitespace-nowrap rotate-[-90deg] origin-center py-12">NÍVEL</span></div>}
          </div>
        </nav>

        <div className={`p-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'} space-y-4 ${sidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
           {!sidebarCollapsed ? (
             <div className="space-y-4">
                <div onClick={() => setView('profile')} className={`flex items-center gap-3 cursor-pointer p-2 rounded-xl transition-colors group ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                   <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-black text-white shadow-lg">U</div>
                   <div className="flex flex-col">
                      <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Usuário Lumina</span>
                      <span className="text-[8px] text-emerald-500 font-bold uppercase flex items-center gap-1 group-hover:text-emerald-400"><ShieldCheck size={10}/> Licença Business</span>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <button onClick={saveReading} className={`flex items-center justify-center gap-2 p-2 rounded-lg text-[9px] font-bold uppercase transition-all shadow-sm ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'}`}><Save size={12}/> Salvar</button>
                   <button onClick={exportToPdf} className={`flex items-center justify-center gap-2 p-2 rounded-lg text-[9px] font-bold uppercase transition-all shadow-sm ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'}`}><Download size={12}/> PDF</button>
                </div>
                <button onClick={() => setDarkMode(!darkMode)} className={`w-full flex items-center gap-2 p-2 text-[10px] font-bold uppercase transition-all ${darkMode ? 'text-slate-500 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-600'}`}>
                  {darkMode ? <Sun size={14}/> : <Moon size={14}/>} {darkMode ? 'Modo Claro' : 'Modo Escuro'}
                </button>
             </div>
           ) : (
              <div className="space-y-4 flex flex-col items-center">
                 <div onClick={() => setView('profile')} className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-black text-white shadow-md cursor-pointer hover:scale-110 transition-transform">U</div>
                 <button onClick={saveReading} className={`text-slate-500 hover:text-indigo-400`} title="Salvar"><Save size={18}/></button>
                 <button onClick={() => setDarkMode(!darkMode)} className={`text-slate-500 hover:text-indigo-400`} title="Tema">{darkMode ? <Sun size={18}/> : <Moon size={18}/>}</button>
              </div>
           )}
        </div>
      </aside>

      {/* ÁREA CENTRAL */}
      <main className="flex-grow flex flex-col h-screen overflow-y-auto custom-scrollbar relative">
        <header className={`h-14 md:h-16 flex items-center justify-between px-4 md:px-10 z-20 sticky top-0 ${darkMode ? 'glass-panel border-b border-slate-800/40' : 'bg-white/80 backdrop-blur-md border-b border-slate-200'}`}>
           <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
              <h2 className={`font-cinzel text-xs md:text-sm font-black tracking-widest uppercase truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {view === 'glossary' ? 'Glossário' : view === 'profile' ? 'Perfil e Estudo' : spreadType === 'relogio' ? 'Relógio' : 'Mesa Real'}
              </h2>
              {view === 'board' && (
                <div className="flex items-center gap-2">
                   <select value={readingTheme} onChange={(e) => setReadingTheme(e.target.value as ReadingTheme)} title="Expansão Temática" className={`text-[9px] font-black uppercase border rounded-md px-2 py-1 outline-none ${darkMode ? 'bg-slate-800/50 text-indigo-300 border-indigo-500/20' : 'bg-white text-indigo-600 border-indigo-200'}`}>
                      {['Geral', 'Amor & Relacionamentos', 'Trabalho & Finanças', 'Espiritualidade & Caminho de Vida'].map(t => <option key={t} value={t}>{t}</option>)}
                   </select>
                </div>
              )}
           </div>
           <div className="flex items-center gap-4">
              {view === 'board' && (
                <button onClick={() => setBoard(generateShuffledArray(spreadType === 'relogio' ? 13 : 36))} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-xl"><RotateCcw size={14} /> EMBARALHAR</button>
              )}
           </div>
        </header>

        <div className="flex-grow p-4 md:p-10 relative">
           {view === 'board' && (
             <div ref={boardRef} className="pb-32">
               {spreadType === 'mesa-real' ? (
                 <div className="max-w-6xl mx-auto flex flex-col gap-8">
                    <div className="grid grid-cols-8 gap-3">
                       {board.slice(0, 32).map((cardId, index) => (
                         <CardVisual key={index} card={cardId ? LENORMAND_CARDS.find(c => c.id === cardId) : null} houseId={index + 1} isSelected={selectedHouse === index} isThemeCard={activeThemeIndex === index} themeColor={getThemeColor(readingTheme)} highlightType={getGeometryHighlight(index)} onClick={() => handleHouseSelection(index)} level={difficultyLevel} darkMode={darkMode} />
                       ))}
                    </div>
                    <div className={`flex flex-col items-center border-t pt-6 ${darkMode ? 'border-slate-800/40' : 'border-slate-200'}`}>
                       <h3 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>VEREDITO FINAL</h3>
                       <div className="grid grid-cols-8 gap-3 w-full">
                          <div className="col-span-2"></div>
                          {board.slice(32, 36).map((cardId, index) => (
                            <CardVisual key={index + 32} card={cardId ? LENORMAND_CARDS.find(c => c.id === cardId) : null} houseId={index + 33} isSelected={selectedHouse === index + 32} isThemeCard={activeThemeIndex === index + 32} themeColor={getThemeColor(readingTheme)} highlightType={getGeometryHighlight(index + 32)} onClick={() => handleHouseSelection(index + 32)} level={difficultyLevel} darkMode={darkMode} />
                          ))}
                          <div className="col-span-2"></div>
                       </div>
                    </div>
                 </div>
               ) : (
                 <div className="flex items-center justify-center min-h-[70vh]">
                    <div className={`relative w-[35rem] h-[35rem] border rounded-full flex items-center justify-center ${darkMode ? 'border-slate-800/20' : 'border-slate-200'}`}>
                       <div className="absolute w-32 z-20">
                          <CardVisual card={board[12] ? LENORMAND_CARDS.find(c => c.id === board[12]) : null} houseId={13} isSelected={selectedHouse === 12} isThemeCard={activeThemeIndex === 12} themeColor={getThemeColor(readingTheme)} highlightType="center" onClick={() => handleHouseSelection(12)} level={difficultyLevel} darkMode={darkMode} />
                       </div>
                       {board.slice(0, 12).map((cardId, index) => {
                          const angle = (index * 30) - 90;
                          const radius = 42; 
                          return (
                            <div key={index} className="absolute w-24 -translate-x-1/2 -translate-y-1/2 z-10" style={{ left: `${50 + radius * Math.cos(angle * Math.PI / 180)}%`, top: `${50 + radius * Math.sin(angle * Math.PI / 180)}%` }}>
                               <CardVisual card={cardId ? LENORMAND_CARDS.find(c => c.id === board[index]) : null} houseId={index + 1} isSelected={selectedHouse === index} isThemeCard={activeThemeIndex === index} themeColor={getThemeColor(readingTheme)} highlightType={getGeometryHighlight(index)} onClick={() => handleHouseSelection(index)} level={difficultyLevel} darkMode={darkMode} />
                            </div>
                          );
                       })}
                    </div>
                 </div>
               )}
             </div>
           )}

           {view === 'profile' && (
             <div className="max-w-5xl mx-auto space-y-10 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid md:grid-cols-3 gap-6">
                   <div className={`md:col-span-1 border p-8 rounded-[2.5rem] flex flex-col items-center text-center shadow-2xl relative overflow-hidden group ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black mb-4 shadow-xl border-4 relative z-10 ${darkMode ? 'bg-indigo-600 border-slate-800 text-white' : 'bg-indigo-50 border-white text-white'}`}>U</div>
                      <h3 className={`text-xl font-cinzel font-bold mb-1 relative z-10 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Usuário Lumina</h3>
                      <p className={`text-xs mb-6 uppercase tracking-widest font-black relative z-10 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Arquiteto de Mesa Real</p>
                      
                      <div className="w-full space-y-3 relative z-10">
                         <div className={`p-4 rounded-2xl border flex items-center gap-3 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                            <Key size={16} className="text-amber-400" />
                            <div className="text-left">
                               <span className={`text-[8px] block font-black ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>CHAVE REGISTRO</span>
                               <span className={`text-[10px] font-mono ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>LMN-8832-QR99</span>
                            </div>
                         </div>
                         <div className={`p-4 rounded-2xl border flex items-center gap-3 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                            <Calendar size={16} className="text-emerald-400" />
                            <div className="text-left">
                               <span className={`text-[8px] block font-black ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>ATIVAÇÃO</span>
                               <span className={`text-[10px] ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>15 de Outubro, 2023</span>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="md:col-span-2 space-y-6">
                      <div className={`border p-8 rounded-[2.5rem] shadow-xl ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                         <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                               <HardDrive size={20} className="text-indigo-400" />
                               <h3 className={`text-sm font-cinzel font-bold uppercase tracking-widest ${darkMode ? 'text-white' : 'text-slate-900'}`}>Laboratório de Estudos</h3>
                            </div>
                            <span className="text-[10px] font-black text-slate-500">{savedReadings.length} TIRAGENS SALVAS</span>
                         </div>

                         {savedReadings.length > 0 ? (
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             {savedReadings.map(r => (
                               <div key={r.id} className={`p-5 rounded-3xl border transition-all group relative ${darkMode ? 'bg-slate-950/60 border-slate-800 hover:border-indigo-500/40' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/40'}`}>
                                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button onClick={() => deleteReading(r.id)} className="p-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={14} /></button>
                                     <button onClick={() => loadReading(r)} className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 transition-all shadow-lg"><ArrowRightLeft size={14} /></button>
                                  </div>
                                  <div className="flex items-center gap-3 mb-3">
                                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-white border border-slate-200 text-slate-600'}`}>{r.spreadType === 'relogio' ? <Clock size={16} /> : <LayoutGrid size={16} />}</div>
                                     <div className="min-w-0">
                                        <h4 className={`text-xs font-bold truncate pr-12 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{r.title}</h4>
                                        <span className="text-[9px] text-slate-500 uppercase font-black">{r.theme}</span>
                                     </div>
                                  </div>
                               </div>
                             ))}
                           </div>
                         ) : (
                           <div className="py-20 text-center opacity-30 flex flex-col items-center">
                              <SearchCode size={48} className={`mb-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Nenhuma tiragem arquivada.</p>
                           </div>
                         )}
                      </div>
                   </div>
                </div>
             </div>
           )}

           {view === 'glossary' && (
             <div className="max-w-7xl mx-auto pb-32 px-4 animate-in fade-in duration-500">
               <div className="mb-10 flex justify-center">
                  <div className="relative w-full max-w-md">
                     <SearchCode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                     <input type="text" placeholder="Buscar por nome ou ID..." value={glossarySearch} onChange={(e) => setGlossarySearch(e.target.value)} className={`w-full border rounded-2xl py-4 pl-12 text-sm outline-none ${darkMode ? 'bg-slate-900 border-slate-800 focus:border-indigo-500' : 'bg-white border-slate-200 focus:border-indigo-500 text-slate-800'}`} />
                  </div>
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                 {LENORMAND_CARDS.filter(c => c.name.toLowerCase().includes(glossarySearch.toLowerCase())).map(card => (
                   <div key={card.id} className={`p-4 rounded-3xl border flex flex-col items-center text-center group transition-all hover:scale-105 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <img src={getCardImageUrl(card.id)} alt={card.name} className="w-full aspect-[3/4.2] mb-4 rounded-2xl object-cover" />
                      <h3 className={`text-[11px] font-cinzel font-bold uppercase tracking-widest ${darkMode ? 'text-white' : 'text-slate-900'}`}>{card.name}</h3>
                   </div>
                 ))}
               </div>
             </div>
           )}

           {view === 'fundamentals' && (
             <div className="max-w-4xl mx-auto space-y-8 pb-32">
               {FUNDAMENTALS_DATA.map(m => (
                 <div key={m.id} className={`p-8 rounded-[2rem] border shadow-xl ${darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white/60 border-slate-200'}`}>
                    <h3 className={`text-lg font-cinzel font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{m.title}</h3>
                    <div className="space-y-4">
                      {m.concepts.map((c, i) => (
                        <div key={i} className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-950/40 border-slate-800/40' : 'bg-slate-50 border-slate-200'}`}>
                          <h4 className={`text-[10px] font-black uppercase mb-1 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{c.title}</h4>
                          <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{c.text}</p>
                        </div>
                      ))}
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </main>

      {/* PAINEL DO MENTOR - RESTAURADO COM TODAS AS INTERPRETAÇÕES */}
      <aside className={`fixed md:sticky top-0 inset-y-0 right-0 z-50 md:z-30 h-screen transition-all duration-500 ease-in-out border-l flex flex-col overflow-hidden ${mentorPanelOpen ? 'w-full md:w-[32rem]' : 'w-16'} ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        {!mentorPanelOpen && (
          <div className={`flex flex-col items-center py-8 gap-12 h-full w-16 cursor-pointer ${darkMode ? 'hover:bg-slate-800/20' : 'hover:bg-slate-100'}`} onClick={() => setMentorPanelOpen(true)}>
             <ChevronLeft size={20} className="text-slate-500" />
             <span className={`font-cinzel text-[11px] font-bold uppercase tracking-[0.5em] whitespace-nowrap rotate-[-90deg] origin-center py-12 transition-colors group-hover:text-indigo-400 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>MENTOR</span>
             <ActivityIcon size={20} className="text-emerald-500/30" />
          </div>
        )}
        {mentorPanelOpen && (
          <>
            <div className={`p-4 border-b flex items-center justify-between sticky top-0 z-50 shadow-lg h-16 shrink-0 ${darkMode ? 'glass-panel border-slate-800' : 'bg-white/80 backdrop-blur-md border-slate-200'}`}>
               <button onClick={() => setMentorPanelOpen(false)} className={`p-2 hover:bg-slate-800/10 rounded-lg ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}><ChevronRight size={18} /></button>
               <h2 className={`text-xs font-bold font-cinzel uppercase tracking-[0.2em] ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Mentor LUMINA</h2>
               <div className="w-10"></div>
            </div>
            
            <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-10">
              {selectedHouse !== null ? (
                <>
                  {/* Resumo da Carta Selecionada */}
                  <div className={`p-6 rounded-[2.5rem] border text-center shadow-lg ${darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    {selectedCard && (
                      <div className="mb-4 aspect-[3/4.2] w-20 mx-auto rounded-xl border-2 border-indigo-500/30 overflow-hidden shadow-xl bg-slate-900">
                        <img src={getCardImageUrl(selectedCard.id)} alt={selectedCard.name} onError={handleImageError} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <h3 className={`text-lg font-cinzel font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedCard?.name || 'Casa Vazia'}</h3>
                    <div className={`p-3 rounded-2xl italic text-xs ${darkMode ? 'bg-indigo-600/5 text-slate-400' : 'bg-indigo-50 text-slate-600'}`}>
                      "{selectedCard?.briefInterpretation || 'Esta posição está livre para receber uma influência técnica.'}"
                    </div>
                  </div>
                  
                  {/* Contexto da Casa */}
                  <div className={`p-6 rounded-[2.5rem] border shadow-md ${darkMode ? 'bg-indigo-900/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'}`}>
                      <span className={`text-[9px] font-black uppercase block mb-1 tracking-widest ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>CASA {selectedHouse + 1}: {currentHouse?.name}</span>
                      <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{currentHouse?.technicalDescription}</p>
                  </div>

                  {/* NOVO: Widget Temporal e Dinâmica de Fluxo */}
                  <div className={`p-5 rounded-[2.5rem] border flex flex-col gap-3 shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                     <div className="flex items-center gap-2">
                        <Clock size={14} className="text-amber-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tempo & Fluxo</span>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div className={`p-3 rounded-2xl flex flex-col gap-1 ${darkMode ? 'bg-slate-950' : 'bg-white border border-slate-100'}`}>
                           <span className={`text-[8px] block font-black uppercase ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Escala Estimada</span>
                           <span className={`text-[10px] font-bold truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedCard?.timingScale || 'Imediato'}</span>
                        </div>
                        <div className={`p-3 rounded-2xl flex flex-col gap-1 ${darkMode ? 'bg-slate-950' : 'bg-white border border-slate-100'}`}>
                           <span className={`text-[8px] block font-black uppercase ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Impacto no Fluxo</span>
                           <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase w-fit ${getTimingCategoryColor(selectedCard?.timingCategory)}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${getTimingDotColor(selectedCard?.timingCategory)}`} />
                              {selectedCard?.timingCategory || 'N/A'}
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Expansão Temática Atual Info */}
                  {readingTheme !== 'Geral' && (
                    <div className={`p-5 rounded-[2.5rem] border flex items-center gap-4 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-indigo-50 border-indigo-100'}`}>
                       <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0 shadow-lg">
                          {readingTheme === 'Amor & Relacionamentos' ? <Heart size={18} /> : 
                           readingTheme === 'Trabalho & Finanças' ? <Briefcase size={18} /> : <Stars size={18} />}
                       </div>
                       <div>
                          <span className={`text-[8px] font-black uppercase block ${darkMode ? 'text-slate-500' : 'text-indigo-500'}`}>FOCO TEMÁTICO</span>
                          <h4 className={`text-[10px] font-bold ${darkMode ? 'text-slate-200' : 'text-indigo-900'}`}>{readingTheme}</h4>
                       </div>
                    </div>
                  )}

                  {/* Geometrias Detalhadas (Mesa Real) */}
                  {spreadType === 'mesa-real' && (
                    <div className="space-y-8">
                       <div className={`flex items-center gap-2 px-2 border-b pb-2 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                          <Layers size={14} className="text-indigo-400" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Geometrias de Campo</span>
                       </div>

                       {/* Espelhamentos */}
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2"><ArrowRightLeft size={14} /> Espelhamentos (Polaridade)</h4>
                          {mirrorCards.length > 0 ? mirrorCards.map((m, i) => (
                            <RelatedCardMini key={`mirror-${i}`} card={m.card} houseName={m.house.name} houseId={m.idx + 1} label="Equilíbrio" labelColor="bg-cyan-500/20 text-cyan-400" darkMode={darkMode} />
                          )) : <p className="text-[9px] italic text-slate-500 px-2">Sem espelhamentos nesta posição.</p>}
                       </div>

                       {/* Cavalo */}
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2"><Zap size={14} /> Salto do Cavalo (Dinâmica)</h4>
                          {knightCards.length > 0 ? knightCards.map((k, i) => (
                            <RelatedCardMini key={`knight-${i}`} card={k.card} houseName={k.house.name} houseId={k.idx + 1} label="Influência" labelColor="bg-fuchsia-500/20 text-fuchsia-400" darkMode={darkMode} />
                          )) : <p className="text-[9px] italic text-slate-500 px-2">Posição de borda, sem saltos disponíveis.</p>}
                       </div>

                       {/* Diagonais */}
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2"><MoveDiagonal size={14} /> Diagonais (Tendências)</h4>
                          <div className="grid grid-cols-1 gap-4">
                            {diagUp.map((d, i) => <RelatedCardMini key={`up-${i}`} card={d.card} houseName={d.house.name} houseId={d.idx + 1} label="Ascendente" labelColor="bg-orange-500/20 text-orange-400" darkMode={darkMode} />)}
                            {diagDown.map((d, i) => <RelatedCardMini key={`dn-${i}`} card={d.card} houseName={d.house.name} houseId={d.idx + 1} label="Descendente" labelColor="bg-indigo-500/20 text-indigo-400" darkMode={darkMode} />)}
                          </div>
                       </div>
                    </div>
                  )}

                  {/* Dinâmica de Oposição (Relógio) */}
                  {spreadType === 'relogio' && oppCard && (
                    <div className="space-y-6">
                      <div className={`flex items-center gap-2 px-2 border-b pb-2 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                        <RefreshCw size={14} className="text-rose-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Eixo de Oposição (180°)</span>
                      </div>
                      <RelatedCardMini card={oppCard} houseName="Casa Oposta" houseId={oppIndex! + 1} label="Tensão" labelColor="bg-rose-500/20 text-rose-400" darkMode={darkMode} />
                      {axisInfo && (
                        <div className={`p-4 rounded-3xl border text-[10px] leading-relaxed italic ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                          {axisInfo.description}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Análise IA Mentor */}
                  <div className={`pt-8 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                      {!cardAnalysis ? (
                        <button onClick={runMentorAnalysis} disabled={isAiLoading || !selectedCard} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-5 rounded-3xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
                          {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                          <span>Solicitar Análise Técnica</span>
                        </button>
                      ) : (
                        <div className={`rounded-[2.5rem] p-6 border shadow-2xl animate-in fade-in zoom-in-95 duration-500 ${darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <div className={`prose prose-sm whitespace-pre-wrap ${darkMode ? 'prose-invert' : 'prose-slate'}`}>{cardAnalysis}</div>
                          <button onClick={() => setCardAnalysis(null)} className="mt-8 text-[9px] text-slate-500 underline uppercase block w-full text-center hover:text-indigo-500 transition-colors">Limpar Relatório do Mentor</button>
                        </div>
                      )}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20 p-8">
                  <Compass size={64} className={`mb-6 animate-pulse ${darkMode ? 'text-slate-200' : 'text-slate-800'}`} />
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 leading-relaxed">Explore a mesa e selecione uma casa para iniciar a leitura pedagógica.</p>
                </div>
              )}
            </div>
            
            {/* Veredito Final (Mini Preview se disponível) */}
            {selectedHouse === null && spreadType === 'mesa-real' && (
               <div className={`p-4 border-t ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'} flex flex-col gap-3`}>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Resumo do Veredito (Casas 33-36)</span>
                  <div className="flex gap-2 h-12">
                     {[32, 33, 34, 35].map(idx => (
                        <div key={idx} className={`flex-1 rounded-lg border flex items-center justify-center text-[10px] font-bold ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-600' : 'bg-white border-slate-200 text-slate-400'}`}>
                           {board[idx] ? board[idx] : '?'}
                        </div>
                     ))}
                  </div>
               </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
};

export default App;