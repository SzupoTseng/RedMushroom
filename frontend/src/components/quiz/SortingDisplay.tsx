import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { Question } from '../../types';
import { BpmfLabel } from '../common/ZhuyinText';

interface Props {
  question: Question;
  onConfirm: (answer: string) => void;
  disabled: boolean;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SortingDisplay({ question, onConfirm, disabled }: Props) {
  // Shuffle tiles so the correct order isn't shown by default.
  // Correct answer is always the KEY sequence '1,2,3,4'; tile LABELS vary per question.
  // The parent passes key={question.question_id} so this component remounts per question,
  // but useEffect guards against any edge case where key is omitted.
  const makeInitial = () => shuffleArray(
    Object.keys(question.options).map((k) => ({
      id: k,
      label: question.options[k],
      zhuyin: question.options_zhuyin?.[k],
    }))
  );
  const [items, setItems] = useState(makeInitial);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || disabled) return;
    const reordered = [...items];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setItems(reordered);
  };

  const handleConfirm = () => {
    const answer = items.map((i) => i.id).join(',');
    onConfirm(answer);
  };

  return (
    <div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="sorting">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={disabled}>
                  {(prov, snap) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      {...prov.dragHandleProps}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 bg-white
                        transition-shadow cursor-grab active:cursor-grabbing
                        ${snap.isDragging ? 'border-mushroom-400 shadow-lg' : 'border-gray-200'}`}
                    >
                      <span className="text-gray-300 text-lg">⠿</span>
                      <BpmfLabel text={item.label} zhuyin={item.zhuyin} className="text-lg font-semibold" />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <button
        onClick={handleConfirm}
        disabled={disabled}
        className="btn-primary w-full mt-6 text-lg"
      >
        確認順序 ✓
      </button>
    </div>
  );
}
