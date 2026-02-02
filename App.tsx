
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppMode, Question, Grade, GameState } from './types';
import { generateQuestionsFromDoc, extractStudents } from './services/geminiService';
import QuestionEditor from './components/QuestionEditor';
import Tree from './components/Tree';
import SpinnerWheel from './components/SpinnerWheel';
import SoundManager from './components/SoundManager';
import confetti from 'canvas-confetti';
import { Settings, RefreshCcw, X, Loader2, Wand2, Shuffle, ArrowLeft, Clock, FileText, Users, PlayCircle, Trophy, Sparkles, Image as ImageIcon, Volume2, VolumeX, UserCheck, AlertCircle, Key } from 'lucide-react';

const TIMER_DURATION = 30;

// Component đồ họa quả táo nhỏ để trang trí
const AppleGraphic: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`relative shrink-0 animate-float ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b81] via-[#ff4757] to-[#eb4b4b] rounded-[55%_55%_50%_50%] shadow-md"></div>
    <div className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[12%] h-[35%] bg-[#2f3542] rounded-full"></div>
    <div className="absolute -top-[20%] left-[55%] w-[45%] h-[35%] bg-gradient-to-tr from-[#2ecc71] to-[#7bed9f] rounded-[100%_0%_100%_0%] rotate-[20deg] shadow-sm"></div>
  </div>
);

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.TEACHER_CONFIG);
  const [keyword, setKeyword] = useState('THÔNG TIN');
  const [grade, setGrade] = useState<Grade>('10');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtractingStudents, setIsExtractingStudents] = useState(false);
  const [students, setStudents] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [hasOwnKey, setHasOwnKey] = useState(false);
  
  const [materialStatus, setMaterialStatus] = useState<string | null>(null);
  const [studentsStatus, setStudentsStatus] = useState<string | null>(null);
  const [lastUploadedFile, setLastUploadedFile] = useState<{base64: string, type: string} | null>(null);
  const [isRearranging, setIsRearranging] = useState(false);
  
  const materialInputRef = useRef<HTMLInputElement>(null);
  const studentsInputRef = useRef<HTMLInputElement>(null);

  const [gameState, setGameState] = useState<GameState>({
    pickedAppleIndices: [],
    revealedChars: [],
    isCompleted: false,
    shuffledOrder: [],
    studentList: [],
    currentStudent: null,
    displayMapping: []
  });

  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number | null>(null);
  const [wrongAnswerId, setWrongAnswerId] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);

  // Kiểm tra xem người dùng đã chọn Key riêng chưa
  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore - access window.aistudio which is assumed to be globally available
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasOwnKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.openSelectKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasOwnKey(true);
      SoundManager.correct();
    }
  };

  const handleInteraction = async () => {
    await SoundManager.init();
    window.removeEventListener('click', handleInteraction);
    window.removeEventListener('touchstart', handleInteraction);
  };

  useEffect(() => {
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const initQuestions = useCallback((kw: string) => {
    const chars = kw.replace(/\s/g, '').split('');
    const newQuestions: Question[] = chars.map((_, idx) => ({
      id: Math.random().toString(36).substr(2, 9),
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      linkedCharIndex: idx
    }));
    setQuestions(newQuestions);
  }, []);

  useEffect(() => {
    if (questions.length === 0) initQuestions(keyword);
  }, [keyword, initQuestions, questions.length]);

  useEffect(() => {
    let timer: any;
    if (activeQuestionIdx !== null && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            SoundManager.wrong(); 
            setActiveQuestionIdx(null);
            return 0;
          }
          if (prev <= 6) SoundManager.countdownTick(); 
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeQuestionIdx, timeLeft]);

  const toggleMute = () => {
    const muted = SoundManager.toggleMute();
    setIsMuted(muted);
    SoundManager.click();
  };

  const handleManualGenerate = async (fileData?: {base64: string, type: string}) => {
    if (!keyword.trim()) return alert("Vui lòng nhập từ khóa bí mật trước!");
    setIsGenerating(true);
    setMaterialStatus("⏳ AI đang soạn...");
    SoundManager.click();
    const targetFile = fileData || lastUploadedFile;
    
    try {
      const aiResults = await generateQuestionsFromDoc(keyword, grade, targetFile?.base64, targetFile?.type);
      const chars = keyword.replace(/\s/g, '').split('');
      
      if (!aiResults || aiResults.length === 0) throw new Error("AI không thể tạo câu hỏi.");

      const updated = chars.map((char, idx) => {
        const res = aiResults[idx] || aiResults[0] || {};
        return {
          id: Math.random().toString(36).substr(2, 9),
          text: res.text || `Câu hỏi về Tin học liên quan đến chữ "${char}"...`,
          options: res.options || ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
          correctAnswer: (res.correctAnswer !== undefined) ? res.correctAnswer : 0,
          linkedCharIndex: idx
        };
      });
      
      setQuestions(updated);
      setMaterialStatus("✅ Đã soạn xong");
      SoundManager.correct();
    } catch (err: any) {
      console.error(err);
      
      if (err.message?.includes("Requested entity was not found.")) {
        setHasOwnKey(false);
        handleOpenKeyDialog();
        return;
      }

      const isQuota = err.message?.toLowerCase().includes('quota') || err.status === 429;
      setMaterialStatus(isQuota ? "⚠️ Hết hạn mức" : "❌ Lỗi AI");
      
      if (isQuota) {
        const confirmSwitch = window.confirm("Hạn mức API miễn phí đã hết. Bạn có muốn sử dụng API Key riêng để tiếp tục không?");
        if (confirmSwitch) handleOpenKeyDialog();
      } else {
        alert(err.message || "Lỗi AI. Hãy thử lại.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (type: 'material' | 'students', file: File) => {
    if (!file) return;
    SoundManager.click();
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      if (!result.includes(',')) return;
      
      const base64 = result.split(',')[1];
      const mimeType = file.type || 'image/jpeg';

      if (type === 'students') {
        setIsExtractingStudents(true);
        setStudentsStatus("⏳ AI đang quét...");
        try {
          const list = await extractStudents(base64, mimeType);
          if (list && list.length > 0) {
            setStudents(list);
            setStudentsStatus(`✅ Đã nhận diện ${list.length} em`);
            SoundManager.correct();
          } else {
            setStudentsStatus("❌ Không thấy tên");
          }
        } catch (e: any) {
          if (e.message?.includes("Requested entity was not found.")) {
            setHasOwnKey(false);
            handleOpenKeyDialog();
            return;
          }
          const isQuota = e.message?.toLowerCase().includes('quota') || e.status === 429;
          setStudentsStatus(isQuota ? "⚠️ Hết hạn mức" : "❌ Lỗi AI");
          if (isQuota) {
            if (window.confirm("Hết hạn mức AI. Bạn có muốn chọn API Key riêng để quét danh sách nhanh hơn không?")) {
              handleOpenKeyDialog();
            }
          }
        } finally {
          setIsExtractingStudents(false);
        }
      } else {
        setMaterialStatus("⏳ Đang tải...");
        setLastUploadedFile({ base64, type: mimeType });
        await handleManualGenerate({ base64, type: mimeType });
      }
    };
    reader.readAsDataURL(file);
  };

  const startLevel = () => {
    const chars = keyword.replace(/\s/g, '').split('');
    if (questions.some(q => !q.text || q.text.length < 3)) return alert('Vui lòng soạn đầy đủ nội dung câu hỏi!');
    if (students.length === 0) return alert('Vui lòng tải danh sách học sinh để quay số!');
    
    const indices = Array.from({ length: chars.length }, (_, i) => i);
    const shuffledMapping = [...indices].sort(() => Math.random() - 0.5);

    setGameState({
      pickedAppleIndices: [],
      revealedChars: new Array(chars.length).fill(null),
      isCompleted: false,
      shuffledOrder: Array.from({ length: questions.length }, (_, i) => i),
      studentList: students,
      currentStudent: null,
      displayMapping: shuffledMapping
    });
    setIsRearranging(false);
    setMode(AppMode.GAME_PLAY);
    SoundManager.click();
  };

  const handleAnswerSubmit = (optionIdx: number) => {
    if (activeQuestionIdx === null) return;
    const q = questions[activeQuestionIdx];
    
    SoundManager.click(); 

    if (optionIdx === q.correctAnswer) {
      SoundManager.correct(); 
      setTimeout(() => SoundManager.charFly(), 400);

      const newRevealed = [...gameState.revealedChars];
      const chars = keyword.replace(/\s/g, '').split('');
      newRevealed[q.linkedCharIndex] = chars[q.linkedCharIndex];
      const newPicked = [...gameState.pickedAppleIndices, activeQuestionIdx];
      
      setGameState(prev => ({
        ...prev,
        pickedAppleIndices: newPicked,
        revealedChars: newRevealed,
        isCompleted: newPicked.length === questions.length,
        currentStudent: null // Đặt về null khi học sinh trả lời đúng để ô thông tin biến mất
      }));
      setActiveQuestionIdx(null);
      if (newPicked.length === questions.length) {
        setTimeout(() => SoundManager.win(), 1000);
      }
    } else {
      SoundManager.wrong(); 
      setWrongAnswerId(optionIdx);
      setTimeout(() => setWrongAnswerId(null), 500);
    }
  };

  const finalizeGame = () => {
    setIsRearranging(true);
    SoundManager.reveal(); 
    SoundManager.win(); 
    confetti({ 
      particleCount: 200, spread: 70, origin: { y: 0.6 },
      colors: ['#ff4757', '#ffa502', '#2ed573']
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center pt-4 relative animate-in fade-in duration-700">
      {mode === AppMode.TEACHER_CONFIG ? (
        <div className="w-full max-w-[1300px] mx-auto px-6 py-4 animate-in slide-in-from-bottom-4 duration-500">
          <header className="text-center mb-10 flex flex-col items-center">
            <div className="flex items-center justify-center gap-4 mb-1">
              <AppleGraphic className="w-10 h-10 md:w-14 md:h-14" />
              <h1 className="text-5xl md:text-6xl font-black text-[#2f3542] modern-title drop-shadow-sm uppercase tracking-tight">
                Hái Táo <span className="text-[#ff4757]">Tri Thức</span>
              </h1>
              <AppleGraphic className="w-10 h-10 md:w-14 md:h-14" />
            </div>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest opacity-80">Hệ thống ôn tập Tin học thông minh</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="modern-card p-6 rounded-3xl relative flex-1">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-lg font-bold text-slate-800 uppercase flex items-center gap-2"><Settings size={20} className="text-slate-400" /> Cấu hình</h2>
                  <button 
                    onClick={handleOpenKeyDialog} 
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${hasOwnKey ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    <Key size={14} /> {hasOwnKey ? "Key riêng: ON" : "Dùng Key riêng"}
                  </button>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Từ khóa bí mật</label>
                    <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold uppercase text-2xl text-[#ff4757] focus:border-[#ff4757]/30 focus:ring-4 focus:ring-[#ff4757]/5 transition-all"
                      value={keyword} onChange={(e) => { setKeyword(e.target.value.toUpperCase()); initQuestions(e.target.value); }} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Khối lớp</label>
                    <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-lg text-slate-700 outline-none cursor-pointer focus:border-slate-300 transition-all"
                      value={grade} onChange={(e) => setGrade(e.target.value as Grade)}>
                      <option value="10">Lớp 10</option><option value="11">Lớp 11</option><option value="12">Lớp 12</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modern-card p-6 rounded-3xl space-y-5 flex-1">
                <h2 className="text-lg font-bold text-slate-800 mb-2 uppercase flex items-center gap-2"><Wand2 size={20} className="text-[#2ecc71]" /> AI Assistant</h2>
                <div className="grid grid-cols-2 gap-3">
                   <div onClick={() => !isGenerating && materialInputRef.current?.click()} className="p-4 rounded-2xl border-2 border-dashed border-slate-200 cursor-pointer text-center hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <ImageIcon className="mx-auto mb-1 text-slate-400" size={24} />
                    <span className="text-[10px] font-bold uppercase leading-tight block text-slate-500">{materialStatus || "Tải tài liệu (Ảnh)"}</span>
                    <input type="file" ref={materialInputRef} className="hidden" 
                      onChange={(e) => { 
                        if (e.target.files) handleFileUpload('material', e.target.files[0]); 
                        e.target.value = ''; 
                      }} 
                      accept="image/*" />
                  </div>
                  <div onClick={() => !isExtractingStudents && studentsInputRef.current?.click()} className="p-4 rounded-2xl border-2 border-dashed border-slate-200 cursor-pointer text-center hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <Users className="mx-auto mb-1 text-blue-500" size={24} />
                    <span className="text-[10px] font-bold uppercase leading-tight block text-slate-500">{studentsStatus || "Tải D.Sách (Ảnh)"}</span>
                    <input type="file" ref={studentsInputRef} className="hidden" 
                      onChange={(e) => { 
                        if (e.target.files) handleFileUpload('students', e.target.files[0]); 
                        e.target.value = ''; 
                      }} 
                      accept="image/*" />
                  </div>
                </div>
                
                {students.length > 0 && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5"><UserCheck size={12} /> Đã nhận diện {students.length} học sinh:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {students.map((s, idx) => (
                        <span key={idx} className="bg-white px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-600 border border-slate-200">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={() => handleManualGenerate()} disabled={isGenerating} className="w-full py-4 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-bold rounded-2xl shadow-lg shadow-[#2ecc71]/20 flex items-center justify-center gap-2 uppercase text-sm disabled:opacity-50 transition-all active:scale-95">
                  {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18}/>} Soạn đề bằng AI
                </button>
              </div>

              <button onClick={startLevel} className="w-full py-5 bg-[#ff4757] hover:bg-[#ff6b81] text-white font-black rounded-3xl shadow-xl shadow-[#ff4757]/30 flex items-center justify-center gap-4 transition-all text-2xl uppercase border-4 border-white/20 active:scale-95">
                <PlayCircle size={32} /> Bắt đầu
              </button>
            </div>

            <div className="lg:col-span-8 flex flex-col h-full">
              <div className="flex justify-between items-center px-4 mb-4">
                <h2 className="text-2xl font-black text-slate-800 modern-title uppercase">Nội dung câu hỏi</h2>
                <div className="bg-slate-800 text-white px-5 py-2 rounded-full text-[10px] font-bold uppercase shadow-sm">
                  {questions.length} Câu hỏi
                </div>
              </div>
              <div className="flex-1 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar space-y-4 p-2">
                {questions.map((q, idx) => (
                  <QuestionEditor key={q.id} index={idx} question={q} keywordChar={keyword.replace(/\s/g, '').split('')[idx] || '?'} onUpdate={(u) => { const n = [...questions]; n[idx] = u; setQuestions(n); }} />
                ))}
              </div>
            </div>
          </div>

          <button onClick={toggleMute} className="fixed bottom-6 left-6 p-4 bg-white text-slate-400 rounded-full shadow-xl hover:text-slate-600 transition-all z-[100]">
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full min-h-screen">
          <div className="w-full px-10 py-6 flex justify-between items-center z-50 fixed top-0 left-0 right-0 modern-card border-b-0 rounded-b-[2.5rem] shadow-2xl">
            <div className="flex items-center gap-6">
              <button onClick={() => { setMode(AppMode.TEACHER_CONFIG); SoundManager.click(); }} className="bg-slate-100 px-6 py-3 rounded-2xl font-bold uppercase text-slate-600 text-sm flex items-center gap-2 hover:bg-slate-200 transition-all active:scale-95">
                <ArrowLeft size={18} /> Quay lại
              </button>
              <div className="flex items-center gap-2">
                <AppleGraphic className="w-6 h-6 md:w-10 md:h-10" />
                <h2 className="hidden md:block text-2xl font-black text-slate-800 modern-title uppercase tracking-tighter">
                  Cây Táo <span className="text-[#ff4757]">Tri Thức</span>
                </h2>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-4 items-center">
                {(isRearranging ? keyword.replace(/\s/g, '').split('') : gameState.displayMapping).map((val, i) => {
                  const char = isRearranging ? val : gameState.revealedChars[val as number];
                  return (
                    <div key={i} className={`min-w-[55px] h-16 md:min-w-[75px] md:h-20 flex items-center justify-center text-3xl md:text-5xl font-black rounded-2xl border-b-8 transition-all duration-700
                      ${char ? 'bg-white border-[#ff4757] text-[#ff4757] scale-110 shadow-xl' : 'bg-slate-200 border-slate-300 text-slate-400'}`}>
                      {char || '?'}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={toggleMute} className="bg-slate-100 p-4 rounded-2xl text-slate-500 hover:text-slate-800 transition-all">
                {isMuted ? <VolumeX size={28} /> : <Volume2 size={28} />}
              </button>
              <button onClick={() => { startLevel(); SoundManager.click(); }} className="bg-[#ff4757] p-5 rounded-2xl text-white shadow-lg shadow-[#ff4757]/20 hover:scale-105 active:scale-90 transition-all"><RefreshCcw size={28} /></button>
            </div>
          </div>

          <div className="flex-1 w-full max-w-[1800px] grid grid-cols-1 lg:grid-cols-12 gap-8 px-12 items-center mt-56 mb-16">
            <div className="lg:col-span-4 flex items-center justify-center z-20">
              <SpinnerWheel 
                students={gameState.studentList} 
                onWinner={(name) => setGameState(prev => ({ 
                  ...prev, 
                  currentStudent: name,
                  studentList: prev.studentList.filter(s => s !== name) // Tự động xóa học sinh đã quay trúng
                }))} 
              />
            </div>

            <div className="lg:col-span-3 flex flex-col items-center gap-8 z-20">
              {/* Chỉ hiển thị tên học sinh khi đang trong lượt chơi và CHƯA hoàn thành hái táo */}
              {gameState.currentStudent && !gameState.isCompleted && !isRearranging && (
                <div className="modern-card p-10 rounded-[3rem] border-l-[10px] border-l-[#ff4757] text-center w-full animate-float">
                  <p className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-[0.2em]">Đang hái táo</p>
                  <h4 className="text-4xl font-black text-slate-800 tracking-tight">{gameState.currentStudent}</h4>
                </div>
              )}
              
              <div className="w-full space-y-6">
                {gameState.isCompleted && !isRearranging && (
                  <button onClick={() => { finalizeGame(); SoundManager.click(); }} className="w-full py-10 bg-[#ffa502] text-white font-black rounded-[3rem] shadow-2xl shadow-[#ffa502]/30 flex flex-col items-center gap-3 uppercase text-3xl hover:scale-105 transition-all active:scale-95 border-b-8 border-[#e67e22]">
                    <Shuffle size={40} /> Giải mã từ khóa
                  </button>
                )}
                
                {isRearranging && (
                   <div className="modern-card p-12 rounded-[4rem] text-center w-full border-t-[10px] border-t-[#2ecc71] animate-in zoom-in duration-500 shadow-2xl">
                      <Trophy className="mx-auto text-[#ffa502] mb-6 drop-shadow-lg" size={100} />
                      <h4 className="text-4xl font-black text-slate-800 uppercase tracking-tight">Chiến thắng!</h4>
                      <p className="text-slate-500 font-bold mt-2 text-lg">Lớp học thật xuất sắc!</p>
                   </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center items-center relative scale-[0.85] xl:scale-95 z-10">
              <Tree>
                {questions.map((q, idx) => {
                  const picked = gameState.pickedAppleIndices.includes(idx);
                  return (
                    <button 
                      key={q.id} 
                      disabled={picked} 
                      onClick={() => { 
                        SoundManager.pluckApple(); 
                        setTimeout(() => { 
                          setActiveQuestionIdx(idx); 
                          setTimeLeft(TIMER_DURATION); 
                          SoundManager.questionPop(); 
                        }, 300); 
                      }}
                      className={`relative w-24 h-24 md:w-28 md:h-28 transition-all duration-700 ${picked ? 'opacity-0 scale-0 -translate-y-40 rotate-[180deg]' : 'hover:scale-110'}`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b81] via-[#ff4757] to-[#eb4b4b] rounded-[55%_55%_50%_50%] shadow-[inset_-10px_-10px_20px_rgba(0,0,0,0.3),5px_15px_25px_rgba(0,0,0,0.2)]"></div>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-2 h-7 bg-gradient-to-b from-[#747d8c] to-[#2f3542] rounded-full z-0"></div>
                      <div className="absolute -top-4 left-[60%] w-10 h-7 bg-gradient-to-tr from-[#2ecc71] to-[#7bed9f] rounded-[100%_0%_100%_0%] rotate-[20deg] shadow-md"></div>
                      <span className="absolute inset-0 flex items-center justify-center text-white font-black text-3xl md:text-4xl italic select-none drop-shadow-[2px_2px_4px_rgba(0,0,0,0.5)] z-10">{idx + 1}</span>
                    </button>
                  );
                })}
              </Tree>
            </div>
          </div>

          {activeQuestionIdx !== null && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
              <div className="modern-card rounded-[3.5rem] max-w-4xl w-full p-16 relative animate-in zoom-in duration-300">
                <div className={`absolute -top-6 left-12 flex items-center gap-3 bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-3xl shadow-xl ${timeLeft <= 5 ? 'bg-[#ff4757] animate-pulse' : ''}`}>
                  <Clock size={32} /> {timeLeft}
                </div>
                <button onClick={() => { setActiveQuestionIdx(null); SoundManager.click(); }} className="absolute -top-6 -right-6 bg-white text-slate-400 hover:text-[#ff4757] transition-all p-3 rounded-2xl shadow-xl active:scale-90"><X size={32} /></button>
                
                <div className="mb-12 text-center mt-4">
                  <span className="text-[#ff4757] font-bold text-xs uppercase tracking-[0.3em] mb-4 block">Thử thách số {activeQuestionIdx + 1}</span>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-800 leading-tight tracking-tight px-4">{questions[activeQuestionIdx].text}</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {questions[activeQuestionIdx].options.map((opt, i) => (
                    <button 
                      key={i} 
                      onMouseEnter={() => SoundManager.playTick()}
                      onClick={() => handleAnswerSubmit(i)} 
                      className={`p-8 rounded-3xl border-2 text-left font-bold text-lg transition-all flex items-center gap-5 group ${wrongAnswerId === i ? 'bg-[#ff4757]/10 border-[#ff4757] animate-shake scale-95' : 'bg-slate-50 border-slate-100 hover:border-[#ff4757]/30 hover:bg-white hover:shadow-lg active:scale-95'}`}
                    >
                      <span className="min-w-[60px] h-[60px] rounded-2xl bg-white text-slate-800 flex items-center justify-center text-xl shadow-sm group-hover:bg-[#ff4757] group-hover:text-white transition-all font-black border border-slate-100">{String.fromCharCode(65 + i)}</span>
                      <span className="flex-1 text-slate-600 group-hover:text-slate-900 tracking-tight">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
