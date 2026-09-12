import AppleGlobalNav from "./AppleGlobalNav";
import FinanceBanner from "./FinanceBanner";
import Shelf from "./Shelf";
import { PRODUCT_NAV_ITEMS, STORE_DIFFERENCE_CARDS, STORE_HELP_CARDS, STORE_LATEST_CARDS } from "./apple-data";

function StoreProductCard({ name, image }: { name: string; image?: string }) {
  return (
    <a className="product-nav-card" href="#latest">
      <div className="product-nav-image">
        {image ? <img alt="" src={image} /> : <span className="product-placeholder">{name === "Apple Vision Pro" ? "◉" : name === "AirTag" ? "◌" : name === "Apple TV 4K" ? "▣" : name === "HomePod" ? "◉" : "✦"}</span>}
      </div>
      <span>{name}</span>
    </a>
  );
}

function LatestCard({ card }: { card: (typeof STORE_LATEST_CARDS)[number] }) {
  return (
    <article className={`latest-card latest-${card.tone}`}>
      <div className="latest-copy">
        {card.eyebrow && <p className="card-eyebrow">{card.eyebrow}</p>}
        <h3>{card.title}</h3>
        <p className="card-body">{card.body}</p>
        {card.price && <p className="card-price">{card.price}</p>}
        <a className="card-link" href="#">Learn more <span>›</span></a>
      </div>
      {card.image && <img alt="" className="latest-image" src={card.image} />}
      {!card.image && <div aria-hidden="true" className="latest-art"><span>{card.title === "iPhone 17 Pro" ? "iPhone" : card.title === "MacBook Neo" ? "Mac" : card.title === "iPhone 17e" ? "iPhone" : "AirPods"}</span></div>}
    </article>
  );
}

function DifferenceCard({ card }: { card: (typeof STORE_DIFFERENCE_CARDS)[number] }) {
  return (
    <article className={`difference-card difference-${card.tone}`}>
      <div className="difference-icon" aria-hidden="true">{card.tone === "gradient" ? "↗" : card.tone === "yellow" ? "✦" : card.tone === "green" ? "◒" : "＋"}</div>
      <h3>{card.title}</h3>
      {card.body && <p>{card.body}</p>}
      <a className="card-link" href="#">Learn more <span>›</span></a>
    </article>
  );
}

function HelpCard({ card }: { card: (typeof STORE_HELP_CARDS)[number] }) {
  return (
    <article className={`help-card help-${card.tone}`}>
      <div className="help-copy">
        {card.eyebrow && <p className="card-eyebrow">{card.eyebrow}</p>}
        <h3>{card.title}</h3>
        {card.body && <p className="card-body">{card.body}</p>}
        <a className="card-link" href="#">Learn more <span>›</span></a>
      </div>
      <img alt="" className="help-image" src={card.image} />
    </article>
  );
}

export default function StorePage() {
  return (
    <div className="apple-page" id="top">
      <AppleGlobalNav />
      <FinanceBanner />
      <main id="main-content">
        <section className="apple-hero store-hero">
          <div className="hero-inner">
            <div>
              <p className="hero-eyebrow">Shop</p>
              <h1>The best way to buy the products you love.</h1>
            </div>
            <div className="hero-side-links">
              <a href="#help">Shop one on one with a Specialist <span>›</span></a>
              <a href="#help">Find an Apple Store <span>›</span></a>
            </div>
          </div>
        </section>

        <section className="product-shelf" aria-label="Shop products">
          <div className="product-shelf-row">
            {PRODUCT_NAV_ITEMS.map((item) => <StoreProductCard key={item.name} {...item} />)}
          </div>
        </section>

        <div id="latest">
          <Shelf title="The latest. Take a look at what’s new right now." className="latest-shelf" itemClassName="latest-row">
            {STORE_LATEST_CARDS.map((card) => <LatestCard card={card} key={card.title} />)}
          </Shelf>
        </div>

        <Shelf title="The Apple Store difference. Even more reasons to shop with us." className="difference-shelf" itemClassName="difference-row">
          {STORE_DIFFERENCE_CARDS.map((card) => <DifferenceCard card={card} key={card.title} />)}
        </Shelf>

        <div id="help">
          <Shelf title="Help is here. Whenever and however you need it." className="help-shelf" itemClassName="help-row">
            {STORE_HELP_CARDS.map((card) => <HelpCard card={card} key={card.title} />)}
          </Shelf>
        </div>
      </main>
      <a aria-label="Chat with an Apple Specialist" className="specialist-bubble" href="#help">
        <img alt="" src="/sites/www.apple.com-6cb27140/shared/specialist-avatar.png" />
      </a>
    </div>
  );
}
