import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Product, ProductForm } from '../../types/product';
import { Camera, Save, Tag } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: ProductForm, id?: string, file?: File) => Promise<boolean>;
  product?: Product | null;
  loading?: boolean;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
  loading = false,
}) => {
  const [form, setForm] = useState<ProductForm>({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    imagen_url: null,
  });
  const [file, setFile] = useState<File | undefined>();
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description || '',
        price: product.price?.toString() || '',
        currency: product.currency || 'USD',
        imagen_url: product.imagen_url,
      });
      setPreview(product.imagen_url);
    } else {
      setForm({ name: '', description: '', price: '', currency: 'USD', imagen_url: null });
      setPreview(null);
      setFile(undefined);
    }
  }, [product, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave(form, product?.id, file);
    if (success) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Editar Producto' : 'Nuevo Producto'}
      footer={
        <Button 
          type="submit" 
          form="product-form"
          className="w-full" 
          loading={loading}
          icon={Save}
        >
          {product ? 'Guardar Cambios' : 'Añadir Producto'}
        </Button>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center mb-4">
          <div 
            className="w-32 h-32 rounded-2xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center relative overflow-hidden group hover:border-[#25D366]/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-[#25D366]">
                <Camera size={32} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Añadir Foto</span>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Nombre del Producto"
            placeholder="Ej: Pizza Margherita"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input
                label="Precio"
                type="number"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                icon={Tag}
              />
            </div>
            <div>
              <div className="w-full space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">Moneda</label>
                <select
                  className="w-full h-[58px] bg-[#1a1a1a] border border-white/5 rounded-xl px-4 text-white outline-none focus:border-[#25D366] appearance-none cursor-pointer"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  <option value="USD">USD</option>
                  <option value="CUP">CUP</option>
                  <option value="MLC">MLC</option>
                </select>
              </div>
            </div>
          </div>

          <Input
            label="Descripción (Opcional)"
            placeholder="Ej: Salsa de tomate, mozzarella y albahaca fresca"
            multiline
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </form>
    </Modal>
  );
};
