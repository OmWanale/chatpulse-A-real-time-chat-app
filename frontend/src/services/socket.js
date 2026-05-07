import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socketInstance = null;

export function connectSocket(user) {
  if (!user?._id) {
    return null;
  }

  if (socketInstance) {
    socketInstance.disconnect();
  }

  socketInstance = io(SOCKET_URL, {
    transports: ["websocket"],
    auth: {
      userId: user._id
    }
  });

  socketInstance.on("connect", () => {
    socketInstance.emit("setup", user);
  });

  return socketInstance;
}

export function getSocket() {
  return socketInstance;
}

export function disconnectSocket() {
  if (!socketInstance) {
    return;
  }

  socketInstance.disconnect();
  socketInstance = null;
}

