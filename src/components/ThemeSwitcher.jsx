import { useState } from "react";
import { THEMES, applyTheme, getStoredTheme } from "../lib/theme";

export default function ThemeSwitcher() {
  const [active, setActive] = useState(getStoredTheme());

  function choose(id) {
    setActive(applyTheme(id));
  }

  return (
    <div className="theme-switcher" role="group" aria-label="Color theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`theme-swatch ${active === t.id ? "theme-swatch--active" : ""}`}
          style={{ background: t.swatch }}
          title={t.label}
          aria-label={`${t.label} theme`}
          aria-pressed={active === t.id}
          onClick={() => choose(t.id)}
        />
      ))}
    </div>
  );
}
