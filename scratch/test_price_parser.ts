import { parseProductText } from '../src/lib/priceParser';

const testCases = [
  {
    name: 'Caso 1: Anuncio con talla y teléfono',
    text: 'Zapatillas Nike originales talla 42. Precio: 45 USD. Escribir al 52345678',
    expectedPrice: 45,
    expectedCurrency: 'USD',
  },
  {
    name: 'Caso 2: Precios dobles con barra (USD y CUP)',
    text: 'Samsung Galaxy S23 Ultra nuevo en caja.\n650 usd / 220000 cup\nInteresados al privado.',
    expectedPrice: 650,
    expectedCurrency: 'USD',
    expectedCount: 2,
  },
  {
    name: 'Caso 3: Especificaciones en pulgadas y precio en CUP',
    text: '🔥 Ventilador recargable 16 pulgadas.\n💵 Precio: 12500 cup',
    expectedPrice: 12500,
    expectedCurrency: 'CUP',
  },
  {
    name: 'Caso 4: Símbolo de pesos al final y almacenamiento en GB',
    text: 'iPhone 13 128gb libre de fábrica 350$',
    expectedPrice: 350,
    expectedCurrency: 'USD',
  },
  {
    name: 'Caso 5: Precio en formato K (ej 14k cup)',
    text: 'Perfume original 14k cup',
    expectedPrice: 14000,
    expectedCurrency: 'CUP',
  },
  {
    name: 'Caso 6: Precio con miles con punto o coma',
    text: 'Bicicleta eléctrica nueva. Precio: 145,000 CUP',
    expectedPrice: 145000,
    expectedCurrency: 'CUP',
  }
];

console.log('=== TEST DE PARSER DE PRECIOS ===\n');
let allPassed = true;

for (const tc of testCases) {
  const result = parseProductText(tc.text);
  console.log(`Test [${tc.name}]:`);
  console.log(`  Suggested Title: "${result.suggestedTitle}"`);
  console.log(`  Best Price: ${result.bestPrice ? `${result.bestPrice.price} ${result.bestPrice.currency}` : 'NONE'}`);
  console.log(`  All Prices: ${result.allPrices.map(p => `${p.price} ${p.currency} (conf: ${p.confidence})`).join(', ')}`);
  
  if (!result.bestPrice || result.bestPrice.price !== tc.expectedPrice || result.bestPrice.currency !== tc.expectedCurrency) {
    console.error(`  ❌ FALLO: Esperado ${tc.expectedPrice} ${tc.expectedCurrency}, obtenido ${result.bestPrice?.price} ${result.bestPrice?.currency}`);
    allPassed = false;
  } else {
    console.log(`  ✅ PASÓ`);
  }
  console.log('---');
}

if (allPassed) {
  console.log('\n🎉 TODOS LOS CASOS DE PRUEBA PASARON EXITOSAMENTE!');
} else {
  console.error('\n⚠️ Algunos casos fallaron.');
}
