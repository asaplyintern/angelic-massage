const { getFirestore } = require("./firebase");

const DEFAULT_BUSINESS = {
  name: "Angelic Massage",
  address: "5227 Trepanier Bench Road, Peachland, British Columbia, Canada, V0H 1X2",
  phone: "+1-778-363-9832",
  email: "avrearain@gmail.com",
};

const DEFAULT_SERVICES = [
  {
    id: "blend",
    name: "Blend",
    category: "Relaxation Massage with Deep Tissue",
    description: "Relaxation massage with deeper pressure where needed.",
    image: "/assets/blend-massage.jpg",
    popular: true,
    active: true,
    prices: [
      ["30 minutes", 80],
      ["1 hour", 120],
      ["90 minutes", 160],
      ["2 hours", 220],
    ],
  },
  {
    id: "soft-touch",
    name: "Soft Touch",
    category: "Relaxation Massage",
    description: "Gentle relaxation massage.",
    image: "/assets/soft-touch-neck.jpg",
    popular: false,
    active: true,
    prices: [
      ["30 minutes", 80],
      ["1 hour", 120],
      ["90 minutes", 160],
      ["2 hours", 220],
    ],
  },
  {
    id: "deep-tissue",
    name: "Deep Tissue",
    category: "Therapeutic Massage",
    description: "Focused pressure for tight muscles.",
    image: "/assets/deep-tissue-back.jpg",
    popular: false,
    active: true,
    prices: [
      ["30 minutes", 80],
      ["1 hour", 120],
      ["90 minutes", 160],
      ["2 hours", 220],
    ],
  },
  {
    id: "hot-stone",
    name: "Hot Stone Therapy",
    category: "Stone Therapy",
    description: "Warm stone massage.",
    image: "/assets/hot-stones-back.jpg",
    popular: false,
    active: true,
    prices: [
      ["1 hour", 150],
      ["90 minutes", 190],
      ["2 hours", 250],
    ],
  },
];

const DEFAULT_ABOUT = {
  introTitle: "Relaxation, wellness, and personalized care.",
  introParagraphs: [
    "Welcome to Angelic Massage, where relaxation, wellness, and personalized care come together in a peaceful and rejuvenating setting overlooking the beautiful Okanagan Lake.",
    "We offer both in-studio and mobile massage services, bringing professional, therapeutic care wherever you feel most comfortable. We proudly provide massage services to independent living resorts, senior communities, hotels, and wellness partners by connecting clients with experienced and compassionate massage therapists.",
  ],
  studioParagraph:
    "Our tranquil studio offers a variety of massage experiences, including relaxation massage, deep tissue massage, and hot stone massage, each customized to meet your individual needs. For a truly unique experience, enjoy our signature Lakeview Balcony Massage, where soothing treatments are combined with breathtaking panoramic views of Okanagan Lake.",
  careParagraphs: [
    "Whether you're looking to relieve tension, relax your mind, support muscle recovery, or simply take time for yourself, Angelic Massage is dedicated to creating a calming experience where you can feel refreshed, restored, and cared for.",
    "Your comfort and well-being are at the heart of everything we do.",
  ],
  ownerParagraphs: [
    "Over the years, Avrea developed her own unique approach, which she lovingly calls Angelic Massage. Her style has been shaped not only by her formal training in spa massage techniques, but also by experiences and inspiration gained through her travels to 15 countries, including repeated journeys to Thailand, where wellness traditions and the art of massage became an important influence.",
    "For over 10 years, Avrea has had the privilege of sharing the healing benefits of massage with her clients through her home-based practice and her work providing massage services at Regency, an independent living resort. As Angelic Massage continues to grow, it has expanded into contract services, providing trusted massage therapists to hotels, seniors' homes, and independent living communities.",
    "A meaningful part of Avrea's work is supporting clients who may have mobility challenges and helping them receive the care they need in a safe, comfortable, and familiar environment. She has always had a special place in her heart for seniors and truly cherishes the relationships she has built with her senior clients.",
    "At Angelic Massage, we believe wellness is about more than just physical relaxation. Massage is one piece of a balanced, joyful, and fulfilling life. Our goal is to help every client feel cared for, renewed, and supported on their journey toward being the happiest and most vibrant version of themselves.",
  ],
};

function normalizeService(service) {
  return {
    id: String(service.id || "").trim(),
    name: String(service.name || "").trim(),
    category: String(service.category || "").trim(),
    description: String(service.description || "").trim(),
    image: String(service.image || "").trim(),
    popular: Boolean(service.popular),
    active: service.active !== false,
    prices: Array.isArray(service.prices)
      ? service.prices
          .map((price) => {
            const duration = Array.isArray(price) ? price[0] : price.duration;
            const amount = Array.isArray(price) ? price[1] : price.price;
            return [String(duration || "").trim(), Number(amount)];
          })
          .filter(([duration, amount]) => duration && Number.isFinite(amount) && amount >= 0)
      : [],
  };
}

function mergeContent(overrides = {}) {
  return {
    business: { ...DEFAULT_BUSINESS, ...(overrides.business || {}) },
    services: Array.isArray(overrides.services) && overrides.services.length
      ? overrides.services.map(normalizeService).filter((service) => service.id && service.name)
      : DEFAULT_SERVICES,
    about: { ...DEFAULT_ABOUT, ...(overrides.about || {}) },
  };
}

async function getSiteContent() {
  try {
    const doc = await getFirestore().collection("settings").doc("site").get();
    return mergeContent(doc.exists ? doc.data() : {});
  } catch (error) {
    return mergeContent();
  }
}

async function saveSiteContent(content) {
  const normalized = mergeContent(content);
  await getFirestore().collection("settings").doc("site").set({
    ...normalized,
    updated_at: new Date().toISOString(),
  });
  return normalized;
}

module.exports = {
  DEFAULT_ABOUT,
  DEFAULT_BUSINESS,
  DEFAULT_SERVICES,
  getSiteContent,
  mergeContent,
  normalizeService,
  saveSiteContent,
};
