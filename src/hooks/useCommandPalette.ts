import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchMusicQuery } from '@/services/SpotifyAPI';
import { ITrack } from '@/types';
import { useTheme } from '@/context/themeContext';
import { useGlobalContext } from '@/context/globalContext';

export interface SearchResult {
  id: string;
  type: 'track' | 'album' | 'artist' | 'playlist' | 'command';
  title: string;
  subtitle: string;
  image?: string;
  data: any;
  action?: () => void;
}

export interface Command {
  id: string;
  title: string;
  subtitle: string;
  category: 'navigation' | 'player' | 'search' | 'settings' | 'help';
  action: () => void;
  keywords: string[];
  shortcut?: string;
  icon?: string;
}

interface UseCommandPaletteProps {
  audioPlayer?: any;
  onItemSelect?: (item: SearchResult) => void;
  onClose?: () => void;
}

export const useCommandPalette = ({
  audioPlayer,
  onItemSelect,
  onClose
}: UseCommandPaletteProps) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { showSidebar, setShowSidebar } = useGlobalContext();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('nextsound_search_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentSearches(parsed.queries || []);
        setSearchHistory(parsed.items || []);
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    }
  }, []);

  // Search for music when query changes
  const {
    data: musicSearchData,
    isLoading: isMusicSearchLoading,
    error: musicSearchError
  } = useSearchMusicQuery(
    {
      query: query.trim(),
      type: 'track',
      limit: 8
    },
    {
      skip: !query.trim()
    }
  );

  // Define app commands
  const commands: Command[] = useMemo(() => [
    // Navigation Commands
    {
      id: 'nav-home',
      title: 'Go to Home',
      subtitle: 'Navigate to the homepage',
      category: 'navigation',
      action: () => navigate('/'),
      keywords: ['home', 'homepage', 'main', 'start'],
      icon: '🏠'
    },


    // Settings Commands
    {
      id: 'settings-theme',
      title: 'Toggle Dark Mode',
      subtitle: `Switch to ${theme === 'Dark' ? 'light' : 'dark'} theme`,
      category: 'settings',
      action: () => setTheme(theme === 'Dark' ? 'Light' : 'Dark'),
      keywords: ['theme', 'dark', 'light', 'mode', 'appearance'],
      shortcut: '⌘+D',
      icon: theme === 'Dark' ? '☀️' : '🌙'
    },
    {
      id: 'settings-sidebar',
      title: showSidebar ? 'Hide Sidebar' : 'Show Sidebar',
      subtitle: 'Toggle navigation sidebar',
      category: 'settings',
      action: () => setShowSidebar(!showSidebar),
      keywords: ['sidebar', 'navigation', 'menu', 'toggle'],
      icon: showSidebar ? '◀️' : '▶️'
    },

    // Help Commands
    {
      id: 'help-shortcuts',
      title: 'Keyboard Shortcuts',
      subtitle: 'View all available keyboard shortcuts',
      category: 'help',
      action: () => {
        // TODO: Implement shortcuts modal
        console.log('Show shortcuts modal');
      },
      keywords: ['help', 'shortcuts', 'keys', 'commands'],
      shortcut: '⌘+?',
      icon: '⌨️'
    }
  ], [navigate, theme, showSidebar, setTheme, setShowSidebar]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return [];

    const searchTerm = query.toLowerCase();

    return commands
      .filter(command =>
        command.title.toLowerCase().includes(searchTerm) ||
        command.subtitle.toLowerCase().includes(searchTerm) ||
        command.keywords.some(keyword => keyword.includes(searchTerm))
      )
      .map(command => ({
        id: command.id,
        type: 'command' as const,
        title: command.title,
        subtitle: command.subtitle,
        image: undefined,
        data: command,
        action: command.action
      }));
  }, [query, commands]);

  // Transform music search results
  const musicResults: SearchResult[] = useMemo(() => {
    if (!musicSearchData?.results) return [];

    return musicSearchData.results.map((track: ITrack) => ({
      id: track.spotify_id || track.id,
      type: 'track' as const,
      title: track.title || track.name || 'Unknown Track',
      subtitle: `${track.artist || 'Unknown Artist'} • ${track.album || 'Unknown Album'}`,
      image: track.poster_path,
      data: track
    }));
  }, [musicSearchData]);

  // Combine all results
  const allResults = useMemo(() => {
    if (!query.trim()) return [];

    // Show music results first, then relevant commands
    return [...musicResults, ...filteredCommands];
  }, [query, musicResults, filteredCommands]);

  // Handle item selection
  const handleItemSelect = (item: SearchResult) => {
    // Add to search history
    if (query.trim()) {
      const newSearches = [query.trim(), ...recentSearches.filter(s => s !== query.trim())].slice(0, 10);
      setRecentSearches(newSearches);

      const newHistory = [item, ...searchHistory.filter(h => h.id !== item.id)].slice(0, 20);
      setSearchHistory(newHistory);

      // Save to localStorage
      localStorage.setItem('nextsound_search_history', JSON.stringify({
        queries: newSearches,
        items: newHistory
      }));
    }

    // Execute action based on item type
    if (item.type === 'command' && item.action) {
      item.action();
    }

    // Call optional callback
    onItemSelect?.(item);

    // Close palette and reset
    onClose?.();
    setQuery('');
    setSelectedIndex(0);
  };

  // Get recent items for empty state
  const recentItems = useMemo(() => {
    if (query.trim()) return [];
    return searchHistory.slice(0, 5);
  }, [query, searchHistory]);

  // Loading state
  const isLoading = isMusicSearchLoading && query.trim();

  return {
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    allResults,
    recentItems,
    recentSearches,
    isLoading,
    error: musicSearchError,
    handleItemSelect,
    clearHistory: () => {
      setRecentSearches([]);
      setSearchHistory([]);
      localStorage.removeItem('nextsound_search_history');
    }
  };
};