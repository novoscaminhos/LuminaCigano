
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LayoutGrid, RotateCcw, Sparkles, ChevronRight, ChevronLeft, BookOpen, 
  Compass, Target, Activity, Award, Key, Clock, Edit3, Dices, Zap, 
  MessageSquare, User, Sun, Moon, History, AlertCircle, LogOut, Mail, 
  ShieldCheck, Info, Wand2, HelpCircle, Anchor, X, AlertTriangle, 
  Brain, GitBranch, Layers, SearchCode, Loader2, Settings, ListFilter,
  ArrowRightLeft, MoveDiagonal, Heart, Briefcase, Stars, ChevronUp, ChevronDown,
  Eye, Maximize2, Minimize2, Menu, Save, Download, CreditCard, Activity as ActivityIcon
} from 'lucide-react';
import { LENORMAND_CARDS, LENORMAND_HOUSES, FUNDAMENTALS_DATA } from './constants';
import { Polarity, Timing, LenormandCard, LenormandHouse, SpreadType, StudyLevel, ReadingTheme } from './types';
import { getDetailedCardAnalysis } from './geminiService';
import * as Geometry from './geometryService';

const getCardImageUrl = (id: number) => `https://api.dicebear.com/7.x/shapes/svg?seed=lenormand-art-${id}&backgroundColor=0f172a&shape1Color=4f46e5&shape2Color=818cf8&shape3Color=312e81`;

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
    case 'Amor & Relacionamentos': return 24; // Coração
    case 'Trabalho & Finanças': return 34;    // Peixes
    case 'Espiritualidade & Caminho': return 16; // Estrela
    default: return null;
  }
};

const getThemeColor = (theme: ReadingTheme): string => {
  switch (theme) {
    case 'Amor & Relacionamentos': return 'rgba(244, 63, 94, 0.6)'; // rose-500
    case 'Trabalho & Finanças': return 'rgba(16, 185, 129, 0.6)';    // emerald-500
    case 'Espiritualidade & Caminho': return 'rgba(168, 85, 247, 0.6)'; // purple-500
    default: return 'rgba(251, 191, 36, 0.6)'; // amber-400
  }
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active: boolean; collapsed: boolean; onClick: () => void }> = ({ icon, label, active, collapsed, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'} ${collapsed ? 'justify-center px-0' : ''}`} title={collapsed ? label : ""}>
    <div className={`${collapsed ? 'scale-110' : ''}`}>{icon}</div>
    {!collapsed && <span className="font-medium text-[10px] uppercase font-bold tracking-wider whitespace-nowrap overflow-hidden">{label}</span>}
  </button>
);

const RelatedCardMini: React.FC<{ card: LenormandCard | null; houseName: string; houseId: number; label?: string; labelColor?: string }> = ({ card, houseName, houseId, label, labelColor }) => {
  const getPolarityColor = (pol?: Polarity) => {
    switch (pol) {
      case Polarity.POSITIVE: return 'bg-emerald-500';
      case Polarity.NEGATIVE: return 'bg-rose-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60 flex gap-3 items-start group hover:border-indigo-500/30 transition-all relative">
      {label && (
        <div className={`absolute -top-2 left-3 px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest shadow-sm z-10 ${labelColor || 'bg-slate-800 text-slate-400'}`}>
          {label}
        </div>
      )}
      <div className={`w-14 aspect-[3/4.2] rounded-lg border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden bg-slate-900 shadow-inner flex-shrink-0 ${!card ? 'opacity-20' : ''}`}>
        {card ? (
          <>
            <img 
              src={getCardImageUrl(card.id)} 
              alt={card.name} 
              className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity"
            />
            <div className="absolute top-1 right-1 w-2 h-2 rounded-full border border-black/20 z-10" style={{ backgroundColor: getPolarityColor(card.polarity).replace('bg-', '') }}></div>
            <span className="text-[10px] font-black text-indigo-100 z-10 drop-shadow-md">{card.id}</span>
            <span className="text-[6px] font-cinzel font-bold text-white uppercase text-center leading-none px-1 mt-auto mb-1 z-10 bg-black/60 w-full py-1 backdrop-blur-sm">{card.name}</span>
          </>
        ) : (
          <X size={12} className="text-slate-800" />
        )}
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate">CASA {houseId}: {houseName}</span>
          {card && <div className={`w-1.5 h-1.5 rounded-full ${getPolarityColor(card.polarity)}`}></div>}
        </div>
        <h4 className="text-[10px] font-bold text-slate-200 truncate">{card ? card.name : 'Vazio'}</h4>
        <p className="text-[9px] text-slate-500 leading-tight italic line-clamp-2 mt-1">
          {card ? card.briefInterpretation : 'Posição disponível para conexão técnica.'}
        </p>
      </div>
    </div>
  );
};

const CardVisual: React.FC<{ 
  card: any; 
  houseId: number; 
  onClick: () => void;
  isSelected: boolean;
  isThemeCard: boolean;
  themeColor?: string;
  highlightType?: string | null;
  level: StudyLevel;
  size?: 'normal' | 'small' | 'large';
}> = ({ card, houseId, onClick, isSelected, isThemeCard, themeColor, highlightType, level, size = 'normal' }) => {
  
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
    <div 
      onClick={onClick} 
      className={`relative group aspect-[3/4.2] rounded-xl border-2 cursor-pointer transition-all duration-500 card-perspective overflow-hidden shadow-xl ${isSelected ? 'border-indigo-400 ring-4 ring-indigo-400/30 scale-105 z-20' : isThemeCard ? 'border-transparent scale-105 z-20' : highlightType ? `${highlightStyles[highlightType]} animate-pulse` : 'border-slate-800/60 hover:border-slate-600 bg-slate-900/60'}`}
      style={isThemeCard ? { boxShadow: `0 0 30px ${themeColor}, inset 0 0 15px ${themeColor}` } : {}}
    >
      
      {isThemeCard && (
        <>
          <div className="absolute inset-0 z-0 animate-cloud-pulse pointer-events-none opacity-40 blur-xl" style={{ backgroundColor: themeColor }}></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-amber-500 text-[6px] font-black text-black px-1.5 py-0.5 rounded-b-md z-40 shadow-sm uppercase tracking-tighter">Tema Ativo</div>
        </>
      )}

      <div className="absolute inset-0 pointer-events-none">
        {card && <img src={getCardImageUrl(card.id)} alt={card.name} className={`w-full h-full object-cover transition-opacity duration-700 ${isThemeCard ? 'opacity-[0.4]' : 'opacity-[0.15] group-hover:opacity-[0.25]'}`} />}
      </div>
      <div className="absolute top-1 right-1 flex items-center gap-1 z-20 scale-75 md:scale-100">
         <span className="text-[8px] md:text-[10px]">{getTimingIndicator(card?.timingSpeed)}</span>
         <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${getPolarityColor(card?.polarity)}`} />
      </div>
      <div className="absolute top-1 left-1 z-10">
        <span className="text-[7px] md:text-[9px] font-black text-slate-500 uppercase">CASA {houseId}</span>
      </div>
      {card ? (
        <div className={`absolute inset-0 flex flex-col p-2 md:p-3 bg-gradient-to-t from-slate-950 via-slate-900/10 to-transparent`}>
          <div className="flex-grow flex flex-col items-center justify-center text-center mt-2">
            <span className={`text-[8px] md:text-[11px] font-cinzel font-bold text-white uppercase leading-tight tracking-wider drop-shadow-md ${isThemeCard ? 'scale-110' : ''}`}>{card.name}</span>
          </div>
          <div className="mt-auto border-t border-white/10 pt-1 flex justify-between">
            <span className="text-[8px] md:text-[10px] font-bold text-indigo-400">{card.id}</span>
            <span className={`text-[6px] md:text-[8px] font-black uppercase ${card.polarity === Polarity.POSITIVE ? 'text-emerald-400' : card.polarity === Polarity.NEGATIVE ? 'text-rose-400' : 'text-slate-400'}`}>{card.polarity}</span>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20"><LayoutGrid size={16} className="text-slate-700" /></div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mentorPanelOpen, setMentorPanelOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [view, setView] = useState<'board' | 'fundamentals'>('board');
  
  const [difficultyLevel, setDifficultyLevel] = useState<StudyLevel>(() => {
    const saved = localStorage.getItem('lumina_difficulty_level');
    return (saved as StudyLevel) || 'Iniciante';
  });

  const [readingTheme, setReadingTheme] = useState<ReadingTheme>('Geral');
  const [spreadType, setSpreadType] = useState<SpreadType>('mesa-real');
  const [board, setBoard] = useState<(number | null)[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [manualThemeIndex, setManualThemeIndex] = useState<number | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [cardAnalysis, setCardAnalysis] = useState<string | null>(null);

  useEffect(() => {
    setMentorPanelOpen(true);
    const timer = setTimeout(() => {
      setMentorPanelOpen(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('lumina_difficulty_level', difficultyLevel);
  }, [difficultyLevel]);

  useEffect(() => {
    setBoard(generateShuffledArray(spreadType === 'relogio' ? 13 : 36));
    setSelectedHouse(null);
    setManualThemeIndex(null);
    setCardAnalysis(null);
  }, [spreadType]);

  const autoThemeIndex = useMemo(() => {
    const targetId = getThemeCardId(readingTheme);
    if (!targetId) return null;
    const index = board.findIndex(id => id === targetId);
    return index !== -1 ? index : null;
  }, [board, readingTheme]);

  const activeThemeIndex = manualThemeIndex !== null ? manualThemeIndex : autoThemeIndex;

  const selectedCard = useMemo(() => {
    if (selectedHouse === null) return null;
    const cardId = board[selectedHouse];
    return cardId ? LENORMAND_CARDS.find(c => c.id === cardId) : null;
  }, [selectedHouse, board]);

  const handleHouseSelection = (index: number) => {
    setSelectedHouse(index);
    setMentorPanelOpen(true);
  };

  const currentHouse = useMemo((): LenormandHouse | null | undefined => {
    if (selectedHouse === null) return null;
    if (spreadType === 'relogio') {
      if (selectedHouse === 12) return { id: 113, name: "Tom da Leitura", polarity: Polarity.NEUTRAL, theme: "Síntese Central", technicalDescription: "A energia central que dita o tom e a vibração predominante.", pedagogicalRule: "Ponto focal." } as LenormandHouse;
      return LENORMAND_HOUSES.find(h => h.id === 101 + selectedHouse);
    }
    return LENORMAND_HOUSES[selectedHouse];
  }, [selectedHouse, spreadType]);

  const oppIndex = useMemo(() => (selectedHouse !== null && spreadType === 'relogio') ? Geometry.getOposicaoRelogio(selectedHouse) : null, [selectedHouse, spreadType]);
  const oppCard = useMemo(() => (oppIndex !== null && board[oppIndex]) ? LENORMAND_CARDS.find(c => c.id === board[oppIndex]) : null, [oppIndex, board]);
  const oppHouse = useMemo(() => (oppIndex !== null) ? LENORMAND_HOUSES.find(h => h.id === 101 + oppIndex) : null, [oppIndex]);

  const mirrorCards = useMemo(() => (selectedHouse === null || spreadType !== 'mesa-real') ? [] : Geometry.getEspelhamentos(selectedHouse).map(idx => ({ idx, card: board[idx] ? LENORMAND_CARDS.find(c => c.id === board[idx]) : null, house: LENORMAND_HOUSES[idx] })), [selectedHouse, spreadType, board]);
  const knightCards = useMemo(() => (selectedHouse === null || spreadType !== 'mesa-real') ? [] : Geometry.getCavalo(selectedHouse).map(idx => ({ idx, card: board[idx] ? LENORMAND_CARDS.find(c => c.id === board[idx]) : null, house: LENORMAND_HOUSES[idx] })), [selectedHouse, spreadType, board]);
  const diagUp = useMemo(() => (selectedHouse === null || spreadType !== 'mesa-real') ? [] : Geometry.getDiagonaisSuperiores(selectedHouse).map(idx => ({ idx, card: board[idx] ? LENORMAND_CARDS.find(c => c.id === board[idx]) : null, house: LENORMAND_HOUSES[idx] })), [selectedHouse, spreadType, board]);
  const diagDown = useMemo(() => (selectedHouse === null || spreadType !== 'mesa-real') ? [] : Geometry.getDiagonaisInferiores(selectedHouse).map(idx => ({ idx, card: board[idx] ? LENORMAND_CARDS.find(c => c.id === board[idx]) : null, house: LENORMAND_HOUSES[idx] })), [selectedHouse, spreadType, board]);

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

  const runMentorAnalysis = async () => {
    if (selectedHouse === null || board[selectedHouse] === null) return;
    setIsAiLoading(true);
    setMentorPanelOpen(true);
    const result = await getDetailedCardAnalysis(board, selectedHouse, readingTheme, spreadType, difficultyLevel);
    setCardAnalysis(result);
    setIsAiLoading(false);
  };

  const themeIcons: Record<ReadingTheme, React.ReactNode> = {
    'Geral': <Compass size={14} />,
    'Amor & Relacionamentos': <Heart size={14} />,
    'Trabalho & Finanças': <Briefcase size={14} />,
    'Espiritualidade & Caminho': <Stars size={14} />
  };

  const polarityStats = useMemo(() => {
    const counts = { positive: 0, negative: 0, neutral: 0 };
    board.slice(0, spreadType === 'relogio' ? 12 : 36).forEach(id => {
      const c = LENORMAND_CARDS.find(card => card.id === id);
      if (c?.polarity === Polarity.POSITIVE) counts.positive++;
      else if (c?.polarity === Polarity.NEGATIVE) counts.negative++;
      else counts.neutral++;
    });
    return counts;
  }, [board, spreadType]);

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${darkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900'} transition-colors overflow-hidden selection:bg-indigo-500/30 font-inter`}>
      
      {/* SIDEBAR ESQUERDA - Sticky e com Hover para desktop */}
      <aside 
        onMouseEnter={() => setSidebarCollapsed(false)}
        onMouseLeave={() => setSidebarCollapsed(true)}
        className={`flex flex-col border-r border-slate-800 transition-all duration-300 z-[60] h-screen sticky top-0 ${sidebarCollapsed ? 'w-16' : 'w-64'} ${darkMode ? 'bg-slate-900' : 'bg-white'}`}
      >
        <div className="p-4 flex items-center justify-between">
           {!sidebarCollapsed && <h1 className="text-xs font-bold font-cinzel text-indigo-100 truncate">LUMINA</h1>}
           <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500">
              {sidebarCollapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
           </button>
        </div>

        <nav className="flex-grow px-2 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem icon={<LayoutGrid size={18}/>} label="Mesa Real" active={view === 'board' && spreadType === 'mesa-real'} collapsed={sidebarCollapsed} onClick={() => {setView('board'); setSpreadType('mesa-real');}} />
          <NavItem icon={<Clock size={18}/>} label="Relógio" active={view === 'board' && spreadType === 'relogio'} collapsed={sidebarCollapsed} onClick={() => {setView('board'); setSpreadType('relogio');}} />
          <NavItem icon={<BookOpen size={18}/>} label="Fundamentos" active={view === 'fundamentals'} collapsed={sidebarCollapsed} onClick={() => setView('fundamentals')} />
          
          <div className={`pt-4 mt-4 border-t border-slate-800 flex flex-col gap-2 ${sidebarCollapsed ? 'items-center' : 'px-2'}`}>
            {!sidebarCollapsed && <span className="text-[9px] font-black text-slate-500 uppercase px-2 mb-1">Nível de Estudo</span>}
            <div className={`grid gap-1 ${sidebarCollapsed ? 'grid-cols-1' : 'grid-cols-1'}`}>
              {(['Iniciante', 'Intermediário', 'Avançado'] as StudyLevel[]).map(l => (
                <button 
                  key={l} 
                  onClick={() => setDifficultyLevel(l)} 
                  className={`text-[9px] font-bold p-2 rounded-lg text-left transition-all ${difficultyLevel === l ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-800'} ${sidebarCollapsed ? 'w-8 h-8 flex items-center justify-center p-0' : ''}`}
                  title={sidebarCollapsed ? l : ''}
                >
                  {sidebarCollapsed ? l[0] : l}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className={`p-4 border-t border-slate-800 space-y-4 ${sidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
           {!sidebarCollapsed ? (
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-black shadow-lg">U</div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold">Usuário Lumina</span>
                      <span className="text-[8px] text-emerald-400 font-bold uppercase flex items-center gap-1"><ShieldCheck size={10}/> Licença Ativa</span>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <button className="flex items-center justify-center gap-2 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[9px] font-bold uppercase transition-all" title="Salvar Tiragem"><Save size={12}/> Salvar</button>
                   <button className="flex items-center justify-center gap-2 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[9px] font-bold uppercase transition-all" title="Exportar Relatório"><Download size={12}/> PDF</button>
                </div>
                <button className="w-full flex items-center gap-2 p-2 text-slate-500 hover:text-rose-500 text-[10px] font-bold uppercase transition-all"><LogOut size={14}/> Sair</button>
             </div>
           ) : (
              <div className="space-y-4 flex flex-col items-center">
                 <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-black shadow-md" title="Usuário Lumina">U</div>
                 <button className="text-slate-500 hover:text-indigo-400 transition-colors" title="Salvar"><Save size={18}/></button>
                 <button className="text-slate-500 hover:text-emerald-400 transition-colors" title="Licença"><CreditCard size={18}/></button>
              </div>
           )}
        </div>
      </aside>

      {/* ÁREA CENTRAL - Scrollable */}
      <main className="flex-grow flex flex-col h-screen overflow-y-auto custom-scrollbar relative">
        <header className="h-14 md:h-16 border-b border-slate-800/40 flex items-center justify-between px-4 md:px-10 z-20 glass-panel sticky top-0">
           <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
              <h2 className="font-cinzel text-xs md:text-sm font-black text-white tracking-widest uppercase truncate">{spreadType === 'relogio' ? 'Relógio' : 'Mesa Real'}</h2>
              <div className="flex items-center gap-2">
                 <select 
                    value={readingTheme} 
                    onChange={(e) => setReadingTheme(e.target.value as ReadingTheme)}
                    className="bg-slate-800/50 text-[9px] font-black uppercase text-indigo-300 border border-indigo-500/20 rounded-md px-2 py-1 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                 >
                    {Object.keys(themeIcons).map(t => <option key={t} value={t}>{t}</option>)}
                 </select>
                 {activeThemeIndex !== null && (
                    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md animate-in fade-in slide-in-from-left-2">
                       <Sparkles size={10} className="text-amber-500" />
                       <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">Foco Temático Ativo</span>
                    </div>
                 )}
              </div>
           </div>
           <div className="flex items-center gap-2 md:gap-4">
              <button onClick={() => setBoard(generateShuffledArray(spreadType === 'relogio' ? 13 : 36))} className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 md:px-4 md:py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all active:scale-95 shadow-xl"><RotateCcw size={14} /><span className="hidden md:inline">EMBARALHAR</span></button>
              <button onClick={() => setMentorPanelOpen(!mentorPanelOpen)} className="md:hidden bg-emerald-600 text-white p-2 rounded-xl mobile-mentor-trigger"><Activity size={18}/></button>
           </div>
        </header>

        <div className="flex-grow bg-slate-950 p-2 md:p-10 relative">
           {view === 'board' && spreadType === 'mesa-real' && (
             <div className="min-w-[800px] md:min-w-0 max-w-6xl mx-auto flex flex-col gap-6 md:gap-8 pb-32">
                <div className="grid grid-cols-8 gap-1.5 md:gap-3">
                   {board.slice(0, 32).map((cardId, index) => (
                     <CardVisual 
                        key={index} 
                        card={cardId ? LENORMAND_CARDS.find(c => c.id === cardId) : null} 
                        houseId={index + 1} 
                        isSelected={selectedHouse === index} 
                        isThemeCard={activeThemeIndex === index}
                        themeColor={getThemeColor(readingTheme)}
                        highlightType={getGeometryHighlight(index)} 
                        onClick={() => handleHouseSelection(index)} 
                        level={difficultyLevel} 
                     />
                   ))}
                </div>
                <div className="flex flex-col items-center gap-4 pt-6 border-t border-slate-800/40">
                   <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Veredito Final</span>
                   {/* Ajuste de tamanho: grid-cols-4 para manter o tamanho das cartas da mesa */}
                   <div className="grid grid-cols-8 gap-1.5 md:gap-3 w-full">
                      <div className="col-span-2 hidden md:block"></div>
                      {board.slice(32, 36).map((cardId, index) => (
                        <CardVisual 
                          key={index + 32}
                          card={cardId ? LENORMAND_CARDS.find(c => c.id === cardId) : null} 
                          houseId={index + 33} 
                          isSelected={selectedHouse === index + 32} 
                          isThemeCard={activeThemeIndex === index + 32}
                          themeColor={getThemeColor(readingTheme)}
                          highlightType={getGeometryHighlight(index + 32)} 
                          onClick={() => handleHouseSelection(index + 32)} 
                          level={difficultyLevel} 
                        />
                      ))}
                      <div className="col-span-2 hidden md:block"></div>
                   </div>
                </div>
             </div>
           )}

           {view === 'board' && spreadType === 'relogio' && (
             <div className="flex items-center justify-center min-h-[80vh] min-w-[600px] md:min-w-0 pb-32">
                <div className="relative w-[30rem] h-[30rem] md:w-[44rem] md:h-[44rem] border border-slate-800/20 rounded-full flex items-center justify-center shadow-inner">
                   <div className="absolute w-24 md:w-36 z-20">
                      <CardVisual 
                        card={board[12] ? LENORMAND_CARDS.find(c => c.id === board[12]) : null} 
                        houseId={13} 
                        isSelected={selectedHouse === 12} 
                        isThemeCard={activeThemeIndex === 12}
                        themeColor={getThemeColor(readingTheme)}
                        highlightType="center" 
                        onClick={() => handleHouseSelection(12)} 
                        level={difficultyLevel} 
                      />
                   </div>
                   {board.slice(0, 12).map((cardId, index) => {
                      const angle = (index * 30) - 90;
                      const radius = 42; 
                      const x = 50 + radius * Math.cos(angle * Math.PI / 180);
                      const y = 50 + radius * Math.sin(angle * Math.PI / 180);
                      return (
                        <div key={index} className="absolute w-20 md:w-28 -translate-x-1/2 -translate-y-1/2 z-10" style={{ left: `${x}%`, top: `${y}%` }}>
                           <CardVisual 
                            card={cardId ? LENORMAND_CARDS.find(c => c.id === board[index]) : null} 
                            houseId={index + 1} 
                            isSelected={selectedHouse === index} 
                            isThemeCard={activeThemeIndex === index}
                            themeColor={getThemeColor(readingTheme)}
                            highlightType={getGeometryHighlight(index)} 
                            onClick={() => handleHouseSelection(index)} 
                            level={difficultyLevel} 
                           />
                        </div>
                      );
                   })}
                </div>
             </div>
           )}

           {view === 'fundamentals' && (
             <div className="max-w-4xl mx-auto space-y-8 pb-32">
               {FUNDAMENTALS_DATA.map(m => (
                 <div key={m.id} className="bg-slate-900/40 p-6 md:p-8 rounded-[2rem] border border-slate-800 shadow-xl">
                    <h3 className="text-lg font-cinzel font-bold text-white mb-4">{m.title}</h3>
                    <div className="space-y-4">
                      {m.concepts.map((c, i) => (
                        <div key={i} className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/40 group hover:border-indigo-500/30 transition-colors">
                          <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-1 group-hover:text-indigo-300 transition-colors">{c.title}</h4>
                          <p className="text-xs text-slate-300 leading-relaxed">{c.text}</p>
                        </div>
                      ))}
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* Floating Action Button (Mobile) */}
        {selectedHouse !== null && !mentorPanelOpen && (
           <button onClick={() => setMentorPanelOpen(true)} className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-8 py-4 rounded-full font-black text-[11px] uppercase tracking-widest flex items-center gap-3 animate-bounce shadow-2xl">
              <Eye size={18}/> Analisar Casa {selectedHouse + 1}
           </button>
        )}
      </main>

      {/* PAINEL DO MENTOR - Fixo à direita, Sticky e com Hover */}
      <aside 
        className={`fixed md:sticky top-0 inset-y-0 right-0 z-50 md:z-30 h-screen transition-all duration-500 ease-in-out bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden ${mentorPanelOpen ? 'w-full md:w-[32rem]' : 'translate-y-full md:translate-y-0 md:w-16'}`}
      >
        <div className="p-4 md:px-6 border-b border-slate-800 flex items-center justify-between glass-panel sticky top-0 z-10 shadow-lg h-14 md:h-16 shrink-0 overflow-hidden">
           <button 
             onClick={() => setMentorPanelOpen(!mentorPanelOpen)} 
             className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors z-20 shrink-0"
           >
              {mentorPanelOpen ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
           </button>
           
           <div className={`flex items-center gap-3 transition-opacity duration-300 ${!mentorPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 flex-grow justify-center'}`}>
              <ActivityIcon className="text-emerald-500 shrink-0" size={18} />
              <h2 className="text-xs font-bold font-cinzel uppercase tracking-[0.2em] text-slate-100 whitespace-nowrap">Mentor LUMINA</h2>
           </div>

           <button 
             onClick={() => setMentorPanelOpen(false)} 
             className={`p-2 text-slate-400 hover:text-rose-500 transition-all z-20 shrink-0 ${!mentorPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
           >
              <X size={20}/>
           </button>
        </div>

        <div className={`flex-grow overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 pb-32 transition-opacity duration-300 ${!mentorPanelOpen ? 'md:opacity-0' : 'opacity-100'}`}>
          {selectedHouse !== null ? (
            <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
               {/* Card Info */}
               <div className="bg-slate-950/60 p-6 md:p-8 rounded-[2rem] border border-slate-800/80 relative overflow-hidden shadow-2xl">
                  <div className="relative z-10">
                    <div className="flex justify-between items-start">
                       <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 block">CARTA {selectedCard?.id}</span>
                       <button 
                          onClick={() => setManualThemeIndex(selectedHouse === activeThemeIndex ? null : selectedHouse)}
                          className={`p-2 rounded-lg transition-all ${activeThemeIndex === selectedHouse ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-slate-800 text-slate-500 hover:text-amber-400'}`}
                          title="Definir Manualmente como Foco"
                       >
                          <Target size={16}/>
                       </button>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-cinzel font-bold text-white mb-4 tracking-wider drop-shadow-lg">{selectedCard?.name || 'Vazio'}</h3>
                    <div className="bg-indigo-600/10 p-4 rounded-2xl border border-indigo-500/20 mb-6 shadow-inner">
                       <p className="text-xs text-slate-300 leading-relaxed font-medium italic">{selectedCard?.briefInterpretation || 'Posição livre para leitura.'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">{selectedCard?.polarity || 'Polaridade'}</div>
                       <div className={`p-3 rounded-xl border text-[10px] font-bold text-center uppercase tracking-widest ${selectedCard?.timingCategory === 'Acelera' ? 'border-emerald-500/30 text-emerald-400' : 'border-slate-800 text-slate-500'}`}>{selectedCard?.timingSpeed || 'Tempo'}</div>
                    </div>
                  </div>
                  {selectedCard && <img src={getCardImageUrl(selectedCard.id)} className="absolute -right-4 top-1/2 -translate-y-1/2 w-32 h-44 opacity-10 mix-blend-overlay rotate-12 pointer-events-none" />}
               </div>

               {/* House Context */}
               <div className="bg-indigo-900/10 p-6 md:p-8 rounded-[2rem] border border-indigo-500/20 shadow-md">
                  <span className="text-[9px] font-black text-indigo-300 uppercase block mb-1 tracking-[0.2em]">CASA {selectedHouse + 1}: {currentHouse?.name}</span>
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium mb-4">{currentHouse?.technicalDescription}</p>
                  {spreadType === 'relogio' && currentHouse && (
                    <div className="pt-4 border-t border-indigo-500/20">
                      <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Pergunta-Chave:</span>
                      <p className="text-xs text-indigo-200 italic">"O que o ciclo de {currentHouse.month} ({currentHouse.zodiac}) pede para ${readingTheme.toLowerCase()}?"</p>
                    </div>
                  )}
               </div>

               {/* Opposition Context (Relógio Only) */}
               {spreadType === 'relogio' && oppIndex !== null && (
                 <div className="space-y-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Eixo de Oposição (180°)</span>
                    <RelatedCardMini 
                      card={oppCard || null} 
                      houseName={oppHouse?.name || "Oposta"} 
                      houseId={oppIndex + 1} 
                      label="Conflito & Complemento"
                      labelColor="bg-rose-500/20 text-rose-400 border-rose-500/20"
                    />
                    <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800 text-[10px] text-slate-400 leading-relaxed italic">
                       Eixo: {Geometry.getEixoConceitualRelogio(selectedHouse) || "Eixo de Transição"}
                    </div>
                 </div>
               )}

               {/* Geometries Section (Mesa Real Only) */}
               {spreadType === 'mesa-real' && (
                  <div className="space-y-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Geometria do Campo</span>
                    <div className="space-y-3">
                      {diagUp.map((item, i) => <RelatedCardMini key={`up-${i}`} card={item.card} houseName={item.house.name} houseId={item.idx + 1} label="Campo de Ascensão" labelColor="bg-orange-500/20 text-orange-400 border-orange-500/20" />)}
                      {diagDown.map((item, i) => <RelatedCardMini key={`dn-${i}`} card={item.card} houseName={item.house.name} houseId={item.idx + 1} label="Campo de Sustentação" labelColor="bg-indigo-500/20 text-indigo-400 border-indigo-500/20" />)}
                      {mirrorCards.map((item, i) => <RelatedCardMini key={`mi-${i}`} card={item.card} houseName={item.house.name} houseId={item.idx + 1} label="Espelhamento" />)}
                      {knightCards.map((item, i) => <RelatedCardMini key={`kn-${i}`} card={item.card} houseName={item.house.name} houseId={item.idx + 1} label="Salto do Cavalo" />)}
                    </div>
                  </div>
               )}

               {/* AI Analysis */}
               <div className="pt-6 border-t border-slate-800">
                  {!cardAnalysis ? (
                    <button onClick={runMentorAnalysis} disabled={isAiLoading || !selectedCard} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-5 rounded-3xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 group shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98]">
                      {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                      <span>{spreadType === 'relogio' ? 'Análise Técnica do Ciclo' : 'Análise Técnica Completa'}</span>
                    </button>
                  ) : (
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-700">
                      <div className="flex justify-between items-center px-4">
                        <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={14}/> Síntese do Mentor</h4>
                        <button onClick={() => setCardAnalysis(null)} className="text-[10px] text-slate-500 underline uppercase tracking-tighter">Limpar</button>
                      </div>
                      <div className="bg-slate-950/80 rounded-[2.5rem] p-6 md:p-8 border border-slate-800 shadow-inner">
                        <div className="prose prose-invert prose-xs md:prose-sm card-interpretation whitespace-pre-wrap leading-relaxed">{cardAnalysis}</div>
                      </div>
                    </div>
                  )}
               </div>

               {/* Relógio Stats Footer */}
               {spreadType === 'relogio' && (
                 <div className="pt-8 mt-8 border-t border-slate-800/40">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 block">Vibração Dominante do Ciclo</span>
                    <div className="grid grid-cols-3 gap-2">
                       <div className="flex flex-col items-center bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
                          <span className="text-xl font-black text-emerald-400">{polarityStats.positive}</span>
                          <span className="text-[7px] font-bold text-emerald-500/60 uppercase">Positivas</span>
                       </div>
                       <div className="flex flex-col items-center bg-slate-800/10 p-3 rounded-2xl border border-slate-800/20">
                          <span className="text-xl font-black text-slate-400">{polarityStats.neutral}</span>
                          <span className="text-[7px] font-bold text-slate-500/60 uppercase">Neutras</span>
                       </div>
                       <div className="flex flex-col items-center bg-rose-500/10 p-3 rounded-2xl border border-rose-500/20">
                          <span className="text-xl font-black text-rose-400">{polarityStats.negative}</span>
                          <span className="text-[7px] font-bold text-rose-500/60 uppercase">Negativas</span>
                       </div>
                    </div>
                 </div>
               )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-20">
              <Compass size={64} className="mb-6 animate-pulse" />
              <p className="text-xs font-black uppercase tracking-widest leading-loose">
                {spreadType === 'relogio' ? 'Selecione um mês para ler o ciclo técnico.' : 'Selecione uma casa na mesa para iniciar a exploração técnica.'}
              </p>
            </div>
          )}
        </div>
        
        {/* Ícone de Estado Minimizado para Desktop */}
        {!mentorPanelOpen && (
          <div className="hidden md:flex absolute inset-0 flex-col items-center pt-24 gap-12 pointer-events-none opacity-40">
            <ActivityIcon size={24} className="text-indigo-400" />
            <span className="font-cinzel text-[10px] font-bold uppercase tracking-[0.5em] vertical-text">MENTOR</span>
          </div>
        )}
      </aside>

      <style>{`
        @keyframes cloud-pulse {
          0% { transform: scale(0.95); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.6; }
          100% { transform: scale(0.95); opacity: 0.3; }
        }
        .animate-cloud-pulse {
          animation: cloud-pulse 3s ease-in-out infinite;
        }
        .card-interpretation h1, .card-interpretation h2, .card-interpretation h3 { color: #818cf8; font-family: 'Cinzel', serif; font-size: 0.9rem; margin: 1.5rem 0 0.5rem; text-transform: uppercase; border-bottom: 1px solid rgba(129, 140, 248, 0.1); padding-bottom: 0.5rem; letter-spacing: 0.1em; }
        .card-interpretation p { margin-bottom: 1rem; font-size: 0.8rem; line-height: 1.7; color: #cbd5e1; }
        .card-interpretation strong { color: #f8fafc; font-weight: 700; }
        .vertical-text {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
        @media (max-width: 768px) {
           .card-interpretation h1, .card-interpretation h2, .card-interpretation h3 { font-size: 0.8rem; }
           .card-interpretation p { font-size: 0.75rem; }
        }
      `}</style>
    </div>
  );
};

export default App;
