import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Loader2,
  AlertTriangle,
  Clock,
  Package,
  GripVertical,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard, { type StaffTask, priorityConfig } from './KanbanCard';

interface ChecklistItem {
  text: string;
  done: boolean;
}

const COLUMNS = [
  { key: 'pendiente', label: 'Pendiente', icon: Clock, color: 'text-muted-foreground' },
  { key: 'en_proceso', label: 'En Proceso', icon: GripVertical, color: 'text-primary' },
  { key: 'empacado', label: 'Empacado/Enviado', icon: Package, color: 'text-primary' },
  { key: 'problema', label: 'Problema/Revisión', icon: AlertTriangle, color: 'text-amber-400' },
];

const PIPELINE_STAGES = [
  { label: 'Nueva Orden', key: 'nueva' },
  { label: 'Verificación Legal', key: 'verificacion' },
  { label: 'Almacén', key: 'almacen' },
  { label: 'Despacho', key: 'despacho' },
];

const STAFF_MEMBERS = ['Ana López', 'Carlos Ruiz', 'María García', 'Jorge Mendoza'];

const DroppableColumn = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`space-y-3 min-h-[200px] rounded-lg p-1 transition-colors ${isOver ? 'bg-primary/5 ring-2 ring-primary/20' : ''}`}
    >
      {children}
    </div>
  );
};

const OperationsSection = () => {
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedChecklist, setExpandedChecklist] = useState<Set<string>>(new Set());
  const [activeTask, setActiveTask] = useState<StaffTask | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'normal',
    assigned_to: '',
    order_id: '',
    status: 'pendiente',
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('staff_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar las tareas.', variant: 'destructive' });
    } else {
      setTasks(
        (data || []).map((t) => ({
          ...t,
          checklist: (Array.isArray(t.checklist) ? t.checklist : []) as unknown as ChecklistItem[],
        })) as unknown as StaffTask[]
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast({ title: 'Error', description: 'El título es requerido.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('staff_tasks').insert({
      title: newTask.title,
      description: newTask.description || null,
      priority: newTask.priority,
      assigned_to: newTask.assigned_to || null,
      order_id: newTask.order_id || null,
      status: newTask.status,
      checklist: [],
    });
    if (error) {
      toast({ title: 'Error', description: 'No se pudo crear la tarea.', variant: 'destructive' });
    } else {
      toast({ title: 'Tarea creada', description: `"${newTask.title}" agregada al tablero.` });
      setNewTask({ title: '', description: '', priority: 'normal', assigned_to: '', order_id: '', status: 'pendiente' });
      setModalOpen(false);
      fetchTasks();
    }
    setSaving(false);
  };

  const moveTask = async (task: StaffTask, newStatus: string) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    const { error } = await supabase.from('staff_tasks').update({ status: newStatus }).eq('id', task.id);
    if (error) fetchTasks();
  };

  const toggleChecklistItem = async (task: StaffTask, index: number) => {
    const updated = [...task.checklist];
    updated[index] = { ...updated[index], done: !updated[index].done };
    await supabase.from('staff_tasks').update({ checklist: updated as unknown as null }).eq('id', task.id);
    fetchTasks();
  };

  const toggleChecklist = (taskId: string) => {
    setExpandedChecklist((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const overId = over.id as string;
    // Check if dropping over a column
    const overColumn = COLUMNS.find((c) => c.key === overId);
    if (overColumn) {
      const activeTaskItem = tasks.find((t) => t.id === active.id);
      if (activeTaskItem && activeTaskItem.status !== overColumn.key) {
        setTasks((prev) =>
          prev.map((t) => (t.id === active.id ? { ...t, status: overColumn.key } : t))
        );
      }
      return;
    }

    // Dropping over another task
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      const activeTaskItem = tasks.find((t) => t.id === active.id);
      if (activeTaskItem && activeTaskItem.status !== overTask.status) {
        setTasks((prev) =>
          prev.map((t) => (t.id === active.id ? { ...t, status: overTask.status } : t))
        );
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active } = event;
    setActiveTask(null);

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    // Persist the new status
    const { error } = await supabase.from('staff_tasks').update({ status: task.status }).eq('id', task.id);
    if (error) fetchTasks();
  };

  // Detect bottleneck
  const bottleneckStage = (() => {
    const counts: Record<string, number> = { nueva: 0, verificacion: 0, almacen: 0, despacho: 0 };
    tasks.forEach((t) => {
      if (t.status === 'pendiente') counts.nueva++;
      else if (t.status === 'en_proceso') counts.verificacion++;
      else if (t.status === 'empacado') counts.almacen++;
      else if (t.status === 'problema') counts.despacho++;
    });
    return Object.entries(counts).reduce((a, b) => (b[1] > a[1] ? b : a), ['nueva', 0])[0];
  })();

  const tasksByStatus = (status: string) => tasks.filter((t) => t.status === status);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Centro de Operaciones</h1>
          <p className="text-muted-foreground text-sm">Gestión de tareas internas y flujo de trabajo del equipo.</p>
        </div>
        <Button className="gap-2" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Nueva Tarea Interna
        </Button>
      </div>

      {/* Pipeline Flow */}
      <Card className="border-border bg-card overflow-hidden">
        <CardContent className="p-6">
          <p className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">Pipeline de Operaciones</p>
          <div className="flex items-center justify-between gap-2">
            {PIPELINE_STAGES.map((stage, i) => {
              const isBottleneck = stage.key === bottleneckStage;
              return (
                <div key={stage.key} className="flex items-center flex-1">
                  <motion.div
                    className={`flex-1 rounded-lg border-2 px-4 py-3 text-center transition-all ${
                      isBottleneck
                        ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(0,230,118,0.2)]'
                        : 'border-border bg-muted/30'
                    }`}
                    animate={isBottleneck ? { boxShadow: ['0 0 10px rgba(0,230,118,0.1)', '0 0 25px rgba(0,230,118,0.3)', '0 0 10px rgba(0,230,118,0.1)'] } : {}}
                    transition={isBottleneck ? { duration: 2, repeat: Infinity } : {}}
                  >
                    <span className={`text-xs font-semibold ${isBottleneck ? 'text-primary' : 'text-muted-foreground'}`}>
                      {stage.label}
                    </span>
                    {isBottleneck && (
                      <p className="text-[10px] text-primary/70 mt-0.5">⚡ Cuello de botella</p>
                    )}
                  </motion.div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div className="mx-1 text-xs font-bold text-muted-foreground/50">➔</div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = tasksByStatus(col.key);
            const ColIcon = col.icon;
            return (
              <div key={col.key} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <ColIcon className={`h-4 w-4 ${col.color}`} />
                  <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{colTasks.length}</Badge>
                </div>
                <DroppableColumn id={col.key}>
                  <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <AnimatePresence>
                      {colTasks.map((task) => (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
                          <KanbanCard
                            task={task}
                            isExpanded={expandedChecklist.has(task.id)}
                            onToggleChecklist={toggleChecklist}
                            onToggleChecklistItem={toggleChecklistItem}
                            columns={COLUMNS}
                            currentColumnKey={col.key}
                            onMoveTask={moveTask}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </SortableContext>
                </DroppableColumn>
              </div>
            );
          })}
        </div>

        {/* Drag overlay for smooth visual feedback */}
        <DragOverlay>
          {activeTask && (
            <div className="opacity-90 rotate-2 w-[280px]">
              <Card className="border-primary/40 bg-card shadow-xl shadow-primary/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-foreground truncate">{activeTask.title}</h4>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${(priorityConfig[activeTask.priority] || priorityConfig.normal).className}`}>
                      {(priorityConfig[activeTask.priority] || priorityConfig.normal).label}
                    </Badge>
                  </div>
                  {activeTask.assigned_to && (
                    <p className="text-[11px] text-muted-foreground mt-2">{activeTask.assigned_to}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* New Task Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Tarea Interna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs">Título *</Label>
              <Input
                placeholder="Ej: Hacer inventario físico de vapes"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Descripción</Label>
              <Textarea
                placeholder="Detalles adicionales..."
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Prioridad</Label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">🟢 Normal</SelectItem>
                    <SelectItem value="alta">🟡 Alta</SelectItem>
                    <SelectItem value="urgente">🔴 Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Columna</Label>
                <Select value={newTask.status} onValueChange={(v) => setNewTask({ ...newTask, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Asignar a</Label>
                <Select value={newTask.assigned_to} onValueChange={(v) => setNewTask({ ...newTask, assigned_to: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {STAFF_MEMBERS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">ID Pedido (opcional)</Label>
                <Input
                  placeholder="WX-XXXX"
                  value={newTask.order_id}
                  onChange={(e) => setNewTask({ ...newTask, order_id: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <Button className="w-full gap-2" onClick={handleCreateTask} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear Tarea
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OperationsSection;
