import { Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { STORE_MEGA_MENU } from "./apple-data";

const navItems = ["Store", "Mac", "iPad", "iPhone", "Watch", "Vision", "AirPods", "TV & Home", "Entertainment", "Accessories", "Support"];

function AppleMark() {
  return (
    <svg aria-label="Apple" className="apple-mark" role="img" viewBox="0 0 24 30">
      <path d="M16.9 7.1c1.2-1.5 2-3.5 1.8-5.5-1.8.1-3.9 1.2-5.1 2.6-1.1 1.2-2 3.2-1.7 5.1 1.9.1 3.8-1 5-2.2ZM21.7 16.1c0-3.9 3.2-5.8 3.4-5.9-1.8-2.6-4.6-3-5.7-3-2.4-.3-4.8 1.4-6 1.4-1.2 0-3-1.4-5-1.4-2.6 0-5.1 1.6-6.5 3.9-2.8 4.8-.7 11.9 2 15.8 1.4 1.9 2.9 4.1 5 4 2-.1 2.8-1.3 5.2-1.3 2.5 0 3.2 1.3 5.3 1.2 2.2 0 3.6-1.9 4.9-3.9 1.5-2.2 2.1-4.4 2.1-4.5-.1 0-4.7-1.8-4.7-6.3Z" transform="translate(-1 -1) scale(.8)" />
    </svg>
  );
}

export default function AppleGlobalNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <div className="apple-nav-wrap" onMouseLeave={() => setMenuOpen(false)}>
      <header className="apple-global-nav">
        <div className="apple-nav-inner">
          <a aria-label="Apple home" className="apple-home" href="/uk/store"><AppleMark /></a>
          <nav id="global-navigation" aria-label="Global" className={`apple-nav-links ${mobileOpen ? "is-mobile-open" : ""}`}>
            {navItems.map((item) => item === "Store" ? (
              <button
                aria-expanded={menuOpen}
                className={`apple-nav-link apple-nav-store ${menuOpen ? "is-active" : ""}`}
                key={item}
                onClick={() => {
                  if (window.matchMedia("(max-width: 760px)").matches) {
                    window.location.assign("/uk/store");
                    return;
                  }
                  setMenuOpen((open) => !open);
                }}
                onMouseEnter={() => setMenuOpen(true)}
                type="button"
              >{item}</button>
            ) : (
              <a className="apple-nav-link" href={item === "Mac" ? "/uk/shop/buy-mac" : "#"} key={item}>{item}</a>
            ))}
          </nav>
          <div className="apple-nav-actions">
            <button aria-label="Search" className="icon-button" type="button"><Search size={19} strokeWidth={1.8} /></button>
            <button aria-label="Shopping Bag" className="icon-button" type="button"><ShoppingBag size={19} strokeWidth={1.8} /></button>
            <button aria-controls="global-navigation" aria-expanded={mobileOpen} aria-label={mobileOpen ? "Close navigation" : "Open navigation"} className="mobile-menu-button" onClick={() => setMobileOpen((open) => !open)} type="button">
              {mobileOpen ? <X size={20} /> : <span className="menu-bars"><i /><i /></span>}
            </button>
          </div>
        </div>
      </header>
      {menuOpen && (
        <div className="store-mega-menu is-open" onMouseEnter={() => setMenuOpen(true)}>
          <div className="store-mega-inner">
            {STORE_MEGA_MENU.map((column) => (
              <div className="store-mega-column" key={column.label}>
                <p className="mega-label">{column.label}</p>
                <div className="mega-items">
                  {column.items.map((item, index) => (
                    <a className={index === 0 && column.label === "Shop" ? "mega-item mega-item-featured" : "mega-item"} href="#" key={item}>{item}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
