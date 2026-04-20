
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Tour, Card, Question, Hint } from './types';
import { tourService } from './services/tourService';
import { exportService } from './services/exportService';
import { 
  IconPlus, IconTrash, IconCamera, IconMapPin, IconUndo, IconRedo, 
  IconMore, IconRecord, IconChevronDown, IconChevronUp, IconMoreVertical,
  IconMaximize, IconX, IconGrip
} from './components/Icons';

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Helper for image compression to avoid localStorage quota issues
const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1024;
      const MAX_HEIGHT = 1024;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7)); // 0.7 quality is good for mobile
    };
  });
};

const FullscreenOverlay: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => (
  <div className="fixed inset-0 z-[2000] bg-black animate-in fade-in duration-200 flex flex-col">
    <div className="absolute top-4 right-4 z-[2001]">
      <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white">
        <IconX />
      </button>
    </div>
    {children}
  </div>
);

const PointSelector: React.FC<{ 
  currentValue: number; 
  onSelect: (val: number) => void; 
  onClose: () => void; 
}> = ({ currentValue, onSelect, onClose }) => (
  <div className="fixed inset-0 z-[3000] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
    <div className="bg-white rounded-2xl p-4 w-full max-w-xs shadow-2xl scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-800">Select Points</h3>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><IconX /></button>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
          <button
            key={num}
            onClick={() => { onSelect(num); onClose(); }}
            className={`h-10 rounded-lg font-bold text-sm border transition-all active:scale-95 ${num === currentValue ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  </div>
);

const TourList: React.FC = () => {
  const [tours, setTours] = useState<Tour[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setTours(tourService.getTours());
  }, []);

  const handleCreateTour = () => {
    const newTour = tourService.createTour();
    navigate(`/tour/${newTour.id}`);
  };

  const handleDeleteTour = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this tour?")) {
      tourService.deleteTour(id);
      setTours(tourService.getTours());
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 pb-32 relative min-h-screen">
      <header className="mb-4 mt-2 px-1">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tour Architect</h1>
        <p className="text-slate-500 text-xs font-medium">Design your city experience.</p>
      </header>

      <div className="space-y-2">
        {tours.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="bg-slate-200 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400">
              <IconPlus />
            </div>
            <p className="text-slate-400 font-medium text-xs">No tours yet. Tap below.</p>
          </div>
        ) : (
          tours.map(tour => (
            <div 
              key={tour.id} 
              onClick={() => navigate(`/tour/${tour.id}`)}
              className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center active:scale-[0.98] active:bg-slate-50 transition-all cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-800 truncate pr-2">{tour.name}</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">
                  {tour.cards.length} {tour.cards.length === 1 ? 'Location' : 'Locations'} • {new Date(tour.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button 
                onClick={(e) => handleDeleteTour(tour.id, e)}
                className="p-2 text-slate-200 hover:text-red-500 transition-colors"
              >
                <IconTrash />
              </button>
            </div>
          ))
        )}
      </div>

      <button 
        onClick={handleCreateTour}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-xl flex items-center justify-center active:scale-90 transition-all z-[100] border-4 border-white"
      >
        <IconPlus />
      </button>
    </div>
  );
};

const TourEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tour, setTour] = useState<Tour | null>(null);
  const [history, setHistory] = useState<Tour[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showMenu, setShowMenu] = useState(false);
  const [activeMenuCard, setActiveMenuCard] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenField, setFullscreenField] = useState<{ cardId: string, type: 'text', field: 'description' | 'task' } | { cardId: string, type: 'question', questionId: string } | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [ptsSelector, setPtsSelector] = useState<{ currentValue: number, onSelect: (val: number) => void } | null>(null);

  const cardsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      const existing = tourService.getTours().find(t => t.id === id);
      if (existing) {
        // Data Migration for old structure
        const migratedCards = existing.cards.map(c => {
          let updatedCard = { ...c };

          // Migrate Questions from String to Object Array
          if (typeof (c as any).questions === 'string') {
            const oldQ = (c as any).questions as string;
            const oldHints = ((c as any).questionHints || []) as string[];
            const oldPrice = (c as any).questionPrice as number;
            
            updatedCard.questions = oldQ ? [{
              id: generateId(),
              text: oldQ,
              price: oldPrice || 1,
              hints: oldHints.map(h => ({ text: h, price: 1 }))
            }] : [];
          }

          // Migrate Task Hints from String Array to Object Array
          if (updatedCard.taskHints && updatedCard.taskHints.length > 0 && typeof updatedCard.taskHints[0] === 'string') {
            updatedCard.taskHints = (updatedCard.taskHints as unknown as string[]).map(t => ({ text: t, price: 1 }));
          }

          return updatedCard as Card;
        });

        const migratedTour = { ...existing, cards: migratedCards };
        setTour(migratedTour);
        setHistory([migratedTour]);
        setHistoryIndex(0);
      } else {
        navigate('/');
      }
    }
  }, [id, navigate]);

  const updateTourState = useCallback((newTour: Tour) => {
    setTour(newTour);
    tourService.updateTour(newTour);
    setHistory(prev => {
      const nextHistory = prev.slice(0, historyIndex + 1);
      nextHistory.push(JSON.parse(JSON.stringify(newTour)));
      if (nextHistory.length > 10) nextHistory.shift(); 
      return nextHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 9));
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setTour(prev);
      tourService.updateTour(prev);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setTour(next);
      tourService.updateTour(next);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const addCard = async (autoCoords = false) => {
    if (!tour) return;
    let coords: { lat: number | null, lng: number | null } = { lat: null, lng: null };
    if (autoCoords) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 8000 })
        );
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (e) { console.error("GPS Error", e); }
    }

    const newCard: Card = {
      id: generateId(),
      name: "",
      description: "",
      task: "",
      taskHints: [],
      questions: [],
      lat: coords.lat,
      lng: coords.lng,
      images: [],
      isCollapsed: false
    };

    updateTourState({ ...tour, cards: [...tour.cards, newCard] });
    setTimeout(() => cardsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
  };

  const updateCard = (cardId: string, data: Partial<Card>) => {
    if (!tour) return;
    const updatedCards = tour.cards.map(c => c.id === cardId ? { ...c, ...data } : c);
    updateTourState({ ...tour, cards: updatedCards });
  };

  const deleteCard = (cardId: string) => {
    if (!tour) return;
    if (window.confirm("Delete location?")) {
      const updatedCards = tour.cards.filter(c => c.id !== cardId);
      updateTourState({ ...tour, cards: updatedCards });
      setActiveMenuCard(null);
    }
  };

  const updateCoords = async (cardId: string) => {
    try {
      const pos = await new Promise<GeolocationPosition>((r, rej) => navigator.geolocation.getCurrentPosition(r, rej));
      updateCard(cardId, { lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (e) { alert("GPS Access Denied"); }
  };

  // --- Task Hint Management ---
  const addTaskHint = (cardId: string) => {
    if (!tour) return;
    const card = tour.cards.find(c => c.id === cardId);
    if (!card) return;
    updateCard(cardId, { taskHints: [...(card.taskHints || []), { text: "", price: 1 }] });
  };
  const updateTaskHint = (cardId: string, idx: number, data: Partial<Hint>) => {
    if (!tour) return;
    const card = tour.cards.find(c => c.id === cardId);
    if (!card) return;
    const hints = [...card.taskHints];
    hints[idx] = { ...hints[idx], ...data };
    updateCard(cardId, { taskHints: hints });
  };
  const deleteTaskHint = (cardId: string, idx: number) => {
    if (!tour) return;
    const card = tour.cards.find(c => c.id === cardId);
    if (!card) return;
    const hints = [...card.taskHints];
    hints.splice(idx, 1);
    updateCard(cardId, { taskHints: hints });
  };

  // --- Question Management ---
  const addQuestion = (cardId: string) => {
    if (!tour) return;
    const card = tour.cards.find(c => c.id === cardId);
    if (!card) return;
    const newQ: Question = { id: generateId(), text: "", price: 1, hints: [] };
    updateCard(cardId, { questions: [...card.questions, newQ] });
  };
  const updateQuestion = (cardId: string, qId: string, data: Partial<Question>) => {
    if (!tour) return;
    const card = tour.cards.find(c => c.id === cardId);
    if (!card) return;
    const questions = card.questions.map(q => q.id === qId ? { ...q, ...data } : q);
    updateCard(cardId, { questions });
  };
  const deleteQuestion = (cardId: string, qId: string) => {
    if (!tour) return;
    const card = tour.cards.find(c => c.id === cardId);
    if (!card) return;
    updateCard(cardId, { questions: card.questions.filter(q => q.id !== qId) });
  };

  // --- Question Hint Management ---
  const addQuestionHint = (cardId: string, qId: string) => {
    if (!tour) return;
    const card = tour.cards.find(c => c.id === cardId);
    if (!card) return;
    const questions = card.questions.map(q => {
      if (q.id === qId) {
        return { ...q, hints: [...q.hints, { text: "", price: 1 }] };
      }
      return q;
    });
    updateCard(cardId, { questions });
  };
  const updateQuestionHint = (cardId: string, qId: string, hIdx: number, data: Partial<Hint>) => {
    if (!tour) return;
    const card = tour.cards.find(c => c.id === cardId);
    if (!card) return;
    const questions = card.questions.map(q => {
      if (q.id === qId) {
        const hints = [...q.hints];
        hints[hIdx] = { ...hints[hIdx], ...data };
        return { ...q, hints };
      }
      return q;
    });
    updateCard(cardId, { questions });
  };
  const deleteQuestionHint = (cardId: string, qId: string, hIdx: number) => {
    if (!tour) return;
    const card = tour.cards.find(c => c.id === cardId);
    if (!card) return;
    const questions = card.questions.map(q => {
      if (q.id === qId) {
        const hints = [...q.hints];
        hints.splice(hIdx, 1);
        return { ...q, hints };
      }
      return q;
    });
    updateCard(cardId, { questions });
  };


  const handleCaptureImage = async (cardId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const rawBase64 = reader.result as string;
          const compressed = await compressImage(rawBase64);
          const currentTour = tourService.getTours().find(t => t.id === id);
          if (currentTour) {
            const card = currentTour.cards.find(c => c.id === cardId);
            if (card) {
              const updatedImages = [...card.images, compressed];
              updateCard(cardId, { images: updatedImages });
            }
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
    setActiveMenuCard(null);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    const newCards = [...(tour?.cards || [])];
    const draggedItem = newCards[draggedIdx];
    newCards.splice(draggedIdx, 1);
    newCards.splice(idx, 0, draggedItem);
    setDraggedIdx(idx);
    setTour(t => t ? { ...t, cards: newCards } : null);
  };

  const handleDragEnd = () => {
    if (tour) updateTourState(tour);
    setDraggedIdx(null);
  };

  if (!tour) return <div className="p-20 text-center font-bold text-slate-400">Loading...</div>;

  // Fullscreen rendering logic
  let fullscreenContent = null;
  let fullscreenSave = () => setFullscreenField(null);
  let fullscreenTitle = "Edit";
  
  if (fullscreenField) {
    const card = tour.cards.find(c => c.id === fullscreenField.cardId);
    if (card) {
      if (fullscreenField.type === 'text') {
        const val = card[fullscreenField.field];
        fullscreenTitle = fullscreenField.field === 'description' ? 'Text' : 'Task';
        fullscreenContent = (
          <textarea
            autoFocus
            className="flex-1 w-full bg-slate-50 rounded-xl p-4 text-base font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300 resize-none"
            value={val}
            onChange={(e) => updateCard(card.id, { [fullscreenField.field]: e.target.value })}
          />
        );
      } else {
        const q = card.questions.find(q => q.id === fullscreenField.questionId);
        if (q) {
            fullscreenTitle = "Question";
            fullscreenContent = (
             <textarea
                autoFocus
                className="flex-1 w-full bg-slate-50 rounded-xl p-4 text-base font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300 resize-none"
                value={q.text}
                onChange={(e) => updateQuestion(card.id, q.id, { text: e.target.value })}
            />
            );
        }
      }
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-slate-50 min-h-screen relative flex flex-col">
      {ptsSelector && <PointSelector currentValue={ptsSelector.currentValue} onSelect={ptsSelector.onSelect} onClose={() => setPtsSelector(null)} />}

      {fullscreenImage && (
        <FullscreenOverlay onClose={() => setFullscreenImage(null)}>
          <div className="flex-1 flex items-center justify-center p-4 bg-black">
            <img src={fullscreenImage} className="max-h-full max-w-full object-contain" style={{ touchAction: 'pinch-zoom' }} alt="Fullscreen" />
          </div>
        </FullscreenOverlay>
      )}

      {fullscreenField && (
        <FullscreenOverlay onClose={fullscreenSave}>
          <div className="flex-1 flex flex-col p-4 bg-white safe-area-bottom">
            <div className="flex items-center justify-between mb-4 mt-12">
              <h2 className="text-base font-black text-slate-900 truncate pr-8">{fullscreenTitle}</h2>
            </div>
            {fullscreenContent}
            <button onClick={fullscreenSave} className="mt-4 w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-lg">Save & Return</button>
          </div>
        </FullscreenOverlay>
      )}

      <div className="sticky top-0 z-[60] bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate('/')} className="text-slate-900 text-xs font-bold px-3 py-1.5 bg-slate-100 rounded-lg">Back</button>
        <div className="flex items-center gap-0.5">
          <button disabled={historyIndex <= 0} onClick={undo} className="p-2 text-slate-600 disabled:opacity-20"><IconUndo /></button>
          <button disabled={historyIndex >= history.length - 1} onClick={redo} className="p-2 text-slate-600 disabled:opacity-20"><IconRedo /></button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className={`p-2 rounded-lg ${showMenu ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}><IconMore /></button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-[70]">
                  <button className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-800 text-xs font-bold" onClick={() => { exportService.exportToZip(tour); setShowMenu(false); }}>Download ZIP</button>
                  <button className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-800 text-xs font-bold border-t border-slate-100" onClick={() => { exportService.exportToGoogleMaps(tour); setShowMenu(false); }}>Maps Preview</button>
                  <button className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-800 text-xs font-bold border-t border-slate-100" onClick={() => { exportService.exportToYaml(tour); setShowMenu(false); }}>Export YAML</button>
                  <button className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-800 text-xs font-bold border-t border-slate-100" onClick={() => { exportService.sendToCreators(tour); setShowMenu(false); }}>Send to creators</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3 pb-48 flex-1 overflow-x-hidden">
        <div className="mb-1 px-1">
          <input 
            type="text" 
            className="w-full bg-transparent text-xl font-black text-slate-900 border-none focus:outline-none focus:ring-0 placeholder:text-slate-200" 
            value={tour.name} 
            onChange={(e) => setTour({ ...tour, name: e.target.value })}
            onBlur={() => updateTourState(tour)}
            placeholder="Tour Title"
          />
        </div>

        {tour.cards.map((card, idx) => (
          <div 
            key={card.id} 
            draggable 
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            className={`bg-white rounded-xl shadow-sm border border-slate-100 transition-all ${draggedIdx === idx ? 'opacity-40 scale-95 shadow-inner' : 'opacity-100'} overflow-visible relative`}
          >
            <div className="p-2 flex items-center gap-2 w-full z-10 relative bg-white rounded-t-xl">
              <div className="shrink-0 text-slate-200 cursor-grab active:cursor-grabbing p-1">
                <IconGrip />
              </div>
              <div className="flex-1 min-w-0">
                <input 
                  type="text"
                  className="w-full font-bold text-slate-800 focus:outline-none placeholder:text-slate-200 text-sm bg-transparent truncate"
                  placeholder={`POI ${idx + 1}`}
                  value={card.name}
                  onChange={(e) => updateCard(card.id, { name: e.target.value })}
                />
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setActiveMenuCard(activeMenuCard === card.id ? null : card.id); }}
                    className="p-1.5 text-slate-400 bg-slate-50 rounded-lg hover:bg-slate-100"
                  >
                    <IconMoreVertical />
                  </button>
                  {activeMenuCard === card.id && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={() => setActiveMenuCard(null)} />
                      <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-xl z-[110] animate-in fade-in slide-in-from-top-1 duration-100 overflow-hidden">
                        <button className="w-full px-3 py-2.5 text-left hover:bg-red-50 text-red-600 font-bold flex items-center gap-2 border-t border-slate-100 text-[10px]" onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }}>
                          <IconTrash /> Remove
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <button 
                  onClick={() => updateCard(card.id, { isCollapsed: !card.isCollapsed })}
                  className={`p-1.5 rounded-lg transition-all ${card.isCollapsed ? 'bg-slate-50 text-slate-300' : 'bg-blue-600 text-white'}`}
                >
                  {card.isCollapsed ? <IconChevronDown /> : <IconChevronUp />}
                </button>
              </div>
            </div>

            {!card.isCollapsed && (
              <div className="px-3 pb-4 space-y-4 animate-in fade-in duration-200 relative z-0">
                {/* 1. TEXT SECTION */}
                <div className="relative group/note">
                  <div className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Text</div>
                  <textarea 
                    className="w-full p-3 bg-slate-50 rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-200 placeholder:text-slate-300 resize-none text-sm font-medium min-h-[5rem]"
                    placeholder="Story details..."
                    value={card.description}
                    onChange={(e) => updateCard(card.id, { description: e.target.value })}
                  />
                  <div className="absolute top-6 right-2 flex gap-1">
                    <button onClick={() => handleCaptureImage(card.id)} className="p-1 bg-white/70 backdrop-blur rounded text-slate-400 hover:text-blue-600 shadow-sm" title="Add Photo"><IconCamera /></button>
                    <button onClick={() => setFullscreenField({ cardId: card.id, type: 'text', field: 'description' })} className="p-1 bg-white/70 backdrop-blur rounded text-slate-400 hover:text-blue-600 shadow-sm" title="Fullscreen"><IconMaximize /></button>
                  </div>
                </div>

                {/* 2. QUESTIONS SECTION */}
                <div className="relative bg-slate-50 p-3 rounded-xl border border-slate-100">
                   <div className="flex justify-between items-center mb-2 ml-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Questions</div>
                   </div>
                   
                   <div className="space-y-4">
                     {card.questions.map((q, qIdx) => (
                       <div key={q.id} className="bg-white rounded-lg p-2 border border-slate-100 shadow-sm">
                         <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-500">Q{qIdx + 1}</span>
                            <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setPtsSelector({ 
                                    currentValue: q.price, 
                                    onSelect: (val) => updateQuestion(card.id, q.id, { price: val }) 
                                  })}
                                  className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 hover:bg-slate-100 active:scale-95 transition-all"
                                >
                                  <span className="text-[9px] font-bold text-slate-400">PTS:</span>
                                  <span className="text-[10px] font-bold text-slate-700 w-4 text-right">{q.price}</span>
                                </button>
                                <button onClick={() => setFullscreenField({ cardId: card.id, type: 'question', questionId: q.id })} className="text-slate-300 hover:text-blue-500"><IconMaximize /></button>
                                <button onClick={() => deleteQuestion(card.id, q.id)} className="text-slate-300 hover:text-red-500"><IconTrash /></button>
                            </div>
                         </div>
                         <textarea 
                            className="w-full p-2 bg-slate-50 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-100 placeholder:text-slate-300 resize-none text-sm font-medium min-h-[3rem] mb-2"
                            placeholder="Ask a question..."
                            value={q.text}
                            onChange={(e) => updateQuestion(card.id, q.id, { text: e.target.value })}
                          />

                          {/* Question Hints */}
                          <div className="space-y-1.5 mt-2 pl-1 border-t border-slate-50 pt-2">
                            {q.hints.map((hint, hIdx) => (
                              <div key={hIdx} className="flex gap-2 items-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                                <input 
                                  type="text" 
                                  className="flex-1 bg-transparent border-b border-slate-100 text-xs py-1 focus:outline-none focus:border-blue-300 text-slate-600"
                                  placeholder="Hint..."
                                  value={hint.text}
                                  onChange={(e) => updateQuestionHint(card.id, q.id, hIdx, { text: e.target.value })}
                                />
                                <button
                                  onClick={() => setPtsSelector({ 
                                    currentValue: hint.price, 
                                    onSelect: (val) => updateQuestionHint(card.id, q.id, hIdx, { price: val }) 
                                  })}
                                  className="flex items-center gap-0.5 bg-slate-50 px-1 rounded hover:bg-slate-100 active:scale-95 transition-all"
                                >
                                  <span className="text-[8px] font-bold text-slate-400">PTS:</span>
                                  <span className="text-[9px] font-bold text-slate-600 w-3 text-right">{hint.price}</span>
                                </button>
                                <button onClick={() => deleteQuestionHint(card.id, q.id, hIdx)} className="text-slate-300 hover:text-red-500 p-0.5"><IconX /></button>
                              </div>
                            ))}
                            <button onClick={() => addQuestionHint(card.id, q.id)} className="text-[9px] font-bold text-blue-500 hover:text-blue-700 mt-1 flex items-center gap-1">+ HINT</button>
                          </div>
                       </div>
                     ))}
                     <button onClick={() => addQuestion(card.id)} className="w-full py-2 bg-white border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-400 transition-colors">+ ADD QUESTION</button>
                   </div>
                </div>

                {/* 3. TASK SECTION */}
                <div className="relative bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-1 ml-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Task</div>
                    <button onClick={() => setFullscreenField({ cardId: card.id, type: 'text', field: 'task' })} className="text-slate-300 hover:text-blue-500 p-1"><IconMaximize /></button>
                  </div>
                  <textarea 
                    className="w-full p-2 bg-white rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-100 placeholder:text-slate-300 resize-none text-sm font-medium min-h-[3.5rem] mb-2"
                    placeholder="Describe the task..."
                    value={card.task}
                    onChange={(e) => updateCard(card.id, { task: e.target.value })}
                  />
                  
                  {/* Task Hints */}
                  <div className="space-y-2 mt-2 pl-1 border-t border-slate-100 pt-2">
                    {(card.taskHints || []).map((hint, hIdx) => (
                      <div key={hIdx} className="flex gap-2 items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                        <input 
                          type="text" 
                          className="flex-1 bg-transparent border-b border-slate-200 text-xs py-1 focus:outline-none focus:border-blue-300 text-slate-600"
                          placeholder="Hint..."
                          value={hint.text}
                          onChange={(e) => updateTaskHint(card.id, hIdx, { text: e.target.value })}
                        />
                        <button
                          onClick={() => setPtsSelector({ 
                            currentValue: hint.price, 
                            onSelect: (val) => updateTaskHint(card.id, hIdx, { price: val }) 
                          })}
                          className="flex items-center gap-0.5 bg-white border border-slate-200 px-1 rounded hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                        >
                          <span className="text-[8px] font-bold text-slate-400">PTS:</span>
                          <span className="text-[9px] font-bold text-slate-600 w-3 text-right">{hint.price}</span>
                        </button>
                        <button onClick={() => deleteTaskHint(card.id, hIdx)} className="text-slate-300 hover:text-red-500 p-1"><IconX /></button>
                      </div>
                    ))}
                    <button onClick={() => addTaskHint(card.id)} className="text-[10px] font-bold text-blue-500 hover:text-blue-700 mt-1 flex items-center gap-1">+ ADD HINT</button>
                  </div>
                </div>

                {/* STATUS & PHOTOS */}
                <div className="flex flex-wrap gap-2 items-center pt-1 px-1">
                  {card.lat ? (
                    <button onClick={() => updateCoords(card.id)} className="text-[9px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1 border border-slate-200 px-2 py-1.5 rounded-md bg-white shadow-sm hover:bg-slate-50 active:scale-95 transition-all">
                      <IconMapPin /> {card.lat.toFixed(4)}, {card.lng?.toFixed(4)} <span className="ml-1 text-blue-600">↻</span>
                    </button>
                  ) : (
                    <button onClick={() => updateCoords(card.id)} className="text-[9px] font-bold text-blue-600 uppercase tracking-tight flex items-center gap-1 border border-blue-200 px-2 py-1.5 rounded-md bg-blue-50 shadow-sm hover:bg-blue-100 active:scale-95 transition-all">
                      <IconMapPin /> Add GPS
                    </button>
                  )}
                </div>
                
                {card.images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-1">
                    {card.images.map((img, i) => (
                      <div key={i} className="relative shrink-0">
                        <img src={img} onClick={() => setFullscreenImage(img)} className="w-16 h-16 object-cover rounded-lg shadow-sm border border-slate-50" alt="" />
                        <button onClick={() => updateCard(card.id, { images: card.images.filter((_, idx) => idx !== i) })} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 shadow-md"><IconX /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={cardsEndRef} className="h-6" />
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent z-50">
        <div className="max-w-xl mx-auto flex gap-2">
          <button onClick={() => addCard(true)} className="flex-1 bg-emerald-600 text-white h-12 rounded-xl shadow-xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 border-b-2 border-emerald-800"><IconRecord /> RECORD LOCATION</button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <Router>
    <div className="min-h-screen bg-slate-50">
      <Routes>
        <Route path="/" element={<TourList />} />
        <Route path="/tour/:id" element={<TourEditor />} />
      </Routes>
    </div>
  </Router>
);

export default App;
