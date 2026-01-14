
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LayoutGrid, RotateCcw, Sparkles, ChevronRight, ChevronLeft, BookOpen, 
  Compass, Target, Activity, Award, Key, Clock, Edit3, Dices, Zap, 
  MessageSquare, User, Sun, Moon, History, AlertCircle, LogOut, Mail, 
  ShieldCheck, Info, Wand2, HelpCircle, Anchor, X, AlertTriangle, 
  Brain, GitBranch, Layers, SearchCode, Loader2, Settings, ListFilter,
  ArrowRightLeft, MoveDiagonal, Heart, Briefcase, Stars, ChevronUp, ChevronDown,
  Eye
} from 'lucide-react';
import { LENORMAND_CARDS, LENORMAND_HOUSES, FUNDAMENTALS_DATA } from './constants';
import { Polarity, Timing, LenormandCard, LenormandHouse, SpreadType, StudyLevel, ReadingTheme } from './types';
import { getDetailedCardAnalysis } from './geminiService';
import * as Geometry from './geometryService';

const VALID_LICENSE_KEY = 'LUMINA-RENEW-2026-LUNARA';

// Função para gerar URLs de imagem (DiceBear para fins didáticos/prototipagem rápida)
const getCardImageUrl = (id: number) => `https://api.dicebear.com/7.x/shapes/svg?seed=lenormand-art-${id}&backgroundColor=0f172a&shape1Color=4f46e5&shape2Color=818cf8&shape3Color=312e81`;

const generateShuffledArray = (size: number = 36) => {
  const ids = Array.from({length: 36}, (_, i) => i + 1);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, size);
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active: boolean; collapsed: boolean; onClick: () => void }> = ({ icon, label, active, collapsed, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'} ${collapsed ? 'justify-center px-0' : ''}`} title={collapsed ? label : ""}>
    <div className={`${collapsed ? 'scale-110' : ''}`}>{icon}</div>
    {!collapsed && <span className="font-medium text-xs whitespace-nowrap overflow-hidden">{label}</span>}
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
  highlightType?: 'mirror' | 'knight' | 'frame' | 'axis' | 'diag-up' | 'diag-down' | 'center' | null;
  level: StudyLevel;
  size?: 'normal' | 'small' | 'large';
}> = ({ card, houseId, onClick, isSelected, highlightType, level, size = 'normal' }) => {
  
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

  const highlightStyles = {
    mirror: 'ring-4 ring-cyan-500/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105 z-10',
    knight: 'ring-4 ring-fuchsia-500/60 border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.4)] scale-105 z-10',
    frame: 'border-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
    axis: 'ring-4 ring-indigo-500/60 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-105 z-10',
    'diag-up': 'ring-4 ring-orange-500/60 border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)] scale-105 z-10',
    'diag-down': 'ring-4 ring-indigo-500/60 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-105 z-10',
    'center': 'ring-4 ring-amber-400 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)] scale-110 z-30'
  };

  const isTensioning = card?.polarity === Polarity.NEGATIVE;
  const isBlocking = card?.timingCategory === 'Bloqueia' || card?.timingCategory === 'Retarda';

  return (
    <div onClick={onClick} className={`relative group aspect-[3/4.2] rounded-xl border-2 cursor-pointer transition-all duration-500 card-perspective overflow-hidden shadow-xl ${isSelected ? 'border-indigo-400 ring-4 ring-indigo-400/30 scale-105 z-20' : highlightType ? `${highlightStyles[highlightType as keyof typeof highlightStyles]} animate-pulse` : 'border-slate-800/60 hover:border-slate-600 bg-slate-900/60'}`}>
      
      {/* Miniatura da Imagem com Opacidade Reduzida */}
      <div className="absolute inset-0 pointer-events-none">
        {card && (
          <img 
            src={getCardImageUrl(card.id)} 
            alt={card.name} 
            className="w-full h-full object-cover opacity-[0.15] group-hover:opacity-[0.25] transition-opacity duration-700"
          />
        )}
      </div>

      <div className="absolute bottom-2 left-2 z-20 flex gap-1 pointer-events-none opacity-90 transition-all">
        {isTensioning && <div className="bg-rose-600 p-1 rounded-md shadow-2xl border border-black/30"><AlertTriangle size={10} className="text-white" /></div>}
        {isBlocking && <div className="bg-slate-800 p-1 rounded-md shadow-2xl border border-black/30"><Anchor size={10} className="text-white" /></div>}
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
         <span className="text-[10px]">{getTimingIndicator(card?.timingSpeed)}</span>
         <div className={`w-2 h-2 rounded-full ${getPolarityColor(card?.polarity)} shadow-sm border border-black/20`} />
      </div>

      <div className="absolute top-2 left-2 z-10">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">CASA {houseId}</span>
      </div>

      {card ? (
        <div className={`absolute inset-0 flex flex-col p-3 transition-all duration-500 ${highlightType && isTensioning ? 'bg-rose-950/30' : highlightType && isBlocking ? 'bg-slate-950/50' : 'bg-gradient-to-t from-slate-950 via-slate-900/10 to-transparent'}`}>
          <div className="flex-grow flex flex-col items-center justify-center text-center p-2 mt-4 space-y-2">
            <span className="text-[11px] font-cinzel font-bold text-white uppercase leading-tight tracking-wider drop-shadow-md group-hover:scale-110 transition-transform z-10">
              {card.name}
            </span>
            <div className="w-10 h-0.5 bg-indigo-500/40 rounded-full z-10"></div>
          </div>
          <div className="mt-auto space-y-1 z-10">
            <div className="flex justify-between items-end border-t border-white/10 pt-1.5">
              <span className="text-[10px] font-bold text-indigo-400">{card.id}</span>
              <span className={`text-[8px] font-black uppercase tracking-widest ${card.polarity === Polarity.POSITIVE ? 'text-emerald-400' : card.polarity === Polarity.NEGATIVE ? 'text-rose-400' : 'text-slate-400'}`}>{card.polarity}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
          <LayoutGrid size={24} className="text-slate-700 mb-1" />
          <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Livre</span>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [score, setScore] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [view, setView] = useState<'board' | 'fundamentals' | 'history'>('board');
  const [difficultyLevel, setDifficultyLevel] = useState<StudyLevel>('Iniciante');
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>('Geral');
  const [spreadType, setSpreadType] = useState<SpreadType>('mesa-real');

  const [board, setBoard] = useState<(number | null)[]>([]);
  const [manualBoard, setManualBoard] = useState<(number | null)[]>(Array(36).fill(null));
  const [boardMode, setBoardMode] = useState<'random' | 'manual'>('random');
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [cardAnalysis, setCardAnalysis] = useState<string | null>(null);

  const currentBoard = useMemo(() => boardMode === 'random' ? board : manualBoard, [boardMode, board, manualBoard]);

  const selectedCard = useMemo(() => {
    if (selectedHouse === null) return null;
    const cardId = currentBoard[selectedHouse];
    return cardId ? LENORMAND_CARDS.find(c => c.id === cardId) : null;
  }, [selectedHouse, currentBoard]);

  // Fix: Adding explicit return type to currentHouse useMemo to solve TypeScript property access errors
  const currentHouse = useMemo((): LenormandHouse | null | undefined => {
    if (selectedHouse === null) return null;
    if (spreadType === 'relogio') {
      // Fix: Adding missing properties to match LenormandHouse type and satisfy TypeScript property access for 'month'
      if (selectedHouse === 12) return { 
        id: 113, 
        name: "Tom da Leitura", 
        polarity: Polarity.NEUTRAL,
        theme: "Síntese Central", 
        technicalDescription: "A energia central que dita o tom e a vibração predominante de todo o ciclo anual.", 
        pedagogicalRule: "Ponto focal de interpretação." 
      } as LenormandHouse;
      return LENORMAND_HOUSES.find(h => h.id === 101 + selectedHouse);
    }
    return LENORMAND_HOUSES[selectedHouse];
  }, [selectedHouse, spreadType]);

  const mirrorCards = useMemo(() => {
    if (selectedHouse === null || spreadType !== 'mesa-real') return [];
    return Geometry.getEspelhamentos(selectedHouse).map(idx => ({
      idx,
      card: currentBoard[idx] ? LENORMAND_CARDS.find(c => c.id === currentBoard[idx]) : null,
      house: LENORMAND_HOUSES[idx]
    }));
  }, [selectedHouse, spreadType, currentBoard]);

  const knightCards = useMemo(() => {
    if (selectedHouse === null || spreadType !== 'mesa-real') return [];
    return Geometry.getCavalo(selectedHouse).map(idx => ({
      idx,
      card: currentBoard[idx] ? LENORMAND_CARDS.find(c => c.id === currentBoard[idx]) : null,
      house: LENORMAND_HOUSES[idx]
    }));
  }, [selectedHouse, spreadType, currentBoard]);

  const diagonalUpCards = useMemo(() => {
    if (selectedHouse === null || spreadType !== 'mesa-real') return [];
    return Geometry.getDiagonaisSuperiores(selectedHouse).map(idx => ({
      idx,
      card: currentBoard[idx] ? LENORMAND_CARDS.find(c => c.id === currentBoard[idx]) : null,
      house: LENORMAND_HOUSES[idx]
    }));
  }, [selectedHouse, spreadType, currentBoard]);

  const diagonalDownCards = useMemo(() => {
    if (selectedHouse === null || spreadType !== 'mesa-real') return [];
    return Geometry.getDiagonaisInferiores(selectedHouse).map(idx => ({
      idx,
      card: currentBoard[idx] ? LENORMAND_CARDS.find(c => c.id === currentBoard[idx]) : null,
      house: LENORMAND_HOUSES[idx]
    }));
  }, [selectedHouse, spreadType, currentBoard]);

  useEffect(() => {
    setBoard(generateShuffledArray(spreadType === 'relogio' ? 13 : 36));
    setSelectedHouse(null);
    setCardAnalysis(null);
  }, [spreadType]);

  const handleManualEntry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const cardId = parseInt(formData.get('cardId') as string);
    if (isNaN(cardId) || cardId < 1 || cardId > 36) return;
    if (selectedHouse !== null) {
      const newB = [...manualBoard];
      const existing = newB.indexOf(cardId);
      if (existing !== -1) newB[existing] = null;
      newB[selectedHouse] = cardId;
      setManualBoard(newB);
      setSelectedHouse((selectedHouse + 1) % (spreadType === 'relogio' ? 13 : 36));
      e.currentTarget.reset();
    }
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

  const runMentorAnalysis = async () => {
    if (selectedHouse === null || currentBoard[selectedHouse] === null) return;
    setIsAiLoading(true);
    const result = await getDetailedCardAnalysis(currentBoard, selectedHouse, readingTheme, spreadType, difficultyLevel);
    setCardAnalysis(result);
    setIsAiLoading(false);
    setScore(s => s + 20);
  };

  const themeIcons: Record<ReadingTheme, React.ReactNode> = {
    'Geral': <Compass size={14} />,
    'Amor & Relacionamentos': <Heart size={14} />,
    'Trabalho & Finanças': <Briefcase size={14} />,
    'Espiritualidade & Caminho': <Stars size={14} />
  };

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900'} transition-colors overflow-hidden selection:bg-indigo-500/30 font-inter`}>
      
      {/* SIDEBAR ESQUERDA */}
      <aside className={`flex flex-col border-r border-slate-800 transition-all duration-300 z-30 shadow-2xl relative ${sidebarCollapsed ? 'w-20' : 'w-64'} ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
        <div className="p-6 flex items-center justify-between mb-4">
           <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'hidden' : 'flex'}`}>
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                 <Sparkles className="text-white" size={18} />
              </div>
              <h1 className="text-sm font-bold font-cinzel text-indigo-100">LUMINA</h1>
           </div>
           <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><ChevronLeft size={18} /></button>
        </div>

        <nav className="flex-grow px-4 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem icon={<LayoutGrid size={18}/>} label="Mesa Real" active={view === 'board' && spreadType === 'mesa-real'} collapsed={sidebarCollapsed} onClick={() => {setView('board'); setSpreadType('mesa-real');}} />
          <NavItem icon={<Clock size={18}/>} label="Relógio" active={view === 'board' && spreadType === 'relogio'} collapsed={sidebarCollapsed} onClick={() => {setView('board'); setSpreadType('relogio');}} />
          <NavItem icon={<BookOpen size={18}/>} label="Fundamentos" active={view === 'fundamentals'} collapsed={sidebarCollapsed} onClick={() => setView('fundamentals')} />

          {!sidebarCollapsed && view === 'board' && (
            <div className="mt-8 space-y-6 pt-6 border-t border-slate-800/50">
               <div className="px-2">
                  <div className="flex items-center gap-2 mb-3 text-slate-500">
                    <Settings size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Personalização</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-slate-950/40 p-1 rounded-xl flex">
                      <button 
                        onClick={() => setBoardMode('random')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${boardMode === 'random' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        <Dices size={14} /> Aleatória
                      </button>
                      <button 
                        onClick={() => setBoardMode('manual')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${boardMode === 'manual' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        <Edit3 size={14} /> Manual
                      </button>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
           {!sidebarCollapsed ? (
             <div className="space-y-4">
                <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white transition-colors">
                   {darkMode ? <Sun size={16}/> : <Moon size={16}/>}
                   <span className="text-xs font-medium">{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
                </button>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/60 flex items-center justify-between">
                   <p className="text-[10px] font-bold text-slate-300 truncate">Estudante LUMINA</p>
                   <button className="text-slate-600 hover:text-rose-500 transition-colors"><LogOut size={14} /></button>
                </div>
             </div>
           ) : (
             <div className="space-y-4 flex flex-col items-center">
               <button onClick={() => setDarkMode(!darkMode)} className="text-slate-400 hover:text-white transition-colors"><Sun size={20}/></button>
             </div>
           )}
        </div>
      </aside>

      {/* ÁREA CENTRAL */}
      <main className="flex-grow flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 border-b border-slate-800/40 flex items-center justify-between px-10 z-20 backdrop-blur-md bg-slate-900/40">
           <div className="flex items-center gap-4">
              <h2 className="font-cinzel text-lg font-black text-white tracking-widest uppercase">{spreadType === 'relogio' ? 'Relógio Cigano' : 'Laboratório Mesa Real'}</h2>
              <div className="flex gap-2">
                <span className="bg-indigo-600/20 text-indigo-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{difficultyLevel}</span>
                <span className="bg-indigo-600/20 text-indigo-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">{themeIcons[readingTheme]} {readingTheme}</span>
              </div>
           </div>
           <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 bg-indigo-950/30 border border-indigo-500/20 px-4 py-2 rounded-xl">
                 <Award size={14} className="text-amber-500" />
                 <span className="text-[10px] font-black text-indigo-100 uppercase">{score} Pts</span>
              </div>
              <button 
                onClick={() => setBoard(generateShuffledArray(spreadType === 'relogio' ? 13 : 36))} 
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-indigo-600/20"
              >
                 <RotateCcw size={14} /> Reembaralhar
              </button>
           </div>
        </header>

        <div className="flex-grow overflow-y-auto p-10 custom-scrollbar bg-slate-950 relative">
           {view === 'board' && spreadType === 'mesa-real' && (
             <div className="max-w-6xl mx-auto space-y-12 pb-24">
                <div className="grid grid-cols-8 gap-3">
                   {currentBoard.slice(0, 32).map((cardId, index) => (
                     <CardVisual key={index} card={cardId ? LENORMAND_CARDS.find(c => c.id === cardId) : null} houseId={index + 1} isSelected={selectedHouse === index} highlightType={getGeometryHighlight(index)} onClick={() => setSelectedHouse(index)} level={difficultyLevel} />
                   ))}
                </div>
                <div className="flex flex-col items-center gap-4 pt-10 border-t border-slate-800/40">
                   <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.5em] mb-4 animate-pulse">Veredito Final</h4>
                   <div className="flex justify-center gap-6">
                      {currentBoard.slice(32, 36).map((cardId, index) => (
                        <div key={index + 32} className="w-36"><CardVisual card={cardId ? LENORMAND_CARDS.find(c => c.id === cardId) : null} houseId={index + 33} isSelected={selectedHouse === index + 32} highlightType={getGeometryHighlight(index + 32)} onClick={() => setSelectedHouse(index + 32)} level={difficultyLevel} /></div>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {view === 'board' && spreadType === 'relogio' && (
             <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[85vh] relative pb-24 origin-center scale-95">
                <div className="relative w-[48rem] h-[48rem] border-2 border-slate-800/10 rounded-full flex items-center justify-center shadow-[inset_0_0_100px_rgba(79,70,229,0.03)] bg-[radial-gradient(circle_at_center,_rgba(79,70,229,0.02)_0%,_transparent_70%)]">
                   
                   {/* Mandala Decorativa */}
                   <div className="absolute inset-0 border border-indigo-500/5 rounded-full scale-[0.98] border-dashed animate-[spin_120s_linear_infinite]"></div>
                   <div className="absolute inset-0 border border-indigo-500/10 rounded-full scale-[0.7] opacity-20 border-dashed animate-[spin_80s_linear_reverse_infinite]"></div>
                   
                   {/* Carta Central: Tom da Leitura */}
                   <div className="absolute w-40 z-30 transition-all hover:scale-105 duration-500">
                      <div className="relative">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 whitespace-nowrap z-20">
                           <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full shadow-lg">
                              <Eye size={12} className="text-amber-400" />
                              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Tom da Leitura</span>
                           </div>
                           <div className="w-0.5 h-4 bg-gradient-to-b from-amber-400/40 to-transparent"></div>
                        </div>
                        <div className="rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(251,191,36,0.2)]">
                          <CardVisual 
                            card={currentBoard[12] ? LENORMAND_CARDS.find(c => c.id === currentBoard[12]) : null} 
                            houseId={13} 
                            isSelected={selectedHouse === 12} 
                            highlightType="center" 
                            onClick={() => setSelectedHouse(12)} 
                            level={difficultyLevel} 
                          />
                        </div>
                      </div>
                   </div>

                   {currentBoard.slice(0, 12).map((cardId, index) => {
                      const angle = (index * 30) - 90;
                      // Raio otimizado para evitar sobreposição total
                      const radius = 42; 
                      const x = 50 + radius * Math.cos(angle * Math.PI / 180);
                      const y = 50 + radius * Math.sin(angle * Math.PI / 180);
                      return (
                        <div key={index} className="absolute w-32 -translate-x-1/2 -translate-y-1/2 z-10 transition-transform duration-300 hover:z-40" style={{ left: `${x}%`, top: `${y}%` }}>
                           <CardVisual card={cardId ? LENORMAND_CARDS.find(c => c.id === cardId) : null} houseId={index + 1} isSelected={selectedHouse === index} highlightType={getGeometryHighlight(index)} onClick={() => setSelectedHouse(index)} level={difficultyLevel} />
                        </div>
                      );
                   })}
                   
                   <div className="flex flex-col items-center gap-4 opacity-[0.03] pointer-events-none select-none">
                      <Clock size={200} />
                      <span className="font-cinzel text-5xl font-black tracking-[0.5em] text-center">MANDALA ANUAL</span>
                   </div>
                </div>
             </div>
           )}

           {view === 'fundamentals' && (
             <div className="max-w-6xl mx-auto space-y-12 pb-24">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {FUNDAMENTALS_DATA.map((module) => (
                    <div key={module.id} className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-8 rounded-[2.5rem] shadow-xl hover:border-indigo-500/30 transition-all">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-indigo-600/10 rounded-2xl border border-indigo-600/20 text-indigo-400">
                           <BookOpen size={24} />
                        </div>
                        <h3 className="text-xl font-cinzel font-bold text-white tracking-wide">{module.title}</h3>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed mb-8">{module.description}</p>
                      <div className="space-y-4">
                        {module.concepts.map((concept, i) => (
                          <div key={i} className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/40 group hover:bg-indigo-600/5 transition-colors">
                             <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 group-hover:text-indigo-300 transition-colors">{concept.title}</h4>
                             <p className="text-xs text-slate-300 leading-relaxed">{concept.text}</p>
                             {concept.example && (
                               <div className="mt-2 flex items-center gap-2 opacity-60">
                                 <Sparkles size={10} className="text-amber-500" />
                                 <span className="text-[10px] italic text-slate-400">Ex: {concept.example}</span>
                               </div>
                             )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
             </div>
           )}
        </div>
      </main>

      {/* PAINEL LATERAL DIREITO - MENTOR */}
      <aside className={`w-[32rem] flex flex-col border-l border-slate-800 transition-all duration-500 z-30 shadow-2xl bg-slate-900`}>
        <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20"><Activity className="text-emerald-500" size={20} /></div>
              <div>
                 <h1 className="text-sm font-bold font-cinzel text-slate-100 uppercase tracking-widest">PAINEL DO MENTOR</h1>
                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">{cardAnalysis ? 'Estágio 2: Interpretação' : 'Estágio 1: Exploração'}</p>
              </div>
           </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-8 space-y-10">
          {selectedHouse !== null ? (
            <div className="space-y-10 animate-in slide-in-from-right duration-500">
               <section className="space-y-8">
                 <div className="bg-slate-950/60 p-8 rounded-[2.5rem] border border-slate-800/80 shadow-2xl relative overflow-hidden group min-h-[18rem]">
                    {/* Visualização da Miniatura da Imagem no Painel Lateral */}
                    <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-56 h-72 opacity-20 pointer-events-none rotate-6 transition-transform group-hover:rotate-12 duration-700">
                      <div className="w-full h-full border-4 border-indigo-500/30 rounded-3xl relative overflow-hidden flex items-center justify-center bg-indigo-500/5 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]">
                        {selectedCard && (
                          <>
                             <img 
                               src={getCardImageUrl(selectedCard.id)} 
                               alt={selectedCard.name} 
                               className="absolute inset-0 w-full h-full object-cover mix-blend-overlay"
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                          </>
                        )}
                        {/* Placeholder tracejado se não houver carta (embora selectedCard já garanta) */}
                        {!selectedCard && (
                           <div className="w-full h-full border-4 border-dashed border-slate-800 rounded-3xl flex items-center justify-center">
                              <Sparkles className="text-slate-800" size={32} />
                           </div>
                        )}
                      </div>
                    </div>

                    <div className="relative z-10 pr-20">
                      <div className="flex justify-between items-start mb-6">
                         <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">CARTA SELECIONADA</span>
                         {selectedCard && (<div className={`w-3 h-3 rounded-full ${selectedCard.polarity === Polarity.POSITIVE ? 'bg-emerald-500' : selectedCard.polarity === Polarity.NEGATIVE ? 'bg-rose-500' : 'bg-slate-400'} border border-black/20 shadow-sm`} />)}
                      </div>
                      <h3 className="text-4xl font-cinzel font-bold text-white mb-3 tracking-wider drop-shadow-lg">{selectedCard ? selectedCard.name : 'Vazio'}</h3>
                      
                      {selectedCard && (
                        <div className="bg-slate-900/80 p-6 rounded-[2rem] border border-slate-800/50 space-y-4 mb-6 transition-all shadow-inner backdrop-blur-sm">
                          <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                            <Clock size={14} /> Panorama Temporal
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block">Velocidade</span>
                               <span className="text-xs font-bold text-slate-200">{selectedCard.timingSpeed}</span>
                            </div>
                            <div className="space-y-1">
                               <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block">Sinal do Tempo</span>
                               <span className="text-xs font-bold text-slate-200">{selectedCard.timingScale}</span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-800/50 flex items-center gap-4">
                             <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-sm border ${
                               selectedCard.timingCategory === 'Acelera' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                               selectedCard.timingCategory === 'Bloqueia' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                               'bg-amber-500/10 border-amber-500/30 text-amber-400'
                             }`}>
                               {selectedCard.timingCategory} Fluxo
                             </div>
                             <p className="text-[10px] text-slate-500 italic leading-snug flex-grow">
                                {selectedCard.timingCategory === 'Acelera' ? 'Impulsiona os eventos com urgência.' :
                                 selectedCard.timingCategory === 'Retarda' ? 'Ação lenta; pede paciência e enraizamento.' :
                                 selectedCard.timingCategory === 'Bloqueia' ? 'Sinaliza uma paralisação que exige revisão.' :
                                 'Mantém o ritmo constante do processo.'}
                             </p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                         <div className="bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800 flex items-center gap-3"><ShieldCheck size={12} className="text-slate-500" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedCard?.polarity || 'Polaridade N/A'}</span></div>
                         <div className="bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800 flex items-center gap-3"><Zap size={12} className="text-slate-500" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedCard?.symbolicEnergy || 'Energia N/A'}</span></div>
                      </div>
                      
                      <div className="mt-8 space-y-4">
                         <p className="text-sm text-slate-300 leading-relaxed font-medium bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/10">
                            <strong>Interpretação Breve:</strong> {selectedCard ? selectedCard.briefInterpretation : 'Selecione uma casa ocupada.'}
                         </p>
                         <p className="text-sm text-slate-400 leading-relaxed italic border-l-4 border-indigo-600/40 pl-6 py-2 max-w-[95%]">
                            <strong>Na Casa de Origem:</strong> "{selectedCard?.interpretationAtOrigin}"
                         </p>
                      </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                   <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4 flex items-center gap-3">
                     <LayoutGrid size={14} className="text-slate-600" /> CONTEXTO DA CASA ({spreadType === 'relogio' ? 'RELÓGIO' : 'MESA REAL'})
                   </h5>
                   <div className="bg-indigo-600/5 p-8 rounded-[2rem] border border-indigo-500/10 shadow-sm relative overflow-hidden transition-all hover:bg-indigo-600/10">
                      <div className="relative z-10">
                        <p className="text-[11px] font-black text-indigo-300 uppercase mb-2 tracking-[0.2em]">
                          {spreadType === 'relogio' 
                            ? `${currentHouse?.name} — ${currentHouse?.month || 'Sinal Central'}` 
                            : `Casa ${selectedHouse + 1}: ${currentHouse?.name}`
                          }
                        </p>
                        <p className="text-sm text-slate-300 leading-relaxed font-medium mb-4">
                          {currentHouse?.technicalDescription}
                        </p>
                        <div className="pt-4 border-t border-indigo-500/10 flex items-start gap-3">
                           {spreadType === 'mesa-real' ? (
                             <>
                               <Info size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                               <span className="text-[10px] text-slate-500 font-bold uppercase leading-tight tracking-wide">{currentHouse?.pedagogicalRule}</span>
                             </>
                           ) : (
                             <>
                               <Target size={14} className="text-indigo-400" />
                               <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{currentHouse?.theme}</span>
                             </>
                           )}
                        </div>
                      </div>
                   </div>
                 </div>

                 {/* Detalhamento de Geometrias Ativas com Miniaturas de Imagem */}
                 {spreadType === 'mesa-real' && selectedHouse !== null && (
                   <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
                     
                     {/* Diagonais Superiores (Ascendentes) */}
                     <div className="space-y-4">
                        <div className="flex items-center justify-between px-4">
                          <h5 className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
                            <ChevronUp size={16} /> Influência Ascendente (Diagonal Superior)
                          </h5>
                          <span className="text-[8px] font-black text-slate-600 uppercase">Expectativa / Topo</span>
                        </div>
                        <div className="space-y-3 px-2">
                          {diagonalUpCards.length > 0 ? (
                            diagonalUpCards.map((item, i) => (
                              <RelatedCardMini key={i} card={item.card} houseName={item.house.name} houseId={item.idx + 1} label="O que está sendo construído?" labelColor="bg-orange-500/20 text-orange-400 border border-orange-500/20" />
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-600 italic px-4">Sem diagonais superiores ativas.</p>
                          )}
                        </div>
                     </div>

                     {/* Diagonais Inferiores (Descendentes) */}
                     <div className="space-y-4">
                        <div className="flex items-center justify-between px-4">
                          <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                            <ChevronDown size={16} /> Influência Descendente (Diagonal Inferior)
                          </h5>
                          <span className="text-[8px] font-black text-slate-600 uppercase">Raízes / Subterrâneo</span>
                        </div>
                        <div className="space-y-3 px-2">
                          {diagonalDownCards.length > 0 ? (
                            diagonalDownCards.map((item, i) => (
                              <RelatedCardMini key={i} card={item.card} houseName={item.house.name} houseId={item.idx + 1} label="O que sustenta ou drena?" labelColor="bg-indigo-500/20 text-indigo-400 border border-indigo-500/20" />
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-600 italic px-4">Sem diagonais inferiores ativas.</p>
                          )}
                        </div>
                     </div>

                     <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800/40 space-y-3">
                        <h6 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Síntese de Modulação Geométrica</h6>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/50">
                              <span className="text-[8px] font-black text-slate-600 uppercase block mb-1">Pressão de Destino</span>
                              <span className="text-[10px] text-indigo-300 font-bold">Ajusta Força e Tempo</span>
                           </div>
                           <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/50">
                              <span className="text-[8px] font-black text-slate-600 uppercase block mb-1">Estabilidade Técnica</span>
                              <span className="text-[10px] text-emerald-300 font-bold">Mapeia Sustentação</span>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4 flex items-center gap-3">
                          <ArrowRightLeft size={14} className="text-cyan-500" /> Conexões por Espelhamento
                        </h5>
                        <div className="space-y-3 px-2">
                          {mirrorCards.length > 0 ? (
                            mirrorCards.map((item, i) => (
                              <RelatedCardMini key={i} card={item.card} houseName={item.house.name} houseId={item.idx + 1} />
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-600 italic px-4">Sem espelhamentos ativos.</p>
                          )}
                        </div>
                     </div>

                     <div className="space-y-4">
                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4 flex items-center gap-3">
                          <MoveDiagonal size={14} className="text-fuchsia-500" /> Influências do Salto do Cavalo
                        </h5>
                        <div className="space-y-3 px-2">
                          {knightCards.length > 0 ? (
                            knightCards.map((item, i) => (
                              <RelatedCardMini key={i} card={item.card} houseName={item.house.name} houseId={item.idx + 1} />
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-600 italic px-4">Sem saltos de cavalo.</p>
                          )}
                        </div>
                     </div>
                   </div>
                 )}
               </section>

               <section className="pt-10 border-t border-slate-800 space-y-8">
                 {!cardAnalysis ? (
                   isAiLoading ? (
                     <div className="py-12 space-y-8">
                        <div className="flex flex-col items-center gap-4 text-center">
                          <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                          <p className="font-cinzel text-xs tracking-[0.3em] uppercase font-bold text-indigo-400 animate-pulse">Consultando Mentor LUMINA</p>
                        </div>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center gap-6 text-center px-6 pb-20">
                        <div className="w-16 h-16 bg-indigo-600/10 rounded-3xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-xl"><HelpCircle size={32} /></div>
                        <p className="text-xs text-slate-500 leading-relaxed">Gerar síntese didática avançada para o nível <strong>{difficultyLevel}</strong> no tema <strong>{readingTheme}</strong>.</p>
                        <button onClick={runMentorAnalysis} disabled={isAiLoading || !selectedCard} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 group shadow-xl shadow-indigo-600/20"><Wand2 size={20} /><span>Gerar Interpretação Técnica</span></button>
                     </div>
                   )
                 ) : (
                   <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700 pb-32">
                      <div className="flex justify-between items-center px-4">
                        <h5 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-3"><MessageSquare size={16} /> Síntese do Mentor</h5>
                        <button onClick={() => setCardAnalysis(null)} className="text-[10px] font-black text-slate-500 hover:text-white uppercase transition-colors underline underline-offset-8">Recolher Análise</button>
                      </div>
                      <div className="bg-slate-950/80 rounded-[3rem] p-10 border border-slate-800/60 shadow-2xl min-h-[500px]">
                         <div className="prose prose-invert prose-sm card-interpretation whitespace-pre-wrap">{cardAnalysis}</div>
                      </div>
                   </div>
                 )}
               </section>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-20"><Compass size={64} className="mb-6" /><p className="text-sm font-bold uppercase tracking-[0.2em] leading-relaxed max-w-[200px]">Selecione uma casa para carregar a Exploração Técnica do Laboratório.</p></div>
          )}
        </div>
      </aside>

      <style>{`
        .card-interpretation h1, .card-interpretation h2, .card-interpretation h3 { color: #818cf8; font-family: 'Cinzel', serif; font-weight: 700; text-transform: uppercase; font-size: 0.95rem; margin-top: 2rem; margin-bottom: 1rem; border-bottom: 2px solid rgba(129, 140, 248, 0.15); padding-bottom: 0.6rem; letter-spacing: 0.1em; }
        .card-interpretation p { margin-bottom: 1.2rem; font-size: 0.85rem; line-height: 1.7; color: #cbd5e1; }
        .card-interpretation strong { color: #f8fafc; font-weight: 600; }
        .card-interpretation blockquote { border-left: 4px solid #4f46e5; padding: 1rem 1.5rem; font-style: italic; background: rgba(79, 70, 229, 0.08); margin: 1.5rem 0; border-radius: 0 1rem 1rem 0; color: #a5b4fc; }
      `}</style>
    </div>
  );
};

export default App;
