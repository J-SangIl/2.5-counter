/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, RotateCcw, LayoutGrid, MousePointer2, Trash2, ArrowRight, Equal } from 'lucide-react';

// --- Types ---

type StoneType = 'plus' | 'minus';

interface Stone {
  id: string;
  type: StoneType;
  x: number;
  y: number;
}

type Mode = 'general' | 'addition' | 'subtraction';

// --- Constants ---

const STONE_SIZE = 40;
const BOX_PADDING = 20;

// --- Components ---

interface StoneIconProps {
  stone: Stone;
  onDelete: () => void;
  onDragEnd: (x: number, y: number) => void;
  dragConstraints: React.RefObject<HTMLDivElement | null>;
  isDraggable: boolean;
  key?: string;
}

const StoneIcon = ({ 
  stone, 
  onDelete, 
  onDragEnd,
  dragConstraints,
  isDraggable 
}: StoneIconProps) => (
  <motion.div
    layout
    drag={isDraggable}
    dragConstraints={dragConstraints}
    dragElastic={0.1}
    dragMomentum={false}
    onDragEnd={(_, info) => {
      // info.point is global, we need relative to the container
      // But motion's drag updates the element's transform. 
      // To keep state in sync, we might need to calculate the final position.
      // However, for simplicity, we can just let motion handle the visual drag
      // and only update state if we really need to 'save' the position.
      // For this app, visual drag is likely enough unless we align later.
    }}
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1, x: stone.x, y: stone.y }}
    exit={{ scale: 0, opacity: 0 }}
    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    className="absolute group cursor-grab active:cursor-grabbing"
    style={{ touchAction: 'none' }}
  >
    <div
      className={`flex items-center justify-center rounded-full border-2 shadow-md ${
        stone.type === 'plus'
          ? 'bg-red-500 border-red-700 text-white'
          : 'bg-blue-500 border-blue-700 text-white'
      }`}
      style={{ width: STONE_SIZE, height: STONE_SIZE, fontSize: STONE_SIZE * 0.6, fontWeight: 'bold' }}
    >
      {stone.type === 'plus' ? '+' : '-'}
    </div>
    
    {/* Individual Delete Button */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      className="absolute -top-2 -right-2 bg-white text-slate-400 rounded-full p-0.5 shadow-sm border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
    >
      <Trash2 size={12} />
    </button>
  </motion.div>
);

export default function App() {
  const [mode, setMode] = useState<Mode>('general');
  const [isAligned, setIsAligned] = useState(false);
  const box1Ref = useRef<HTMLDivElement>(null);
  const box2Ref = useRef<HTMLDivElement>(null);

  // Box 1 stones
  const [stones1, setStones1] = useState<Stone[]>([]);
  // Box 2 stones (for addition/subtraction)
  const [stones2, setStones2] = useState<Stone[]>([]);

  // Calculate values
  const value1 = useMemo(() => {
    return stones1.reduce((acc, s) => acc + (s.type === 'plus' ? 1 : -1), 0);
  }, [stones1]);

  const value2 = useMemo(() => {
    return stones2.reduce((acc, s) => acc + (s.type === 'plus' ? 1 : -1), 0);
  }, [stones2]);

  // Align stones helper
  const getAlignedStones = useCallback((stones: Stone[]) => {
    const cols = 5;
    return stones.map((s, i) => ({
      ...s,
      x: (i % cols) * (STONE_SIZE + 10) + BOX_PADDING,
      y: Math.floor(i / cols) * (STONE_SIZE + 10) + BOX_PADDING,
    }));
  }, []);

  // Helper to add stones
  const addStone = (box: 1 | 2, type: StoneType | 'pair') => {
    const setStones = box === 1 ? setStones1 : setStones2;
    const currentStones = box === 1 ? stones1 : stones2;
    const boxWidth = 300;
    const boxHeight = 200;

    const getRandomPos = () => ({
      x: Math.random() * (boxWidth - STONE_SIZE - BOX_PADDING * 2) + BOX_PADDING,
      y: Math.random() * (boxHeight - STONE_SIZE - BOX_PADDING * 2) + BOX_PADDING,
    });

    let newStones: Stone[] = [];
    if (type === 'pair') {
      const pos1 = getRandomPos();
      const pos2 = { ...pos1, x: pos1.x + STONE_SIZE + 5 };
      newStones = [
        { id: Math.random().toString(36).substr(2, 9), type: 'plus', ...pos1 },
        { id: Math.random().toString(36).substr(2, 9), type: 'minus', ...pos2 },
      ];
    } else {
      newStones = [
        { id: Math.random().toString(36).substr(2, 9), type: type as StoneType, ...getRandomPos() },
      ];
    }

    setStones((prev) => {
      const combined = [...prev, ...newStones];
      return isAligned ? getAlignedStones(combined) : combined;
    });
  };

  const deleteStone = (box: 1 | 2, id: string) => {
    const setStones = box === 1 ? setStones1 : setStones2;
    setStones((prev) => {
      const filtered = prev.filter(s => s.id !== id);
      return isAligned ? getAlignedStones(filtered) : filtered;
    });
  };

  const clearBox = (box: 1 | 2) => {
    if (box === 1) setStones1([]);
    else setStones2([]);
  };

  const handleAlignToggle = () => {
    const nextAligned = !isAligned;
    setIsAligned(nextAligned);
    if (nextAligned) {
      setStones1(getAlignedStones(stones1));
      setStones2(getAlignedStones(stones2));
    }
  };

  // Mode change effect
  useEffect(() => {
    if (mode === 'addition' || mode === 'subtraction') {
      setIsAligned(true);
      setStones1(getAlignedStones(stones1));
      setStones2(getAlignedStones(stones2));
    } else {
      setIsAligned(false);
    }
  }, [mode]);

  // Addition Logic
  const handleAddition = async () => {
    if (stones2.length === 0) return;
    const offset = 350; 
    const newStonesFrom2 = stones2.map(s => ({
      ...s,
      x: s.x + offset,
    }));
    setStones1(prev => {
      const merged = [...prev, ...newStonesFrom2];
      return isAligned ? getAlignedStones(merged) : merged;
    });
    setStones2([]);
  };

  // Subtraction Logic
  const handleSubtraction = () => {
    if (stones2.length === 0) return;
    const plusNeeded = stones2.filter(s => s.type === 'plus').length;
    const minusNeeded = stones2.filter(s => s.type === 'minus').length;
    const plusAvailable = stones1.filter(s => s.type === 'plus').length;
    const minusAvailable = stones1.filter(s => s.type === 'minus').length;
    
    if (plusAvailable < plusNeeded || minusAvailable < minusNeeded) {
      const extraPlus = Math.max(0, plusNeeded - plusAvailable);
      const extraMinus = Math.max(0, minusNeeded - minusAvailable);
      const pairsNeeded = Math.max(extraPlus, extraMinus);
      alert(`뺄 돌이 부족합니다! 0의 쌍(±0)을 최소 ${pairsNeeded}개 더 추가해야 합니다.`);
      return;
    }

    let pToRemove = plusNeeded;
    let mToRemove = minusNeeded;
    setStones1(prev => {
      const filtered = prev.filter(s => {
        if (s.type === 'plus' && pToRemove > 0) {
          pToRemove--;
          return false;
        }
        if (s.type === 'minus' && mToRemove > 0) {
          mToRemove--;
          return false;
        }
        return true;
      });
      return isAligned ? getAlignedStones(filtered) : filtered;
    });
    setStones2([]);
  };

  // Combine Logic (Remove zero pairs)
  const handleCombine = () => {
    const pluses = stones1.filter(s => s.type === 'plus');
    const minuses = stones1.filter(s => s.type === 'minus');
    const pairsToRemove = Math.min(pluses.length, minuses.length);
    if (pairsToRemove === 0) return;

    let pCount = 0;
    let mCount = 0;
    setStones1(prev => {
      const filtered = prev.filter(s => {
        if (s.type === 'plus' && pCount < pairsToRemove) {
          pCount++;
          return false;
        }
        if (s.type === 'minus' && mCount < pairsToRemove) {
          mCount++;
          return false;
        }
        return true;
      });
      return isAligned ? getAlignedStones(filtered) : filtered;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <header className="max-w-5xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">중학 수학 셈돌 모델</h1>
        <p className="text-slate-600">정수의 덧셈과 뺄셈을 셈돌로 이해해 봅시다.</p>
      </header>

      {/* Mode Selector */}
      <nav className="max-w-5xl mx-auto mb-8 flex justify-center gap-2">
        {(['general', 'addition', 'subtraction'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              mode === m
                ? 'bg-indigo-600 text-white shadow-lg scale-105'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {m === 'general' ? '일반 모드' : m === 'addition' ? '덧셈 모드' : '뺄셈 모드'}
          </button>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 mb-8">
          {/* Box 1 */}
          <div className="flex flex-col items-center gap-4">
            <div className="text-2xl font-bold text-indigo-600 bg-indigo-50 px-4 py-1 rounded-lg border border-indigo-100">
              {value1 > 0 ? `+${value1}` : value1}
            </div>
            <div 
              ref={box1Ref}
              className="relative w-[320px] h-[240px] bg-white border-4 border-slate-200 rounded-2xl shadow-inner overflow-hidden"
            >
              <AnimatePresence>
                {stones1.map((stone) => (
                  <StoneIcon 
                    key={stone.id} 
                    stone={stone} 
                    onDelete={() => deleteStone(1, stone.id)}
                    onDragEnd={(x, y) => {}}
                    dragConstraints={box1Ref}
                    isDraggable={!isAligned}
                  />
                ))}
              </AnimatePresence>
            </div>
            <div className="flex gap-2">
              <button onClick={() => addStone(1, 'plus')} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors" title="+ 추가">
                <Plus size={24} />
              </button>
              <button onClick={() => addStone(1, 'minus')} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors" title="- 추가">
                <Minus size={24} />
              </button>
              <button 
                onClick={() => addStone(1, 'pair')} 
                className="flex items-center gap-1 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-bold border border-amber-200" 
                title="0의 쌍 추가"
              >
                <div className="flex -space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                </div>
                0의 쌍
              </button>
              <button onClick={() => clearBox(1)} className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 transition-colors" title="초기화">
                <Trash2 size={20} />
              </button>
            </div>
          </div>

          {/* Operator / Action */}
          <div className="flex flex-col items-center justify-center gap-4">
            {mode === 'addition' && (
              <button
                onClick={handleAddition}
                disabled={stones2.length === 0}
                className="group relative flex flex-col items-center justify-center"
              >
                <div className="text-7xl font-bold text-slate-300 group-hover:text-indigo-400 transition-colors cursor-pointer select-none">
                  +
                </div>
                <div className="absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 font-bold text-sm whitespace-nowrap">
                  더하기 클릭
                </div>
              </button>
            )}
            {mode === 'subtraction' && (
              <button
                onClick={handleSubtraction}
                disabled={stones2.length === 0}
                className="group relative flex flex-col items-center justify-center"
              >
                <div className="text-7xl font-bold text-slate-300 group-hover:text-rose-400 transition-colors cursor-pointer select-none">
                  -
                </div>
                <div className="absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity text-rose-600 font-bold text-sm whitespace-nowrap">
                  빼기 클릭
                </div>
              </button>
            )}
            {mode === 'general' && (
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleAlignToggle}
                  className={`p-3 rounded-xl shadow-md transition-all ${
                    isAligned ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'
                  }`}
                  title={isAligned ? "자유롭게 놓기" : "정렬하기"}
                >
                  {isAligned ? <MousePointer2 size={24} /> : <LayoutGrid size={24} />}
                </button>
                <button
                  onClick={handleCombine}
                  className="p-3 bg-white text-amber-600 rounded-xl shadow-md hover:bg-amber-50"
                  title="상쇄하기 (0의 쌍 제거)"
                >
                  <RotateCcw size={24} className="rotate-180" />
                </button>
                <button
                  onClick={() => { setStones1([]); setStones2([]); }}
                  className="p-3 bg-white text-slate-600 rounded-xl shadow-md hover:bg-slate-50"
                  title="전체 초기화"
                >
                  <Trash2 size={24} />
                </button>
              </div>
            )}
          </div>

          {/* Box 2 (Only for Addition/Subtraction) */}
          {(mode === 'addition' || mode === 'subtraction') && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-2xl font-bold text-indigo-600 bg-indigo-50 px-4 py-1 rounded-lg border border-indigo-100">
                {value2 > 0 ? `+${value2}` : value2}
              </div>
              <div 
                ref={box2Ref}
                className="relative w-[320px] h-[240px] bg-white border-4 border-slate-200 rounded-2xl shadow-inner overflow-hidden"
              >
                <AnimatePresence>
                  {stones2.map((stone) => (
                    <StoneIcon 
                      key={stone.id} 
                      stone={stone} 
                      onDelete={() => deleteStone(2, stone.id)}
                      onDragEnd={(x, y) => {}}
                      dragConstraints={box2Ref}
                      isDraggable={!isAligned}
                    />
                  ))}
                </AnimatePresence>
              </div>
              <div className="flex gap-2">
                <button onClick={() => addStone(2, 'plus')} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                  <Plus size={24} />
                </button>
                <button onClick={() => addStone(2, 'minus')} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors">
                  <Minus size={24} />
                </button>
                <button 
                  onClick={() => addStone(2, 'pair')} 
                  className="flex items-center gap-1 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-bold border border-amber-200"
                >
                  <div className="flex -space-x-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  </div>
                  0의 쌍
                </button>
                <button onClick={() => clearBox(2)} className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 transition-colors">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Expression Display */}
        {(mode === 'addition' || mode === 'subtraction') && (
          <div className="max-w-2xl mx-auto mb-8 bg-indigo-900 text-white p-6 rounded-2xl shadow-xl flex items-center justify-center gap-4 text-3xl font-mono">
            <span className="bg-indigo-800 px-4 py-2 rounded-lg">({value1 > 0 ? `+${value1}` : value1})</span>
            <span className="text-indigo-400">{mode === 'addition' ? '+' : '-'}</span>
            <span className="bg-indigo-800 px-4 py-2 rounded-lg">({value2 > 0 ? `+${value2}` : value2})</span>
            <span className="text-indigo-400">=</span>
            <span className="bg-amber-500 text-white px-6 py-2 rounded-lg shadow-inner">
              {mode === 'addition' ? (value1 + value2 > 0 ? `+${value1 + value2}` : value1 + value2) : (value1 - value2 > 0 ? `+${value1 - value2}` : value1 - value2)}
            </span>
          </div>
        )}

        {/* Instructions */}
        <section className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold mb-4 text-slate-800">도움말</h2>
          <ul className="space-y-2 text-slate-600 list-disc pl-5">
            {mode === 'general' && (
              <>
                <li><b>드래그</b>: 셈돌을 클릭해서 원하는 위치로 옮길 수 있습니다. (정렬 모드 해제 시)</li>
                <li><b>개별 삭제</b>: 셈돌 위에 마우스를 올리면 나타나는 <b>x</b> 버튼으로 돌을 하나씩 지울 수 있습니다.</li>
                <li><b>0의 쌍</b>: +와 -를 동시에 추가하여 정수의 뺄셈 준비를 돕습니다.</li>
                <li><b>상쇄</b>: 박스 안의 +와 -를 짝지어 제거합니다.</li>
              </>
            )}
            {mode === 'addition' && (
              <>
                <li>두 박스에 셈돌을 넣고 중앙의 <b>+ 기호</b>를 클릭하여 합쳐보세요.</li>
                <li>덧셈 모드에서는 셈돌이 항상 정렬된 상태로 유지됩니다.</li>
              </>
            )}
            {mode === 'subtraction' && (
              <>
                <li>중앙의 <b>- 기호</b>를 클릭하여 뺄셈을 실행하세요.</li>
                <li>뺄 돌이 부족하면 <b>0의 쌍</b> 버튼을 눌러 돌을 보충해야 합니다.</li>
              </>
            )}
          </ul>
        </section>
      </main>

      <footer className="mt-12 text-center text-slate-400 text-sm">
        &copy; 2026 중학 수학 셈돌 모델 시뮬레이터
      </footer>
    </div>
  );
}
