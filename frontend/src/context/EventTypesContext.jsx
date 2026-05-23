import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../api/eventTypes';
import toast from 'react-hot-toast';

const EventTypesContext = createContext();

export function EventTypesProvider({ children }) {
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEventTypes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getEventTypes();
      setEventTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to load event types.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEventTypes();
  }, [fetchEventTypes]);

  return (
    <EventTypesContext.Provider value={{ eventTypes, loading, refreshEventTypes: fetchEventTypes }}>
      {children}
    </EventTypesContext.Provider>
  );
}

export function useEventTypes() {
  const context = useContext(EventTypesContext);
  if (context === undefined) {
    throw new Error('useEventTypes must be used within an EventTypesProvider');
  }
  return context;
}
