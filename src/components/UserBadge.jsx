import { useState } from "react";

export default function UserBadge({ userName, onChangeName }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(userName);

  function save() {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== userName) onChangeName(trimmed);
    else setValue(userName);
  }

  return (
    <div className="user-badge">
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
      ) : (
        <button className="user-badge__name" onClick={() => setEditing(true)} title="Change your name">
          {userName}
        </button>
      )}
    </div>
  );
}
