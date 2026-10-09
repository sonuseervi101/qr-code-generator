import { QR_TYPES } from "../utils/constants";

// Recently saved/downloaded codes. They live in localStorage, so they survive a refresh.
export default function RecentList({ items, onReuse, onDelete, onClear }) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>Recent</h2>
        {items.length > 0 && (
          <button type="button" className="text-btn" onClick={onClear}>
            Clear all
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="muted">Codes you download or save appear here, even after you refresh the page.</p>
      ) : (
        <ul className="recent">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className="recent-item" onClick={() => onReuse(item)} title="Load this code again">
                <img src={item.thumb} alt="" width="44" height="44" />
                <span>
                  <strong>{QR_TYPES.find((t) => t.id === item.type)?.label ?? item.type}</strong>
                  <small>{describe(item)}</small>
                </span>
              </button>
              <button type="button" className="icon-btn" aria-label="Delete from recent" onClick={() => onDelete(item.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function describe(item) {
  const d = item.data;
  if (item.type === "url") return d.url;
  if (item.type === "text") return d.text;
  if (item.type === "email") return d.email;
  if (item.type === "phone") return d.phone;
  return d.ssid;
}
