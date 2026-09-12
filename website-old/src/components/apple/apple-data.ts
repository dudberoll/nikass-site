export type ProductNavItem = {
  name: string;
  image?: string;
};

export type MegaMenuColumn = {
  label: string;
  items: string[];
};

export const PRODUCT_NAV_ITEMS: ProductNavItem[] = [
  { name: "Mac", image: "/sites/www.apple.com-6cb27140/shared/store-mac.webp" },
  { name: "iPhone", image: "/sites/www.apple.com-6cb27140/shared/store-iphone.webp" },
  { name: "iPad", image: "/sites/www.apple.com-6cb27140/shared/store-ipad.webp" },
  { name: "Apple Watch", image: "/sites/www.apple.com-6cb27140/shared/store-watch.webp" },
  { name: "Apple Vision Pro" },
  { name: "AirPods", image: "/sites/www.apple.com-6cb27140/shared/store-airpods.webp" },
  { name: "AirTag" },
  { name: "Apple TV 4K" },
  { name: "HomePod" },
  { name: "Accessories" },
  { name: "Apple Gift Card" },
];

export const STORE_MEGA_MENU: MegaMenuColumn[] = [
  {
    label: "Shop",
    items: ["Shop the Latest", "Mac", "iPad", "iPhone", "Apple Watch", "Apple Vision Pro", "AirPods", "Accessories"],
  },
  {
    label: "Quick Links",
    items: ["Find a Store", "Order Status", "Apple Trade In", "Financing", "Personal Setup", "University Student Offer"],
  },
  {
    label: "Shop Special Stores",
    items: ["Certified Refurbished", "Education", "Business"],
  },
];

export const STORE_LATEST_CARDS = [
  { eyebrow: "PRE-ORDER NOW", title: "Mac mini", body: "Now with M6 and M5 Pro.", price: "From £899 or £27.63/mo. for 36 mo. at 6.9% interest", image: "/sites/www.apple.com-6cb27140/store/latest-mac-mini.webp", tone: "light" },
  { eyebrow: "PRE-ORDER NOW", title: "Mac Studio", body: "Now with M5 Max and M5 Ultra.", price: "From £2,499 or £76.80/mo. for 36 mo. at 6.9% interest", image: "/sites/www.apple.com-6cb27140/store/latest-mac-studio.webp", tone: "light" },
  { eyebrow: "", title: "iPhone 17 Pro", body: "All out Pro.", price: "From £1,099 or £36.63/mo. for 30 months at 0% interest", image: "/sites/www.apple.com-6cb27140/shared/store-iphone.webp", tone: "dark" },
  { eyebrow: "", title: "MacBook Neo", body: "The magic of Mac at a surprising price.", price: "From £699 or £21.48/mo. for 36 months at 6.9% interest", image: "/sites/www.apple.com-6cb27140/mac/all-macbook-neo.webp", tone: "blue" },
  { eyebrow: "LIMITED TIME", title: "Buy Mac or iPad with education savings.", body: "And get a gift card from £80 to £120.", price: "", image: "/sites/www.apple.com-6cb27140/shared/store-ipad.webp", tone: "warm" },
  { eyebrow: "", title: "iPhone 17e", body: "Feature stacked. Value packed.", price: "From £599 or £24.95/mo. for 24 months at 0% interest", image: "/sites/www.apple.com-6cb27140/shared/store-iphone.webp", tone: "silver" },
  { eyebrow: "FREE ENGRAVING", title: "AirPods Max 2", body: "New intelligent features. More immersive listening.", price: "From £499 or £124.75/mo. for 4 months at 0% interest", image: "/sites/www.apple.com-6cb27140/shared/store-airpods.webp", tone: "cloud" },
  { eyebrow: "", title: "MacBook Pro", body: "Now with M5, M5 Pro and M5 Max.", price: "From £1,999 or £61.44/mo. for 36 months at 6.9% interest", image: "/sites/www.apple.com-6cb27140/mac/all-macbook-pro.webp", tone: "dark" },
  { eyebrow: "", title: "MacBook Air", body: "Now supercharged by M5.", price: "From £1,299 or £39.92/mo. for 36 months at 6.9% interest", image: "/sites/www.apple.com-6cb27140/mac/all-macbook-air.webp", tone: "blue" },
  { eyebrow: "", title: "iPad Air", body: "Now supercharged by M4.", price: "From £749 or £62.41/mo. for 12 months at 0% interest", image: "/sites/www.apple.com-6cb27140/shared/store-ipad.webp", tone: "silver" },
  { eyebrow: "", title: "Apple Watch Series 11", body: "The ultimate way to watch your health.", price: "From £369 or £30.75/mo. for 12 months at 0% interest", image: "/sites/www.apple.com-6cb27140/shared/store-watch.webp", tone: "warm" },
  { eyebrow: "", title: "iPhone 17", body: "Magichromatic.", price: "From £799 or £26.63/mo. for 30 months at 0% interest", image: "/sites/www.apple.com-6cb27140/shared/store-iphone.webp", tone: "cloud" },
  { eyebrow: "", title: "iPhone Air", body: "The thinnest iPhone ever.", price: "From £999 or £33.30/mo. for 30 months at 0% interest", image: "/sites/www.apple.com-6cb27140/shared/store-iphone.webp", tone: "blue" },
  { eyebrow: "", title: "Apple Watch SE 3", body: "Walk it. Talk it. Track it. Love it.", price: "From £219 or £18.25/mo. for 12 months at 0% interest", image: "/sites/www.apple.com-6cb27140/shared/store-watch.webp", tone: "silver" },
];

export const STORE_DIFFERENCE_CARDS = [
  { title: "Spread the cost with the Flexible Finance Account.", body: "Pay for your next Apple products with low rates and interest-free options.", tone: "gradient" },
  { title: "Choose an instalment plan that works for you.", body: "", tone: "white" },
  { title: "Trade in your device, get credit towards a new one.", body: "", tone: "white" },
  { title: "Make them yours.", body: "Engrave a mix of emoji, names and numbers for free.", tone: "yellow" },
  { title: "Customise your Mac and create your own style of Apple Watch.", body: "", tone: "lavender" },
  { title: "Get a personalised shopping experience in the Apple Store app.", body: "", tone: "green" },
  { title: "Get free delivery, or pick up available items at an Apple Store.", body: "", tone: "white" },
];

export const STORE_HELP_CARDS = [
  { eyebrow: "APPLE SPECIALIST", title: "Shop one on one with a Specialist. Online or in a store.", body: "", image: "/sites/www.apple.com-6cb27140/store/help-specialist.webp", tone: "white" },
  { eyebrow: "Today at Apple", title: "Explore Apple Intelligence", body: "Come and try it for yourself in a free session at the Apple Store.", image: "/sites/www.apple.com-6cb27140/store/help-ai.webp", tone: "warm" },
  { eyebrow: "Today at Apple", title: "Join free sessions at your Apple Store.", body: "Learn about the latest features and how to go further with your Apple devices.", image: "/sites/www.apple.com-6cb27140/store/help-ai.webp", tone: "warm" },
  { eyebrow: "PERSONAL SETUP", title: "Set up your new device with help from a Specialist.", body: "Let us guide you through data transfer, the latest features and more, in an online, one-to-one session.", image: "/sites/www.apple.com-6cb27140/store/help-specialist.webp", tone: "white" },
  { eyebrow: "", title: "Get expert service and support at the Genius Bar.", body: "", image: "/sites/www.apple.com-6cb27140/store/help-ai.webp", tone: "dark" },
];

export const MAC_PRODUCTS = [
  { eyebrow: "", title: "MacBook Neo", price: "From £699 or £21.48/mo. for 36 mo. at 6.9% interest", image: "/sites/www.apple.com-6cb27140/mac/all-macbook-neo.webp", action: "Buy" },
  { eyebrow: "", title: "MacBook Air", price: "From £1,299 or £39.92/mo. for 36 mo. at 6.9% interest", image: "/sites/www.apple.com-6cb27140/mac/all-macbook-air.webp", action: "Buy" },
  { eyebrow: "", title: "MacBook Pro", price: "From £1,999 or £61.44/mo. for 36 mo. at 6.9% interest", image: "/sites/www.apple.com-6cb27140/mac/all-macbook-pro.webp", action: "Buy" },
  { eyebrow: "", title: "iMac", price: "From £1,499 or £46.07/mo. for 36 mo. at 6.9% interest", image: "/sites/www.apple.com-6cb27140/mac/all-imac.webp", action: "Buy" },
  { eyebrow: "NEW", title: "Mac mini", price: "From £899 or £27.63/mo. for 36 mo. at 6.9% interest", image: "/sites/www.apple.com-6cb27140/store/latest-mac-mini.webp", action: "Pre-Order" },
  { eyebrow: "NEW", title: "Mac Studio", price: "From £2,499 or £76.80/mo. for 36 mo. at 6.9% interest", image: "/sites/www.apple.com-6cb27140/store/latest-mac-studio.webp", action: "Pre-Order" },
  { eyebrow: "", title: "Studio Display", price: "From £1,499 or £51.21/mo. for 36 mo. at 14.9% interest", tone: "display", action: "Buy" },
  { eyebrow: "", title: "Studio Display XDR", price: "From £2,999 or £102.45/mo. for 36 mo. at 14.9% interest", tone: "display-xdr", action: "Buy" },
];

export const MAC_SAVING_CARDS = [
  { eyebrow: "", title: "Spread the cost with the Flexible Finance Account.", body: "Pay for your next Apple products with low rates and interest-free options.", image: "/sites/www.apple.com-6cb27140/mac/ways-affordability.webp", tone: "gradient" },
  { eyebrow: "MONTHLY PAYMENT OPTIONS", title: "Find a finance offer that works for you.", body: "", image: "/sites/www.apple.com-6cb27140/mac/ways-financing.webp", tone: "light" },
  { eyebrow: "APPLE TRADE IN", title: "Save on a new Mac when you trade in an eligible device.", body: "", image: "/sites/www.apple.com-6cb27140/mac/ways-tradein.webp", tone: "light" },
];

export const MAC_GUIDE_CARDS = [
  { eyebrow: "COMPARE ALL MODELS", title: "Which Mac is right for you?", body: "", image: "/sites/www.apple.com-6cb27140/mac/guides-compare.webp", tone: "light" },
  { eyebrow: "WHY MAC", title: "If you love iPhone, you’ll love Mac.", body: "", image: "/sites/www.apple.com-6cb27140/mac/guides-why.webp", tone: "dark" },
  { eyebrow: "", title: "Apple Intelligence.", body: "Create, communicate and get things done effortlessly.", image: "/sites/www.apple.com-6cb27140/mac/guides-ai.webp", tone: "warm" },
  { eyebrow: "MAC SPECIALIST", title: "Shop one on one with a Specialist. Online or in a store.", body: "", image: "/sites/www.apple.com-6cb27140/store/help-specialist.webp", tone: "white" },
  { eyebrow: "Today at Apple", title: "Explore Apple Intelligence", body: "Come and try it for yourself in a free session at the Apple Store.", image: "/sites/www.apple.com-6cb27140/store/help-ai.webp", tone: "warm" },
];
