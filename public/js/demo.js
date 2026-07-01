// Run once to seed demo products — include this script only if needed.
// Open index.html normally to skip seeding.
(function seedDemo() {
  if (localStorage.getItem('dripvault_demo_seeded')) return;

  const demos = [
    {
      name: 'Oversized Hoodie — Black Noise',
      price: 79.99,
      description: 'Heavy 400g fleece. Dropped shoulders, kangaroo pocket. Unisex.',
      category: 'streetwear',
      visible: true,
      image: null,
    },
    {
      name: 'Graphic Tee — Glitch Series',
      price: 44.99,
      description: 'Screen-printed on 220g combed cotton. Boxy fit.',
      category: 'streetwear',
      visible: true,
      image: null,
    },
    {
      name: 'Art Print — Fragment #01',
      price: 34.99,
      description: 'A3 Giclée print. Signed & numbered. Limited to 50 pieces.',
      category: 'art',
      visible: true,
      image: null,
    },
    {
      name: 'Bucket Hat — Acid Wash',
      price: 29.99,
      description: '100% cotton. One size fits most.',
      category: 'accessories',
      visible: false,
      image: null,
    },
  ];

  const existing = JSON.parse(localStorage.getItem('dripvault_products') || '[]');
  if (existing.length > 0) {
    localStorage.setItem('dripvault_demo_seeded', '1');
    return;
  }

  demos.forEach(d => {
    existing.push({
      id: 'p_' + Math.floor(Math.random() * 1e9),
      ...d,
      createdAt: new Date().toISOString(),
    });
  });
  localStorage.setItem('dripvault_products', JSON.stringify(existing));
  localStorage.setItem('dripvault_demo_seeded', '1');
})();
