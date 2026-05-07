import clsx from "clsx";
import { useEffect, useState } from "react";

function formatChatTime(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function Sidebar({
  chats,
  selectedChatId,
  onSelectChat,
  onStartDirectChat,
  onSearchUsers,
  onOpenGroupModal,
  onOpenAiChat,
  currentUser,
  socketConnected,
  loadingStartChat
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearching(false);
      setSearchError("");
      return undefined;
    }

    let isCancelled = false;
    setSearching(true);
    setSearchError("");

    const handle = setTimeout(async () => {
      try {
        const results = await onSearchUsers(trimmed);
        if (!isCancelled) {
          setSearchResults(Array.isArray(results) ? results : []);
        }
      } catch (error) {
        if (!isCancelled) {
          setSearchError(error.message || "Unable to search users");
        }
      } finally {
        if (!isCancelled) {
          setSearching(false);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(handle);
    };
  }, [searchTerm, onSearchUsers]);

  const handleSelectUser = async (userId) => {
    if (!userId) {
      return;
    }

    await onStartDirectChat(userId);
    setSearchTerm("");
    setSearchResults([]);
  };

  return (
    <aside className="flex h-full flex-col rounded-3xl border border-white/10 bg-app-900/80 p-4 backdrop-blur shadow-pane">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-100">Pulse Chat</h1>
        <p className="mt-1 text-xs text-slate-400">{currentUser?.name}</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-app-700/70 px-3 py-1 text-xs text-slate-200">
          <span
            className={clsx(
              "h-2.5 w-2.5 rounded-full",
              socketConnected ? "bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.9)]" : "bg-slate-500"
            )}
          />
          {socketConnected ? "Realtime online" : "Connecting..."}
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">Start direct chat</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAiChat}
              className="rounded-full border border-white/10 bg-app-800 px-3 py-1 text-[11px] text-slate-200 hover:bg-app-700"
            >
              Grok AI
            </button>
            <button
              type="button"
              onClick={onOpenGroupModal}
              className="rounded-full border border-white/10 bg-app-800 px-3 py-1 text-[11px] text-slate-200 hover:bg-app-700"
            >
              + Create group
            </button>
          </div>
        </div>
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-app-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-400"
          placeholder="Search by name or email"
        />
        {searchError ? <p className="text-xs text-rose-300">{searchError}</p> : null}
        <div className="space-y-2">
          {searching ? <p className="text-xs text-slate-400">Searching...</p> : null}
          {searchResults.map((user) => (
            <button
              key={user._id}
              type="button"
              onClick={() => handleSelectUser(user._id)}
              disabled={loadingStartChat}
              className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-app-800/60 px-3 py-2 text-left transition hover:border-white/10 hover:bg-app-700/70 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div>
                <p className="text-sm text-slate-100">{user.name}</p>
                <p className="text-[11px] text-slate-400">{user.email}</p>
              </div>
              <span className="text-xs text-violet-300">Open</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {chats.map((chat) => (
          <button
            key={chat._id}
            type="button"
            onClick={() => onSelectChat(chat._id)}
            className={clsx(
              "w-full rounded-2xl border p-3 text-left transition-all duration-200",
              String(selectedChatId) === String(chat._id)
                ? "border-violet-400/40 bg-app-600/70"
                : "border-transparent bg-app-800/40 hover:border-white/10 hover:bg-app-700/60"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-app-500 text-xs font-semibold text-slate-100">
                {getInitials(chat.displayName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-100">{chat.displayName}</p>
                    <div className="flex items-center gap-2">
                      {chat.unreadCount > 0 ? (
                        <span className="rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {chat.unreadCount}
                        </span>
                      ) : null}
                      <span className="text-[11px] text-slate-400">{formatChatTime(chat.updatedAt)}</span>
                    </div>
                </div>
                <p className="mt-1 truncate text-xs text-slate-300">
                  {chat.latestMessage?.content || "No messages yet"}
                </p>
                  {chat.isGroupChat ? (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-app-700/70 px-2 py-0.5 text-[10px] text-slate-300">
                      Group
                    </span>
                  ) : null}
              </div>
            </div>
          </button>
        ))}

        {chats.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-app-800/30 p-4 text-xs text-slate-400">
            No chats yet. Start one by searching for a user.
          </div>
        ) : null}
      </div>
    </aside>
  );
}

