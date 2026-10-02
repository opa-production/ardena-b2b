import { useEffect, useId, useRef, useState } from "react";
import { fetchClients } from "../lib/api";
import "../components/dropdown.css";

/**
 * The customer name on the booking form, with the business's own clients
 * offered as it is typed.
 *
 * Clients come from two places, the clients page and bookings, and they are
 * one list. So a name that is already a client pops up here and picking it
 * fills in the rest; a name that isn't simply becomes a new client when the
 * booking is saved (the server adds it). Either way nobody has to visit the
 * clients page first.
 *
 * It searches the server rather than a list held in memory, so it works the
 * same with ten clients or ten thousand. Typing never waits on it: the field
 * is an ordinary text input and the suggestions are an extra.
 *
 * `onPick(client)` is called with the client chosen, and with `null` when the
 * name is then changed to something else, so the form knows whether it is
 * still booking that client.
 */
export default function ClientNameField({ id, name = "customer", placeholder, onPick }) {
  const listId = useId();
  const [value, setValue] = useState("");
  const [matches, setMatches] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [picked, setPicked] = useState(null);
  // The search that has come back for what is in the field now. Until it has,
  // the "new client" note stays quiet rather than flashing while they type.
  const [searched, setSearched] = useState("");
  const wrapRef = useRef(null);

  const query = value.trim();

  useEffect(() => {
    if (picked || query.length < 2) {
      setMatches([]);
      setSearched("");
      return undefined;
    }
    let alive = true;
    const t = setTimeout(() => {
      fetchClients({ search: query, per_page: 6 })
        .then((res) => {
          if (!alive) return;
          const rows = Array.isArray(res) ? res : res?.data || [];
          setMatches(rows);
          setSearched(query);
          setActive(-1);
        })
        .catch(() => {
          // Suggestions are a convenience. If they can't load, the field is
          // still a field and the server still sorts out the client.
          if (alive) setMatches([]);
        });
    }, 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, picked]);

  // Close when the click or the focus goes anywhere else.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function pick(client) {
    setValue(client.name);
    setPicked(client);
    setOpen(false);
    setMatches([]);
    onPick?.(client);
  }

  function handleChange(e) {
    const next = e.target.value;
    setValue(next);
    setOpen(true);
    // Changing the name after picking someone means it is no longer them.
    if (picked && next.trim() !== picked.name) {
      setPicked(null);
      onPick?.(null);
    }
  }

  function handleKeyDown(e) {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault(); // pick the client, don't submit the form
      pick(matches[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && !picked && matches.length > 0;
  // An exact name among the matches is someone already on file even if the
  // suggestion wasn't clicked; the server pairs them up by name and phone.
  const known = matches.some((c) => c.name.trim().toLowerCase() === query.toLowerCase());
  const isNew = !picked && query.length >= 2 && searched === query && !known;

  return (
    <div ref={wrapRef}>
      {/* Only the input and its list are in the anchored box, so the list
          opens directly under the input and not under the note below it. */}
      <div className="client-suggest">
      <input
        id={id}
        name={name}
        type="text"
        placeholder={placeholder}
        required
        autoComplete="off"
        value={value}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
      />
      {showList && (
        <div className="dd-panel" id={listId} role="listbox" aria-label="Clients with this name">
          {matches.map((c, i) => (
            <button
              type="button"
              key={c.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={"dd-option" + (i === active ? " selected" : "")}
              // mousedown, not click: the input's blur would close the list first
              onMouseDown={(e) => {
                e.preventDefault();
                pick(c);
              }}
            >
              <span>{c.name}</span>
              <span className="client-suggest-meta">{c.phone}</span>
            </button>
          ))}
        </div>
      )}
      </div>
      {picked && <p className="field-note">Existing client. Their details are filled in below.</p>}
      {isNew && <p className="field-note">New client. They will be added to your clients when you save.</p>}
    </div>
  );
}
