import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Switch } from '../../components/ui/Switch';
import { toast } from 'react-hot-toast';
import { Settings, Save, Globe, Store, Lock } from 'lucide-react';

export const AdminSettingsPage = () => {
  const {
    settings,
    loading,
    updateSetting,
    refresh,
    isGlobalCatalogCreationEnabled,
    setGlobalCatalogCreation,
  } = useSystemSettings();
  const [appUrl, setAppUrl] = useState('');
  const [allowCatalogCreation, setAllowCatalogCreation] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingCatalogCreation, setTogglingCatalogCreation] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (settings && settings.app_url) {
      setAppUrl(settings.app_url);
    }
    setAllowCatalogCreation(isGlobalCatalogCreationEnabled);
  }, [settings, isGlobalCatalogCreationEnabled]);

  const handleToggleCatalogCreation = async (checked: boolean) => {
    setAllowCatalogCreation(checked);
    setTogglingCatalogCreation(true);
    const res = await setGlobalCatalogCreation(checked);
    if (res.success) {
      toast.success(
        checked
          ? 'Creación de catálogos activada para usuarios'
          : 'Creación de catálogos desactivada para usuarios'
      );
      await refresh();
    } else {
      setAllowCatalogCreation(!checked);
      toast.error('Error al actualizar permiso: ' + (res.error || 'Intente de nuevo'));
    }
    setTogglingCatalogCreation(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUrl.trim()) {
      toast.error('El dominio no puede estar vacío');
      return;
    }

    setSaving(true);
    const cleanedUrl = appUrl.trim()
      .replace(/^(https?:\/\/)/, '') // Quita http:// o https:// para guardar solo el dominio
      .replace(/\/$/, ''); // Quita barra diagonal final si existe

    const [urlResult, catalogResult] = await Promise.all([
      updateSetting(
        'app_url',
        cleanedUrl,
        'Dominio o URL principal de la aplicación pública para los enlaces'
      ),
      setGlobalCatalogCreation(allowCatalogCreation),
    ]);

    if (urlResult.success && catalogResult.success) {
      toast.success('Configuración guardada correctamente');
      await refresh();
    } else {
      toast.error(
        'Error al guardar la configuración: ' +
          (urlResult.error || catalogResult.error || 'Intente de nuevo')
      );
    }
    setSaving(false);
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-24 space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Configuración"
        subtitle="Ajustes Globales del Sistema"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-6">
          <div className="flex items-center gap-3 border-b border-border/40 pb-4">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Enlaces Públicos</h3>
              <p className="text-[10px] text-secondary uppercase tracking-widest mt-0.5">Configura el dominio del catálogo en línea</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Dominio Público de la Aplicación"
              type="text"
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              placeholder="nazzar.shop"
              icon={Globe}
              disabled={loading || saving}
              helperText="El dominio que se utilizará para generar y compartir los enlaces de las tiendas públicas (ej. nazzar.shop)."
              required
            />

            {appUrl && (
              <div className="bg-surface-hover/30 p-4 rounded-2xl border border-border/40 space-y-2">
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Ejemplo de enlace generado</span>
                <p className="text-xs text-accent font-semibold select-all break-all">
                  https://{appUrl.replace(/^(https?:\/\/)/, '').replace(/\/$/, '')}/mi-tienda
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="card space-y-5">
          <div className="flex items-center gap-3 border-b border-border/40 pb-4">
            <div
              className={`p-2.5 rounded-xl ${
                allowCatalogCreation
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-red-500/10 text-red-500'
              }`}
            >
              {allowCatalogCreation ? <Store size={20} /> : <Lock size={20} />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
                Permisos de Catálogos
              </h3>
              <p className="text-[10px] text-secondary uppercase tracking-widest mt-0.5">
                Control global de creación de nuevos catálogos
              </p>
            </div>
          </div>

          <Switch
            label="Permitir creación de catálogos por usuarios"
            subtitle={
              allowCatalogCreation
                ? 'Los usuarios pueden crear nuevos catálogos según los límites de su plan.'
                : 'La creación de nuevos catálogos está desactivada para todos los usuarios (excepto administradores).'
            }
            checked={allowCatalogCreation}
            onChange={handleToggleCatalogCreation}
            disabled={loading || saving || togglingCatalogCreation}
          />
        </div>

        <Button
          type="submit"
          className="w-full py-4 font-bold"
          loading={saving || loading}
          icon={Save}
          size="lg"
        >
          Guardar Configuración
        </Button>
      </form>
    </div>
  );
};
