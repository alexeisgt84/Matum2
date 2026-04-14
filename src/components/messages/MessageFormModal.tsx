import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { RichTextarea } from '../ui/RichTextarea';
import type { WhatsAppMessage, MessageForm, MessageType } from '../../types/message';
import { Save, Clock, X, ImagePlus } from 'lucide-react';

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
  const [showSchedule, setShowSchedule] = useState(false);

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
      setShowSchedule(!!message.scheduled_time);
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
      setShowSchedule(false);
    }
  }, [message, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setForm({ ...form, type: 'image' });
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setForm({ ...form, image_url: null, type: 'text' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que haya al menos contenido o imagen
    if (!form.content?.trim() && !previewUrl && !imageFile) {
      alert('Por favor ingresa el contenido del mensaje o selecciona una imagen.');
      return;
    }

    // Auto-determine type based on image presence
    const finalForm = {
      ...form,
      type: (previewUrl || imageFile ? 'image' : 'text') as MessageType,
      scheduled_time: showSchedule ? form.scheduled_time : null,
    };
    const success = await onSave(finalForm, message?.id, imageFile || undefined);
    if (success) onClose();
  };

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
        <div className="space-y-5">
          {/* 1. Identificador del Mensaje */}
          <Input
            label="Identificador del Mensaje"
            placeholder="Ej: Mensaje de Bienvenida"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />

          {/* 2. Contenido del Mensaje */}
          <RichTextarea
            label="Contenido del Mensaje"
            placeholder="Escribe el cuerpo del mensaje..."
            value={form.content || ''}
            onChange={(val) => setForm({ ...form, content: val })}
            helperText="Selecciona texto para aplicar formato o usa el selector de emojis."
          />

          {/* 3. Imagen */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-500 uppercase tracking-widest block">Imagen</label>
            <div className="flex items-center gap-4">
              {previewUrl ? (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500/80 rounded-full text-white transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/10 hover:border-[#25D366]/30 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all hover:bg-white/5 flex-shrink-0">
                  <ImagePlus size={18} className="text-gray-500" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Subir</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
              )}
              <p className="text-[11px] text-gray-500 leading-relaxed italic flex-1">
                Opcional. Si agregas una imagen, el mensaje se enviará como imagen con el texto como descripción.
              </p>
            </div>
          </div>

          {/* 4. Comportamiento */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-500 uppercase tracking-widest block">Comportamiento</label>
            <label className="flex items-center gap-3 cursor-pointer group w-fit">
              <div 
                onClick={() => setForm({ 
                  ...form, 
                  is_sequence: !form.is_sequence,
                  is_individual: form.is_sequence // Si estaba en secuencia, ahora es individual (true)
                })}
                className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                  form.is_sequence ? 'bg-[#25D366] border-[#25D366]' : 'bg-white/5 border-white/10'
                }`}
              >
                {form.is_sequence && <div className="w-2 h-2 bg-black rounded-full" />}
              </div>
              <span className="text-sm text-gray-300">Incluir en Secuencia</span>
            </label>
          </div>


          {/* 5. Toggle Hora de Envío */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">Hora de Envío</label>
              <button
                type="button"
                onClick={() => {
                  setShowSchedule(!showSchedule);
                  if (showSchedule) {
                    setForm({ ...form, scheduled_time: null });
                  }
                }}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                  showSchedule ? 'bg-[#25D366]' : 'bg-white/10'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${
                    showSchedule ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
            {showSchedule && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <Input
                  type="time"
                  value={form.scheduled_time || ''}
                  onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
                  icon={Clock}
                  helperText="A qué hora debe enviarse este mensaje"
                />
              </div>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
