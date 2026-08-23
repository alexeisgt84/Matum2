import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useCategories } from '../../hooks/useCategories';
import type { Category } from '../../types/category';
import { Plus, Trash2, Edit2, Save, ArrowUp, ArrowDown, X, Folder, Check } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { CategoryIcon } from '../ui/CategoryIcon';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogId: string;
  onCategoriesChange?: () => void;
  onCategoryCreated?: (category: Category) => void;
  zIndex?: string;
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  catalogId,
  onCategoriesChange,
  onCategoryCreated,
  zIndex = 'z-50',
}) => {
  const {
    categories,
    loading,
    getCategories,
    saveCategory,
    deleteCategory,
    updateCategoriesOrder
  } = useCategories(catalogId);

  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('Folder'); // Icono por defecto (Lucide Folder)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('Folder');
  const [showEditIconPicker, setShowEditIconPicker] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Cargar categorías al abrir el modal
  useEffect(() => {
    if (isOpen && catalogId) {
      getCategories();
    }
  }, [isOpen, catalogId, getCategories]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const result = await saveCategory({
      name: newName,
      icon: newIcon || 'Folder',
      is_active: true
    });

    if (result) {
      setNewName('');
      setNewIcon('Folder');
      if (onCategoriesChange) onCategoriesChange();
      if (onCategoryCreated) onCategoryCreated(result);
    }
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon || 'Folder');
    setShowEditIconPicker(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditIcon('Folder');
    setShowEditIconPicker(false);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editName.trim()) return;

    const success = await saveCategory({
      name: editName,
      icon: editIcon || 'Folder'
    }, id);

    if (success) {
      setEditingId(null);
      setShowEditIconPicker(false);
      if (onCategoriesChange) onCategoriesChange();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    const success = await deleteCategory(categoryToDelete.id);
    if (success) {
      setCategoryToDelete(null);
      if (onCategoriesChange) onCategoriesChange();
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= categories.length) return;

    const reordered = [...categories];
    const temp = reordered[index];
    reordered[index] = reordered[nextIndex];
    reordered[nextIndex] = temp;

    await updateCategoriesOrder(reordered);
    if (onCategoriesChange) onCategoriesChange();
  };

  const popularIcons = [
    { label: 'Carpeta', value: 'Folder' },
    { label: 'Ropa', value: 'Shirt' },
    { label: 'Comida', value: 'Utensils' },
    { label: 'Pizza', value: 'Pizza' },
    { label: 'Café', value: 'Coffee' },
    { label: 'Hogar', value: 'Home' },
    { label: 'Móvil', value: 'Smartphone' },
    { label: 'Laptop', value: 'Laptop' },
    { label: 'Brillos', value: 'Sparkles' },
    { label: 'Corazón', value: 'Heart' },
    { label: 'Herramientas', value: 'Wrench' },
    { label: 'Coche', value: 'Car' },
    { label: 'Bolsa', value: 'ShoppingBag' },
    { label: 'Regalo', value: 'Gift' },
    { label: 'Libro', value: 'BookOpen' },
    { label: 'Gamepad', value: 'Gamepad2' },
    { label: 'Música', value: 'Music' },
    { label: 'Etiqueta', value: 'Tag' }
  ];

  const activeIcon = editingId !== null ? editIcon : newIcon;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Gestionar Categorías"
        zIndex={zIndex}
      >
        <div className="space-y-6">
          {/* Formulario para agregar nueva categoría */}
          <form onSubmit={handleAdd} className="space-y-4 bg-surface-hover/50 p-4 rounded-2xl border border-border">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
              Nueva Categoría
            </h3>
            
            <div className="flex gap-3 items-end">
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Icono</span>
                <div className="w-10 h-10 bg-background border border-border rounded-xl flex items-center justify-center text-[var(--accent)] shadow-inner">
                  <CategoryIcon name={newIcon} size={20} />
                </div>
              </div>
              <div className="flex-1">
                <Input
                  label="Nombre de Categoría"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Bebidas, Postres..."
                  required
                />
              </div>
              <Button
                type="submit"
                loading={loading}
                icon={Plus}
                className="h-10 px-4 mb-[2px]"
              >
                Añadir
              </Button>
            </div>

            {/* Selector de iconos sugeridos para nueva categoría */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                Selecciona un icono:
              </span>
              <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
                {popularIcons.map(icon => (
                  <button
                    key={icon.value}
                    type="button"
                    onClick={() => setNewIcon(icon.value)}
                    className={`h-8 rounded-lg flex items-center justify-center transition-all border ${
                      newIcon === icon.value 
                        ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)] scale-105 shadow-sm shadow-accent/10' 
                        : 'bg-background border-border hover:bg-surface-hover text-secondary hover:text-primary'
                    }`}
                    title={icon.label}
                  >
                    <CategoryIcon name={icon.value} size={15} />
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* Lista de categorías */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-secondary px-1">
              Categorías en el Catálogo ({categories.length})
            </h3>

            {loading && categories.length === 0 ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2 border border-dashed border-border rounded-2xl bg-surface-hover/20">
                <Folder size={32} className="text-gray-600" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sin categorías creadas</span>
                <p className="text-[10px] text-gray-500 max-w-[280px]">
                  Crea tu primera categoría usando el formulario de arriba para empezar a clasificar tus productos.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {categories.map((cat, index) => {
                  const isEditing = editingId === cat.id;

                  if (isEditing) {
                    return (
                      <div
                        key={cat.id}
                        className="p-3 border border-accent/40 rounded-xl bg-surface-hover/80 shadow-md space-y-2.5 transition-all animate-in fade-in duration-150"
                      >
                        <div className="flex items-center gap-2">
                          {/* Botón de icono editable */}
                          <div className="relative flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setShowEditIconPicker(prev => !prev)}
                              className="w-10 h-10 rounded-xl bg-background border-2 border-accent/60 flex items-center justify-center text-accent hover:border-accent transition-all shadow-inner active:scale-95"
                              title="Cambiar icono"
                            >
                              <CategoryIcon name={editIcon} size={18} />
                            </button>
                          </div>

                          {/* Campo de texto editable en línea */}
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveEdit(cat.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              placeholder="Nombre de la categoría"
                              className="w-full h-10 px-3 rounded-xl bg-background border border-accent/40 text-primary text-sm focus:outline-none focus:border-accent"
                              autoFocus
                            />
                          </div>

                          {/* Botones de acción en la misma fila */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Button
                              type="button"
                              onClick={() => handleSaveEdit(cat.id)}
                              loading={loading}
                              icon={Check}
                              className="h-10 px-3 text-xs"
                            >
                              <span className="hidden sm:inline">Guardar</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="h-10 px-2.5 border border-border"
                              title="Cancelar"
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        </div>

                        {/* Selector de icono desplegable en la fila */}
                        {showEditIconPicker && (
                          <div className="pt-2 border-t border-border/50 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">
                                Elige un icono para esta categoría:
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowEditIconPicker(false)}
                                className="text-[10px] text-accent hover:underline font-bold"
                              >
                                Ocultar
                              </button>
                            </div>
                            <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
                              {popularIcons.map(icon => (
                                <button
                                  key={icon.value}
                                  type="button"
                                  onClick={() => {
                                    setEditIcon(icon.value);
                                    setShowEditIconPicker(false);
                                  }}
                                  className={`h-8 rounded-lg flex items-center justify-center transition-all border ${
                                    editIcon === icon.value 
                                      ? 'bg-accent/15 border-accent text-accent scale-105 shadow-sm' 
                                      : 'bg-background border-border hover:bg-surface text-secondary hover:text-primary'
                                  }`}
                                  title={icon.label}
                                >
                                  <CategoryIcon name={icon.value} size={15} />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={cat.id}
                      className="p-3 border border-border bg-surface-hover/40 hover:bg-surface-hover rounded-xl flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-accent flex-shrink-0">
                          <CategoryIcon name={cat.icon} size={16} />
                        </div>
                        <span className="text-xs font-bold text-primary truncate">
                          {cat.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Ordenar */}
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Subir"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === categories.length - 1}
                          className="p-1.5 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Bajar"
                        >
                          <ArrowDown size={14} />
                        </button>

                        {/* Acciones */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 text-secondary hover:text-accent hover:bg-surface-hover rounded-lg transition-all ml-1"
                          title="Editar en esta fila"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoryToDelete(cat)}
                          className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Eliminar categoría"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Categoría"
        message={`¿Estás seguro de que deseas eliminar la categoría "${categoryToDelete?.name}"? Los productos asignados a ella quedarán sin categoría, pero no se eliminarán.`}
        variant="danger"
        confirmLabel="Eliminar"
      />
    </>
  );
};
