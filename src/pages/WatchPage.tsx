import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { VideoPlayer } from '@/components/Watch/VideoPlayer';
import { ChatPanel } from '@/components/Watch/ChatPanel';
import { RoomInfo } from '@/components/Watch/RoomInfo';
import { AdminPanel } from '@/components/Watch/AdminPanel';
import { useRooms } from '@/hooks/useRooms';
import { useRoomStore } from '@/stores/roomStore';
import { useAuth } from '@/hooks/useAuth';
import { useMedia } from '@/hooks/useMedia';
import { Loading } from '@/components/Common/Loading';
import { Button } from '@/components/Common/Button';
import { ArrowLeft, MessageSquare, Users, Crown, X, ChevronUp, ChevronDown } from 'lucide-react';

import { apiService } from '@/lib/api-service';

const WatchPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  useAuth();
  const { room, isHost, joinRoom, leaveRoom } = useRooms();
  const { getMediaById } = useMedia();

  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'none' | 'chat' | 'participants' | 'admin'>('none');
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  // Sync progress every 10 seconds
  useEffect(() => {
    if (!room?.mediaId) return;

    const interval = setInterval(() => {
      const { currentTime, duration } = useRoomStore.getState().videoState;
      if (currentTime > 0 && duration > 0) {
        apiService.updateWatchProgress(room.mediaId, currentTime, duration).catch(() => {});
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [room?.mediaId]);

  useEffect(() => {
    const loadRoom = async () => {
      if (roomId && !room) {
        await joinRoom(roomId);
      }
      setIsLoading(false);
    };
    loadRoom();

    return () => {
      leaveRoom();
    };
  }, [roomId]);

  const media = room?.mediaId ? getMediaById(room.mediaId) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loading text="Cargando sala..." />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 text-lg">Sala no encontrada</p>
          <Button
            variant="primary"
            onClick={() => navigate('/')}
            className="mt-4"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="h-14 bg-[#1a1a1a] border-b border-white/10 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-white font-medium truncate max-w-[150px] sm:max-w-xs lg:max-w-md">
              {media?.title || room.mediaTitle || 'Sala de visualización'}
            </h1>
            {room.code && (
              <p className="text-white/50 text-xs">Código: {room.code}</p>
            )}
          </div>
        </div>

        {/* Desktop toggles */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={() => setShowChat(!showChat)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              showChat
                ? 'bg-[#ff6b35] text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            )}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              showParticipants
                ? 'bg-[#ff6b35] text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            )}
          >
            <Users className="w-5 h-5" />
          </button>
          {isHost && (
            <button
              onClick={() => setShowAdmin(!showAdmin)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showAdmin
                  ? 'bg-yellow-500 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
            >
              <Crown className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Mobile panel selector */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={() => setMobilePanel(mobilePanel === 'chat' ? 'none' : 'chat')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              mobilePanel === 'chat'
                ? 'bg-[#ff6b35] text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            )}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobilePanel(mobilePanel === 'participants' ? 'none' : 'participants')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              mobilePanel === 'participants'
                ? 'bg-[#ff6b35] text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            )}
          >
            <Users className="w-5 h-5" />
          </button>
          {isHost && (
            <button
              onClick={() => setMobilePanel(mobilePanel === 'admin' ? 'none' : 'admin')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                mobilePanel === 'admin'
                  ? 'bg-yellow-500 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
            >
              <Crown className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video player - takes full width on mobile when panel is closed */}
        <div className={cn(
          'flex-1 transition-all duration-300',
          mobilePanel !== 'none' && 'lg:flex-1'
        )}>
          <VideoPlayer
            src={room?.mediaId ? apiService.getStreamUrl(room.mediaId) : undefined}
            poster={media?.backdrop || media?.poster}
            className="h-full w-full"
            onToggleChat={() => setShowChat(!showChat)}
            onToggleParticipants={() => setShowParticipants(!showParticipants)}
            showChat={showChat}
            showParticipants={showParticipants}
          />
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:flex">
          {showChat && (
            <div className="w-80 border-l border-white/10">
              <ChatPanel isOpen={showChat} onClose={() => setShowChat(false)} />
            </div>
          )}
          {showParticipants && (
            <div className="w-72 border-l border-white/10">
              <RoomInfo isOpen={showParticipants} onClose={() => setShowParticipants(false)} />
            </div>
          )}
          {isHost && showAdmin && (
            <div className="w-72 border-l border-white/10">
              <AdminPanel />
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom panel - collapsible */}
      {mobilePanel !== 'none' && (
        <div className={cn(
          'lg:hidden fixed left-0 right-0 bg-[#1a1a1a] border-t border-white/10 z-50 transition-all duration-300',
          isPanelExpanded ? 'bottom-0 h-[80vh]' : 'bottom-0 h-[40vh]'
        )}>
          {/* Panel header with drag handle */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
            <button
              onClick={() => setIsPanelExpanded(!isPanelExpanded)}
              className="flex items-center gap-2 text-white/50 hover:text-white"
            >
              {isPanelExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              <span className="text-sm">{isPanelExpanded ? 'Reducir' : 'Expandir'}</span>
            </button>
            <button
              onClick={() => {
                setMobilePanel('none');
                setIsPanelExpanded(false);
              }}
              className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Panel content */}
          <div className="h-[calc(100%-44px)]">
            {mobilePanel === 'chat' && <ChatPanel isOpen onClose={() => setMobilePanel('none')} />}
            {mobilePanel === 'participants' && <RoomInfo isOpen onClose={() => setMobilePanel('none')} />}
            {mobilePanel === 'admin' && isHost && <AdminPanel />}
          </div>
        </div>
      )}

      {/* Mobile panel indicator */}
      {mobilePanel === 'none' && (
        <div className="lg:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full">
          <span className="text-white/60 text-xs">Usa los botones arriba para abrir chat</span>
        </div>
      )}
    </div>
  );
};

export default WatchPage;
