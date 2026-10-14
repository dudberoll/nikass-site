export const CONTACT_DETAILS = {
  email: { label: "shop@nikass.ru", href: "mailto:shop@nikass.ru" },
  phone: { label: "+7 (925) 642-53-15", href: "tel:+79256425315" },
  pickup: {
    address: "Москва, Электролитный проезд, 3, стр. 2",
    hours: "Пн–Пт, 09:00–18:00",
    details: {
      region: "Москва",
      city: "Москва",
      street: "Электролитный проезд",
      house: "3 стр. 2",
      apartment: "",
      postcode: "115230",
    },
  },
  messengers: [
    { name: "Telegram", href: "https://t.me/Nikass_energy", icon: "/icons/telegram.svg" },
    { name: "WhatsApp", href: "https://wa.me/message/LKDO2UNXC6XIM1", icon: "/icons/whatsapp.svg" },
    { name: "MAX", href: "https://max.ru/u/f9LHodD0cOKUlKKjqQo3h1xKeys4xeVBPTG1niW8dBgXHShr8nf6QkokH8g", icon: "/icons/max.svg" },
  ],
} as const;
