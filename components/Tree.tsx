
import React from 'react';

interface Props {
  children: React.ReactNode;
}

const Tree: React.FC<Props> = ({ children }) => {
  return (
    <div className="relative w-full aspect-square flex flex-col items-center justify-end group select-none">
      {/* Ground Shadow */}
      <div className="absolute bottom-6 w-[80%] h-12 bg-slate-900/10 rounded-[100%] blur-3xl z-0"></div>
      
      {/* Modern Stylized Canopy */}
      <div className="absolute top-0 w-full h-[85%] z-10 flex items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center overflow-visible">
          
          {/* Bubble Clusters for Foliage */}
          {/* Main big bubble */}
          <div className="absolute inset-4 bg-gradient-to-br from-[#2ed573] to-[#26ae60] rounded-full shadow-[inset_-30px_-30px_60px_rgba(0,0,0,0.1),20px_20px_40px_rgba(0,0,0,0.05)] border-b-8 border-green-800/10"></div>
          
          {/* Small accent bubbles */}
          <div className="absolute -top-4 left-1/4 w-[50%] h-[50%] bg-[#7bed9f] rounded-full opacity-30 blur-2xl"></div>
          <div className="absolute top-1/2 -right-8 w-40 h-40 bg-green-400 rounded-full opacity-20 blur-xl"></div>
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>

          {/* The apples (children) */}
          <div className="relative z-20 flex flex-wrap justify-center items-center gap-10 max-w-[90%] drop-shadow-[0_15px_15px_rgba(0,0,0,0.2)]">
            {children}
          </div>
        </div>
      </div>
      
      {/* Modern Stylized Trunk */}
      <div className="relative w-40 h-[20%] z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-[#2f3542] via-[#57606f] to-[#2f3542] rounded-t-3xl shadow-[inset_15px_0_30px_rgba(0,0,0,0.4),0_10px_20px_rgba(0,0,0,0.2)]">
          {/* Minimal texture lines */}
          <div className="absolute left-1/3 top-4 w-1.5 h-20 bg-black/20 rounded-full"></div>
          <div className="absolute right-1/4 top-8 w-1 h-12 bg-white/5 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default Tree;
