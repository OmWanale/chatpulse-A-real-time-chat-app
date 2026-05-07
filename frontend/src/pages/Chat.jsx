import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatWindow from "../components/ChatWindow.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  accessChat,
  accessAiChat,
  addToGroup,
  createGroupChat,
  fetchChats,
  fetchMessages,
  removeFromGroup,
  renameGroupChat,
  searchUsers,
  sendAiMessageRequest,
  sendMessageRequest
} from "../services/api.js";
import { connectSocket, disconnectSocket, getSocket } from "../services/socket.js";
import GroupChatModal from "../components/GroupChatModal.jsx";

function mapChatForUi(chat, currentUserId) {
  const otherUser =
    !chat.isGroupChat && Array.isArray(chat.users)
      ? chat.users.find((user) => String(user?._id) !== String(currentUserId))
      : null;

  const displayName = chat.isGroupChat ? chat.chatName || "Group Chat" : otherUser?.name || "Direct Chat";
  const isAiChat = !chat.isGroupChat && otherUser?.name === "Grok AI";

  return {
    ...chat,
    displayName,
    unreadCount: chat.unreadCount || 0,
    isAiChat
  };
}

function upsertChatWithLatestMessage(existingChats, incomingMessage, currentUserId) {
  const chatId = String(incomingMessage?.chat?._id || incomingMessage?.chat || "");

  if (!chatId) {
    return existingChats;
  }

  const existingIndex = existingChats.findIndex((chat) => String(chat._id) === chatId);

  if (existingIndex < 0) {
    if (typeof incomingMessage.chat !== "object") {
      return existingChats;
    }

    const chatToInsert = mapChatForUi(
      {
        ...incomingMessage.chat,
        latestMessage: incomingMessage
      },
      currentUserId
    );

    return [chatToInsert, ...existingChats];
  }

  const updatedChat = mapChatForUi(
    {
      ...existingChats[existingIndex],
      latestMessage: incomingMessage,
      updatedAt: incomingMessage.createdAt || new Date().toISOString()
    },
    currentUserId
  );

  const next = [...existingChats];
  next.splice(existingIndex, 1);
  next.unshift(updatedChat);
  return next;
}

export default function Chat() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingStartChat, setLoadingStartChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showManageGroup, setShowManageGroup] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [error, setError] = useState("");

  const typingRef = useRef(false);
  const lastTypingTimeRef = useRef(0);
  const activeChatIdRef = useRef("");
  const messagesEndRef = useRef(null);

  const selectedChat = useMemo(
    () => chats.find((chat) => String(chat._id) === String(selectedChatId)) || null,
    [chats, selectedChatId]
  );

  useEffect(() => {
    activeChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
    if (!selectedChatId) {
      setAiTyping(false);
    }
  }, [selectedChatId]);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    let isCancelled = false;

    const loadChats = async () => {
      setLoadingChats(true);
      setError("");

      try {
        const data = await fetchChats(token);
        if (isCancelled) {
          return;
        }

        const mapped = (Array.isArray(data) ? data : []).map((chat) => mapChatForUi(chat, user?._id));
        setChats(mapped);
        if (mapped.length > 0) {
          setSelectedChatId(mapped[0]._id);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError.message || "Unable to load chats");
        }
      } finally {
        if (!isCancelled) {
          setLoadingChats(false);
        }
      }
    };

    void loadChats();

    return () => {
      isCancelled = true;
    };
  }, [token, user?._id, navigate]);

  useEffect(() => {
    if (!user?._id) {
      return undefined;
    }

    const socket = connectSocket(user);
    if (!socket) {
      return undefined;
    }

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    const onTyping = (chatId) => {
      if (String(chatId) === String(activeChatIdRef.current)) {
        setIsTyping(true);
      }
    };
    const onStopTyping = (chatId) => {
      if (String(chatId) === String(activeChatIdRef.current)) {
        setIsTyping(false);
      }
    };
    const onMessageReceived = (incomingMessage) => {
      const incomingChatId = String(incomingMessage?.chat?._id || incomingMessage?.chat || "");

      setChats((previous) => {
        const updated = upsertChatWithLatestMessage(previous, incomingMessage, user._id);

        if (incomingChatId && incomingChatId !== String(activeChatIdRef.current)) {
          return updated.map((chat) =>
            String(chat._id) === incomingChatId
              ? { ...chat, unreadCount: (chat.unreadCount || 0) + 1 }
              : chat
          );
        }

        return updated;
      });

      if (incomingChatId === String(activeChatIdRef.current)) {
        setMessages((previous) => [...previous, incomingMessage]);
      }
    };
    const onAiTyping = ({ chatId }) => {
      if (String(chatId) === String(activeChatIdRef.current)) {
        setAiTyping(true);
      }
    };
    const onAiStopTyping = ({ chatId }) => {
      if (String(chatId) === String(activeChatIdRef.current)) {
        setAiTyping(false);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connected", onConnect);
    socket.on("typing", onTyping);
    socket.on("stop typing", onStopTyping);
    socket.on("message received", onMessageReceived);
    socket.on("ai typing", onAiTyping);
    socket.on("ai stop typing", onAiStopTyping);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connected", onConnect);
      socket.off("typing", onTyping);
      socket.off("stop typing", onStopTyping);
      socket.off("message received", onMessageReceived);
      socket.off("ai typing", onAiTyping);
      socket.off("ai stop typing", onAiStopTyping);
      disconnectSocket();
    };
  }, [user]);

  useEffect(() => {
    if (!selectedChatId || !token) {
      setMessages([]);
      return;
    }

    let isCancelled = false;

    const loadMessages = async () => {
      setLoadingMessages(true);
      setError("");
      setIsTyping(false);
      setAiTyping(false);
      setMessages([]);

      try {
        const data = await fetchMessages(token, selectedChatId);
        if (!isCancelled) {
          setMessages(Array.isArray(data) ? data : []);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError.message || "Unable to load messages");
        }
      } finally {
        if (!isCancelled) {
          setLoadingMessages(false);
        }
      }
    };

    const socket = getSocket();
    socket?.emit("join chat", selectedChatId);
    void loadMessages();

    return () => {
      isCancelled = true;
    };
  }, [selectedChatId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, loadingMessages]);

  const handleDraftChange = (value) => {
    setDraftMessage(value);

    const socket = getSocket();
    if (!socketConnected || !socket || !selectedChatId) {
      return;
    }

    if (!typingRef.current) {
      typingRef.current = true;
      socket.emit("typing", selectedChatId);
    }

    lastTypingTimeRef.current = Date.now();
    setTimeout(() => {
      const timeDiff = Date.now() - lastTypingTimeRef.current;
      if (timeDiff >= 2500 && typingRef.current) {
        socket.emit("stop typing", selectedChatId);
        typingRef.current = false;
      }
    }, 2500);
  };

  const handleSendMessage = async () => {
    const rawContent = draftMessage.trim();
    const isAiCommand = rawContent.startsWith("/ai ") || rawContent === "/ai";
    const content = isAiCommand ? rawContent.replace(/^\/ai\s*/i, "").trim() : rawContent;

    if (!content || !selectedChatId || !token) {
      return;
    }

    const socket = getSocket();
    if (typingRef.current && socket) {
      socket.emit("stop typing", selectedChatId);
      typingRef.current = false;
    }

    setSendingMessage(true);
    setDraftMessage("");

    try {
      if (isAiCommand || selectedChat?.isAiChat) {
        setAiTyping(true);
        const aiPayload = await sendAiMessageRequest(token, {
          message: content,
          chatId: selectedChatId
        });

        if (aiPayload?.userMessage) {
          setMessages((previous) => [...previous, aiPayload.userMessage]);
          setChats((previous) => upsertChatWithLatestMessage(previous, aiPayload.userMessage, user?._id));
        }

        if (aiPayload?.aiMessage) {
          setMessages((previous) => [...previous, aiPayload.aiMessage]);
          setChats((previous) => upsertChatWithLatestMessage(previous, aiPayload.aiMessage, user?._id));
        }
      } else {
        const message = await sendMessageRequest(token, {
          content,
          chatId: selectedChatId
        });

        setMessages((previous) => [...previous, message]);
        setChats((previous) => upsertChatWithLatestMessage(previous, message, user?._id));
        socket?.emit("new message", message);
      }
    } catch (sendError) {
      setDraftMessage(rawContent);
      setError(sendError.message || "Unable to send message");
    } finally {
      setAiTyping(false);
      setSendingMessage(false);
    }
  };

  const handleStartDirectChat = async (userId) => {
    if (!token || !userId) {
      return;
    }

    setLoadingStartChat(true);
    setError("");

    try {
      const chat = await accessChat(token, userId);
      const mappedChat = mapChatForUi(chat, user?._id);
      setChats((previous) => {
        const index = previous.findIndex((item) => String(item._id) === String(mappedChat._id));
        if (index === -1) {
          return [mappedChat, ...previous];
        }

        const next = [...previous];
        next.splice(index, 1);
        next.unshift(mappedChat);
        return next;
      });
      setSelectedChatId(mappedChat._id);
    } catch (startError) {
      setError(startError.message || "Unable to open direct chat");
    } finally {
      setLoadingStartChat(false);
    }
  };

  const handleOpenAiChat = async () => {
    if (!token) {
      return;
    }

    try {
      const chat = await accessAiChat(token);
      const mappedChat = mapChatForUi(chat, user?._id);
      setChats((previous) => {
        const index = previous.findIndex((item) => String(item._id) === String(mappedChat._id));
        if (index === -1) {
          return [mappedChat, ...previous];
        }

        const next = [...previous];
        next.splice(index, 1);
        next.unshift(mappedChat);
        return next;
      });
      handleSelectChat(mappedChat._id);
    } catch (openError) {
      setError(openError.message || "Unable to open Grok AI chat");
    }
  };

  const handleSelectChat = (chatId) => {
    setSelectedChatId(chatId);
    setChats((previous) =>
      previous.map((chat) =>
        String(chat._id) === String(chatId) ? { ...chat, unreadCount: 0 } : chat
      )
    );
  };

  const handleSearchUsers = useCallback(
    async (query) => {
      if (!token || !query) {
        return [];
      }

      const data = await searchUsers(token, query);
      return Array.isArray(data) ? data : [];
    },
    [token]
  );

  const handleCreateGroup = async ({ name, users }) => {
    if (!token) {
      return;
    }

    const newChat = await createGroupChat(token, { name, users });
    const mappedChat = mapChatForUi(newChat, user?._id);

    setChats((previous) => [mappedChat, ...previous]);
    setSelectedChatId(mappedChat._id);
  };

  const handleRenameGroup = async ({ chatId, chatName }) => {
    if (!token) {
      return;
    }

    const updatedChat = await renameGroupChat(token, { chatId, chatName });
    const mappedChat = mapChatForUi(updatedChat, user?._id);

    setChats((previous) =>
      previous.map((chat) => (String(chat._id) === String(chatId) ? { ...mappedChat } : chat))
    );
  };

  const handleAddUserToGroup = async ({ chatId, userId }) => {
    if (!token) {
      return;
    }

    const updatedChat = await addToGroup(token, { chatId, userId });
    const mappedChat = mapChatForUi(updatedChat, user?._id);

    setChats((previous) =>
      previous.map((chat) => (String(chat._id) === String(chatId) ? { ...mappedChat } : chat))
    );
  };

  const handleRemoveUserFromGroup = async ({ chatId, userId }) => {
    if (!token) {
      return;
    }

    const updatedChat = await removeFromGroup(token, { chatId, userId });
    const mappedChat = mapChatForUi(updatedChat, user?._id);

    if (String(userId) === String(user?._id)) {
      setChats((previous) => previous.filter((chat) => String(chat._id) !== String(chatId)));
      setSelectedChatId("");
      return;
    }

    setChats((previous) =>
      previous.map((chat) => (String(chat._id) === String(chatId) ? { ...mappedChat } : chat))
    );
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <main className="h-full p-4 md:p-6">
      <div className="mx-auto mb-3 flex max-w-7xl justify-end">
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-white/10 bg-app-800/70 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-app-700"
        >
          Logout
        </button>
      </div>

      <div className="mx-auto grid h-[calc(100%-38px)] max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <Sidebar
          chats={chats}
          selectedChatId={selectedChatId}
          onSelectChat={handleSelectChat}
          onStartDirectChat={handleStartDirectChat}
          onSearchUsers={handleSearchUsers}
          onOpenGroupModal={() => setShowCreateGroup(true)}
          onOpenAiChat={handleOpenAiChat}
          currentUser={user}
          socketConnected={socketConnected}
          loadingStartChat={loadingStartChat}
        />
        <div className="flex h-full flex-col gap-2">
          {error ? (
            <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </div>
          ) : null}

          {loadingChats ? (
            <section className="grid h-full place-items-center rounded-3xl border border-white/10 bg-app-900/70">
              <p className="text-sm text-slate-400">Loading chats...</p>
            </section>
          ) : (
            <ChatWindow
              selectedChat={selectedChat}
              messages={messages}
              currentUserId={user?._id}
              draftMessage={draftMessage}
              onDraftChange={handleDraftChange}
              onSendMessage={handleSendMessage}
              isTyping={isTyping}
              aiTyping={aiTyping}
              socketConnected={socketConnected}
              messagesEndRef={messagesEndRef}
              sendingMessage={sendingMessage || loadingMessages}
              onOpenGroupManage={() => setShowManageGroup(true)}
            />
          )}
        </div>
      </div>
      <GroupChatModal
        isOpen={showCreateGroup}
        mode="create"
        currentUserId={user?._id}
        onClose={() => setShowCreateGroup(false)}
        onSearchUsers={handleSearchUsers}
        onCreateGroup={handleCreateGroup}
      />
      <GroupChatModal
        isOpen={showManageGroup && Boolean(selectedChat)}
        mode="manage"
        selectedChat={selectedChat}
        currentUserId={user?._id}
        onClose={() => setShowManageGroup(false)}
        onSearchUsers={handleSearchUsers}
        onRenameGroup={handleRenameGroup}
        onAddUser={handleAddUserToGroup}
        onRemoveUser={handleRemoveUserFromGroup}
      />
    </main>
  );
}

