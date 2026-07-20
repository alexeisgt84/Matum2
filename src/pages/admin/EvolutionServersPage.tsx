import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'react-hot-toast';
import { 
  Server, 
  Plus, 
  Edit2, 
  Trash2, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  ArrowLeft, 
  Copy, 
  Check, 
  Loader2 
} from 'lucide-react';

interface EvolutionServer {
  id: string;
  name: string;
  url: string;
  api_key: string;
  capacity_limit: number;
  created_at: string;
  updated_at: string;
}

export const EvolutionServersPage = () => {
  const [servers, setServers] = useState<EvolutionServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<EvolutionServer | null>(null);

  // Campos del formulario
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [capacityLimit, setCapacityLimit] = useState(100);

  // Estados de interfaz adicionales
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'failed'>>({});
  const [testError, setTestError] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchServers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('evolution_servers')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setServers(data || []);
    } catch (err: any) {
      console.error('Error al cargar los servidores:', err);
      toast.error('Error al cargar la lista de servidores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const openCreateModal = () => {
    setEditingServer(null);
    setName('');
    setUrl('');
    setApiKey('');
    setCapacityLimit(100);
    setIsFormOpen(true);
  };

  const openEditModal = (server: EvolutionServer) => {
    setEditingServer(server);
    setName(server.name);
    setUrl(server.url);
    setApiKey(server.api_key);
    setCapacityLimit(server.capacity_limit);
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingServer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim() || !apiKey.trim()) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setSaving(true);
    const cleanedUrl = url.trim().replace(/\/$/, ''); // Eliminar barra diagonal final

    try {
      if (editingServer) {
        // Actualizar servidor
        const { error } = await supabase
          .from('evolution_servers')
          .update({
            name: name.trim(),
            url: cleanedUrl,
            api_key: apiKey.trim(),
            capacity_limit: capacityLimit,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingServer.id);

        if (error) throw error;
        toast.success('Servidor actualizado correctamente');
      } else {
        // Crear servidor
        const { error } = await supabase
          .from('evolution_servers')
          .insert([
            {
              name: name.trim(),
              url: cleanedUrl,
              api_key: apiKey.trim(),
              capacity_limit: capacityLimit
            }
          ]);

        if (error) throw error;
        toast.success('Servidor agregado correctamente');
      }

      closeFormModal();
      await fetchServers();
    } catch (err: any) {
      console.error('Error al guardar el servidor:', err);
      toast.error(err.message || 'Error al guardar el servidor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, serverName: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el servidor "${serverName}"?\n\nEsta acción no se puede deshacer y puede desconectar las instancias de WhatsApp asociadas a este servidor.`)) {
      const toastId = toast.loading('Eliminando servidor...');
      try {
        const { error } = await supabase
          .from('evolution_servers')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast.success('Servidor eliminado correctamente', { id: toastId });
        await fetchServers();
      } catch (err: any) {
        console.error('Error al eliminar servidor:', err);
        let errorDetail = err.message || 'Intente de nuevo';
        if (err.code === '23503') {
          errorDetail = 'No se puede eliminar el servidor porque tiene instancias de WhatsApp activas. Por favor, desconéctalas primero.';
        } else if (err.details) {
          errorDetail = err.details;
        }
        toast.error('Error al eliminar: ' + errorDetail, { id: toastId });
      }
    }
  };

  const handleTestConnection = async (server: EvolutionServer) => {
    setTestStatus(prev => ({ ...prev, [server.id]: 'testing' }));
    setTestError(prev => ({ ...prev, [server.id]: '' }));

    try {
      // Llamar al proxy de Supabase pidiendo listar las instancias del servidor
      const { data, error } = await supabase.functions.invoke('evolution-proxy', {
        body: {
          server_id: server.id,
          endpoint: '/instance/fetchInstances',
          method: 'GET'
        }
      });

      if (error) throw error;
      if (data && data.error) {
        throw new Error(data.error || 'Respuesta con error del servidor de Evolution');
      }

      setTestStatus(prev => ({ ...prev, [server.id]: 'success' }));
      toast.success(`Conexión exitosa con ${server.name}`);
    } catch (err: any) {
      console.error(`Error en test de conexión para ${server.name}:`, err);
      const errMsg = err.message || 'No se pudo conectar con el servidor de Evolution API';
      setTestStatus(prev => ({ ...prev, [server.id]: 'failed' }));
      setTestError(prev => ({ ...prev, [server.id]: errMsg }));
      toast.error(`Fallo de conexión en ${server.name}`);
    }
  };

  const toggleRevealKey = (id: string) => {
    setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-24 space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Servidores"
        subtitle="Mantenimiento de Evolution API"
        rightAction={
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/admin')}
            className="rounded-xl px-3 border border-border"
          >
            Volver
          </Button>
        }
      />

      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest ml-1">
          Nodos de Conexión
        </h3>
        <Button
          size="sm"
          icon={Plus}
          onClick={openCreateModal}
          className="rounded-xl py-2 px-3 text-xs"
        >
          Agregar Servidor
        </Button>
      </div>

      {/* Lista de Servidores */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <span className="text-[10px] text-secondary font-bold uppercase tracking-widest">Cargando servidores...</span>
          </div>
        ) : servers.length === 0 ? (
          <div className="py-20 text-center space-y-4 bg-surface/30 rounded-3xl border border-dashed border-border">
            <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mx-auto text-secondary/30">
               <Server size={32} />
            </div>
            <p className="text-secondary font-medium italic text-xs">No hay servidores configurados.</p>
          </div>
        ) : (
          servers.map((server) => {
            const isRevealed = !!revealedKeys[server.id];
            const testState = testStatus[server.id] || 'idle';
            const errorMsg = testError[server.id];

            return (
              <div 
                key={server.id} 
                className="card p-5 flex flex-col gap-4 border-border hover:border-accent/30 transition-all group relative overflow-hidden"
              >
                {/* Cabecera del item */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-xl bg-accent/10 text-accent flex-shrink-0">
                      <Server size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-primary truncate leading-snug">
                        {server.name}
                      </h4>
                      <p className="text-[10px] font-mono text-secondary truncate mt-0.5 select-all">
                        {server.url}
                      </p>
                    </div>
                  </div>

                  {/* Acciones principales */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(server)}
                      className="p-2 rounded-xl bg-surface-hover hover:bg-surface-hover/80 text-secondary hover:text-primary border border-transparent hover:border-border transition-all"
                      title="Editar Servidor"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(server.id, server.name)}
                      className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      title="Eliminar Servidor"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Detalles y Capacidad */}
                <div className="grid grid-cols-2 gap-4 bg-surface-hover/30 p-3.5 rounded-2xl border border-border/40 text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-secondary uppercase tracking-widest block">Capacidad Límite</span>
                    <span className="font-semibold text-primary mt-0.5 block">{server.capacity_limit} instancias</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-[9px] font-bold text-secondary uppercase tracking-widest block">Creado</span>
                    <span className="text-secondary mt-0.5 block">
                      {new Date(server.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>

                {/* API Key Fila */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-secondary uppercase tracking-widest pl-1 block">API Key del Servidor</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-surface-hover/50 border border-border/60 rounded-xl px-3 py-2 flex items-center justify-between font-mono text-xs text-primary min-w-0">
                      <span className="truncate pr-2 select-all">
                        {isRevealed ? server.api_key : '••••••••••••••••••••••••••••••••'}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleRevealKey(server.id)}
                          className="p-1 text-secondary hover:text-primary transition-colors"
                        >
                          {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(server.api_key, server.id)}
                          className="p-1 text-secondary hover:text-primary transition-colors"
                        >
                          {copiedId === server.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fila de Test de Conexión */}
                <div className="border-t border-border/40 pt-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => handleTestConnection(server)}
                      disabled={testState === 'testing'}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all select-none ${
                        testState === 'testing'
                          ? 'bg-surface-hover text-secondary border-border'
                          : testState === 'success'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : testState === 'failed'
                          ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                          : 'bg-surface-hover hover:bg-surface-hover/80 text-primary border-border'
                      }`}
                    >
                      {testState === 'testing' ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Probando...
                        </>
                      ) : (
                        <>
                          <Activity size={12} />
                          Probar Conexión
                        </>
                      )}
                    </button>

                    {testState === 'success' && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                        <CheckCircle2 size={12} />
                        En línea
                      </div>
                    )}
                    {testState === 'failed' && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                        <AlertCircle size={12} />
                        Fallo
                      </div>
                    )}
                    {testState === 'idle' && (
                      <div className="text-[10px] font-bold text-secondary uppercase tracking-wider italic">
                        Sin verificar
                      </div>
                    )}
                  </div>

                  {testState === 'failed' && errorMsg && (
                    <div className="text-[10px] font-mono text-red-400 bg-red-500/5 border border-red-500/10 p-2 rounded-xl mt-1 break-all">
                      {errorMsg}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal / Backdrop para formulario Crear / Editar */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-surface border border-border rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
            {/* Cabecera del formulario */}
            <div className="flex justify-between items-center border-b border-border/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 text-accent rounded-xl">
                  <Server size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-primary text-base">
                    {editingServer ? 'Editar Servidor' : 'Agregar Servidor'}
                  </h3>
                  <p className="text-[10px] text-secondary uppercase tracking-widest mt-0.5">
                    {editingServer ? 'Actualizar credenciales' : 'Registrar nuevo nodo'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeFormModal}
                className="p-1.5 rounded-lg hover:bg-surface-hover text-secondary hover:text-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Campos del formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nombre del Servidor"
                placeholder="Ej: Servidor Principal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={saving}
              />

              <Input
                label="URL de Evolution API"
                placeholder="https://evolution.dominio.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                helperText="URL base del servidor de Evolution API (ej: https://api.matum.app)."
                required
                disabled={saving}
                type="url"
              />

              <Input
                label="API Key Global del Servidor"
                placeholder="Ingrese la apikey del servidor"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                helperText="La clave maestra que autoriza la comunicación con la API."
                required
                disabled={saving}
                type="text"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-secondary px-1">
                  Capacidad Límite de Instancias
                </label>
                <Input
                  placeholder="Ej: 100"
                  value={capacityLimit}
                  onChange={(e) => setCapacityLimit(parseInt(e.target.value) || 0)}
                  required
                  disabled={saving}
                  type="number"
                  min="1"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-4 border-t border-border/40">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 py-3.5 font-bold border border-border"
                  onClick={closeFormModal}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 py-3.5 font-bold"
                  loading={saving}
                  icon={Save}
                >
                  Guardar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
