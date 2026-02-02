
import React, { useState, useRef, useEffect } from 'react';
import SoundManager from './SoundManager';
import { Sparkles, Users } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  students: string[];
  onWinner: (name: string) => void;
}

const COLORS = [
  '#ff4757', '#ffa502', '#2ed573', '#54a0ff', '#5f27cd', '#ff9f43', 
  '#1dd1a1', '#ee5253', '#10ac84', '#0abde3', '#341f97'
];

const SpinnerWheel: React.FC<Props> = ({ students, onWinner }) => {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const currentRotationRef = useRef(0);
  const lastTickAngleRef = useRef(0);

  useEffect(() => {
    if (!isSpinning) return;

    SoundManager.startSpin();

    let startTime = performance.now();
    const duration = 5000; 
    const startRotation = currentRotationRef.current;
    const spins = 10 + Math.random() * 5;
    const extraDegrees = Math.random() * 360;
    const targetRotation = startRotation + (spins * 360) + extraDegrees;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const ease = 1 - Math.pow(1 - progress, 4); 
      const currentRotation = startRotation + (targetRotation - startRotation) * ease;
      
      currentRotationRef.current = currentRotation;
      setRotation(currentRotation);

      if (students.length > 0) {
        const segmentAngle = 360 / students.length;
        const totalSegmentsPassed = Math.floor(currentRotation / segmentAngle);
        const lastSegmentsPassed = Math.floor(lastTickAngleRef.current / segmentAngle);
        
        if (totalSegmentsPassed !== lastSegmentsPassed) {
          SoundManager.playTick(); 
        }
        lastTickAngleRef.current = currentRotation;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        finishSpin(targetRotation);
      }
    };

    const animId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animId);
      SoundManager.stopSpin();
    };
  }, [isSpinning, students.length]);

  const spin = () => {
    if (isSpinning || students.length === 0) return;
    setIsSpinning(true);
    setWinner(null);
    SoundManager.click();
  };

  const finishSpin = (finalRotation: number) => {
    setIsSpinning(false);
    SoundManager.stopSpin();
    
    if (students.length === 0) return;

    const segmentAngle = 360 / students.length;
    const normalizedRotation = (360 - (finalRotation % 360)) % 360;
    const winningIndex = Math.floor(normalizedRotation / segmentAngle) % students.length;
    
    const picked = students[winningIndex];
    setWinner(picked);
    onWinner(picked);
    
    SoundManager.wheelWin(); 

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { x, y },
        colors: COLORS,
        zIndex: 1000
      });
    }
  };

  const getFontSize = () => {
    const count = students.length;
    if (count <= 6) return 'text-lg md:text-xl';
    if (count <= 12) return 'text-sm md:text-base';
    if (count <= 20) return 'text-[11px] md:text-[13px]';
    return 'text-[9px] md:text-[11px]';
  };

  return (
    <div ref={containerRef} className="modern-card flex flex-col items-center gap-6 p-8 rounded-[3.5rem] w-full max-w-xl mx-auto border-none shadow-2xl bg-white/80 backdrop-blur-xl">
      <div className="flex items-center justify-between w-full mb-2">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight modern-title">Vòng Quay</h3>
        <div className="bg-slate-100 px-3 py-1 rounded-full flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
          <Users size={14} /> {students.length} Thành viên
        </div>
      </div>
      
      <div className="relative w-72 h-72 md:w-[24rem] md:h-[24rem] xl:w-[26rem] xl:h-[26rem] wheel-container">
        {/* Kim chỉ thị (Indicator) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 z-40 w-10 h-14 pointer-events-none drop-shadow-[0_5px_15px_rgba(255,71,87,0.4)]">
          <svg viewBox="0 0 100 120">
            <path d="M50 120 L15 30 Q15 0 50 0 Q85 0 85 30 Z" fill="#ff4757" />
            <circle cx="50" cy="35" r="10" fill="white" opacity="0.3" />
          </svg>
        </div>

        <div 
          ref={wheelRef}
          className="w-full h-full rounded-full border-[12px] border-slate-800 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.15)] bg-slate-100"
          style={{ transform: `rotate(${rotation}deg)`, transition: isSpinning ? 'none' : 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
        >
          {students.length > 0 ? (
            students.map((name, i) => {
              const angle = 360 / students.length;
              const rotate = i * angle;
              const skew = 90 - angle;
              return (
                <div 
                  key={i}
                  className="absolute top-0 right-0 w-1/2 h-1/2 origin-bottom-left"
                  style={{ 
                    transform: `rotate(${rotate}deg) skewY(-${skew}deg)`,
                    backgroundColor: COLORS[i % COLORS.length],
                    border: '1px solid rgba(255,255,255,0.15)'
                  }}
                >
                  <div 
                    className="absolute bottom-0 left-0 w-[200%] h-[200%] flex items-start justify-center"
                    style={{ 
                      transform: `skewY(${skew}deg) rotate(${angle / 2}deg)`,
                      paddingTop: '15%'
                    }}
                  >
                    <span 
                      className={`text-white font-black uppercase tracking-tight whitespace-nowrap px-4 py-1 rounded-lg ${getFontSize()}`}
                      style={{ 
                        transform: `rotate(90deg)`,
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        maxWidth: '160px',
                        textAlign: 'center',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block'
                      }}
                    >
                      {name}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold italic text-sm uppercase text-center px-10">Lớp đã hái sạch táo!</div>
          )}
          
          {/* Tâm vòng quay */}
          <div className="absolute inset-0 m-auto w-16 h-16 bg-slate-800 rounded-full border-[6px] border-white shadow-2xl z-20 flex items-center justify-center">
             <div className="w-10 h-10 bg-white/10 rounded-full animate-ping absolute"></div>
             <Sparkles className="text-white opacity-40" size={24} />
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col items-center gap-4 mt-2">
        <button
          onClick={spin}
          disabled={isSpinning || students.length === 0}
          className="w-full py-5 bg-[#ff4757] hover:bg-[#ff6b81] disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-3xl shadow-xl shadow-[#ff4757]/20 transition-all active:scale-95 uppercase text-xl tracking-tighter flex items-center justify-center gap-3 border-b-4 border-black/10"
        >
          {isSpinning ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <Sparkles size={24} />}
          {isSpinning ? 'ĐANG QUAY...' : '🎯 BẮT ĐẦU QUAY'}
        </button>

        <div className="h-28 flex items-center justify-center w-full">
          {winner && !isSpinning && (
            <div className="text-center animate-in zoom-in duration-500 bg-[#2ecc71]/10 px-12 py-5 rounded-[2.5rem] border-2 border-[#2ecc71]/30 shadow-lg w-full">
              <p className="text-[10px] text-[#2ecc71] font-black uppercase tracking-[0.3em] mb-2 flex items-center justify-center gap-2">
                <Sparkles size={14} className="animate-pulse" /> NGƯỜI ĐƯỢC CHỌN <Sparkles size={14} className="animate-pulse" />
              </p>
              <p className="text-4xl font-black text-slate-800 tracking-tight drop-shadow-sm">{winner}</p>
            </div>
          )}
          {!winner && !isSpinning && students.length > 0 && (
            <p className="text-slate-400 font-bold italic text-sm animate-pulse">Nhấn nút để chọn người hái táo tiếp theo!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpinnerWheel;
