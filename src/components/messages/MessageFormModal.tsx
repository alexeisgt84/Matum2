import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { RichTextarea } from '../ui/RichTextarea';
import type { WhatsAppMessage, MessageForm, MessageType } from '../../types/message';
import { Save, Clock, X, ImagePlus, Sparkles, Crown, Plus } from 'lucide-react';
import heic2any from 'heic2any';
import { toast } from 'react-hot-toast';
import { useProfile } from '../../hooks/useProfile';
import { useEvolution } from '../../hooks/useEvolution';
import { analyzeProductImage } from '../../lib/aiService';


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
  const { profile } = useProfile();
  const { catalogId } = useParams<{ catalogId: string }>();
  const { instance } = useEvolution(catalogId);
  const hasInstance = instance?.status === 'connected';

  const [form, setForm] = useState<MessageForm>({
    name: '',
    content: '',
    type: 'text',
    is_individual: true,
    is_sequence: false,
    scheduled_at: null,
    scheduled_time: null,
    image_url: null,
    schedule_type: 'fixed',
    schedule_interval: 30,
    fixed_schedules: [],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [newTime, setNewTime] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isPremium = profile?.plan === 'premium';

  const runAIAnalysis = async () => {
    let fileToAnalyze: File | Blob | null = imageFile;

    // Si no hay archivo local pero hay una URL de preview remota
    if (!fileToAnalyze && previewUrl) {
      setIsAnalyzing(true);
      const toastId = toast.loading('Descargando imagen para análisis...');
      try {
        const response = await fetch(previewUrl);
        const blob = await response.blob();
        fileToAnalyze = blob;
        toast.dismiss(toastId);
      } catch (err) {
        console.error("Error al descargar la imagen remota:", err);
        toast.error('No se pudo recuperar la imagen remota para analizarla.', { id: toastId });
        setIsAnalyzing(false);
        return;
      }
    }

    if (!fileToAnalyze) {
      toast.error('Por favor, selecciona una imagen primero.');
      return;
    }

    if (!profile?.gemini_api_key || profile.gemini_api_key.trim() === '') {
      toast.error('Configura tu API Key de Gemini en tu perfil para usar la IA.');
      return;
    }

    setIsAnalyzing(true);
    const toastId = toast.loading('IA redactando el mensaje...');
    try {
      const result = await analyzeProductImage(fileToAnalyze);
      
      setForm(prev => ({
        ...prev,
        name: result.title,
        content: result.description
      }));
      
      toast.success('¡Mensaje redactado por la IA! ✨', { id: toastId });
    } catch (err: any) {
      console.error("AI Analysis failed:", err);
      if (err.message?.includes('NO_API_KEY')) {
        toast.error('Configura tu API Key en tu perfil para usar la IA.', { id: toastId });
      } else {
        toast.error('No se pudo redactar el mensaje con IA', { id: toastId });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAIClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isPremium) {
      toast.error('👑 Esta función es exclusiva para usuarios Premium. ¡Actualiza tu plan en tu perfil!', { duration: 5000 });
      return;
    }
    runAIAnalysis();
  };

  useEffect(() => {
    if (message) {
      let fixedSchedules = message.fixed_schedules || [];
      if (fixedSchedules.length === 0 && message.scheduled_time) {
        fixedSchedules = [{ time: message.scheduled_time }];
      }
      setForm({
        name: message.name,
        content: message.content,
        type: message.type,
        is_individual: hasInstance ? (message.is_individual ?? true) : true,
        is_sequence: hasInstance ? (message.is_sequence ?? false) : false,
        scheduled_at: hasInstance ? message.scheduled_at : null,
        scheduled_time: hasInstance ? message.scheduled_time : null,
        image_url: message.image_url,
        schedule_type: hasInstance ? (message.schedule_type || 'fixed') : 'fixed',
        schedule_interval: hasInstance ? (message.schedule_interval ?? 30) : 30,
        fixed_schedules: hasInstance ? fixedSchedules : [],
      });
      setPreviewUrl(message.image_url || null);
      setShowSchedule(hasInstance && (!!message.schedule_interval || fixedSchedules.length > 0 || !!message.scheduled_time));
      setNewTime('');
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
        schedule_type: 'fixed',
        schedule_interval: 30,
        fixed_schedules: [],
      });
      setPreviewUrl(null);
      setImageFile(null);
      setShowSchedule(false);
      setNewTime('');
    }
  }, [message, isOpen, hasInstance]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      let fileToProcess = file;
      const fileName = file.name || 'image.jpg';
      const extension = fileName.split('.').pop()?.toLowerCase();

      // Soporte HEIC
      if (file.type === 'image/heic' || file.type === 'image/heif' || extension === 'heic' || extension === 'heif') {
        setIsConverting(true);
        const toastId = toast.loading('Convirtiendo formato de iPhone...');
        try {
          const converted = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.8
          });
          fileToProcess = (Array.isArray(converted) ? converted[0] : converted) as File;
          if (!(fileToProcess instanceof File)) {
            fileToProcess = new File([fileToProcess], fileName.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
          }
          toast.success('Imagen convertida', { id: toastId });
        } catch (err) {
          console.error('Error al convertir HEIC:', err);
          toast.error('No se pudo convertir el formato HEIC', { id: toastId });
        } finally {
          setIsConverting(false);
        }
      }

      setImageFile(fileToProcess as File);
      setPreviewUrl(URL.createObjectURL(fileToProcess));
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

    // Si la programación está activada, validar según el tipo
    if (showSchedule && !form.is_sequence) {
      if (form.schedule_type === 'fixed' && (!form.fixed_schedules || form.fixed_schedules.length === 0)) {
        toast.error('Agrega al menos un horario para la programación.');
        return;
      }
      if (form.schedule_type === 'interval' && (!form.schedule_interval || form.schedule_interval <= 0)) {
        toast.error('Especifica un intervalo válido en minutos.');
        return;
      }
    }

    const firstFixedTime = form.fixed_schedules && form.fixed_schedules.length > 0 
      ? form.fixed_schedules[0].time 
      : null;

    // Auto-determine type based on image presence
    const finalForm = {
      ...form,
      type: (previewUrl || imageFile ? 'image' : 'text') as MessageType,
      scheduled_time: showSchedule ? (form.schedule_type === 'fixed' ? firstFixedTime : null) : null,
      schedule_type: showSchedule ? form.schedule_type : null,
      schedule_interval: showSchedule && form.schedule_type === 'interval' ? form.schedule_interval : null,
      fixed_schedules: showSchedule && form.schedule_type === 'fixed' ? form.fixed_schedules : [],
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
          
          <div className="relative space-y-5 p-1">
            {/* Overlay de Carga Premium de la IA */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px] z-20 rounded-2xl flex flex-col items-center justify-center border border-purple-500/20 shadow-2xl p-6">
                <div className="p-3.5 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 text-purple-400 rounded-2xl border border-purple-500/30 mb-3 shadow-lg shadow-purple-500/10 animate-bounce">
                  <Sparkles size={26} className="animate-pulse" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-widest bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  La IA está redactando tu mensaje...
                </span>
                <span className="text-[10px] text-gray-400 mt-1.5 tracking-wide text-center max-w-[280px]">
                  Analizando la imagen para crear un identificador y cuerpo de mensaje vendedor
                </span>
              </div>
            )}

            {/* 1. Imagen (Primero) */}
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
                      disabled={isAnalyzing}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/10 hover:border-[var(--accent)]/30 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all hover:bg-white/5 flex-shrink-0 relative overflow-hidden">
                    {isConverting ? (
                      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ImagePlus size={18} className="text-gray-500" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Subir</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,image/*" onChange={handleImageChange} disabled={isConverting || isAnalyzing} />
                  </label>
                )}
                <div className="flex-1 space-y-2">
                  <p className="text-[11px] text-gray-500 leading-relaxed italic">
                    Opcional. Si agregas una imagen, el mensaje se enviará como imagen con el texto como descripción.
                  </p>
                  
                  {/* Botón premium de Redactar con IA que aparece al subir imagen y si la IA está configurada */}
                  {previewUrl && profile?.gemini_api_key && (
                    <div className="pt-1">
                      {isPremium ? (
                        <button
                          type="button"
                          onClick={handleAIClick}
                          disabled={isAnalyzing}
                          className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md shadow-purple-500/10 active:scale-95 transition-all"
                        >
                          <Sparkles size={13} className="text-purple-200 animate-pulse" />
                          <span>Redactar con IA ✨</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleAIClick}
                          className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 transition-all"
                        >
                          <Crown size={13} className="text-amber-400" />
                          <span>Redactar con IA (Premium 👑)</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Banner descriptivo si no hay imagen seleccionada y si la IA está configurada */}
                  {!previewUrl && profile?.gemini_api_key && (
                    <div className="py-1.5 px-3.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-[9px] text-emerald-400 font-medium flex items-center gap-1.5 w-fit">
                      <Sparkles size={11} className="text-emerald-400 animate-pulse" />
                      <span>Sube una imagen para habilitar la IA ✨</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Identificador del Mensaje (Segundo) */}
            <Input
              label="Identificador del Mensaje"
              placeholder="Ej: Mensaje de Bienvenida"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus={!message}
              disabled={isAnalyzing}
            />

            {/* 3. Contenido del Mensaje (Tercero) */}
            <RichTextarea
              label="Contenido del Mensaje"
              placeholder="Escribe el cuerpo del mensaje..."
              value={form.content || ''}
              onChange={(val) => setForm({ ...form, content: val })}
              helperText="Selecciona texto para aplicar formato o usa el selector de emojis."
              disabled={isAnalyzing}
            />
          </div>

          {/* 4. Comportamiento y Programación (solo si hay WhatsApp conectado) */}
          {hasInstance && (
            <>
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
                      form.is_sequence ? 'bg-[var(--accent)] border-[var(--accent)]' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    {form.is_sequence && <div className="w-2 h-2 bg-black rounded-full" />}
                  </div>
                  <span className="text-sm text-gray-300">Incluir en Secuencia</span>
                </label>
              </div>

              {/* 5. Programación de Envío (solo para mensajes individuales / fuera de secuencia) */}
              {!form.is_sequence && (
                <div className="space-y-4 p-4 rounded-2xl bg-white/5 border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-bold text-gray-300 uppercase tracking-widest">Programar Envío</label>
                      <p className="text-[10px] text-gray-500">Configura cuándo se publicará este mensaje automáticamente</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSchedule(!showSchedule);
                      }}
                      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                        showSchedule ? 'bg-[var(--accent)]' : 'bg-white/10'
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
                    <div className="space-y-4 pt-2 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                      {/* Selector de Tipo de Programación */}
                      <div className="flex p-1 bg-black/30 rounded-xl border border-white/5">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, schedule_type: 'fixed' })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                            form.schedule_type === 'fixed'
                              ? 'bg-[var(--accent)] text-black shadow-md'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Horarios Fijos
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, schedule_type: 'interval' })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                            form.schedule_type === 'interval'
                              ? 'bg-[var(--accent)] text-black shadow-md'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Intervalo
                        </button>
                      </div>

                      {/* Renderizado según el tipo de programación */}
                      {form.schedule_type === 'fixed' ? (
                        <div className="space-y-3">
                          {/* Lista de horarios configurados */}
                          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Horarios Seleccionados</label>
                          {form.fixed_schedules && form.fixed_schedules.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {form.fixed_schedules.map((sched, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 py-1 px-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white transition-all hover:border-red-500/30 group/tag">
                                  <span className="tabular-nums">{sched.time}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = form.fixed_schedules?.filter((_, i) => i !== idx) || [];
                                      setForm({ ...form, fixed_schedules: updated });
                                    }}
                                    className="text-gray-500 hover:text-red-500 transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-gray-500 italic">No has agregado ningún horario todavía.</p>
                          )}

                          {/* Input para agregar nuevo horario */}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1">
                              <Input
                                type="time"
                                value={newTime}
                                onChange={(e) => setNewTime(e.target.value)}
                                icon={Clock}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!newTime) return;
                                const exists = form.fixed_schedules?.some(s => s.time === newTime);
                                if (exists) {
                                  toast.error('Este horario ya ha sido agregado.');
                                  return;
                                }
                                const updated = [...(form.fixed_schedules || []), { time: newTime }].sort((a, b) => a.time.localeCompare(b.time));
                                setForm({ ...form, fixed_schedules: updated });
                                setNewTime('');
                              }}
                              className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-[var(--accent)] hover:text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1 border border-white/5 cursor-pointer active:scale-95"
                            >
                              <Plus size={14} />
                              <span>Agregar</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Publicar cada (minutos)</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[15, 30, 60, 120, 240].map((mins) => (
                              <button
                                type="button"
                                key={mins}
                                onClick={() => setForm({ ...form, schedule_interval: mins })}
                                className={`py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all border ${
                                  form.schedule_interval === mins
                                    ? 'bg-[var(--accent)] text-black border-[var(--accent)] shadow-lg shadow-[var(--accent)]/15'
                                    : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/10 hover:text-white'
                                }`}
                              >
                                {mins >= 60 ? `${mins / 60} ${mins / 60 === 1 ? 'Hora' : 'Horas'}` : `${mins} Min`}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const val = prompt('Ingresa el intervalo en minutos:');
                                if (val) {
                                  const mins = parseInt(val, 10);
                                  if (!isNaN(mins) && mins > 0) {
                                    setForm({ ...form, schedule_interval: mins });
                                  } else {
                                    toast.error('Ingresa un número válido');
                                  }
                                }
                              }}
                              className={`py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all border ${
                                ![15, 30, 60, 120, 240].includes(form.schedule_interval || 0)
                                  ? 'bg-[var(--accent)] text-black border-[var(--accent)] shadow-lg'
                                  : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/10'
                              }`}
                            >
                              {![15, 30, 60, 120, 240].includes(form.schedule_interval || 0) && form.schedule_interval
                                ? `Pers. (${form.schedule_interval}m)`
                                : 'Otro...'}
                            </button>
                          </div>
                          <p className="text-[10px] text-gray-500 leading-relaxed italic pt-2 border-t border-white/5">
                            El mensaje se publicará en los grupos de manera cíclica cada {form.schedule_interval || 30} minutos.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </form>
    </Modal>
  );
};
