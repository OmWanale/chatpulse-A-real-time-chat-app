import clsx from "clsx";

function formatMessageTime(timestamp) {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function MessageBubble({ message, isOwn, isAi }) {
  const senderName = typeof message.sender === "object" ? message.sender?.name : "";

  return (
    <div className={clsx("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-[75%] rounded-2xl px-4 py-2.5 shadow transition-all duration-150",
          isAi
            ? "rounded-bl-md bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white"
            : isOwn
              ? "rounded-br-md bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
              : "rounded-bl-md bg-app-700 text-slate-100"
        )}
      >
        {!isOwn && senderName ? (
          <p className={clsx("mb-1 text-[11px] font-semibold", isAi ? "text-white/80" : "text-slate-300")}>
            {senderName}
          </p>
        ) : null}
        <p className="text-sm leading-relaxed">{message.content}</p>
        <p className={clsx("mt-1 text-[10px]", isOwn ? "text-violet-100/90" : "text-slate-400")}>
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

