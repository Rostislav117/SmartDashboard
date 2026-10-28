import { io } from 'socket.io-client';

// Один сокет на вкладку; роль и комната отправляются при каждом (пере)подключении
export function createSocket(join) {
  const socket = io({ reconnectionDelay: 1000, reconnectionDelayMax: 3000 });
  socket.on('connect', () => socket.emit('join', join));
  return socket;
}
