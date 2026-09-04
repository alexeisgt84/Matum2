import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { RichTextarea } from '../ui/RichTextarea';
import type { WhatsAppMessage, MessageForm, MessageType } from '../../types/message';
import { Save, Clock, X, Sparkles, Crown, Plus, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useProfile } from '../../hooks/useProfile';
import { useEvolution } from '../../hooks/useEvolution';
import { analyzeProductImage } from '../../lib/aiService';
import { ImageUpload } from '../ui/ImageUpload';


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

  const handleRemoveImage = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setImageFile(null);
    setPreviewUrl(null);
    setForm(prev => ({ ...prev, image_url: null, type: 'text' }));
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
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      icon={MessageSquare}
      title={
        <div className="flex items-center gap-2">
          <span>{message ? 'Editar Mensaje' : 'Nuevo Mensaje'}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
            message 
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {message ? 'Edición' : 'Nuevo'}
          </span>
        </div>
      }
      subtitle={message ? 'Personaliza el texto, imagen o programación del mensaje' : 'Redacta un mensaje para enviar o programar en tus grupos'}
      maxWidth="sm:max-w-xl"
      footer={
        <div className="w-full">
          <Button 
            type="submit" 
            form="message-form"
            className="w-full font-bold py-3 text-sm shadow-md" 
            loading={loading}
            icon={Save}
          >
            {message ? 'Guardar Cambios' : 'Crear Mensaje'}
          </Button>
        </div>
      }
    >
      <form id="message-form" onSubmit={handleSubmit} className="space-y-5 pb-2">
        <div className="relative space-y-4">
          {/* Overlay de Carga Premium de la IA */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-[6px] z-30 rounded-2xl flex flex-col items-center justify-center border border-purple-500/30 shadow-2xl p-6">
              <div className="p-3.5 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 text-purple-400 rounded-2xl border border-purple-500/40 mb-3 shadow-lg shadow-purple-500/20 animate-bounce">
                <Sparkles size={28} className="animate-pulse" />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-widest bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                La IA está redactando tu mensaje...
              </span>
              <span className="text-[10px] text-gray-300 mt-1.5 tracking-wide text-center max-w-[280px]">
                Analizando la imagen para crear un identificador y cuerpo de mensaje vendedor
              </span>
            </div>
          )}

          {/* 1. Imagen (Primero) */}
          <div className="p-3.5 rounded-2xl bg-surface-hover/40 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider ml-1">Foto / Imagen (Opcional)</label>
              {previewUrl && (
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Adjunta
                </span>
              )}
            </div>
            <ImageUpload
              value={previewUrl}
              onChange={(file, url) => {
                setImageFile(file);
                setPreviewUrl(url);
                setForm(prev => ({ ...prev, type: 'image' }));
              }}
              onRemove={handleRemoveImage}
              disabled={isAnalyzing}
              label="Añadir Foto"
              filePrefix="message"
              title="Studio de Imágenes"
              className="mb-1"
              extraActions={
                previewUrl && profile?.gemini_api_key ? (
                  isPremium ? (
                    <button
                      type="button"
                      onClick={handleAIClick}
                      disabled={isAnalyzing}
                      className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md shadow-purple-500/15 active:scale-95 transition-all"
                    >
                      <Sparkles size={13} className="text-purple-200 animate-pulse" />
                      <span>Redactar con IA ✨</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAIClick}
                      className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold bg-surface border border-border hover:bg-surface-hover text-secondary transition-all"
                    >
                      <Crown size={13} className="text-amber-400" />
                      <span>Redactar con IA (Premium 👑)</span>
                    </button>
                  )
                ) : null
              }
              bottomContent={
                !previewUrl && profile?.gemini_api_key ? (
                  <div className="mt-2 py-1 px-3.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-[10px] text-emerald-400 font-medium flex items-center gap-1.5 w-fit mx-auto">
                    <Sparkles size={11} className="text-emerald-400 animate-pulse" />
                    <span>Sube una imagen para redactar con IA ✨</span>
                  </div>
                ) : null
              }
            />
            <p className="text-[11px] text-secondary text-center leading-relaxed">
              Si agregas una imagen, el mensaje se enviará con la foto y el texto como pie de imagen.
            </p>
          </div>

          {/* 2. Identificador del Mensaje */}
          <Input
            label="Identificador del Mensaje"
            placeholder="Ej: Mensaje de Bienvenida / Oferta Semanal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoFocus={!message}
            disabled={isAnalyzing}
          />

          {/* 3. Contenido del Mensaje */}
          <RichTextarea
            label="Contenido del Mensaje"
            placeholder="Escribe el cuerpo del mensaje que recibirán los grupos..."
            value={form.content || ''}
            onChange={(val) => setForm({ ...form, content: val })}
            helperText="Usa negritas, cursivas o emojis para que tu mensaje destaque."
            disabled={isAnalyzing}
          />
        </div>

        {/* 4. Comportamiento y Programación (solo si hay WhatsApp conectado) */}
        {hasInstance && (
          <div className="space-y-4 pt-1 border-t border-border">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-hover/50 border border-border">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Secuencia de Mensajes</span>
                <span className="text-[11px] text-secondary">
                  {form.is_sequence 
                    ? 'El mensaje forma parte de la secuencia programada del catálogo.' 
                    : 'Mensaje individual (programación manual o envío directo).'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setForm(prev => ({ 
                  ...prev, 
                  is_sequence: !prev.is_sequence,
                  is_individual: prev.is_sequence
                }))}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${form.is_sequence ? 'bg-accent' : 'bg-secondary/40'}`}
                aria-label={form.is_sequence ? 'Desactivar secuencia' : 'Activar secuencia'}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${form.is_sequence ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {/* 5. Programación de Envío (solo para mensajes individuales) */}
            {!form.is_sequence && (
              <div className="space-y-4 p-4 rounded-2xl bg-surface-hover/40 border border-border animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-primary uppercase tracking-wider">Programar Difusión Automática</label>
                    <p className="text-[11px] text-secondary">Publica este mensaje automáticamente en tus grupos</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSchedule(!showSchedule)}
                    className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                      showSchedule ? 'bg-accent' : 'bg-secondary/40'
                    }`}
                    aria-label={showSchedule ? 'Desactivar programación' : 'Activar programación'}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
                        showSchedule ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {showSchedule && (
                  <div className="space-y-4 pt-3 border-t border-border animate-in slide-in-from-top-2 duration-200">
                    {/* Selector de Tipo de Programación */}
                    <div className="grid grid-cols-2 p-1 bg-surface rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, schedule_type: 'fixed' })}
                        className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                          form.schedule_type === 'fixed'
                            ? 'bg-accent text-black shadow-md'
                            : 'text-secondary hover:text-primary'
                        }`}
                      >
                        Horarios Fijos
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, schedule_type: 'interval' })}
                        className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                          form.schedule_type === 'interval'
                            ? 'bg-accent text-black shadow-md'
                            : 'text-secondary hover:text-primary'
                        }`}
                      >
                        Intervalo
                      </button>
                    </div>

                    {/* Renderizado según el tipo de programación */}
                    {form.schedule_type === 'fixed' ? (
                      <div className="space-y-3">
                        <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                          Horarios del Día Programados
                        </label>
                        {form.fixed_schedules && form.fixed_schedules.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {form.fixed_schedules.map((sched, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-center gap-1.5 py-1.5 px-3 bg-surface border border-border rounded-xl text-xs font-bold text-primary shadow-sm hover:border-red-500/40 transition-all"
                              >
                                <Clock size={12} className="text-accent" />
                                <span className="tabular-nums">{sched.time}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = form.fixed_schedules?.filter((_, i) => i !== idx) || [];
                                    setForm({ ...form, fixed_schedules: updated });
                                  }}
                                  className="text-secondary hover:text-red-400 transition-colors ml-0.5"
                                  title="Eliminar horario"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-secondary italic">No has agregado ningún horario todavía.</p>
                        )}

                        {/* Input para agregar nuevo horario */}
                        <div className="flex items-center gap-2 pt-1">
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
                            className="h-[52px] px-4 rounded-xl bg-surface-hover hover:bg-accent hover:text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 border border-border cursor-pointer active:scale-95 shrink-0"
                          >
                            <Plus size={15} />
                            <span>Agregar</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                          Publicar cada (minutos)
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[15, 30, 60, 120, 240].map((mins) => (
                            <button
                              type="button"
                              key={mins}
                              onClick={() => setForm({ ...form, schedule_interval: mins })}
                              className={`py-2 rounded-xl text-[11px] font-bold tracking-wider transition-all border ${
                                form.schedule_interval === mins
                                  ? 'bg-accent text-black border-accent shadow-md'
                                  : 'bg-surface text-secondary border border-border hover:bg-surface-hover hover:text-primary'
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
                            className={`py-2 rounded-xl text-[11px] font-bold tracking-wider transition-all border ${
                              ![15, 30, 60, 120, 240].includes(form.schedule_interval || 0) && form.schedule_interval
                                ? 'bg-accent text-black border-accent shadow-md'
                                : 'bg-surface text-secondary border border-border hover:bg-surface-hover hover:text-primary'
                            }`}
                          >
                            {![15, 30, 60, 120, 240].includes(form.schedule_interval || 0) && form.schedule_interval
                              ? `Pers. (${form.schedule_interval}m)`
                              : 'Otro...'}
                          </button>
                        </div>
                        <p className="text-[11px] text-secondary leading-relaxed italic pt-1 border-t border-border">
                          El mensaje se publicará en los grupos de manera cíclica cada {form.schedule_interval || 30} minutos.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </form>
    </BottomSheet>
  );
};
