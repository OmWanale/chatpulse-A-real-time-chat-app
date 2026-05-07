export default function MessageInput({ value, onChange, onSend, disabled }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSend();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type a message..."
        className="flex-1 rounded-xl border border-white/10 bg-app-800 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-400"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Send
      </button>
    </form>
  );
}

