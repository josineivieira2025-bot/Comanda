import { io } from 'socket.io-client';
import { getToken } from './api';

let socket;
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const socketUrl = import.meta.env.VITE_SOCKET_URL || apiUrl.replace(/\/api\/?$/, '');

export function connectSocket(onChange) {
  if (socket) socket.disconnect();
  socket = io(socketUrl, { auth: { token: getToken() }, transports: ['websocket', 'polling'] });
  ['table:changed', 'table:deleted', 'tab:opened', 'tab:closed', 'order:created', 'order:updated', 'stock:changed', 'service:called', 'service:resolved'].forEach(event => socket.on(event, payload => onChange(event, payload)));
  return () => socket?.disconnect();
}
