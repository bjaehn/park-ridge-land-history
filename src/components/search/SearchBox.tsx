import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { useParkRidgeContext } from "../../contexts/ParkRidgeDataContext";
import { ROUTES } from "../../lib/routes";
import { formatAddress, formatPin } from "../../lib/formatters";
import type { ParcelFeature } from "../../lib/parcelTypes";
import "./SearchBox.css";

type Props = {
  placeholder?: string;
  autoFocus?: boolean;
  onSelect?: (pin: string) => void;
};

export function SearchBox({ placeholder = "Search by address or PIN…", autoFocus, onSelect }: Props) {
  const navigate = useNavigate();
  const { searchParcels, isLoading } = useParkRidgeContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ParcelFeature[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const found = searchParcels(query);
    setResults(found);
    setOpen(found.length > 0);
    setActiveIndex(-1);
  }, [query, searchParcels]);

  function handleSelect(parcel: ParcelFeature) {
    const pin = parcel.properties.pin_normalized || parcel.properties.pin_original;
    if (!pin) return;
    setQuery("");
    setOpen(false);
    if (onSelect) {
      onSelect(pin);
    } else {
      navigate(ROUTES.property(pin));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      handleSelect(results[activeIndex]);
      return;
    }
    if (results.length === 1) {
      handleSelect(results[0]);
      return;
    }
    if (query.trim()) {
      navigate(`${ROUTES.search}?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
      setOpen(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const showDropdown = open && results.length > 0;

  return (
    <div className="search-box-wrap">
      <form className="search-box-form" onSubmit={handleSubmit} role="search" aria-label="Property search">
        <div className="search-box-input-wrap">
          <Search className="search-box-icon" size={18} strokeWidth={2.2} aria-hidden="true" />
          <input
            ref={inputRef}
            className="search-box-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={isLoading ? "Loading data…" : placeholder}
            disabled={isLoading}
            autoFocus={autoFocus}
            autoComplete="off"
            aria-label="Search by address or PIN"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
          />
          <button className="search-box-submit" type="submit" aria-label="Search">
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        {showDropdown && (
          <ul
            ref={listRef}
            className="search-dropdown"
            role="listbox"
            aria-label="Search results"
          >
            {results.slice(0, 8).map((parcel, i) => {
              const pin = parcel.properties.pin_normalized || parcel.properties.pin_original || "";
              return (
                <li
                  key={pin}
                  role="option"
                  aria-selected={i === activeIndex}
                  className={`search-dropdown-item${i === activeIndex ? " is-active" : ""}`}
                  onMouseDown={() => handleSelect(parcel)}
                >
                  <span className="search-dropdown-address">
                    {formatAddress(parcel.properties.address)}
                  </span>
                  <span className="search-dropdown-meta">
                    {formatPin(pin)}
                    {parcel.properties.year_built ? ` · Built ${parcel.properties.year_built}` : ""}
                  </span>
                </li>
              );
            })}
            {results.length > 8 && (
              <li className="search-dropdown-more">
                {results.length - 8} more — press Enter to see all
              </li>
            )}
          </ul>
        )}
      </form>
    </div>
  );
}
