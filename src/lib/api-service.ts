import { API_BASE_URL } from '@/lib/constants';
import { useAuthStore } from '@/stores/authStore';
import type { MediaType } from '@/types';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return useAuthStore.getState().token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.error || `HTTP Error ${response.status}`
      );
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{ token: string; user: { id: string; email: string; name: string } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
  }

  async register(email: string, password: string, name: string) {
    return this.request<{ token: string; user: { id: string; email: string; name: string } }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }
    );
  }

  async logout() {
    return this.request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    });
  }

  // Media endpoints
  async getMediaList(type: 'movies' | 'series' | 'all' = 'movies', skip = 0, limit = 20) {
    const data = await this.request<Array<{
      id: string;
      title: string;
      poster: string;
      backdrop: string;
      rating: number;
      year: number;
      duration: number;
      synopsis: string;
      genres: string[];
    }>>(`/media/list?type=${type}&skip=${skip}&limit=${limit}`);
    
    return data.map(item => ({
      ...item,
      type: (type === 'series' ? 'series' : 'movie') as MediaType,
    }));
  }

  async getMediaDetails(id: string, mediaType: MediaType = 'movie') {
    const data = await this.request<{
      id: string;
      title: string;
      poster: string;
      backdrop: string;
      rating: number;
      year: number;
      duration: number;
      synopsis: string;
      genres: string[];
      cast: Array<{ name: string; role: string }>;
      subtitles: string[];
      audio: string[];
    }>(`/media/${id}`);
    
    return {
      ...data,
      type: mediaType,
      cast: data.cast?.map((c, i) => ({
        id: `cast-${i}`,
        name: c.name,
        character: c.role,
      })),
    };
  }

  // Room endpoints
  async createRoom(mediaId: string, name: string, isPrivate: boolean = true) {
    return this.request<{ roomId: string; code: string }>('/rooms', {
      method: 'POST',
      body: JSON.stringify({ mediaId, name, isPrivate }),
    });
  }

  async getRoomByCode(code: string) {
    return this.request<{
      roomId: string;
      code: string;
      mediaId: string;
      host: { id: string; name: string; avatar?: string; isWatching: boolean };
      participants: Array<{ id: string; name: string; avatar?: string; isWatching: boolean }>;
      createdAt: string;
    }>(`/rooms/${code}`);
  }

  async deleteRoom(roomId: string) {
    return this.request<{ success: boolean }>(`/rooms/${roomId}`, {
      method: 'DELETE',
    });
  }

  async kickUser(roomId: string, userId: string) {
    return this.request<{ success: boolean }>(`/rooms/${roomId}/kick/${userId}`, {
      method: 'POST',
    });
  }

  // Friends endpoints
  async getFriends() {
    return this.request<Array<{
      id: string;
      name: string;
      avatar?: string;
      status: 'online' | 'offline';
      watching?: string;
    }>>('/friends');
  }

  async getPendingRequests() {
    return this.request<Array<{
      id: string;
      name: string;
      avatar?: string;
    }>>('/friends/pending');
  }

  async sendFriendRequest(userId: string) {
    return this.request<{ success: boolean }>(`/friends/${userId}/add`, {
      method: 'POST',
    });
  }

  async acceptFriendRequest(userId: string) {
    return this.request<{ success: boolean }>(`/friends/${userId}/accept`, {
      method: 'POST',
    });
  }

  async removeFriend(userId: string) {
    return this.request<{ success: boolean }>(`/friends/${userId}`, {
      method: 'DELETE',
    });
  }

  // Notifications endpoints
  async getNotifications(unreadOnly: boolean = false, limit: number = 50) {
    return this.request<Array<{
      id: string;
      type: string;
      data: Record<string, unknown>;
      read: boolean;
      created_at: string;
    }>>(`/notifications?unread=${unreadOnly}&limit=${limit}`);
  }

  async getUnreadCount() {
    return this.request<{ count: number }>('/notifications/unread-count');
  }

  async markNotificationAsRead(id: string) {
    return this.request<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead() {
    return this.request<{ success: boolean }>('/notifications/read-all', {
      method: 'PUT',
    });
  }

  async deleteNotification(id: string) {
    return this.request<{ success: boolean }>(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  // Watch History endpoints
  async getWatchHistory(limit: number = 20, offset: number = 0) {
    return this.request<Array<{
      mediaId: string;
      currentTime: number;
      duration: number;
      completed: boolean;
      lastWatchedAt: string;
    }>>(`/history?limit=${limit}&offset=${offset}`);
  }

  async getContinueWatching(limit: number = 10) {
    return this.request<Array<{
      mediaId: string;
      currentTime: number;
      duration: number;
      completed: boolean;
      lastWatchedAt: string;
    }>>(`/history/continue?limit=${limit}`);
  }

  async updateWatchProgress(mediaId: string, currentTime: number, duration: number) {
    return this.request<{ success: boolean }>('/history/progress', {
      method: 'POST',
      body: JSON.stringify({ mediaId, currentTime, duration }),
    });
  }

  async getWatchProgress(mediaId: string) {
    return this.request<{
      mediaId: string;
      currentTime: number;
      duration: number;
      completed: boolean;
      lastWatchedAt: string;
    }>(`/history/progress/${mediaId}`);
  }

  // Stream endpoint
  getStreamUrl(mediaId: string, quality: string = '720p'): string {
    const token = this.getToken();
    return `${this.baseUrl}/stream/${mediaId}?quality=${quality}&token=${token || ''}`;
  }
}

export const apiService = new ApiService();
export default apiService;
