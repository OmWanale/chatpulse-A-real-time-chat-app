let ioInstance = null;

export const initSocket = (io) => {
  ioInstance = io;
};

export const getIo = () => ioInstance;

export const emitToChatUsers = (chat, event, payload, excludeUserId) => {
  if (!ioInstance || !chat?.users || !Array.isArray(chat.users)) {
    return;
  }

  chat.users.forEach((user) => {
    const userId = String(user?._id || user?.id || user || "");
    if (!userId || (excludeUserId && String(excludeUserId) === userId)) {
      return;
    }

    ioInstance.to(userId).emit(event, payload);
  });
};
