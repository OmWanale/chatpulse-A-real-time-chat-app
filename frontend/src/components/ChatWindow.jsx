import MessageBubble from "./MessageBubble.jsx";
import MessageInput from "./MessageInput.jsx";

function resolveStatusLabel(selectedChat, socketConnected) {
  if (selectedChat?.isGroupChat) {
    return "Group conversation";
  }

  return socketConnected ? "Online now" : "Offline";
}

export default function ChatWindow({
  selectedChat,
  messages,
  currentUserId,
  draftMessage,
  onDraftChange,
  onSendMessage,
  isTyping,
  aiTyping,
  socketConnected,
  messagesEndRef,
  sendingMessage,
  onOpenGroupManage
}) {
  if (!selectedChat) {
    return (
      <section className="grid h-full place-items-center rounded-3xl border border-white/10 bg-app-900/70 p-6 shadow-pane">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-100">Welcome to Pulse Chat</h2>
          <p className="mt-2 text-sm text-slate-400">Select or start a conversation to begin messaging.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col rounded-3xl border border-white/10 bg-app-900/70 shadow-pane">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">{selectedChat.displayName}</h2>
            <p className="mt-0.5 text-xs text-slate-400">{resolveStatusLabel(selectedChat, socketConnected)}</p>
          </div>
          {selectedChat.isGroupChat ? (
            <button
              type="button"
              onClick={onOpenGroupManage}
              className="rounded-full border border-white/10 bg-app-800 px-3 py-1 text-[11px] text-slate-200 hover:bg-app-700"
            >
              Manage
            </button>
          ) : null}
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-app-700/70 px-3 py-1 text-[11px] text-slate-200">
          <span className={`h-2.5 w-2.5 rounded-full ${socketConnected ? "bg-violet-400" : "bg-slate-500"}`} />
          {socketConnected ? "Live" : "Reconnect"}
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.map((message) => {
          const senderId =
            typeof message.sender === "object" ? String(message.sender?._id || "") : String(message.sender || "");
          const senderName = typeof message.sender === "object" ? message.sender?.name : "";
          const isAi = senderName === "Grok AI";
          return (
            <MessageBubble
              key={message._id}
              message={message}
              isOwn={senderId === String(currentUserId)}
              isAi={isAi}
            />
          );
        })}
        {isTyping ? <p className="text-xs text-violet-300">typing...</p> : null}
        {aiTyping ? <p className="text-xs text-fuchsia-300">Grok is typing...</p> : null}
        <div ref={messagesEndRef} />
      </div>

      <footer className="border-t border-white/10 p-4">
        <MessageInput
          value={draftMessage}
          onChange={onDraftChange}
          onSend={onSendMessage}
          disabled={sendingMessage}
        />
      </footer>
    </section>
  );
}

