import React, { useState, useEffect, useRef } from 'react';
import { useEvolution } from '../../hooks/useEvolution';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Phone, CheckCircle2, AlertCircle, RefreshCw, QrCode, LogOut, Hash, Copy, Server } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface EvolutionConfigProps {
  catalogId?: string;
  onConnected?: () => void;
}

export const EvolutionConfig = ({ catalogId, onConnected }: EvolutionConfigProps) => {
  const { instance, loading, availableServers, createInstance, getQR, getPairingCode, disconnectInstance, checkStatus } = useEvolution(catalogId);
  const [instanceName, setInstanceName] = useState('');
  const [selectedServerId, setSelectedServerId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [method, setMethod] = useState<'qr' | 'code'>('qr');

  // Rastrear si la conexión ocurrió durante esta sesión
  const prevStatusRef = useRef<string | undefined>(instance?.status);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = instance?.status;

    if (instance?.status === 'connected' && prevStatus && prevStatus !== 'connected') {
      const timer = setTimeout(() => {
        onConnected?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [instance?.status, onConnected]);

  useEffect(() => {
    let interval: any;
    if (instance && instance.status !== 'connected') {
      if (method === 'qr' && !instance.qrcode) {
        getQR();
      }
      interval = setInterval(() => {
        checkStatus();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [instance?.id, instance?.status, method]);

  useEffect(() => {
    if (availableServers.length > 0 && !selectedServerId) {
      setSelectedServerId(availableServers[0].id);
    }
  }, [availableServers, selectedServerId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Código copiado al portapapeles');
  };

  if (!instance) {
    return (
      <div className="card space-y-4 border-border bg-surface-hover/20">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-accent/10 text-accent rounded-2xl">
            <Phone size={28} />
          </div>
          <div>
            <h3 className="text-primary font-bold text-lg mb-0.5">Vincular WhatsApp</h3>
            <p className="text-secondary text-xs">Elige cómo quieres conectar tu dispositivo</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Nombre de la Instancia"
            placeholder="Ej: MiWhatsAppSoporte"
            value={instanceName}
            onChange={(e) => setInstanceName(e.target.value)}
            className="bg-surface-hover/40 border-border"
          />

          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-secondary px-1 flex items-center gap-2">
              <Server size={12} /> Seleccionar Servidor
            </label>
            <div className="grid grid-cols-1 gap-2">
              {availableServers.map((server) => (
                <button
                  key={server.id}
                  onClick={() => setSelectedServerId(server.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                    selectedServerId === server.id
                      ? 'border-accent bg-accent/5 ring-1 ring-accent'
                      : 'border-border bg-surface-hover/20 hover:bg-surface-hover/40'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-primary">{server.name}</p>
                    <p className="text-[10px] text-secondary">
                      {server.active_instances} / {server.capacity_limit} instancias
                    </p>
                  </div>
                  {selectedServerId === server.id && (
                    <CheckCircle2 size={16} className="text-accent" />
                  )}
                </button>
              ))}
              {availableServers.length === 0 && (
                <div className="p-3 text-[10px] text-amber-500 bg-amber-500/10 rounded-xl border border-amber-500/20 text-center">
                  No hay servidores disponibles en este momento.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => setMethod('qr')}
            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
              method === 'qr' 
                ? 'border-accent bg-accent/10 text-accent' 
                : 'border-border bg-surface-hover/20 text-secondary hover:bg-surface-hover/40'
            }`}
          >
            <QrCode size={24} />
            <span className="text-[11px] font-bold uppercase tracking-wider">Código QR</span>
          </button>
          <button
            onClick={() => setMethod('code')}
            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
              method === 'code' 
                ? 'border-accent bg-accent/10 text-accent' 
                : 'border-border bg-surface-hover/20 text-secondary hover:bg-surface-hover/40'
            }`}
          >
            <Hash size={24} />
            <span className="text-[11px] font-bold uppercase tracking-wider">Por Código</span>
          </button>
        </div>

        <Button 
          className="w-full mt-4 py-6 text-sm font-bold uppercase tracking-widest" 
          onClick={() => createInstance(instanceName, selectedServerId)}
          loading={loading}
          disabled={!instanceName || !selectedServerId}
        >
          {method === 'qr' ? 'Generar Código QR' : 'Siguiente Paso'}
        </Button>
      </div>
    );
  }

  return (
    <div className="card space-y-6 border-border bg-surface-hover/20">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl transition-colors ${
            instance.status === 'connected' 
              ? 'bg-accent/10 text-accent' 
              : 'bg-amber-500/10 text-amber-500'
          }`}>
            <Phone size={28} />
          </div>
          <div>
            <h3 className="text-primary font-bold text-lg uppercase tracking-tight">{instance.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${
                instance.status === 'connected' ? 'bg-[var(--accent)] animate-pulse' : 'bg-amber-500 animate-bounce'
              }`} />
              <span className={`text-[11px] font-bold uppercase tracking-widest ${
                instance.status === 'connected' ? 'text-[var(--accent)]' : 'text-amber-500 italic'
              }`}>
                {instance.status === 'connected' ? 'Conectado' : 'Esperando Conexión...'}
              </span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={checkStatus} 
          disabled={loading}
          className="p-2 rounded-xl bg-surface-hover hover:bg-surface-hover/80 transition-colors text-secondary hover:text-primary"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {instance.status !== 'connected' && (
        <div className="space-y-6 py-2">
          {method === 'qr' ? (
            <div className="flex flex-col items-center gap-6">
              <div className="bg-white p-4 rounded-[2rem] shadow-[0_0_50px_-12px_rgba(255,255,255,0.2)]">
                {instance.qrcode ? (
                  <img src={instance.qrcode} alt="QR Code" className="w-56 h-56 rounded-xl" />
                ) : (
                  <div className="w-56 h-56 flex flex-col items-center justify-center bg-gray-50 rounded-[1.5rem] gap-3">
                    <RefreshCw size={40} className="text-gray-300 animate-spin" />
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Generando...</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-secondary text-center max-w-[280px] leading-relaxed font-medium">
                Escanea este código desde la sección <span className="text-primary">Dispositivos Vinculados</span> de tu WhatsApp.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {!instance.pairing_code ? (
                <div className="space-y-4 bg-surface-hover/20 p-6 rounded-3xl border border-border">
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-secondary px-1">Número de Teléfono</label>
                    <Input
                      placeholder="Ej: 5351234567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="bg-surface-hover/40 border-border py-6"
                      type="tel"
                    />
                  </div>
                  <Button 
                    className="w-full py-6 text-xs"
                    onClick={() => getPairingCode(phoneNumber)}
                    loading={loading}
                  >
                    Generar Código de 8 Dígitos
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-8 py-4">
                  <div className="relative group">
                    <div className="absolute -inset-4 bg-accent/20 rounded-[2.5rem] blur-2xl group-hover:bg-accent/30 transition-all" />
                    <div className="relative bg-surface border border-accent/30 p-8 rounded-[2rem] flex flex-col items-center gap-4 min-w-[300px]">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent/70">Tu Código</span>
                      <div className="flex items-center gap-4">
                        <span className="text-5xl font-mono font-black text-primary tracking-widest">
                          {instance.pairing_code}
                        </span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(instance.pairing_code || '')}
                        className="flex items-center gap-2 mt-2 px-6 py-2 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-all border border-accent/20"
                      >
                        <Copy size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Copiar Código</span>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 px-4">
                     <p className="text-[11px] text-secondary text-center leading-relaxed">
                       Ve a <span className="text-primary">Dispositivos Vinculados</span> → <span className="text-white">Vincular con número</span> e ingresa este código.
                     </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <button 
              onClick={() => {
                setMethod(method === 'qr' ? 'code' : 'qr');
                if (method === 'code' && !instance.qrcode) getQR();
              }}
              className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] hover:brightness-125 transition-all"
            >
              Usar {method === 'qr' ? 'Número' : 'QR'}
            </button>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}

      {instance.status === 'connected' && (
        <div className="p-6 bg-accent/5 rounded-3xl border border-accent/10 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
             <CheckCircle2 size={120} />
          </div>
          <p className="text-xs text-accent leading-relaxed font-medium relative z-10">
            Tu cuenta está vinculada y lista para la acción. Los envíos automáticos y catálogos están habilitados para esta instancia.
          </p>
        </div>
      )}

      <button 
        onClick={disconnectInstance}
        disabled={loading}
        className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-red-500/50 hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all flex items-center justify-center gap-2 border border-transparent hover:border-red-500/10"
      >
        <LogOut size={14} />
        Desconectar Instancia
      </button>
    </div>
  );
};
