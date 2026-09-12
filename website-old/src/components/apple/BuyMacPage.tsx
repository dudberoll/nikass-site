import AppleGlobalNav from "./AppleGlobalNav";
import FinanceBanner from "./FinanceBanner";
import Shelf from "./Shelf";
import { MAC_GUIDE_CARDS, MAC_PRODUCTS, MAC_SAVING_CARDS } from "./apple-data";

const localNav = ["All Models", "Ways to Save", "Shopping Guides", "Limited-Time Offer", "The Apple Store Difference", "Accessories", "Mac for Business", "Setup and Support", "The Mac Experience", "Special Stores"];

function MacProductCard({ card }: { card: (typeof MAC_PRODUCTS)[number] }) {
  return (
    <article className={`mac-product-card ${card.tone ? `mac-${card.tone}` : ""}`}>
      <div className="mac-product-art">
        {card.image ? <img alt="" src={card.image} /> : <div className="display-art"><span>{card.title.includes("XDR") ? "XDR" : "Display"}</span></div>}
      </div>
      <div className="mac-product-copy">
        {card.eyebrow && <p className="card-eyebrow">{card.eyebrow}</p>}
        <h3>{card.title}</h3>
        <p className="card-price">{card.price}</p>
        <div className="swatches" aria-label={`${card.title} colours`}><i /><i /><i /><i /></div>
        <div className="mac-card-actions"><a className="card-link" href="#">Take a closer look <span>›</span></a><a className="buy-button" href="#">{card.action}</a></div>
      </div>
    </article>
  );
}

function MacEditorialCard({ card }: { card: (typeof MAC_SAVING_CARDS)[number] | (typeof MAC_GUIDE_CARDS)[number] }) {
  return (
    <article className={`mac-editorial-card mac-editorial-${card.tone}`}>
      <div className="mac-editorial-copy">
        {card.eyebrow && <p className="card-eyebrow">{card.eyebrow}</p>}
        <h3>{card.title}</h3>
        {card.body && <p className="card-body">{card.body}</p>}
        <a className="card-link" href="#">Learn more <span>›</span></a>
      </div>
      <img alt="" src={card.image} />
    </article>
  );
}

export default function BuyMacPage() {
  return (
    <div className="apple-page" id="top">
      <AppleGlobalNav />
      <FinanceBanner />
      <main id="main-content">
        <section className="apple-hero mac-hero">
          <div className="hero-inner">
            <div><p className="hero-eyebrow">Mac</p><h1>Shop Mac</h1></div>
            <div className="hero-side-links">
              <a href="#guides">Connect with a Specialist <span>›</span></a>
              <a href="#guides">Find an Apple Store <span>›</span></a>
            </div>
          </div>
        </section>
        <nav aria-label="Mac sections" className="local-nav">
          <div className="local-nav-inner">
            {localNav.map((item, index) => <a className={index === 0 ? "is-current" : ""} href={index < 3 ? `#${["models", "savings", "guides"][index]}` : "#top"} key={item}>{item}</a>)}
          </div>
        </nav>

        <div id="models">
          <Shelf title="All models. Take your pick." className="models-shelf" itemClassName="models-row">
            {MAC_PRODUCTS.map((card) => <MacProductCard card={card} key={card.title} />)}
          </Shelf>
        </div>

        <div id="savings">
          <Shelf title="Ways to save. Find what works for you." className="savings-shelf" itemClassName="mac-editorial-row">
            {MAC_SAVING_CARDS.map((card) => <MacEditorialCard card={card} key={card.title} />)}
          </Shelf>
        </div>

        <div id="guides">
          <Shelf title="Shopping guides. Can’t decide? Start here." className="guides-shelf" itemClassName="mac-editorial-row">
            {MAC_GUIDE_CARDS.map((card) => <MacEditorialCard card={card} key={card.title} />)}
          </Shelf>
        </div>
      </main>
      <a aria-label="Chat with an Apple Specialist" className="specialist-bubble" href="#guides">
        <img alt="" src="/sites/www.apple.com-6cb27140/shared/specialist-avatar.png" />
      </a>
    </div>
  );
}
