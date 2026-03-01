import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMediaStore } from '@/stores/mediaStore';
import { apiService } from '@/lib/api-service';
import { useAuthStore } from '@/stores/authStore';

export const useMedia = () => {
  const {
    movies,
    series,
    trending,
    continueWatching,
    favorites,
    selectedMedia,
    isLoading,
    error,
    setMovies,
    setSeries,
    setTrending,
    setContinueWatching,
    setSelectedMedia,
    setLoading,
    setError,
    addToFavorites,
    removeFromFavorites,
    getMediaById,
    getMediaByType,
    getFavoritesList,
    isFavorite,
  } = useMediaStore();

  // Load real media data
  const loadMovies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getMediaList('movies');
      setMovies(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setMovies]);

  const loadSeries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getMediaList('series');
      setSeries(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setSeries]);

  const loadTrending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getMediaList('all');
      const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 10);
      setTrending(shuffled);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setTrending]);

  const loadContinueWatching = useCallback(async () => {
    try {
      const data = await apiService.getContinueWatching(10);
      const mediaPromises = data
        .filter((item) => !item.completed && item.currentTime > 0)
        .slice(0, 5)
        .map(async (item) => {
          try {
            return await apiService.getMediaDetails(item.mediaId);
          } catch {
            return null;
          }
        });
      
      const mediaData = (await Promise.all(mediaPromises)).filter((m): m is NonNullable<Awaited<ReturnType<typeof apiService.getMediaDetails>>> => m !== null);
      setContinueWatching(mediaData);
    } catch (err) {
      console.error('Error loading continue watching:', err);
    }
  }, [setContinueWatching]);

  const loadMediaDetails = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getMediaDetails(id);
      setSelectedMedia(data);
      return data;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setSelectedMedia]);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (hasFetchedRef.current && movies.length > 0) return;
    hasFetchedRef.current = true;
    loadMovies();
    loadSeries();
    loadTrending();
    loadContinueWatching();
  }, [isAuthenticated]);

  const allMedia = useMemo(() => [...movies, ...series], [movies, series]);

  const getByGenre = useCallback((genre: string) => {
    return allMedia.filter((m) => m.genres?.includes(genre));
  }, [allMedia]);

  const getByYear = useCallback((year: number) => {
    return allMedia.filter((m) => m.year === year);
  }, [allMedia]);

  const getByRating = useCallback((minRating: number) => {
    return allMedia.filter((m) => m.rating >= minRating);
  }, [allMedia]);

  const searchMedia = useCallback((query: string) => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return allMedia.filter(
      (m) =>
        m.title?.toLowerCase().includes(lowerQuery) ||
        m.genres?.some((g) => g.toLowerCase().includes(lowerQuery)) ||
        m.synopsis?.toLowerCase().includes(lowerQuery)
    );
  }, [allMedia]);

  const toggleFavorite = useCallback((mediaId: string) => {
    if (isFavorite(mediaId)) {
      removeFromFavorites(mediaId);
    } else {
      addToFavorites(mediaId);
    }
  }, [isFavorite, addToFavorites, removeFromFavorites]);

  return {
    // Data
    movies,
    series,
    trending,
    continueWatching,
    favorites,
    selectedMedia,
    isLoading,
    error,
    allMedia,
    
    // Actions
    setMovies,
    setSeries,
    loadMovies,
    loadSeries,
    loadTrending,
    loadContinueWatching,
    loadMediaDetails,
    setSelectedMedia,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    
    // Getters
    getMediaById,
    getMediaByType,
    getFavoritesList,
    isFavorite,
    getByGenre,
    getByYear,
    getByRating,
    searchMedia,
  };
};
