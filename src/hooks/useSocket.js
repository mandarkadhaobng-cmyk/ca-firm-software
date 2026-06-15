import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';
import useNotificationStore from '../store/notificationStore';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

let socket = null;

export const useSocket = () => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || connectedRef.current) return;
    connectedRef.current = true;

    socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => console.log('Socket connected'));
    socket.on('disconnect', () => { connectedRef.current = false; });

    socket.on('notification', (notification) => {
      addNotification(notification);
      // Browser notification (if permitted)
      if (Notification.permission === 'granted') {
        new Notification(notification.title, { body: notification.message, icon: '/favicon.svg' });
      }
    });

    return () => {
      socket?.disconnect();
      socket = null;
      connectedRef.current = false;
    };
  }, [isAuthenticated, accessToken]); // eslint-disable-line

  return socket;
};

export const getSocket = () => socket;
