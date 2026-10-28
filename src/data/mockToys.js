export const INITIAL_TOYS = [
  {
    id: "toy-1",
    name: "CyberBot 3000 Programmable Robot",
    sku: "STEM-ROB-001",
    category: "STEM & Learning",
    ageGroup: "9-12 yrs",
    brand: "RoboMind",
    price: 69.99,
    originalPrice: 89.99,
    rating: 4.9,
    reviewsCount: 128,
    stock: 24,
    isFeatured: true,
    isBestSeller: true,
    isNewArrival: false,
    images: [
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Empower your young engineer with CyberBot 3000! Features drag-and-drop visual coding, ultrasonic obstacle sensors, interactive LED emotional eyes, and multi-directional motorized treads.",
    features: [
      "App-enabled programming via Bluetooth (iOS & Android)",
      "Ultrasonic obstacle avoidance and sound sensors",
      "Rechargeable lithium battery with 4 hours continuous playtime",
      "Includes 20 step-by-step coding challenge mission cards"
    ],
    specs: {
      dimensions: "8.5 x 6.2 x 7.8 inches",
      weight: "1.6 lbs",
      battery: "Built-in rechargeable Li-ion (USB-C cable included)",
      safety: "BPA-free high-impact ABS, ASTM F963 certified"
    },
    reviews: [
      { id: "r1", user: "Sarah M.", rating: 5, date: "2026-03-12", comment: "My 10-year-old hasn't put this down! The coding missions are super engaging.", verified: true },
      { id: "r2", user: "David K.", rating: 5, date: "2026-02-28", comment: "Outstanding build quality and the app is very intuitive. Highly recommended!", verified: true }
    ]
  },
  {
    id: "toy-2",
    name: "Galactic Explorer Space Shuttle & Launch Pad",
    sku: "LEGO-SPC-002",
    category: "LEGO & Building",
    ageGroup: "6-8 yrs",
    brand: "BrickWorks",
    price: 54.99,
    originalPrice: 64.99,
    rating: 4.8,
    reviewsCount: 94,
    stock: 18,
    isFeatured: true,
    isBestSeller: true,
    isNewArrival: false,
    images: [
      "https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Blast off to outer space! This 680-piece building set includes a realistic multistage rocket, mobile launch gantry, satellite deployment bay, and 3 astronaut minifigures.",
    features: [
      "680 high-precision interlocking durable bricks",
      "Working gantry crane with magnetic cargo latch",
      "Opening cockpit with dual control panels",
      "Compatible with all major building block brands"
    ],
    specs: {
      dimensions: "14.2 x 9.5 x 18.0 inches (assembled)",
      weight: "2.4 lbs",
      safety: "Non-toxic ABS, smooth rounded corners"
    },
    reviews: [
      { id: "r3", user: "Elena P.", rating: 5, date: "2026-03-01", comment: "Fantastic set! Took my 7-year-old a weekend to assemble and he was thrilled.", verified: true }
    ]
  },
  {
    id: "toy-3",
    name: "Ultra-Fluffy Cuddle Cloud Teddy Bear",
    sku: "PLUSH-TED-003",
    category: "Plush & Soft Toys",
    ageGroup: "0-2 yrs",
    brand: "HuggyFriends",
    price: 24.99,
    originalPrice: 29.99,
    rating: 4.9,
    reviewsCount: 215,
    stock: 45,
    isFeatured: true,
    isBestSeller: false,
    isNewArrival: false,
    images: [
      "https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1561037404-61cd46aa615b?auto=format&fit=crop&w=800&q=80"
    ],
    description: "The softest companion for sweet dreams. Crafted with hypoallergenic, cloud-like microfiber fleece, embroidered child-safe facial details, and a weighted bottom for sitting upright.",
    features: [
      "100% hypoallergenic plush microfiber filling",
      "Embroidered eyes and nose with no choking hazards",
      "Machine washable on gentle cycle",
      "Perfect keepsake gift for newborns and toddlers"
    ],
    specs: {
      dimensions: "16 inches tall",
      weight: "0.8 lbs",
      safety: "Certified baby-safe 0+ months, OEKO-TEX standard 100"
    },
    reviews: [
      { id: "r4", user: "Jessica W.", rating: 5, date: "2026-02-14", comment: "Incredibly soft! My baby holds it every night to fall asleep.", verified: true }
    ]
  },
  {
    id: "toy-4",
    name: "TurboDrift 4WD High-Speed Stunt RC Car",
    sku: "RC-CAR-004",
    category: "RC Vehicles & Drones",
    ageGroup: "9-12 yrs",
    brand: "SpeedX",
    price: 49.99,
    originalPrice: 59.99,
    rating: 4.7,
    reviewsCount: 88,
    stock: 12,
    isFeatured: true,
    isBestSeller: true,
    isNewArrival: true,
    images: [
      "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Experience 360-degree spins, double-sided flips, and insane drifts! Powered by dual high-torque motors, all-terrain monster tires, and vibrant RGB underglow headlights.",
    features: [
      "2.4GHz interference-free long-range remote (up to 150 ft)",
      "Double-sided driving capability & 360° flip stunts",
      "Two modular rechargeable batteries for 50 minutes of action",
      "Shockproof suspension for grass, gravel, and ramps"
    ],
    specs: {
      dimensions: "7.1 x 6.5 x 3.2 inches",
      weight: "1.2 lbs",
      battery: "2x 3.7V 800mAh Li-ion battery pack"
    },
    reviews: [
      { id: "r5", user: "Marcus T.", rating: 5, date: "2026-01-20", comment: "Super fast and indestructible. Flips right over when it hits walls!", verified: true }
    ]
  },
  {
    id: "toy-5",
    name: "Kingdoms of Eldoria Strategy Board Game",
    sku: "GAME-BRD-005",
    category: "Board Games & Puzzles",
    ageGroup: "12+ yrs",
    brand: "MythicPlay",
    price: 39.99,
    originalPrice: 45.00,
    rating: 4.9,
    reviewsCount: 76,
    stock: 30,
    isFeatured: false,
    isBestSeller: true,
    isNewArrival: false,
    images: [
      "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Gather your alliance, trade rare crystals, and conquer medieval lands. A tactical strategy board game designed for 2-5 players with modular map boards and endless replayability.",
    features: [
      "Modular double-sided terrain hex tiles",
      "75 detailed miniature figures and custom wood resource tokens",
      "Playtime: 45-75 minutes per campaign",
      "Easy-to-learn rulebook with solo play variant"
    ],
    specs: {
      dimensions: "11.8 x 11.8 x 2.8 inches",
      weight: "3.1 lbs",
      players: "2 - 5 Players"
    },
    reviews: [
      { id: "r6", user: "Arthur L.", rating: 5, date: "2026-03-05", comment: "Our family's new favorite game night centerpiece. Deep strategy yet accessible.", verified: true }
    ]
  },
  {
    id: "toy-6",
    name: "MagnaTiles 3D Magnetic Architectural Castle",
    sku: "STEM-MAG-006",
    category: "STEM & Learning",
    ageGroup: "3-5 yrs",
    brand: "ShapeCraft",
    price: 44.99,
    originalPrice: 54.99,
    rating: 4.8,
    reviewsCount: 142,
    stock: 22,
    isFeatured: true,
    isBestSeller: true,
    isNewArrival: false,
    images: [
      "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Spark geometric creativity with 100 translucent, jewel-toned magnetic tiles. Children develop spatial awareness, color theory, and engineering principles while constructing majestic towers.",
    features: [
      "100 pieces including towers, balconies, stairs, and archways",
      "Ultrasonic welded ABS plastic with reinforced rivets",
      "Strong neodymium safety magnets sealed securely",
      "Vibrant sun-catcher translucent colors"
    ],
    specs: {
      dimensions: "12 x 9 x 3.5 inches",
      weight: "3.5 lbs",
      safety: "ASTM & EN71 compliant, BPA and phthalate-free"
    },
    reviews: [
      { id: "r7", user: "Chloe R.", rating: 5, date: "2026-02-18", comment: "Both my 3 and 6-year-old play with this every single day. Worth every penny.", verified: true }
    ]
  },
  {
    id: "toy-7",
    name: "Avian Sentinel Mechanical Dragon Action Figure",
    sku: "ACT-DRG-007",
    category: "Action Figures & Heroes",
    ageGroup: "6-8 yrs",
    brand: "TitanForce",
    price: 29.99,
    originalPrice: 34.99,
    rating: 4.6,
    reviewsCount: 65,
    stock: 15,
    isFeatured: false,
    isBestSeller: false,
    isNewArrival: true,
    images: [
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Command the skies! Features 18 points of articulation, dual flapping wings with spring triggers, glowing ruby LED eyes, and roaring roar sound effects.",
    features: [
      "18 points of poseable articulation",
      "Flapping wing mechanism with 16-inch wingspan",
      "Sound effects and light-up dragon breath effect",
      "Includes removable hero rider figurine with armor"
    ],
    specs: {
      dimensions: "14 x 16 x 7 inches",
      weight: "1.4 lbs",
      battery: "3x AAA batteries (included)"
    },
    reviews: [
      { id: "r8", user: "Nathan B.", rating: 5, date: "2026-01-15", comment: "Poseability is incredible. The wing flap action is very satisfying.", verified: true }
    ]
  },
  {
    id: "toy-8",
    name: "Rainbow Sensory Musical Activity Cube",
    sku: "TOD-CUB-008",
    category: "STEM & Learning",
    ageGroup: "0-2 yrs",
    brand: "TinyTots",
    price: 32.99,
    originalPrice: 38.00,
    rating: 4.9,
    reviewsCount: 160,
    stock: 28,
    isFeatured: false,
    isBestSeller: true,
    isNewArrival: false,
    images: [
      "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=800&q=80"
    ],
    description: "6 activity panels in 1! Features xylophone keys, shape sorting sorter, spinning gears, bead maze, clock hands, and textured discovery flaps for sensory development.",
    features: [
      "Solid beechwood construction with water-based non-toxic paints",
      "Removable top bead maze flips inside for compact storage",
      "Encourages fine motor skills, hand-eye coordination & audio recognition",
      "Smooth splinter-free rounded edges"
    ],
    specs: {
      dimensions: "8 x 8 x 14 inches",
      weight: "2.8 lbs",
      safety: "100% natural wood, lead-free certified"
    },
    reviews: [
      { id: "r9", user: "Emily S.", rating: 5, date: "2026-03-08", comment: "Keeps my 1-year-old busy during tummy time and sitting playtime. Beautiful colors!", verified: true }
    ]
  },
  {
    id: "toy-9",
    name: "Whimsical Wooden Dollhouse Villa with Furniture",
    sku: "DOL-VIL-009",
    category: "Dolls & Playsets",
    ageGroup: "3-5 yrs",
    brand: "LilliputHome",
    price: 89.99,
    originalPrice: 110.00,
    rating: 4.8,
    reviewsCount: 52,
    stock: 9,
    isFeatured: true,
    isBestSeller: false,
    isNewArrival: true,
    images: [
      "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80"
    ],
    description: "A 3-story dollhouse featuring 5 decorated rooms, a working balcony elevator, and 18 handcrafted miniature wooden furniture pieces.",
    features: [
      "3 stories, 5 rooms, outdoor patio terrace",
      "Includes 18 pieces of wooden furniture and 4 doll figures",
      "Open-front design for easy cooperative play",
      "Sturdy engineered wood and solid pinewood frame"
    ],
    specs: {
      dimensions: "24 x 12 x 32 inches",
      weight: "12 lbs",
      safety: "Non-toxic paint, meets US & European safety standards"
    },
    reviews: [
      { id: "r10", user: "Karen V.", rating: 5, date: "2026-02-04", comment: "The detail on the tiny wooden chairs and beds is exquisite. My daughter adores it.", verified: true }
    ]
  },
  {
    id: "toy-10",
    name: "Crystal Geode Excavation Science Kit",
    sku: "STEM-GEO-010",
    category: "STEM & Learning",
    ageGroup: "6-8 yrs",
    brand: "GeoLab",
    price: 21.99,
    originalPrice: 26.99,
    rating: 4.7,
    reviewsCount: 110,
    stock: 35,
    isFeatured: false,
    isBestSeller: false,
    isNewArrival: false,
    images: [
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Break open 10 real geological geodes to uncover stunning quartz and amethyst crystal formations! Includes safety goggles, chisel, mallet, and full-color learning guide.",
    features: [
      "10 genuine natural geode specimens",
      "Child-safe protective goggles and digging tools",
      "2 display stands for showcasing favorite crystal halves",
      "16-page full color National Geology guide"
    ],
    specs: {
      dimensions: "10 x 8 x 3 inches",
      weight: "2.1 lbs",
      safety: "Includes safety goggles, adult supervision recommended"
    },
    reviews: [
      { id: "r11", user: "Brian D.", rating: 5, date: "2026-01-29", comment: "Cracking open the rocks and finding purple crystals inside was magical for my 8yo.", verified: true }
    ]
  },
  {
    id: "toy-11",
    name: "SkyPhantom HD Camera Drone for Beginners",
    sku: "RC-DRN-011",
    category: "RC Vehicles & Drones",
    ageGroup: "12+ yrs",
    brand: "SpeedX",
    price: 79.99,
    originalPrice: 99.99,
    rating: 4.6,
    reviewsCount: 73,
    stock: 8,
    isFeatured: true,
    isBestSeller: false,
    isNewArrival: true,
    images: [
      "https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Capture the world from above with 1080p FPV live video streaming to your phone. Features altitude hold, one-key takeoff/landing, and propeller guard rings.",
    features: [
      "1080p HD wide-angle camera with live Wi-Fi transmission",
      "Altitude Hold & Optical Flow positioning for steady flight",
      "One-key takeoff, landing & emergency return",
      "Foldable arms and includes portable carrying case"
    ],
    specs: {
      dimensions: "9.8 x 9.8 x 2.4 inches (unfolded)",
      weight: "185 grams (No FAA registration required)",
      flightTime: "24 minutes total (2 modular batteries)"
    },
    reviews: [
      { id: "r12", user: "Trevor P.", rating: 4, date: "2026-02-19", comment: "Very stable hovering, perfect first drone for teens.", verified: true }
    ]
  },
  {
    id: "toy-12",
    name: "Master Artist 142-Piece Deluxe Art Studio Case",
    sku: "ART-CSE-012",
    category: "Arts & Crafts",
    ageGroup: "6-8 yrs",
    brand: "ArtisanJunior",
    price: 36.99,
    originalPrice: 42.00,
    rating: 4.9,
    reviewsCount: 140,
    stock: 40,
    isFeatured: false,
    isBestSeller: true,
    isNewArrival: false,
    images: [
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1580481077197-9b294d1377cf?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Unleash infinite creativity with oil pastels, colored pencils, watercolor cakes, acrylic tubes, brushes, sharpener, and sketch pads in an aluminum folding briefcase.",
    features: [
      "142 premium artistic tools arranged in pop-up tiered trays",
      "Non-toxic, washable pigments safe for young creators",
      "Heavy-duty aluminum carrying suitcase with secure latches",
      "Includes 2 mixed-media drawing pads"
    ],
    specs: {
      dimensions: "14.8 x 9.5 x 3.8 inches",
      weight: "4.2 lbs",
      safety: "ASTM D-4236 non-toxic certified"
    },
    reviews: [
      { id: "r13", user: "Hannah G.", rating: 5, date: "2026-03-10", comment: "The quality of the colored pencils and watercolors exceeded my expectations.", verified: true }
    ]
  }
];

export const TOY_CATEGORIES = [
  { id: "all", name: "All Toys", icon: "Sparkles", count: 1151 },
  { id: "Pop Vinyl Figures", name: "Pop Vinyl Figures", icon: "Boxes", count: 513 },
  { id: "Collectible Statues", name: "Collectible Statues", icon: "Shield", count: 159 },
  { id: "Action Figures", name: "Action Figures", icon: "Bot", count: 138 },
  { id: "Diecast Cars & Vehicles", name: "Diecast Cars & Vehicles", icon: "Car", count: 76 },
  { id: "Blind Boxes & Mystery Figures", name: "Blind Boxes & Mystery", icon: "Sparkles", count: 73 },
  { id: "Collectible Pins", name: "Collectible Pins", icon: "Heart", count: 50 },
  { id: "Model Kits", name: "Model Kits", icon: "Boxes", count: 47 },
  { id: "Board Games & Puzzles", name: "Board Games & Puzzles", icon: "Dices", count: 23 },
  { id: "Collectible Figures", name: "Collectible Figures", icon: "Shield", count: 17 },
  { id: "Toy Blasters", name: "Toy Blasters", icon: "Gamepad2", count: 17 },
  { id: "Gaming Accessories & Holders", name: "Gaming Accessories & Holders", icon: "Gamepad2", count: 16 },
  { id: "Card Games", name: "Card Games", icon: "Wand2", count: 10 },
  { id: "Squishy Toys", name: "Squishy Toys", icon: "Heart", count: 4 },
  { id: "Advent Calendars", name: "Advent Calendars", icon: "TreePine", count: 3 },
  { id: "Other Toys & Collectibles", name: "Other Toys & Collectibles", icon: "PartyPopper", count: 2 },
  { id: "Collectible Gift Sets", name: "Collectible Gift Sets", icon: "Gift", count: 1 },
  { id: "Collectible Magnets", name: "Collectible Magnets", icon: "Sparkles", count: 1 },
  { id: "Gift Cards", name: "Gift Cards", icon: "Gift", count: 1 }
];

export const AGE_GROUPS = [
  { id: "all", label: "All Ages" },
  { id: "0-2 yrs", label: "0-2 Years (Babies & Toddlers)", badge: "Baby" },
  { id: "3-5 yrs", label: "3-5 Years (Preschool)", badge: "Preschool" },
  { id: "6-8 yrs", label: "6-8 Years (Early Readers)", badge: "Kids" },
  { id: "9-12 yrs", label: "9-12 Years (Tweens)", badge: "Tweens" },
  { id: "12+ yrs", label: "12+ Years (Teens & Collectors)", badge: "Teens" }
];

export const INITIAL_COUPONS = [
  { code: "TOY20", discountPercent: 20, description: "20% off all toys for grand launch!", minSpend: 30, active: true },
  { code: "KIDS10", discountPercent: 10, description: "10% off storewide", minSpend: 20, active: true },
  { code: "FREESHIP", discountPercent: 0, freeShipping: true, description: "Free expedited delivery", minSpend: 0, active: true }
];

export const INITIAL_ORDERS = [
  {
    id: "ORD-9481",
    date: "2026-10-15",
    customer: {
      name: "Alex Mercer",
      email: "alex.mercer@example.com",
      phone: "+1 (555) 349-2810"
    },
    shippingAddress: {
      address: "742 Evergreen Terrace",
      city: "Springfield",
      state: "OR",
      zip: "97477",
      country: "United States"
    },
    items: [
      { id: "toy-1", name: "CyberBot 3000 Programmable Robot", price: 69.99, quantity: 1, image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=400&q=80" },
      { id: "toy-3", name: "Ultra-Fluffy Cuddle Cloud Teddy Bear", price: 24.99, quantity: 1, image: "https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&w=400&q=80" }
    ],
    subtotal: 94.98,
    discount: 18.99,
    shippingFee: 0,
    total: 75.99,
    status: "Delivered",
    paymentMethod: "Credit Card (ending 4242)",
    trackingNumber: "TRK-88392019"
  },
  {
    id: "ORD-9482",
    date: "2026-10-16",
    customer: {
      name: "Sophia Martinez",
      email: "sophia.m@example.com",
      phone: "+1 (555) 782-9012"
    },
    shippingAddress: {
      address: "1200 Beacon St Apt 4B",
      city: "Brookline",
      state: "MA",
      zip: "02446",
      country: "United States"
    },
    items: [
      { id: "toy-2", name: "Galactic Explorer Space Shuttle & Launch Pad", price: 54.99, quantity: 1, image: "https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?auto=format&fit=crop&w=400&q=80" },
      { id: "toy-6", name: "MagnaTiles 3D Magnetic Architectural Castle", price: 44.99, quantity: 1, image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=400&q=80" }
    ],
    subtotal: 99.98,
    discount: 0,
    shippingFee: 0,
    total: 99.98,
    status: "Shipped",
    paymentMethod: "PayPal",
    trackingNumber: "TRK-99201452"
  },
  {
    id: "ORD-9483",
    date: "2026-10-17",
    customer: {
      name: "Marcus Vance",
      email: "marcus.v@example.com",
      phone: "+1 (555) 438-1299"
    },
    shippingAddress: {
      address: "550 Market Street",
      city: "San Francisco",
      state: "CA",
      zip: "94104",
      country: "United States"
    },
    items: [
      { id: "toy-4", name: "TurboDrift 4WD High-Speed Stunt RC Car", price: 49.99, quantity: 1, image: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&w=400&q=80" }
    ],
    subtotal: 49.99,
    discount: 5.00,
    shippingFee: 4.99,
    total: 49.98,
    status: "Processing",
    paymentMethod: "Credit Card (ending 8812)",
    trackingNumber: "TRK-10492837"
  }
];
