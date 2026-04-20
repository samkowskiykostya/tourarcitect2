
import { Tour, Card } from '../types';

const STORAGE_KEY = 'tour_architect_data';

// Robust ID generator
const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const tourService = {
  getTours: (): Tour[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to load tours", e);
      return [];
    }
  },

  saveTours: (tours: Tour[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tours));
    } catch (e) {
      // If quota is exceeded, we log it. In a real app, we'd alert the user.
      console.error("Failed to save to localStorage (likely quota exceeded)", e);
    }
  },

  createTour: (name?: string): Tour => {
    const defaultName = `New Tour ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const newTour: Tour = {
      id: generateId(),
      name: name || defaultName,
      createdAt: Date.now(),
      cards: [],
    };
    const tours = tourService.getTours();
    tourService.saveTours([newTour, ...tours]);
    return newTour;
  },

  updateTour: (updatedTour: Tour) => {
    const tours = tourService.getTours();
    const index = tours.findIndex(t => t.id === updatedTour.id);
    if (index !== -1) {
      tours[index] = updatedTour;
      tourService.saveTours(tours);
    }
  },

  deleteTour: (id: string) => {
    const tours = tourService.getTours();
    tourService.saveTours(tours.filter(t => t.id !== id));
  }
};
