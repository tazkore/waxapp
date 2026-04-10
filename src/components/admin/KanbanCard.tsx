import { motion, AnimatePresence } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  GripVertical,
  User,
} from 'lucide-react';

interface ChecklistItem {
  text: string;
  done: boolean;
}

export interface StaffTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  assigned_avatar: string | null;
  order_id: string | null;
  checklist: ChecklistItem[];
  created_at: string;
  updated_at: string;
}

export const priorityConfig: Record<string, { label: string; className: string }> = {
  normal: { label: 'Normal', className: 'bg-primary/20 text-primary border-primary/30' },
  alta: { label: 'Alta', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  urgente: { label: 'Urgente', className: 'bg-destructive/20 text-destructive border-destructive/30' },
};

interface KanbanCardProps {
  task: StaffTask;
  isExpanded: boolean;
  onToggleChecklist: (taskId: string) => void;
  onToggleChecklistItem: (task: StaffTask, index: number) => void;
  columns: { key: string; label: string }[];
  currentColumnKey: string;
  onMoveTask: (task: StaffTask, newStatus: string) => void;
}

const KanbanCard = ({
  task,
  isExpanded,
  onToggleChecklist,
  onToggleChecklistItem,
  columns,
  currentColumnKey,
  onMoveTask,
}: KanbanCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const pCfg = priorityConfig[task.priority] || priorityConfig.normal;
  const checklistDone = task.checklist.filter((c) => c.done).length;

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`border-border bg-card hover:border-primary/30 transition-colors ${isDragging ? 'shadow-lg shadow-primary/20' : ''}`}>
        <CardContent className="p-4 space-y-3">
          {/* Drag handle + Title & Priority */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <button
                {...attributes}
                {...listeners}
                className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                {task.order_id && (
                  <span className="text-[10px] font-mono text-primary/70">#{task.order_id}</span>
                )}
                <h4 className="text-sm font-medium text-foreground leading-tight truncate">{task.title}</h4>
              </div>
            </div>
            <Badge variant="outline" className={`text-[10px] shrink-0 ${pCfg.className}`}>
              {pCfg.label}
            </Badge>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          )}

          {task.assigned_to && (
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-3 w-3 text-primary" />
              </div>
              <span className="text-[11px] text-muted-foreground">{task.assigned_to}</span>
            </div>
          )}

          {task.checklist.length > 0 && (
            <div>
              <button
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                onClick={() => onToggleChecklist(task.id)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{checklistDone}/{task.checklist.length} subtareas</span>
                {isExpanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-1.5 pl-1">
                      {task.checklist.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => onToggleChecklistItem(task, idx)}
                        >
                          <Checkbox checked={item.done} className="h-3.5 w-3.5" />
                          <span className={`text-xs ${item.done ? 'line-through text-muted-foreground/60' : 'text-foreground'}`}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Move actions */}
          <div className="flex gap-1 pt-1">
            {columns.filter((c) => c.key !== currentColumnKey).map((target) => (
              <Button
                key={target.key}
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                onClick={() => onMoveTask(task, target.key)}
              >
                → {target.label.split('/')[0]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KanbanCard;
