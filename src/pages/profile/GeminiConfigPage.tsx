import React, { useState, useEffect } from 'react';
import { useProfile } from '../../hooks/useProfile';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { Sparkles, RefreshCw, Key, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { validateGeminiConfiguration } from '../../lib/aiService';

export const GeminiConfigPage = () => {
  const { profile, loading, updateProfile } = useProfile();
  
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    if (profile) {
      setGeminiApiKey(profile.gemini_api_key || '');
      setGeminiModel(profile.gemini_model || 'gemini-2.5-flash');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestingConnection(true);
    const success = await updateProfile(
      profile?.full_name || '',
      undefined,
      geminiApiKey,
      geminiModel
    );
    if (success) {
      if (geminiApiKey && geminiApiKey.trim() !== '') {
        toast.loading('Validando conexión con Gemini...', { id: 'gemini-test' });
        const testResult = await validateGeminiConfiguration();
        if (testResult.success) {
          toast.success('Configuración guardada y conexión con Gemini validada con éxito ✨', { id: 'gemini-test' });
        } else {
          toast.error(`Configuración guardada, pero falló la prueba de Gemini: ${testResult.error || 'Verifica la clave API'}`, { id: 'gemini-test', duration: 7000 });
        }
      } else {
        toast.success('Configuración de IA actualizada correctamente');
      }
    } else {
      toast.error('Error al actualizar la configuración de IA');
    }
    setTestingConnection(false);
  };

  const handleTestConnection = async () => {
    if (!geminiApiKey || geminiApiKey.trim() === '') {
      toast.error('Ingresa una Clave API de Gemini para poder realizar la prueba.');
      return;
    }

    setTestingConnection(true);
    toast.loading('Guardando configuración y probando conexión...', { id: 'gemini-manual-test' });
    const saveSuccess = await updateProfile(
      profile?.full_name || '',
      undefined,
      geminiApiKey,
      geminiModel
    );
    
    if (!saveSuccess) {
      toast.error('Error al guardar la configuración antes de la prueba.', { id: 'gemini-manual-test' });
      setTestingConnection(false);
      return;
    }

    const testResult = await validateGeminiConfiguration();
    if (testResult.success) {
      toast.success('¡Conexión exitosa! El modelo responde correctamente ✨', { id: 'gemini-manual-test', duration: 4000 });
    } else {
      toast.error(`Fallo de conexión: ${testResult.error || 'Verifica tu API Key o modelo.'}`, { id: 'gemini-manual-test', duration: 7000 });
    }
    setTestingConnection(false);
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-20">
      <PageHeader 
        title="Asistente de IA" 
        subtitle="Configuración de Gemini"
      />

      <div className="card space-y-6">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary tracking-wide">Asistente de IA (Gemini)</h3>
            <p className="text-xs text-secondary">Autocompleta tus productos con análisis de fotos</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Input
            label="Clave API de Gemini"
            placeholder="AIzaSy..."
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
          />
          
          <Select
            label="Modelo de IA (Gemini)"
            value={geminiModel}
            onChange={(e) => setGeminiModel(e.target.value)}
          >
            {/* Gemini 3 Series */}
            <option value="gemini-3-flash-preview" className="bg-surface text-primary">Gemini 3 Flash (Última generación - Ultra rápido y potente)</option>
            <option value="gemini-3.1-pro-preview" className="bg-surface text-primary">Gemini 3.1 Pro (Razonamiento y agentes avanzados)</option>
            <option value="gemini-3.1-flash-lite" className="bg-surface text-primary">Gemini 3.1 Flash-Lite (Eficiencia a gran escala)</option>
            
            {/* Gemini 2.5 Series */}
            <option value="gemini-2.5-flash" className="bg-surface text-primary">Gemini 2.5 Flash (Equilibrado y veloz)</option>
            <option value="gemini-2.5-pro" className="bg-surface text-primary">Gemini 2.5 Pro (Precisión y desarrollo)</option>
            <option value="gemini-2.5-flash-lite" className="bg-surface text-primary">Gemini 2.5 Flash-Lite (Bajo consumo)</option>
          </Select>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-purple-500/20 hover:border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10 text-purple-600 dark:text-purple-300 rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {testingConnection ? (
              <>
                <RefreshCw size={14} className="animate-spin text-purple-500 dark:text-purple-400" />
                <span>Probando Conexión con Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} className="text-purple-500 dark:text-purple-400" />
                <span>Probar Conexión en Caliente</span>
              </>
            )}
          </button>

          <a
            href="https://aistudio.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors font-medium mt-1 ml-1 hover:underline"
          >
            <Key size={12} />
            Obtener clave de API gratuita en Google AI Studio →
          </a>

          <Button 
            type="submit" 
            className="w-full" 
            loading={loading}
            icon={Save}
            size="lg"
          >
            Guardar Configuración
          </Button>
        </form>
      </div>
    </div>
  );
};
