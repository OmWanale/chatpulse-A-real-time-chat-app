import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function GroupChatModal({
  isOpen,
  mode,
  selectedChat,
  currentUserId,
  onClose,
  onSearchUsers,
  onCreateGroup,
  onRenameGroup,
  onAddUser,
  onRemoveUser
}) {
  const [groupName, setGroupName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const isManageMode = mode === "manage";

  const isAdmin = useMemo(() => {
    if (!selectedChat || !currentUserId) {
      return false;
    }

    const adminId = selectedChat.groupAdmin?._id || selectedChat.groupAdmin;
    return String(adminId) === String(currentUserId);
  }, [currentUserId, selectedChat]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setError("");
    setSearchTerm("");
    setSearchResults([]);

    if (isManageMode) {
      setGroupName(selectedChat?.chatName || "");
      setSelectedUsers([]);
    } else {
      setGroupName("");
      setSelectedUsers([]);
    }
  }, [isOpen, isManageMode, selectedChat]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setSearchResults([]);
      return undefined;
    }

    let isCancelled = false;
    setSearching(true);

    const handle = setTimeout(async () => {
      try {
        const results = await onSearchUsers(trimmed);
        if (!isCancelled) {
          setSearchResults(Array.isArray(results) ? results : []);
        }
      } catch (searchError) {
        if (!isCancelled) {
          setError(searchError.message || "Unable to search users");
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
  }, [isOpen, searchTerm, onSearchUsers]);

  if (!isOpen) {
    return null;
  }

  const handleSelectUser = (user) => {
    if (isManageMode) {
      handleAddUser(user);
      return;
    }

    setSelectedUsers((previous) => {
      if (previous.some((item) => String(item._id) === String(user._id))) {
        return previous;
      }
      return [...previous, user];
    });
  };

  const handleRemoveSelected = (userId) => {
    setSelectedUsers((previous) => previous.filter((user) => String(user._id) !== String(userId)));
  };

  const handleCreate = async () => {
    setError("");
    const trimmedName = groupName.trim();

    if (!trimmedName || selectedUsers.length < 2) {
      setError("Provide a group name and pick at least 2 users.");
      return;
    }

    setSubmitting(true);
    try {
      await onCreateGroup({
        name: trimmedName,
        users: selectedUsers.map((user) => user._id)
      });
      onClose();
    } catch (submitError) {
      setError(submitError.message || "Unable to create group");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRename = async () => {
    if (!selectedChat) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onRenameGroup({
        chatId: selectedChat._id,
        chatName: groupName.trim()
      });
    } catch (submitError) {
      setError(submitError.message || "Unable to rename group");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveUser = async (user) => {
    if (!selectedChat) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onRemoveUser({
        chatId: selectedChat._id,
        userId: user._id
      });
    } catch (submitError) {
      setError(submitError.message || "Unable to update group");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddUser = async (user) => {
    if (!selectedChat) {
      return;
    }

    const alreadyMember = selectedChat.users?.some((item) => String(item._id) === String(user._id));
    if (alreadyMember) {
      setError("User already in this group.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onAddUser({
        chatId: selectedChat._id,
        userId: user._id
      });
    } catch (submitError) {
      setError(submitError.message || "Unable to add user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedChat) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onRemoveUser({
        chatId: selectedChat._id,
        userId: currentUserId
      });
      onClose();
    } catch (submitError) {
      setError(submitError.message || "Unable to leave group");
    } finally {
      setSubmitting(false);
    }
  };

  const members = selectedChat?.users || [];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 py-6">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-app-900 p-6 shadow-pane">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">
            {isManageMode ? "Manage group" : "Create a group"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-app-800 px-2 py-1 text-xs text-slate-200 hover:bg-app-700"
          >
            Close
          </button>
        </div>

        {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs text-slate-400">Group name</label>
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              disabled={isManageMode && !isAdmin}
              className="mt-2 w-full rounded-xl border border-white/10 bg-app-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Design Squad"
            />
          </div>

          {isManageMode ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Members</p>
                <span className="text-[11px] text-slate-500">{members.length} users</span>
              </div>
              <div className="grid gap-2">
                {members.map((member) => {
                  const isSelf = String(member._id) === String(currentUserId);
                  const canRemove = isAdmin || isSelf;

                  return (
                    <div key={member._id} className="flex items-center justify-between rounded-2xl bg-app-800/60 px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-app-600 text-xs font-semibold text-slate-100">
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <p className="text-sm text-slate-100">{member.name}</p>
                          <p className="text-[11px] text-slate-400">{member.email}</p>
                        </div>
                      </div>
                      {canRemove ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(member)}
                          disabled={submitting}
                          className={clsx(
                            "rounded-lg border border-rose-400/40 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200 hover:bg-rose-500/20",
                            submitting && "cursor-not-allowed opacity-60"
                          )}
                        >
                          {isSelf ? "Leave" : "Remove"}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-slate-400">Selected users</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedUsers.length === 0 ? (
                  <span className="text-xs text-slate-500">No users picked yet.</span>
                ) : (
                  selectedUsers.map((user) => (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => handleRemoveSelected(user._id)}
                      className="inline-flex items-center gap-2 rounded-full bg-app-700 px-3 py-1 text-xs text-slate-100"
                    >
                      {user.name}
                      <span className="text-[10px] text-slate-400">x</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400">Find users</label>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-app-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-400"
              placeholder="Search by name or email"
            />
            <div className="mt-2 space-y-2">
              {searching ? <p className="text-xs text-slate-400">Searching...</p> : null}
              {searchResults.map((user) => (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => (isManageMode ? handleAddUser(user) : handleSelectUser(user))}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-app-800/60 px-3 py-2 text-left transition hover:border-white/10 hover:bg-app-700/70"
                >
                  <div>
                    <p className="text-sm text-slate-100">{user.name}</p>
                    <p className="text-[11px] text-slate-400">{user.email}</p>
                  </div>
                  <span className="text-xs text-violet-300">{isManageMode ? "Add" : "Select"}</span>
                </button>
              ))}
            </div>
          </div>

          {isManageMode ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={handleRename}
                  disabled={submitting || !groupName.trim()}
                  className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save name
                </button>
              ) : (
                <p className="text-xs text-slate-500">Only admins can rename or add users.</p>
              )}
              {!isAdmin ? (
                <button
                  type="button"
                  onClick={handleLeaveGroup}
                  disabled={submitting}
                  className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Leave group
                </button>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create group"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
