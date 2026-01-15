import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  LayoutGrid, RotateCcw, Sparkles, ChevronRight, ChevronLeft, BookOpen, 
  Compass, Target, Activity, Award, Key, Clock, Edit3, Dices, Zap, 
  MessageSquare, User, Sun, Moon, History, AlertCircle, LogOut, Mail, 
  ShieldCheck, Info, Wand2, HelpCircle, Anchor, X, AlertTriangle, 
  Brain, GitBranch, Layers, SearchCode, Loader2, Settings, ListFilter,
  ArrowRightLeft, MoveDiagonal, Heart, Briefcase, Stars, ChevronUp, ChevronDown,
  Eye, Maximize2, Minimize2, Menu, Save, Download, CreditCard, Activity as ActivityIcon,
  Book, GitMerge, RefreshCw, Scale, ZapOff, Trash2, Calendar, HardDrive, Smartphone, Globe, Share2,
  GraduationCap, PenTool, ClipboardList, BarChart3, Binary, MousePointer2, Plus, Monitor,
  Crosshair, Frame, CornerDownRight, CheckCircle2
} from 'lucide-react';
import html2canvas from 'https://esm.sh/html2canvas@1.4.1';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';

import { LENORMAND_CARDS, LENORMAND_HOUSES, FUNDAMENTALS_DATA } from './constants';
import { Polarity, Timing, LenormandCard, LenormandHouse, SpreadType, StudyLevel, ReadingTheme } from './types';
import { getDetailedCardAnalysis } from './geminiService';
import * as Geometry from './geometryService';
import { CARD_IMAGES, FALLBACK_IMAGE, BASE64_FALLBACK } from './cardImages';

// ===============================
// Interfaces e Tipagem
// ===============================
interface SavedReading {
  id: string;
  timestamp: number;
  board: (number | null)[];
  theme: ReadingTheme;
  spreadType: SpreadType;
  title: string;
  userAnnotations?: Record<number, string>;
}

type GeometryFilter = 'ponte' | 'cavalo' | 'moldura' | 'veredito' | 'diagonais' | 'todas' | 'nenhuma';
type ThemeMode = 'light' | 'dark' | 'system';

// ===============================
// Componentes de Interface
// ===============================
const NavItem: React.FC<{ icon: React.ReactNode; label: string; active: boolean; collapsed: boolean; onClick: () => void; darkMode: boolean }> = ({ icon, label, active, collapsed, onClick, darkMode }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]' : darkMode ? 'text-indigo-300/70 hover:bg-slate-800 hover:text-indigo-200' : 'text-slate-900 hover:bg-slate-200 hover:text-indigo-950 font-bold'} ${collapsed ? 'justify-center px-0' : ''}`} title={collapsed ? label : ""}>
    <div className={`${collapsed ? 'scale-110' : ''}`}>{icon}</div>
    {!collapsed && <span className="font-medium text-[10px] uppercase font-bold tracking-widest whitespace-nowrap overflow-hidden">{label}</span>}
  </button>
);

const CardVisual: React.FC<{ card: any; houseId: number; onClick: () => void; isSelected: boolean; isThemeCard: boolean; themeColor?: string; highlightType?: string | null; darkMode: boolean; isManualMode?: boolean }> = ({ card, houseId, onClick, isSelected, isThemeCard, themeColor, highlightType, darkMode, isManualMode }) => {
  const highlightStyles: Record<string, string> = {
    mirror: 'ring-4 ring-cyan-500/60 border-cyan-400 scale-105 z-10 animate-pulse',
    knight: 'ring-4 ring-fuchsia-500/60 border-fuchsia-400 scale-105 z-10 animate-pulse',
    frame: 'border-amber-500/80 ring-2 ring-amber-500/40 animate-pulse',
    axis: 'ring-4 ring-indigo-500/60 border-indigo-400 scale-105 z-10 animate-pulse',
    bridge: 'ring-4 ring-amber-400/80 border-amber-400 scale-110 z-30 animate-bounce',
    veredito: 'ring-4 ring-emerald-500/60 border-emerald-400 scale-105 z-10 animate-pulse',
    'diag-up': 'ring-4 ring-orange-500/60 border-orange-400 scale-105 z-10 animate-pulse',
    'diag-down': 'ring-4 ring-indigo-500/60 border-indigo-400 scale-105 z-10 animate-pulse',
    'center': 'ring-4 ring-amber-400 border-amber-400 scale-110 z-30 animate-pulse',
    theme: 'ring-[6px] ring-white/40 border-white scale-110 z-40 animate-pulse'
  };

  return (
    <div onClick={onClick} className={`relative group aspect-[3/4.2] rounded-xl border-2 cursor-pointer transition-all duration-500 overflow-hidden shadow-xl ${isSelected ? 'border-indigo-400 ring-4 ring-indigo-400/30 scale-105 z-20' : isThemeCard ? 'border-transparent scale-105 z-20' : highlightType ? `${highlightStyles[highlightType]}` : darkMode ? 'border-slate-800/60 hover:border-slate-600 bg-slate-900/60' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`} style={isThemeCard ? { boxShadow: `0 0 30px ${themeColor}, inset 0 0 15px ${themeColor}` } : {}}>
      {card && (
        <div className="absolute inset-0 z-0">
          <img src={CARD_IMAGES[card.id] || FALLBACK_IMAGE} className={`w-full h-full object-cover opacity-40 transition-opacity`} alt="" />
        </div>
      )}
      {!card && isManualMode && <div className="absolute inset-0 flex items-center justify-center"><Plus size={16} className={`opacity-30 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`} /></div>}
      <div className="absolute top-1 left-1 z-20">
        <span className={`text-[7px] md:text-[8px] font-black uppercase bg-black/40 px-1 rounded-sm backdrop-blur-sm text-white`}>CASA {houseId}</span>
      </div>
      {card && (
        <div className="absolute inset-0 z-30 flex flex-col p-2 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent">
          <div className="flex-grow flex flex-col items-center justify-center text-center mt-2">
            <span className="text-[7px] md:text-[10px] font-cinzel font-bold text-white uppercase leading-tight tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{card.name}</span>
          </div>
          <div className="mt-auto flex justify-between items-center bg-black/30 -mx-2 -mb-2 px-2 py-0.5">
            <span className="text-[8px] font-black text-white">{card.id}</span>
            <div className={`w-1.5 h-1.5 rounded-full ${card.polarity === Polarity.POSITIVE ? 'bg-emerald-500' : card.polarity === Polarity.NEGATIVE ? 'bg-rose-500' : 'bg-slate-400'}`} />
          </div>
        </div>
      )}
    </div>
  );
};

// ===============================
// App Principal
// ===============================
const App: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mentorPanelOpen, setMentorPanelOpen] = useState(true);
  
  // Lógica de Temas
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => (localStorage.getItem('lumina_theme') as ThemeMode) || 'system');
  const [darkMode, setDarkMode] = useState(true);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  useEffect(() => {
    localStorage.setItem('lumina_theme', themeMode);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = () => {
      if (themeMode === 'system') {
        setDarkMode(mediaQuery.matches);
      } else {
        setDarkMode(themeMode === 'dark');
      }
    };

    applyTheme();
    
    if (themeMode === 'system') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [themeMode]);

  const [view, setView] = useState<'board' | 'fundamentals' | 'glossary' | 'profile' | 'study'>('board');
  const [spreadType, setSpreadType] = useState<SpreadType>('mesa-real');
  const [isManualMode, setIsManualMode] = useState(false);
  const [difficultyLevel, setDifficultyLevel] = useState<StudyLevel>('Iniciante');
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>('Geral');
  
  const [board, setBoard] = useState<(number | null)[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [geometryFilters, setGeometryFilters] = useState<Set<GeometryFilter>>(new Set(['nenhuma']));
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [cardAnalysis, setCardAnalysis] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);

  // Inicialização
  useEffect(() => {
    if (isManualMode) {
      setBoard(new Array(spreadType === 'relogio' ? 13 : 36).fill(null));
    } else {
      setBoard(generateShuffledArray(spreadType === 'relogio' ? 13 : 36));
    }
    setSelectedHouse(null);
    setCardAnalysis(null);
  }, [spreadType, isManualMode]);

  const generateShuffledArray = (size: number) => {
    const ids = Array.from({length: 36}, (_, i) => i + 1);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids.slice(0, size);
  };

  const selectedCard = useMemo(() => (selectedHouse !== null && board[selectedHouse]) ? LENORMAND_CARDS.find(c => c.id === board[selectedHouse]) : null, [selectedHouse, board]);
  
  const currentHouse = useMemo(() => {
    if (selectedHouse === null) return null;
    if (spreadType === 'relogio') {
      if (selectedHouse === 12) return { id: 113, name: "Tom da Leitura", theme: "Síntese Anual", technicalDescription: "A energia central que regula todo o ciclo anual de 12 meses." } as LenormandHouse;
      return LENORMAND_HOUSES.find(h => h.id === 101 + selectedHouse);
    }
    return LENORMAND_HOUSES[selectedHouse];
  }, [selectedHouse, spreadType]);

  const toggleFilter = (f: GeometryFilter) => {
    setGeometryFilters(prev => {
      const next = new Set(prev);
      if (f === 'nenhuma') { next.clear(); next.add('nenhuma'); }
      else if (f === 'todas') { next.clear(); next.add('todas'); }
      else { next.delete('nenhuma'); next.delete('todas'); if (next.has(f)) next.delete(f); else next.add(f); if (next.size === 0) next.add('nenhuma'); }
      return next;
    });
  };

  const handleHouseSelection = (index: number) => {
    setSelectedHouse(index);
    setMentorPanelOpen(true); // Abrir automaticamente o painel do mentor ao selecionar
    if (isManualMode) setShowCardPicker(true);
    else setCardAnalysis(null);
  };

  const getGeometryHighlight = (idx: number) => {
    if (geometryFilters.has('nenhuma') && selectedHouse === null) return null;
    const showAll = geometryFilters.has('todas');
    if ((showAll || geometryFilters.has('moldura')) && Geometry.getMoldura().includes(idx)) return 'frame';
    if ((showAll || geometryFilters.has('veredito')) && idx >= 32) return 'veredito';
    if (selectedHouse !== null) {
      if (showAll || geometryFilters.has('ponte')) {
        const targetId = selectedHouse + 1;
        const targetIdx = board.findIndex(id => id === (targetId));
        if (idx === targetIdx) return 'bridge';
      }
      if (showAll || geometryFilters.has('cavalo')) if (Geometry.getCavalo(selectedHouse).includes(idx)) return 'knight';
      if (showAll || geometryFilters.has('diagonais')) {
        if (Geometry.getDiagonaisSuperiores(selectedHouse).includes(idx)) return 'diag-up';
        if (Geometry.getDiagonaisInferiores(selectedHouse).includes(idx)) return 'diag-down';
      }
    }
    if (spreadType === 'relogio') {
      if (idx === 12) return 'center';
      if (selectedHouse !== null && idx === Geometry.getOposicaoRelogio(selectedHouse)) return 'axis';
    }
    return null;
  };

  // Cálculo de dados para o Painel do Mentor
  const bridgeData = useMemo(() => {
    if (selectedHouse === null || spreadType !== 'mesa-real') return null;
    const targetIdx = board.findIndex(id => id === (selectedHouse + 1));
    return targetIdx !== -1 ? { card: LENORMAND_CARDS.find(c => c.id === board[targetIdx]), house: LENORMAND_HOUSES[targetIdx], houseId: targetIdx + 1 } : null;
  }, [selectedHouse, board, spreadType]);

  const knightData = useMemo(() => {
    if (selectedHouse === null || spreadType !== 'mesa-real') return [];
    return Geometry.getCavalo(selectedHouse).map(idx => ({ card: board[idx] ? LENORMAND_CARDS.find(c => c.id === board[idx]) : null, house: LENORMAND_HOUSES[idx], houseId: idx + 1 })).filter(i => i.card);
  }, [selectedHouse, board, spreadType]);

  const diagonalData = useMemo(() => {
    if (selectedHouse === null || spreadType !== 'mesa-real') return { up: [], down: [] };
    const mapper = (idx: number) => ({ card: board[idx] ? LENORMAND_CARDS.find(c => c.id === board[idx]) : null, houseId: idx + 1 });
    return { up: Geometry.getDiagonaisSuperiores(selectedHouse).map(mapper).filter(i => i.card), down: Geometry.getDiagonaisInferiores(selectedHouse).map(mapper).filter(i => i.card) };
  }, [selectedHouse, board, spreadType]);

  const frameData = useMemo(() => {
    if (spreadType !== 'mesa-real') return null;
    const mapper = (idx: number) => ({ card: board[idx] ? LENORMAND_CARDS.find(c => c.id === board[idx]) : null, houseId: idx + 1 });
    return { superior: [0, 7].map(mapper), inferior: [24, 31].map(mapper) };
  }, [board, spreadType]);

  const axisDataRelogio = useMemo(() => {
    if (selectedHouse === null || spreadType !== 'relogio' || selectedHouse === 12) return null;
    const oppositeIdx = Geometry.getOposicaoRelogio(selectedHouse);
    return { axis: Geometry.getAxisDataRelogio(selectedHouse), oppositeCard: board[oppositeIdx] ? LENORMAND_CARDS.find(c => c.id === board[oppositeIdx]) : null, oppositeHouseId: oppositeIdx + 1 };
  }, [selectedHouse, board, spreadType]);

  const runMentorAnalysis = useCallback(async () => {
    if (selectedHouse === null || board[selectedHouse] === null) return;
    
    setIsAiLoading(true);
    setCardAnalysis(null);
    
    try {
      const result = await getDetailedCardAnalysis(
        board,
        selectedHouse,
        readingTheme,
        spreadType,
        difficultyLevel
      );
      setCardAnalysis(result);
    } catch (error) {
      console.error("Mentor analysis failed:", error);
      setCardAnalysis("Erro de conexão com o Mentor.");
    } finally {
      setIsAiLoading(false);
    }
  }, [board, selectedHouse, readingTheme, spreadType, difficultyLevel]);

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${darkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900'} transition-colors overflow-hidden font-inter`}>
      {/* SIDEBAR */}
      <aside className={`flex flex-col border-r ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-xl'} transition-all duration-300 z-[60] h-screen sticky top-0 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="p-4 flex items-center justify-between">
           {!sidebarCollapsed && <h1 className={`text-xs font-bold font-cinzel ${darkMode ? 'text-indigo-100' : 'text-indigo-950'}`}>LUMINA</h1>}
           <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className={`p-2 rounded-lg ${darkMode ? 'text-slate-500 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>{sidebarCollapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}</button>
        </div>
        <nav className="flex-grow px-2 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem icon={<LayoutGrid size={18}/>} label="Mesa Real" active={view === 'board' && spreadType === 'mesa-real'} collapsed={sidebarCollapsed} onClick={() => {setView('board'); setSpreadType('mesa-real'); setIsManualMode(false);}} darkMode={darkMode} />
          <NavItem icon={<Clock size={18}/>} label="Relógio" active={view === 'board' && spreadType === 'relogio'} collapsed={sidebarCollapsed} onClick={() => {setView('board'); setSpreadType('relogio'); setIsManualMode(false);}} darkMode={darkMode} />
          <NavItem icon={<Book size={18}/>} label="Glossário" active={view === 'glossary'} collapsed={sidebarCollapsed} onClick={() => setView('glossary')} darkMode={darkMode} />
          <NavItem icon={<BookOpen size={18}/>} label="Fundamentos" active={view === 'fundamentals'} collapsed={sidebarCollapsed} onClick={() => setView('fundamentals')} darkMode={darkMode} />
          <NavItem icon={<Edit3 size={18}/>} label="Personalizada" active={view === 'board' && isManualMode} collapsed={sidebarCollapsed} onClick={() => {setView('board'); setIsManualMode(true);}} darkMode={darkMode} />
          <NavItem icon={<GraduationCap size={18}/>} label="Modo Estudo" active={view === 'study'} collapsed={sidebarCollapsed} onClick={() => setView('study')} darkMode={darkMode} />
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-2">
          {['Salvar', 'Exportar', 'Tema', 'Perfil'].map((label, idx) => (
            <div key={idx} className="relative w-full">
              <button 
                onClick={idx === 2 ? () => setShowThemeMenu(!showThemeMenu) : idx === 3 ? () => setView('profile') : undefined}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all ${darkMode ? 'text-indigo-100 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white' : 'text-indigo-950 bg-indigo-100 border border-indigo-300 hover:bg-indigo-600 hover:text-white'} ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
              >
                {idx === 0 && <Save size={18}/>}
                {idx === 1 && <Download size={18}/>}
                {idx === 2 && (themeMode === 'light' ? <Sun size={18}/> : themeMode === 'dark' ? <Moon size={18}/> : <Monitor size={18}/>)}
                {idx === 3 && <User size={18}/>}
                {!sidebarCollapsed && <span className="text-[10px] uppercase tracking-widest">{label}</span>}
              </button>
              
              {idx === 2 && showThemeMenu && (
                <div className={`absolute bottom-full left-0 mb-2 w-full p-2 rounded-xl shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} z-50 animate-in fade-in slide-in-from-bottom-2`}>
                  <button onClick={() => {setThemeMode('light'); setShowThemeMenu(false)}} className={`w-full flex items-center gap-3 p-2 rounded-lg text-[10px] font-bold uppercase transition-colors ${themeMode === 'light' ? 'bg-indigo-600 text-white' : darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-700'}`}>
                    <Sun size={14}/> {!sidebarCollapsed && 'Claro'}
                  </button>
                  <button onClick={() => {setThemeMode('dark'); setShowThemeMenu(false)}} className={`w-full flex items-center gap-3 p-2 rounded-lg text-[10px] font-bold uppercase transition-colors ${themeMode === 'dark' ? 'bg-indigo-600 text-white' : darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-700'}`}>
                    <Moon size={14}/> {!sidebarCollapsed && 'Escuro'}
                  </button>
                  <button onClick={() => {setThemeMode('system'); setShowThemeMenu(false)}} className={`w-full flex items-center gap-3 p-2 rounded-lg text-[10px] font-bold uppercase transition-colors ${themeMode === 'system' ? 'bg-indigo-600 text-white' : darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-700'}`}>
                    <Monitor size={14}/> {!sidebarCollapsed && 'Sistema'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-grow flex flex-col h-screen overflow-y-auto custom-scrollbar">
        <header className={`h-16 flex items-center justify-between px-10 border-b sticky top-0 z-20 backdrop-blur-md transition-colors ${darkMode ? 'bg-slate-950/80 border-white/5' : 'bg-white/95 border-slate-200 shadow-sm'}`}>
          <h2 className={`font-cinzel text-sm font-black tracking-widest uppercase ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {view === 'board' ? (isManualMode ? 'Mesa Personalizada' : spreadType === 'mesa-real' ? 'Mesa Real' : 'Relógio') : view === 'glossary' ? 'Glossário' : view === 'fundamentals' ? 'Fundamentos' : view === 'profile' ? 'Perfil do Usuário' : 'Estudo'}
          </h2>
          {view === 'board' && (
            <div className="flex items-center gap-2">
               {isManualMode && (
                 <div className="flex gap-2 mr-4">
                   <button onClick={() => setSpreadType('mesa-real')} className={`px-3 py-1 rounded-lg text-[8px] font-bold uppercase transition-all ${spreadType === 'mesa-real' ? 'bg-indigo-500 text-white' : darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-700 font-bold'}`}>Real</button>
                   <button onClick={() => setSpreadType('relogio')} className={`px-3 py-1 rounded-lg text-[8px] font-bold uppercase transition-all ${spreadType === 'relogio' ? 'bg-indigo-500 text-white' : darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-700 font-bold'}`}>Relógio</button>
                 </div>
               )}
               <div className={`flex p-1 rounded-xl border ${darkMode ? 'bg-slate-800/20 border-white/5' : 'bg-slate-200/80 border-slate-300'}`}>
                 {(['nenhuma', 'ponte', 'cavalo', 'moldura', 'veredito', 'diagonais', 'todas'] as GeometryFilter[]).map(f => (
                   <button key={f} onClick={() => toggleFilter(f)} className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${geometryFilters.has(f) ? 'bg-indigo-600 text-white' : darkMode ? 'text-slate-500 hover:text-slate-200' : 'text-slate-700 hover:text-slate-950'}`}>{f}</button>
                 ))}
               </div>
               <button onClick={() => setBoard(generateShuffledArray(spreadType === 'relogio' ? 13 : 36))} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-xl ml-4"><RotateCcw size={14} /> EMBARALHAR</button>
            </div>
          )}
        </header>

        <div className="p-4 md:p-10 flex-grow flex flex-col min-h-0">
          {view === 'board' && (
            <div ref={boardRef} className="flex-grow flex flex-col items-center justify-center min-h-0 w-full py-4 overflow-hidden">
              {spreadType === 'mesa-real' ? (
                <div className="max-w-6xl w-full grid grid-cols-8 gap-1 md:gap-3 mx-auto landscape:scale-[0.8] sm:landscape:scale-[0.9] lg:landscape:scale-100 origin-center transition-all duration-300 flex-grow-0">
                  {board.slice(0, 32).map((id, i) => <CardVisual key={i} card={id ? LENORMAND_CARDS.find(c => c.id === id) : null} houseId={i + 1} isSelected={selectedHouse === i} isThemeCard={false} highlightType={getGeometryHighlight(i)} onClick={() => handleHouseSelection(i)} darkMode={darkMode} isManualMode={isManualMode} />)}
                  <div className="col-span-8 flex justify-center py-2 md:py-4"><span className="text-[9px] md:text-[11px] font-cinzel font-black tracking-[0.6em] text-slate-500 uppercase opacity-60">VEREDITO</span></div>
                  <div className="col-span-2"></div>
                  {board.slice(32, 36).map((id, i) => <CardVisual key={i+32} card={id ? LENORMAND_CARDS.find(c => c.id === id) : null} houseId={i + 33} isSelected={selectedHouse === i+32} isThemeCard={false} highlightType={getGeometryHighlight(i+32)} onClick={() => handleHouseSelection(i+32)} darkMode={darkMode} isManualMode={isManualMode} />)}
                </div>
              ) : (
                <div className="flex items-center justify-center flex-grow min-h-0 w-full landscape:scale-[0.6] sm:landscape:scale-[0.8] lg:landscape:scale-100 origin-center transition-all">
                  <div className={`relative w-[28rem] h-[28rem] md:w-[32rem] md:h-[32rem] border rounded-full flex items-center justify-center ${darkMode ? 'border-slate-800/20' : 'border-slate-200'}`}>
                    <div className="absolute w-28 z-20"><CardVisual card={board[12] ? LENORMAND_CARDS.find(c => c.id === board[12]) : null} houseId={13} isSelected={selectedHouse === 12} isThemeCard={false} highlightType="center" onClick={() => handleHouseSelection(12)} darkMode={darkMode} isManualMode={isManualMode} /></div>
                    {board.slice(0, 12).map((id, i) => {
                      const angle = (i * 30) - 90;
                      return (
                        <div 
                          key={i} 
                          className="absolute w-24 aspect-[3/4.2] -translate-x-1/2 -translate-y-1/2 z-10" 
                          style={{ left: `${50 + 40 * Math.cos(angle * Math.PI / 180)}%`, top: `${50 + 40 * Math.sin(angle * Math.PI / 180)}%` }}
                        >
                          <CardVisual 
                            card={id ? LENORMAND_CARDS.find(c => c.id === id) : null} 
                            houseId={i + 1} 
                            isSelected={selectedHouse === i} 
                            isThemeCard={false} 
                            highlightType={getGeometryHighlight(i)} 
                            onClick={() => handleHouseSelection(i)} 
                            darkMode={darkMode} 
                            isManualMode={isManualMode} 
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'glossary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {LENORMAND_CARDS.map(card => (
                <div key={card.id} className={`${darkMode ? 'bg-slate-900 border-slate-800 text-indigo-100' : 'bg-white border-slate-200 text-slate-900 shadow-lg'} border rounded-2xl p-6 hover:border-indigo-500/50 transition-colors`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-16 rounded-lg bg-slate-800 overflow-hidden shrink-0"><img src={CARD_IMAGES[card.id] || FALLBACK_IMAGE} className="w-full h-full object-cover" /></div>
                    <div><h3 className="text-sm font-cinzel font-bold">{card.id}. {card.name}</h3><span className={`text-[8px] font-black uppercase ${card.polarity === Polarity.POSITIVE ? 'text-emerald-500' : 'text-rose-500'}`}>{card.polarity}</span></div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed mb-4 italic">"{card.briefInterpretation}"</p>
                  <div className="flex flex-wrap gap-1">{card.keywords.map((k, i) => <span key={i} className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase ${darkMode ? 'bg-slate-800 text-indigo-300' : 'bg-indigo-50 text-indigo-800 font-bold'}`}>{k}</span>)}</div>
                </div>
              ))}
            </div>
          )}

          {view === 'fundamentals' && (
            <div className="max-w-4xl mx-auto space-y-12">
              {FUNDAMENTALS_DATA.map(mod => (
                <div key={mod.id} className="space-y-6">
                  <div><h3 className={`text-xl font-cinzel font-bold ${darkMode ? 'text-indigo-100' : 'text-indigo-950'}`}>{mod.title}</h3><p className="text-slate-400 text-sm">{mod.description}</p></div>
                  <div className="grid gap-4">
                    {mod.concepts.map((concept, i) => (
                      <div key={i} className={`${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'} border p-6 rounded-2xl`}>
                        <h4 className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-indigo-400' : 'text-indigo-800'} mb-2`}>{concept.title}</h4>
                        <p className={`text-sm leading-relaxed mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{concept.text}</p>
                        {concept.example && <p className="text-xs text-slate-500 italic">Ex: {concept.example}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'study' && (
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center opacity-60">
              <GraduationCap size={64} className="mb-6 text-indigo-500" />
              <h2 className={`text-xl font-cinzel font-bold mb-2 ${darkMode ? 'text-indigo-100' : 'text-indigo-950'}`}>Modo Estudo Em Construção</h2>
              <p className="text-slate-400 max-w-sm">Este módulo está sendo atualizado para incluir quizes interativos e trilhas de aprendizado multinível. Use o "Glossário" e "Fundamentos" por enquanto.</p>
            </div>
          )}

          {view === 'profile' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={`${darkMode ? 'bg-slate-900/40 border-indigo-500/20' : 'bg-white border-slate-200 shadow-xl'} border rounded-[2.5rem] p-10 text-center`}>
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-cinzel font-bold shadow-2xl">
                  L
                </div>
                <h3 className={`text-2xl font-cinzel font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>Estudante Lumina</h3>
                <p className="text-indigo-600 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">Nível Iniciante • 12 Tiragens</p>
                <div className="grid grid-cols-3 gap-4 mt-10">
                  {[
                    { label: 'Tiragens', val: '12', icon: <History size={16}/> },
                    { label: 'Cartas Vistas', val: '36/36', icon: <Layers size={16}/> },
                    { label: 'Pontuação', val: '450', icon: <Award size={16}/> }
                  ].map((stat, i) => (
                    <div key={i} className={`${darkMode ? 'bg-slate-950/60' : 'bg-slate-50'} p-4 rounded-2xl border ${darkMode ? 'border-white/5' : 'border-slate-100 shadow-sm'}`}>
                      <div className="text-indigo-600 mb-2 flex justify-center">{stat.icon}</div>
                      <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stat.val}</div>
                      <div className="text-[8px] font-black uppercase text-slate-500">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className={`text-xs font-black uppercase tracking-widest ${darkMode ? 'text-indigo-400' : 'text-indigo-900'}`}>Últimas Atividades</h4>
                {[1, 2, 3].map(i => (
                  <div key={i} className={`${darkMode ? 'bg-slate-900/20 border-white/5' : 'bg-white border-slate-200 shadow-sm'} border p-4 rounded-2xl flex items-center justify-between`}>
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><RotateCcw size={16}/></div>
                      <div>
                        <p className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>Mesa Real — Geral</p>
                        <p className="text-[10px] text-slate-500">Há {i} dia(s)</p>
                      </div>
                    </div>
                    <button className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-500 font-bold">Ver Detalhes</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MODAL PICKER PARA MODO MANUAL */}
        {showCardPicker && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <div className="max-w-4xl w-full max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 custom-scrollbar">
              <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
                <h3 className="text-sm font-cinzel font-bold text-indigo-100">Escolha a Carta para Casa {selectedHouse! + 1}</h3>
                <button onClick={() => setShowCardPicker(false)} className="p-2 text-slate-500 hover:text-white"><X size={24}/></button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-3">
                {LENORMAND_CARDS.map(card => {
                  const isUsed = board.includes(card.id);
                  return (
                    <div key={card.id} onClick={() => { 
                      const newBoard = [...board]; 
                      const prevIdx = newBoard.indexOf(card.id); 
                      if(prevIdx !== -1) newBoard[prevIdx] = null; 
                      newBoard[selectedHouse!] = card.id; 
                      setBoard(newBoard); 
                      setShowCardPicker(false); 
                    }} className={`aspect-[3/4.2] rounded-xl border-2 flex flex-col items-center justify-center p-2 cursor-pointer transition-all ${isUsed ? 'opacity-40 grayscale pointer-events-none' : 'border-slate-700 hover:border-indigo-500 bg-slate-800/60'}`}>
                      <span className="text-[10px] font-black text-slate-400">{card.id}</span>
                      <span className="text-[7px] font-bold text-center uppercase tracking-tighter mt-1 text-indigo-200">{card.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MENTOR PANEL */}
      <aside className={`fixed md:sticky top-0 inset-y-0 right-0 z-[70] md:z-30 h-screen transition-all duration-500 border-l flex flex-col overflow-hidden ${mentorPanelOpen ? 'w-full md:w-[32rem]' : 'w-16'} ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        {!mentorPanelOpen && <div className="flex flex-col items-center py-8 h-full w-16 cursor-pointer" onClick={() => setMentorPanelOpen(true)}><ChevronLeft size={20} className="text-slate-500" /><span className="font-cinzel text-[11px] font-bold uppercase tracking-[0.5em] rotate-[-90deg] origin-center py-12 text-slate-500">MENTOR</span></div>}
        {mentorPanelOpen && (
          <>
            <div className={`p-4 border-b flex items-center justify-between shadow-lg h-16 shrink-0 ${darkMode ? '' : 'bg-slate-50 border-slate-200'}`}><button onClick={() => setMentorPanelOpen(false)} className={`p-2 transition-colors ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-950'}`}><ChevronRight size={18} /></button><h2 className={`text-xs font-bold font-cinzel uppercase tracking-[0.2em] ${darkMode ? 'text-indigo-100' : 'text-indigo-950 font-black'}`}>Mentor LUMINA</h2><div className="w-10"></div></div>
            <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-8 pb-32">
              {selectedHouse !== null && board[selectedHouse] ? (
                <>
                  {/* IDENTIFICAÇÃO */}
                  <div className={`p-6 rounded-3xl border shadow-lg ${darkMode ? 'bg-slate-950/60 border-indigo-500/20' : 'bg-white border-slate-200'} flex items-center gap-6`}>
                    <div className="w-16 md:w-20 aspect-[3/4.2] rounded-xl overflow-hidden border border-slate-700 shrink-0 shadow-lg">
                      <img src={CARD_IMAGES[selectedCard?.id] || FALLBACK_IMAGE} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-grow">
                      <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1 block">CASA {selectedHouse + (spreadType === 'relogio' && selectedHouse < 12 ? 101 : spreadType === 'relogio' ? 113 : 1)}: {currentHouse?.name}</span>
                      <h3 className={`text-xl font-cinzel font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-950'}`}>{selectedCard?.name}</h3>
                      <div className="flex items-center gap-4 mt-2">
                         <div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${selectedCard?.polarity === Polarity.POSITIVE ? 'bg-emerald-500' : 'bg-rose-500'}`} /><span className={`text-[10px] font-black uppercase ${darkMode ? 'text-slate-200' : 'text-slate-950'}`}>{selectedCard?.polarity}</span></div>
                         <div className="flex items-center gap-1.5 text-slate-500"><Clock size={12}/><span className={`text-[10px] font-black uppercase ${darkMode ? 'text-slate-400' : 'text-slate-800 font-bold'}`}>{selectedCard?.timingSpeed}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* DESCRIÇÃO E PALAVRAS CHAVE */}
                  <div className="space-y-4">
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50 border-indigo-100 shadow-sm'}`}>
                      <span className="text-[11px] font-black uppercase text-indigo-600 mb-2 block">Interpretação Base</span>
                      <p className={`text-[14px] italic leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-900 font-medium'}`}>"{selectedCard?.briefInterpretation}"</p>
                    </div>
                    <div className="flex flex-wrap gap-2">{selectedCard?.keywords.map((k, i) => <span key={i} className={`px-2 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest ${darkMode ? 'bg-slate-800 text-indigo-400' : 'bg-indigo-100 text-indigo-950 font-bold'}`}>{k}</span>)}</div>
                  </div>

                  {/* GEOMETRIA PEDAGÓGICA */}
                  <div className="space-y-6">
                    <h4 className={`text-[12px] font-black uppercase text-indigo-600 tracking-[0.3em] border-b pb-2 ${darkMode ? 'border-white/5' : 'border-slate-200'}`}>GEOMETRIA ESTRUTURAL</h4>
                    
                    {spreadType === 'mesa-real' && (
                      <div className="grid gap-4">
                        {/* PONTE DETALHADA */}
                        {bridgeData && (
                          <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200 shadow-sm'}`}>
                            <h5 className="text-[13px] font-black text-amber-700 uppercase flex items-center gap-2 mb-2"><GitMerge size={12}/> Técnica da Ponte</h5>
                            <p className={`text-[13px] leading-snug ${darkMode ? 'text-slate-400' : 'text-slate-900'}`}>O dono da Casa {selectedHouse + 1} ({currentHouse?.name}) está na <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-950 underline decoration-indigo-300'}`}>Casa {bridgeData.houseId} ({bridgeData.house.name})</span> com a carta <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>{bridgeData.card?.name}</span>.</p>
                            <p className={`text-[12px] mt-2 italic ${darkMode ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>A Casa {bridgeData.houseId} indica que: "{bridgeData.house.technicalDescription}"</p>
                          </div>
                        )}

                        {/* CAVALOS DETALHADOS */}
                        {knightData.length > 0 && (
                          <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-fuchsia-500/5 border-fuchsia-500/20' : 'bg-fuchsia-50 border-fuchsia-200 shadow-sm'}`}>
                            <h5 className="text-[13px] font-black text-fuchsia-800 uppercase flex items-center gap-2 mb-3"><CornerDownRight size={12}/> Salto do Cavalo</h5>
                            <div className="space-y-2">
                              {knightData.map((item, i) => (
                                <div key={i} className={`${darkMode ? 'bg-black/20 border-white/5' : 'bg-white border-slate-200 shadow-sm'} p-2 rounded-lg border`}>
                                  <div className="flex justify-between items-center mb-1"><span className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>{item.card?.name}</span><span className="text-[11px] text-slate-600 font-black uppercase">Casa {item.houseId}</span></div>
                                  <p className={`text-[11px] italic leading-tight ${darkMode ? 'text-slate-400' : 'text-slate-800 font-medium'}`}>"{item.card?.briefInterpretation}"</p>
                                </div>
                              ))}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-2 uppercase font-black">Eventos colaterais e fofocas que cercam o tema.</p>
                          </div>
                        )}

                        {/* DIAGONAIS DETALHADAS */}
                        {(diagonalData.up.length > 0 || diagonalData.down.length > 0) && (
                          <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-orange-500/5 border-orange-500/20' : 'bg-orange-50 border-orange-200 shadow-sm'}`}>
                            <h5 className="text-[13px] font-black text-orange-800 uppercase flex items-center gap-2 mb-3"><MoveDiagonal size={12}/> Eixos Diagonais</h5>
                            <div className="space-y-4">
                              {diagonalData.up.length > 0 && (
                                <div>
                                  <span className="text-[11px] font-black text-orange-600 uppercase block mb-1">Campo de Ascensão (🔺):</span>
                                  {diagonalData.up.map((i, idx) => <div key={idx} className={`${darkMode ? 'bg-white/5' : 'bg-white border border-slate-100 shadow-sm'} p-1.5 rounded mb-1`}><span className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>{i.card?.name} (C{i.houseId})</span><p className={`text-[11px] italic ${darkMode ? 'text-slate-400' : 'text-slate-800'}`}>"{i.card?.briefInterpretation}"</p></div>)}
                                </div>
                              )}
                              {diagonalData.down.length > 0 && (
                                <div>
                                  <span className="text-[11px] font-black text-orange-600 uppercase block mb-1">Campo de Sustentação (🔻):</span>
                                  {diagonalData.down.map((i, idx) => <div key={idx} className={`${darkMode ? 'bg-white/5' : 'bg-white border border-slate-100 shadow-sm'} p-1.5 rounded mb-1`}><span className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>{i.card?.name} (C{i.houseId})</span><p className={`text-[11px] italic ${darkMode ? 'text-slate-400' : 'text-slate-800'}`}>"{i.card?.briefInterpretation}"</p></div>)}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* MOLDURA SEGMENTADA */}
                        {frameData && (
                          <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50 border-indigo-200 shadow-sm'}`}>
                            <h5 className="text-[13px] font-black text-indigo-800 uppercase flex items-center gap-2 mb-3"><Frame size={12}/> Posicionamento de Moldura</h5>
                            <div className="space-y-3">
                              <div><span className="text-[11px] font-black text-indigo-600 uppercase block mb-1">Moldura Superior (1 & 8):</span><div className="grid grid-cols-2 gap-2">{frameData.superior.map((f, i) => f.card && <div key={i} className={`${darkMode ? 'bg-indigo-500/10' : 'bg-white border border-indigo-200 shadow-sm'} p-1.5 rounded`}><span className={`text-[12px] font-bold block ${darkMode ? 'text-white' : 'text-slate-950'}`}>{f.card.name} (C{f.houseId})</span><p className={`text-[11px] italic mt-0.5 leading-tight ${darkMode ? 'text-slate-500' : 'text-slate-800'}`}>"{f.card.briefInterpretation}"</p></div>)}</div></div>
                              <div><span className="text-[11px] font-black text-indigo-600 uppercase block mb-1">Moldura Inferior (25 & 32):</span><div className="grid grid-cols-2 gap-2">{frameData.inferior.map((f, i) => f.card && <div key={i} className={`${darkMode ? 'bg-indigo-500/10' : 'bg-white border border-indigo-200 shadow-sm'} p-1.5 rounded`}><span className={`text-[12px] font-bold block ${darkMode ? 'text-white' : 'text-slate-950'}`}>{f.card.name} (C{f.houseId})</span><p className={`text-[11px] italic mt-0.5 leading-tight ${darkMode ? 'text-slate-500' : 'text-slate-800'}`}>"{f.card.briefInterpretation}"</p></div>)}</div></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* RELÓGIO DETALHADO */}
                    {spreadType === 'relogio' && axisDataRelogio && (
                      <div className="grid gap-4">
                        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200 shadow-sm'}`}>
                          <h5 className="text-[13px] font-black text-indigo-800 uppercase flex items-center gap-2 mb-2"><Scale size={12}/> Eixo de Oposição (180°)</h5>
                          <p className={`text-[13px] font-bold mb-2 ${darkMode ? 'text-slate-300' : 'text-indigo-950'}`}>{axisDataRelogio.axis?.name}</p>
                          <p className={`text-[12px] mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-800'}`}>{axisDataRelogio.axis?.description}</p>
                          <div className={`${darkMode ? 'bg-black/20 border-white/5' : 'bg-white border-slate-200 shadow-sm'} p-3 rounded-xl border`}>
                            <span className="text-[11px] font-black text-indigo-600 uppercase block mb-1">Carta Oposta na Casa {axisDataRelogio.oppositeHouseId}:</span>
                            <span className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-slate-950'}`}>{axisDataRelogio.oppositeCard?.name || "Vazio"}</span>
                            <p className={`text-[12px] italic mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-800'}`}>"{axisDataRelogio.oppositeCard?.briefInterpretation || "Nenhuma carta selecionada."}"</p>
                          </div>
                          <p className={`text-[12px] mt-4 leading-relaxed font-medium italic ${darkMode ? 'text-slate-500' : 'text-slate-700'}`}>"{axisDataRelogio.axis?.tensionKey}"</p>
                        </div>
                      </div>
                    )}

                    {/* ANÁLISE IA */}
                    <button onClick={runMentorAnalysis} disabled={isAiLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl mt-6">
                      {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                      <span>EXPANDIR LEITURA (MENTOR IA)</span>
                    </button>
                    {cardAnalysis && <div className={`mt-4 rounded-3xl p-6 border shadow-2xl animate-in slide-in-from-bottom-4 duration-700 ${darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'}`}><div className={`prose prose-sm ${darkMode ? 'prose-invert' : ''} text-[12px] leading-relaxed whitespace-pre-wrap ${darkMode ? '' : 'text-slate-950 font-medium'}`}>{cardAnalysis}</div></div>}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20 p-8"><Compass size={64} className="mb-6 animate-pulse" /><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Selecione uma casa ocupada no laboratório.</p></div>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
};

export default App;