import { useState, useEffect, useRef } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { Plus, X, GripVertical, FolderPlus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface ServiceEntry {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Props {
  services: ServiceEntry[];
  onServicesChange: (services: ServiceEntry[]) => void;
  pageName: string;
}

export function ServiceSetupStep({ services, onServicesChange, pageName }: Props) {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const initialized = useRef(false);

  // Add a blank service on first render if empty
  useEffect(() => {
    if (!initialized.current && services.length === 0) {
      initialized.current = true;
      onServicesChange([
        { id: crypto.randomUUID(), name: '', description: '', category: 'General' },
      ]);
    }
  }, []);

  const allCategories = Array.from(
    new Set(['General', ...services.map(s => s.category), ...extraCategories])
  );

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (allCategories.includes(name)) {
      setNewCategoryName('');
      setShowCategoryInput(false);
      return;
    }
    setExtraCategories(prev => [...prev, name]);
    setNewCategoryName('');
    setShowCategoryInput(false);
  };

  const removeCategory = (category: string) => {
    onServicesChange(
      services.map(s =>
        s.category === category ? { ...s, category: 'General' } : s
      )
    );
    setExtraCategories(prev => prev.filter(c => c !== category));
  };

  const renameCategory = (oldName: string) => {
    const newName = editCategoryName.trim();
    if (!newName || newName === oldName) {
      setEditingCategory(null);
      return;
    }
    onServicesChange(
      services.map(s =>
        s.category === oldName ? { ...s, category: newName } : s
      )
    );
    setExtraCategories(prev => prev.map(c => c === oldName ? newName : c));
    setEditingCategory(null);
  };

  const addService = (category: string) => {
    onServicesChange([
      ...services,
      { id: crypto.randomUUID(), name: '', description: '', category },
    ]);
  };

  const updateService = (id: string, field: keyof ServiceEntry, value: string) => {
    onServicesChange(services.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeService = (id: string) => {
    onServicesChange(services.filter(s => s.id !== id));
  };

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceCategory = source.droppableId;
    const destCategory = destination.droppableId;

    // Build ordered lists per category
    const byCat: Record<string, ServiceEntry[]> = {};
    for (const cat of allCategories) {
      byCat[cat] = services.filter(s => s.category === cat);
    }

    // Remove from source
    const [moved] = byCat[sourceCategory].splice(source.index, 1);
    // Update category if moved between groups
    moved.category = destCategory;
    // Insert at destination
    byCat[destCategory].splice(destination.index, 0, moved);

    // Flatten back preserving order
    const reordered = allCategories.flatMap(cat => byCat[cat] || []);
    onServicesChange(reordered);
  };

  const servicesInCategory = (category: string) =>
    services.filter(s => s.category === category);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Set Up Services</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Add services to monitor for{' '}
            <span className="font-medium text-foreground">{pageName}</span>
          </p>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-5">
          {allCategories.map(category => (
            <div key={category} className="space-y-2">
              {/* Category header */}
              <div className="flex items-center justify-between">
                {editingCategory === category ? (
                  <Input
                    value={editCategoryName}
                    onChange={e => setEditCategoryName(e.target.value)}
                    onBlur={() => renameCategory(category)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') renameCategory(category);
                      if (e.key === 'Escape') setEditingCategory(null);
                    }}
                    autoFocus
                    className="h-6 text-xs font-semibold uppercase tracking-wider max-w-[200px] px-1 py-0"
                  />
                ) : (
                  <button
                    type="button"
                    className="group/cat flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-text"
                    onClick={() => {
                      setEditingCategory(category);
                      setEditCategoryName(category);
                    }}
                  >
                    {category}
                    <Pencil className="h-3 w-3 opacity-0 group-hover/cat:opacity-50 transition-opacity" />
                  </button>
                )}
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 px-2"
                    onClick={() => addService(category)}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Service
                  </Button>
                  {category !== 'General' && servicesInCategory(category).length === 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeCategory(category)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Droppable zone */}
              <Droppable droppableId={category}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[48px] rounded-lg border border-dashed transition-colors ${
                      snapshot.isDraggingOver
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border'
                    } ${servicesInCategory(category).length === 0 ? 'p-4' : 'p-2 space-y-2'}`}
                  >
                    {servicesInCategory(category).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center">
                        Drag services here or click Add
                      </p>
                    )}
                    {servicesInCategory(category).map((svc, idx) => (
                      <Draggable key={svc.id} draggableId={svc.id} index={idx}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className={`border border-border rounded-lg bg-card p-3 flex items-start gap-3 transition-shadow ${
                              dragSnapshot.isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''
                            }`}
                          >
                            <div
                              {...dragProvided.dragHandleProps}
                              tabIndex={-1}
                              className="mt-2.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing shrink-0"
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <div className="flex-1 flex items-baseline gap-3">
                              <Input
                                placeholder="Service name"
                                value={svc.name}
                                onChange={e =>
                                  updateService(svc.id, 'name', e.target.value)
                                }
                                className="max-w-[180px] shrink-0"
                              />
                              <Input
                                placeholder="Description (optional)"
                                value={svc.description}
                                onChange={e =>
                                  updateService(svc.id, 'description', e.target.value)
                                }
                                className="flex-1"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              tabIndex={-1}
                              className="h-7 w-7 shrink-0 mt-1 text-muted-foreground hover:text-destructive"
                              onClick={() => removeService(svc.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Add category */}
      <div className="pt-2">
        {showCategoryInput ? (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Category name"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCategory();
                }
              }}
              autoFocus
              className="max-w-[200px]"
            />
            <Button type="button" size="sm" onClick={addCategory}>
              Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCategoryInput(false);
                setNewCategoryName('');
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCategoryInput(true)}
            >
              <FolderPlus className="h-4 w-4 mr-1" /> Add Category
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addService(allCategories[0] || 'General')}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Service
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
