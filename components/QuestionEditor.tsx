
import React from 'react';
import { Question } from '../types';

interface Props {
  question: Question;
  index: number;
  keywordChar: string;
  onUpdate: (updated: Question) => void;
}

const QuestionEditor: React.FC<Props> = ({ question, index, keywordChar, onUpdate }) => {
  const handleChange = (field: keyof Question, value: any) => {
    onUpdate({ ...question, [field]: value });
  };

  const handleOptionChange = (optIdx: number, val: string) => {
    const newOptions = [...question.options];
    newOptions[optIdx] = val;
    handleChange('options', newOptions);
  };

  return (
    <div className="modern-card p-6 rounded-3xl mb-4 border-none hover:translate-y-[-2px] transition-all">
      <div className="flex items-center gap-4 mb-4">
        <span className="bg-[#ff4757] text-white w-9 h-9 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-[#ff4757]/20 text-sm">
          {index + 1}
        </span>
        <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs">Câu hỏi số {index + 1}</h3>
        <div className="ml-auto bg-slate-100 text-slate-400 px-3 py-1 rounded-xl text-[10px] font-bold uppercase">Linked: {keywordChar}</div>
      </div>
      
      <textarea
        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-4 focus:border-[#ff4757]/30 focus:bg-white outline-none font-bold text-slate-700 shadow-inner text-sm transition-all"
        placeholder="Nhập nội dung câu hỏi..."
        value={question.text}
        rows={2}
        onChange={(e) => handleChange('text', e.target.value)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {['A', 'B', 'C', 'D'].map((label, idx) => (
          <div key={label} className="flex items-center gap-3">
            <input
              type="radio"
              name={`correct-${question.id}`}
              checked={question.correctAnswer === idx}
              onChange={() => handleChange('correctAnswer', idx)}
              className="w-4 h-4 accent-[#ff4757] cursor-pointer"
            />
            <div className={`flex-1 flex items-center rounded-2xl border transition-all overflow-hidden ${question.correctAnswer === idx ? 'border-[#2ecc71] bg-[#2ecc71]/5 ring-2 ring-[#2ecc71]/10' : 'border-slate-100 bg-slate-50'}`}>
              <span className={`px-3 py-2 font-black text-xs ${question.correctAnswer === idx ? 'bg-[#2ecc71] text-white' : 'bg-slate-200 text-slate-500'}`}>{label}</span>
              <input
                type="text"
                className="flex-1 bg-transparent px-3 py-2 text-xs font-bold outline-none text-slate-600 focus:text-slate-900"
                value={question.options[idx] || ''}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                placeholder={`Đáp án ${label}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionEditor;
