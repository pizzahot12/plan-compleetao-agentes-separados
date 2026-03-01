import React, { useState } from 'react';
import { Header } from '@/components/Layout/Header';
import { Sidebar } from '@/components/Layout/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useThemeStore } from '@/stores/themeStore';
import { Button } from '@/components/Common/Button';
import { Input } from '@/components/Common/Input';
import { Card } from '@/components/Common/Card';
import { NotificationDemo } from '@/components/Layout/NotificationDemo';
import { 
  User, 
  Mail, 
  Key, 
  Bell, 
  Shield, 
  Palette,
  Camera,
  Save,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ProfilePage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, updateUser, updateProfile } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const { theme, toggleTheme } = useThemeStore();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'appearance'>('profile');

  const handleSave = async () => {
    if (updateProfile) {
      const success = await updateProfile({ name });
      if (success) {
        showSuccess('Perfil actualizado', 'Tus cambios han sido guardados');
        setIsEditing(false);
      } else {
        showError('Error', 'No se pudo actualizar el perfil');
      }
    } else {
      updateUser({ name });
      showSuccess('Perfil actualizado', 'Tus cambios han sido guardados');
      setIsEditing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'appearance', label: 'Apariencia', icon: Palette },
  ] as const;

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header 
        onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
        isSidebarOpen={sidebarOpen}
      />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:ml-20 xl:ml-64 pt-16">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Perfil</h1>
            <p className="text-white/60 mt-1">Gestiona tu cuenta y preferencias</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar tabs */}
            <div className="lg:w-64 flex-shrink-0">
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                        activeTab === tab.id
                          ? 'bg-[#ff6b35]/10 text-[#ff6b35]'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 mt-4 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Cerrar sesión</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* Avatar */}
                  <Card className="p-6">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <img
                          src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
                          alt={user?.name}
                          className="w-24 h-24 rounded-full bg-white/10"
                        />
                        <button
                          onClick={() => showError('Próximamente', 'Cambio de avatar en desarrollo')}
                          className="absolute bottom-0 right-0 w-8 h-8 bg-[#ff6b35] rounded-full flex items-center justify-center text-white hover:bg-[#ff8555] transition-colors"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <h3 className="text-white font-medium text-lg">Foto de perfil</h3>
                        <p className="text-white/50 text-sm">JPG, PNG o GIF. Máximo 2MB.</p>
                      </div>
                    </div>
                  </Card>

                  {/* Profile info */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-white font-medium text-lg">Información personal</h3>
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="text-[#ff6b35] hover:text-[#ff8555] text-sm font-medium"
                      >
                        {isEditing ? 'Cancelar' : 'Editar'}
                      </button>
                    </div>

                    <div className="space-y-4">
                      <Input
                        label="Nombre"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        leftIcon={<User className="w-5 h-5" />}
                        disabled={!isEditing}
                      />
                      <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        leftIcon={<Mail className="w-5 h-5" />}
                        disabled={!isEditing}
                      />

                      {isEditing && (
                        <Button
                          variant="primary"
                          onClick={handleSave}
                          leftIcon={<Save className="w-4 h-4" />}
                          className="mt-4"
                        >
                          Guardar cambios
                        </Button>
                      )}
                    </div>
                  </Card>

                  {/* User ID for adding friends */}
                  <Card className="p-6">
                    <h3 className="text-white font-medium text-lg mb-2">Tu ID de usuario</h3>
                    <p className="text-white/50 text-sm mb-4">Comparte este ID para que tus amigos puedan agregarte</p>
                    <div className="flex items-center gap-4">
                      <code className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white tracking-wide text-center break-all">
                        {user?.id || 'Cargando...'}
                      </code>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          navigator.clipboard.writeText(user?.id || '');
                          showSuccess('ID copiado', 'Comparte con tus amigos');
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-white font-medium text-lg mb-4">Cambiar contraseña</h3>
                    <div className="space-y-4">
                      <Input
                        label="Contraseña actual"
                        type="password"
                        placeholder="••••••••"
                        leftIcon={<Key className="w-5 h-5" />}
                      />
                      <Input
                        label="Nueva contraseña"
                        type="password"
                        placeholder="••••••••"
                        leftIcon={<Key className="w-5 h-5" />}
                      />
                      <Input
                        label="Confirmar nueva contraseña"
                        type="password"
                        placeholder="••••••••"
                        leftIcon={<Key className="w-5 h-5" />}
                      />
                      <Button
                        variant="primary"
                        onClick={() => showSuccess('Próximamente', 'Cambio de contraseña en desarrollo')}
                      >
                        Cambiar contraseña
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-white font-medium text-lg mb-4">Sesiones activas</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div>
                          <p className="text-white text-sm">Este dispositivo</p>
                          <p className="text-white/50 text-xs">Chrome en Windows • Activo ahora</p>
                        </div>
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Activo</span>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <NotificationDemo />
                  
                  <Card className="p-6">
                    <h3 className="text-white font-medium text-lg mb-4">Preferencias de notificaciones</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Invitaciones a salas', description: 'Cuando alguien te invite a ver contenido' },
                        { label: 'Amigos conectados', description: 'Cuando un amigo se conecte' },
                        { label: 'Nuevos episodios', description: 'Cuando salga un nuevo episodio de tus series' },
                        { label: 'Mensajes en sala', description: 'Cuando alguien te mencione en el chat' },
                      ].map((item) => (
                        <label
                          key={item.label}
                          className="flex items-start gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                        >
                          <input
                            type="checkbox"
                            defaultChecked
                            className="w-5 h-5 mt-0.5 rounded border-white/20 bg-white/5 text-[#ff6b35] focus:ring-[#ff6b35]"
                          />
                          <div>
                            <p className="text-white text-sm">{item.label}</p>
                            <p className="text-white/50 text-xs">{item.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-white font-medium text-lg mb-4">Tema</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => {
                          if (theme === 'light') toggleTheme();
                        }}
                        className={cn(
                          'p-4 rounded-xl text-left transition-all',
                          theme === 'dark'
                            ? 'bg-[#1a1a1a] border-2 border-[#ff6b35]'
                            : 'bg-white/5 border-2 border-white/10 hover:bg-white/10'
                        )}
                      >
                        <div className="w-full h-20 bg-[#242424] rounded-lg mb-3 flex items-center justify-center">
                          <Moon className="w-8 h-8 text-white/50" />
                        </div>
                        <p className="text-white font-medium">Oscuro</p>
                        <p className="text-white/50 text-xs">Tema predeterminado</p>
                      </button>
                      <button
                        onClick={() => {
                          if (theme === 'dark') toggleTheme();
                        }}
                        className={cn(
                          'p-4 rounded-xl text-left transition-all',
                          theme === 'light'
                            ? 'bg-white border-2 border-[#ff6b35]'
                            : 'bg-white/5 border-2 border-white/10 hover:bg-white/10'
                        )}
                      >
                        <div className="w-full h-20 bg-gradient-to-br from-gray-100 to-gray-300 rounded-lg mb-3 flex items-center justify-center">
                          <Sun className="w-8 h-8 text-yellow-500" />
                        </div>
                        <p className={cn('font-medium', theme === 'light' ? 'text-gray-900' : 'text-white')}>
                          Claro
                        </p>
                        <p className={cn('text-xs', theme === 'light' ? 'text-gray-500' : 'text-white/50')}>
                          Tema claro
                        </p>
                      </button>
                    </div>
                  </Card>
                  
                  <Card className="p-6">
                    <h3 className="text-white font-medium text-lg mb-4">Vista previa</h3>
                    <div className={cn(
                      'p-4 rounded-xl transition-colors',
                      theme === 'light' ? 'bg-gray-100' : 'bg-[#242424]'
                    )}>
                      <p className={cn(
                        'text-sm',
                        theme === 'light' ? 'text-gray-700' : 'text-white/70'
                      )}>
                        Así se verá la aplicación con el tema {theme === 'dark' ? 'oscuro' : 'claro'}.
                      </p>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
