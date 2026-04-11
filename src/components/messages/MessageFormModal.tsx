import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { WhatsAppMessage, MessageForm, MessageType } from '../../types/message';
import { Save, Clock, Type, AlignLeft } from 'lucide-react';

interface MessageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: MessageForm, id?: string, file?: File) => Promise<boolean>;
  message?: WhatsAppMessage | null;
  loading?: boolean;
}

export const MessageFormModal: React.FC<MessageFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  message,
  loading = false,
}) => {
  const [form, setForm] = useState<MessageForm>({
    name: '',
    content: '',
    type: 'text',
    is_individual: true,
    is_sequence: false,
    scheduled_at: null,
    scheduled_time: null,
    image_url: null,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      setForm({
        name: message.name,
        content: message.content,
        type: message.type,
        is_individual: message.is_individual ?? true,
        is_sequence: message.is_sequence ?? false,
        scheduled_at: message.scheduled_at,
        scheduled_time: message.scheduled_time,
        image_url: message.image_url,
      });
      setPreviewUrl(message.image_url || null);
    } else {
      setForm({ 
        name: '', 
        content: '', 
        type: 'text', 
        is_individual: true,
        is_sequence: false,
        scheduled_at: null,
        scheduled_time: null,
        image_url: null,
      });
      setPreviewUrl(null);
      setImageFile(null);
    }
  }, [message, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave(form, message?.id, imageFile || undefined);
    if (success) onClose();
  };

  const types: { value: MessageType; label: string }[] = [
    { value: 'text', label: 'Texto' },
    { value: 'image', label: 'Imagen' },
    { value: 'button', label: 'Botón' },
    { value: 'product', label: 'Producto' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={message ? 'Editar Mensaje' : 'Nuevo Mensaje'}
      footer={
        <Button 
          type="submit" 
          form="message-form"
          className="w-full" 
          loading={loading}
          icon={Save}
        >
          {message ? 'Guardar Cambios' : 'Crear Mensaje'}
        </Button>
      }
    >
      <form id="message-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Identificador del Mensaje"
            placeholder="Ej: Mensaje de Bienvenida"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />

          <div>
            <label className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 block">Tipo de Mensaje</label>
            <div className="grid grid-cols-2 gap-2">
              {types.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: type.value })}
                  className={`py-2 px-4 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                    form.type === type.value
                      ? 'bg-[#25D366]/10 border-[#25D366]/30 text-[#25D366]'
                      : 'bg-white/5 border-transparent text-gray-500 hover:text-white'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">Comportamiento</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div 
                  onClick={() => setForm({ ...form, is_individual: !form.is_individual })}
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                    form.is_individual ? 'bg-[#25D366] border-[#25D366]' : 'bg-white/5 border-white/10'
                  }`}
                >
                  {form.is_individual && <div className="w-2 h-2 bg-black rounded-full" />}
                </div>
                <span className="text-sm text-gray-300">Mensaje Individual</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div 
                  onClick={() => setForm({ ...form, is_sequence: !form.is_sequence })}
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                    form.is_sequence ? 'bg-[#25D366] border-[#25D366]' : 'bg-white/5 border-white/10'
                  }`}
                >
                  {form.is_sequence && <div className="w-2 h-2 bg-black rounded-full" />}
                </div>
                <span className="text-sm text-gray-300">En Secuencia</span>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-gray-400 uppercase tracking-widest block">Imagen Asociada</label>
            <div className="flex items-center gap-4">
              {previewUrl ? (
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/10">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setPreviewUrl(null);
                      setForm({ ...form, image_url: null });
                    }}
                    className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black rounded-full text-white transition-all"
                  >
                    <Save size={12} className="rotate-45" /> {/* Use X icon if available */}
                  </button>
                </div>
              ) : (
                <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-white/10 hover:border-[#25D366]/30 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-white/5">
                  <Save size={20} className="text-gray-500" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Subir</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
              )}
              <div className="flex-1">
                <p className="text-[11px] text-gray-500 leading-relaxed italic">
                  Las imágenes ayudan a captar la atención. Si se envía como secuencia del catálogo, se usará para promocionar productos.
                </p>
              </div>
            </div>
          </div>

          <Input
            label="Contenido del Mensaje"
            placeholder="Escribe el cuerpo del mensaje..."
            multiline
            rows={5}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            helperText="Usa *negrita*, _cursiva_ y emojis."
          />

          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Hora de Envío"
              type="time"
              value={form.scheduled_time || ''}
              onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
              icon={Clock}
              helperText="A qué hora debe enviarse este mensaje"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
