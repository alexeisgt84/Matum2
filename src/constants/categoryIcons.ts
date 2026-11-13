export interface CategoryIconItem {
  value: string;         // Nombre exacto en Lucide (PascalCase)
  label: string;         // Nombre descriptivo en español
  group: string;         // Grupo temático
  keywords: string[];    // Palabras clave para el buscador en español e inglés
}

export const CATEGORY_ICON_GROUPS = [
  'Todos',
  'Energía & Eléctrico',
  'Vehículos & Movilidad',
  'Refrigeración & Frío',
  'Clima & Ventilación',
  'Cocina & Electrodomésticos',
  'Lavado & Limpieza',
  'Audio, Video & TV',
  'Tecnología & Móviles',
  'Ferretería & Construcción',
  'Hogar, Muebles & Baño',
  'Comercio & Finanzas',
  'Moda, Belleza & Salud',
  'Alimentos & Bebidas',
  'General & Otros',
] as const;

export type CategoryIconGroup = typeof CATEGORY_ICON_GROUPS[number];

export const CATEGORY_ICONS: CategoryIconItem[] = [
  // ==========================================
  // ENERGÍA & ELÉCTRICO (Paneles, Inversores, Baterías, Estaciones)
  // ==========================================
  {
    value: 'Sun',
    label: 'Panel Solar / Energía',
    group: 'Energía & Eléctrico',
    keywords: ['solar', 'panel', 'fotovoltaico', 'energia', 'sol', 'kit solar', 'longi']
  },
  {
    value: 'Zap',
    label: 'Inversor / Electricidad',
    group: 'Energía & Eléctrico',
    keywords: ['inversor', 'corriente', 'voltaje', '110v', '220v', 'electricidad', 'sumry', 'must', 'hibrido', 'potencia']
  },
  {
    value: 'Battery',
    label: 'Batería / Acumulador',
    group: 'Energía & Eléctrico',
    keywords: ['bateria', 'acumulador', 'litio', 'lifepo4', 'gel', 'amperes', '60v', '72v', '10kw']
  },
  {
    value: 'BatteryCharging',
    label: 'Estación de Energía',
    group: 'Energía & Eléctrico',
    keywords: ['estacion', 'ecoflow', 'bluetti', 'delta', 'cargador', 'recargable', 'generador solar', 'power station']
  },
  {
    value: 'Power',
    label: 'Planta Eléctrica / Generador',
    group: 'Energía & Eléctrico',
    keywords: ['planta', 'generador', 'planta electrica', 'motor', 'combustion', 'arranque']
  },
  {
    value: 'Plug',
    label: 'Transfer / Enchufes',
    group: 'Energía & Eléctrico',
    keywords: ['enchufe', 'transfer', 'automatico', 'breaker', 'clavija', 'toma', 'conector']
  },
  {
    value: 'Cable',
    label: 'Cables & Conductores',
    group: 'Energía & Eléctrico',
    keywords: ['cable', 'alambre', 'extension', 'cableado', 'cobre', 'instalacion']
  },
  {
    value: 'Activity',
    label: 'Regulador / Medidor',
    group: 'Energía & Eléctrico',
    keywords: ['regulador', 'tester', 'multimetro', 'medidor', 'voltaje', 'frecuencia', 'controlador']
  },

  // ==========================================
  // VEHÍCULOS & MOVILIDAD (Motorinas, Bicis, Triciclos, Scooters)
  // ==========================================
  {
    value: 'Bike',
    label: 'Bicicleta / Bici Eléctrica',
    group: 'Vehículos & Movilidad',
    keywords: ['bicicleta', 'bici', 'bicimoto', 'vivamax', 'montana', 'aluminio', 'plegable', 'rueda']
  },
  {
    value: 'Gauge',
    label: 'Motorina / Moto Eléctrica',
    group: 'Vehículos & Movilidad',
    keywords: ['motorina', 'moto', 'bucatti', 'vedca', 'mtoo', 'velocidad', 'autonomia', 'scooter electrico']
  },
  {
    value: 'Truck',
    label: 'Triciclo / Carga',
    group: 'Vehículos & Movilidad',
    keywords: ['triciclo', 'carga', 'transporte', 'topmaq', 'briderk', 'furgon', 'camion', 'reparto']
  },
  {
    value: 'Navigation',
    label: 'Scooter / Patineta',
    group: 'Vehículos & Movilidad',
    keywords: ['scooter', 'patineta', 'patinete', 'caroma', 'movilidad', 'urbana']
  },
  {
    value: 'Car',
    label: 'Auto / Automotriz',
    group: 'Vehículos & Movilidad',
    keywords: ['carro', 'auto', 'coche', 'automotriz', 'vehiculo', 'garaje']
  },
  {
    value: 'Fuel',
    label: 'Repuestos & Mecánica',
    group: 'Vehículos & Movilidad',
    keywords: ['mecanica', 'repuestos', 'piezas', 'motor', 'neumatico', 'llanta', 'goma']
  },

  // ==========================================
  // REFRIGERACIÓN & FRÍO
  // ==========================================
  {
    value: 'Refrigerator',
    label: 'Refrigerador / Nevera',
    group: 'Refrigeración & Frío',
    keywords: ['refrigerador', 'nevera', 'frio', 'royal', 'eko', 'nizzato', 'hys', 'pies', 'escarcha', 'descongelacion']
  },
  {
    value: 'Snowflake',
    label: 'Congelador / Freezer',
    group: 'Refrigeración & Frío',
    keywords: ['congelador', 'freezer', 'frio', 'hielo', 'escarcha', 'nieve', 'congelar']
  },
  {
    value: 'Thermometer',
    label: 'Exhibidor Comercial',
    group: 'Refrigeración & Frío',
    keywords: ['exhibidor', 'vitrina', 'temperatura', 'comercial', 'conservacion', 'termostato']
  },
  {
    value: 'IceCream',
    label: 'Hielera / Heladera',
    group: 'Refrigeración & Frío',
    keywords: ['hielera', 'helado', 'termo', 'bebidas frias', 'cubitera']
  },

  // ==========================================
  // CLIMA & VENTILACIÓN
  // ==========================================
  {
    value: 'AirVent',
    label: 'Split / Aire Acondicionado',
    group: 'Clima & Ventilación',
    keywords: ['split', 'aire', 'clima', 'acondicionado', 'inverter', 'tonelada', 'chigo', 'milexus', 'eko']
  },
  {
    value: 'Wind',
    label: 'Ventilador / Abanico',
    group: 'Clima & Ventilación',
    keywords: ['ventilador', 'abanico', 'pedestal', 'pared', 'f26', 'recargable', 'aire']
  },
  {
    value: 'Fan',
    label: 'Extractor / Turbina',
    group: 'Clima & Ventilación',
    keywords: ['extractor', 'turbina', 'ventilacion', 'aireacion', 'soplador']
  },

  // ==========================================
  // COCINA & ELECTRODOMÉSTICOS
  // ==========================================
  {
    value: 'CookingPot',
    label: 'Olla Reina / Presión',
    group: 'Cocina & Electrodomésticos',
    keywords: ['olla', 'reina', 'presion', 'arrocera', 'multifuncion', 'saco', 'eko', 'litros', 'caldero']
  },
  {
    value: 'Soup',
    label: 'Freidora de Aire / Sartén',
    group: 'Cocina & Electrodomésticos',
    keywords: ['freidora', 'aire', 'sarten', 'ceramax', 'wynwood', 'cazuela', 'fritar', 'cocinar']
  },
  {
    value: 'Flame',
    label: 'Fogón de Gas / Hornilla',
    group: 'Cocina & Electrodomésticos',
    keywords: ['fogon', 'gas', 'hornilla', 'estufa', 'petroleo', 'llama', 'fuego', 'cocina gas']
  },
  {
    value: 'Microwave',
    label: 'Horno / Microondas',
    group: 'Cocina & Electrodomésticos',
    keywords: ['horno', 'microondas', 'electrico', 'tostador', 'induccion', 'infrarrojo', 'grill']
  },
  {
    value: 'Coffee',
    label: 'Cafetera / Café',
    group: 'Cocina & Electrodomésticos',
    keywords: ['cafetera', 'cafe', 'espresso', 'tazas', 'greca', 'electrica', 'rohs']
  },
  {
    value: 'ChefHat',
    label: 'Batidora & Repostería',
    group: 'Cocina & Electrodomésticos',
    keywords: ['batidora', 'merenguera', 'reposteria', 'unizuki', 'licuadora', 'amasadora', 'chef']
  },
  {
    value: 'Utensils',
    label: 'Vajilla & Menaje',
    group: 'Cocina & Electrodomésticos',
    keywords: ['cubiertos', 'tenedor', 'cuchillo', 'vajilla', 'platos', 'cuchara', 'cocina', 'menaje']
  },
  {
    value: 'UtensilsCrossed',
    label: 'Gastronomía / Menaje Pro',
    group: 'Cocina & Electrodomésticos',
    keywords: ['restaurante', 'gastronomia', 'buffet', 'chef', 'utensilios', 'cocina profesional']
  },

  // ==========================================
  // LAVADO & LIMPIEZA
  // ==========================================
  {
    value: 'WashingMachine',
    label: 'Lavadora / Secadora',
    group: 'Lavado & Limpieza',
    keywords: ['lavadora', 'secadora', 'semiautomatica', 'automatica', 'rudenkov', 'samsung', 'eko', 'kg', 'ropa limpia']
  },
  {
    value: 'Droplet',
    label: 'Calentador / Tanque de Agua',
    group: 'Lavado & Limpieza',
    keywords: ['calentador', 'tanque', 'agua', '800 litros', 'tubo', 'bomba agua', 'plomeria', 'hidro']
  },
  {
    value: 'Sparkles',
    label: 'Aseo & Limpieza',
    group: 'Lavado & Limpieza',
    keywords: ['limpieza', 'aseo', 'detergente', 'jabon', 'brillo', 'desinfeccion', 'higiene']
  },

  // ==========================================
  // AUDIO, VIDEO & TV
  // ==========================================
  {
    value: 'Tv',
    label: 'Smart TV / Televisor',
    group: 'Audio, Video & TV',
    keywords: ['tv', 'smart tv', 'televisor', 'pantalla', 'hisense', 'royal', 'vision', '32', '43', '50', 'pulgadas', 'soporte']
  },
  {
    value: 'Speaker',
    label: 'Bocina / Equipo de Música',
    group: 'Audio, Video & TV',
    keywords: ['bocina', 'altavoz', 'parlante', 'equipo musica', 'mlspk', 'bluetooth', 'bafle', 'sonido']
  },
  {
    value: 'Radio',
    label: 'Cajita Digital / Radio',
    group: 'Audio, Video & TV',
    keywords: ['cajita', 'decodificador', 'antena', 'radio', 'reproductor', 'tdt']
  },
  {
    value: 'Headphones',
    label: 'Audífonos / Auriculares',
    group: 'Audio, Video & TV',
    keywords: ['audifonos', 'auriculares', 'headset', 'manos libres', 'in ear', 'airpods']
  },
  {
    value: 'Music',
    label: 'Música & Instrumentos',
    group: 'Audio, Video & TV',
    keywords: ['musica', 'audio', 'instrumento', 'guitarra', 'piano', 'melodia']
  },
  {
    value: 'Gamepad2',
    label: 'Videojuegos / Consola',
    group: 'Audio, Video & TV',
    keywords: ['videojuegos', 'consola', 'playstation', 'xbox', 'nintendo', 'gamepad', 'gamer', 'juegos']
  },

  // ==========================================
  // TECNOLOGÍA & MÓVILES
  // ==========================================
  {
    value: 'Smartphone',
    label: 'Teléfono / Móvil',
    group: 'Tecnología & Móviles',
    keywords: ['celular', 'telefono', 'smartphone', 'movil', 'iphone', 'samsung', 'redmi', 'xiaomi']
  },
  {
    value: 'Laptop',
    label: 'Laptop / Computadora',
    group: 'Tecnología & Móviles',
    keywords: ['laptop', 'computadora', 'portatil', 'pc', 'macbook', 'ordenador', 'informatica']
  },
  {
    value: 'Monitor',
    label: 'Monitor / Pantalla PC',
    group: 'Tecnología & Móviles',
    keywords: ['monitor', 'pantalla pc', 'display', 'escritorio', 'hdmi']
  },
  {
    value: 'Tablet',
    label: 'Tablet / iPad',
    group: 'Tecnología & Móviles',
    keywords: ['tablet', 'ipad', 'tableta', 'pantalla tactil']
  },
  {
    value: 'Printer',
    label: 'Impresora / Escáner',
    group: 'Tecnología & Móviles',
    keywords: ['impresora', 'escaner', 'tinta', 'toner', 'papel', 'fotocopiadora']
  },
  {
    value: 'Camera',
    label: 'Cámara / Fotografía',
    group: 'Tecnología & Móviles',
    keywords: ['camara', 'fotografia', 'foto', 'video', 'lente', 'tripode']
  },
  {
    value: 'Wifi',
    label: 'Router / Redes Wifi',
    group: 'Tecnología & Móviles',
    keywords: ['wifi', 'router', 'modem', 'red', 'internet', 'repetidor', 'antena wifi']
  },
  {
    value: 'HardDrive',
    label: 'Disco Duro / Memorias',
    group: 'Tecnología & Móviles',
    keywords: ['disco duro', 'memoria', 'usb', 'ssd', 'sd', 'pendrive', 'almacenamiento']
  },
  {
    value: 'Cpu',
    label: 'Componentes & Procesadores',
    group: 'Tecnología & Móviles',
    keywords: ['procesador', 'cpu', 'placa', 'chip', 'componentes', 'hardware']
  },

  // ==========================================
  // FERRETERÍA & CONSTRUCCIÓN
  // ==========================================
  {
    value: 'Wrench',
    label: 'Herramientas / Llaves',
    group: 'Ferretería & Construcción',
    keywords: ['herramientas', 'llave', 'mecanica', 'taller', 'reparacion', 'ferreteria']
  },
  {
    value: 'Hammer',
    label: 'Martillo & Carpintería',
    group: 'Ferretería & Construcción',
    keywords: ['martillo', 'clavo', 'carpinteria', 'madera', 'golpear']
  },
  {
    value: 'Drill',
    label: 'Taladro & Eléctricas',
    group: 'Ferretería & Construcción',
    keywords: ['taladro', 'destornillador', 'pulidora', 'soldadora', 'amoladora', 'broca']
  },
  {
    value: 'Construction',
    label: 'Materiales / Obra',
    group: 'Ferretería & Construcción',
    keywords: ['construccion', 'obra', 'cemento', 'bloque', 'arena', 'arido', 'remodelacion']
  },
  {
    value: 'Paintbrush',
    label: 'Pintura & Acabados',
    group: 'Ferretería & Construcción',
    keywords: ['pintura', 'brocha', 'rodillo', 'barniz', 'esmalte', 'impermeabilizante']
  },
  {
    value: 'DoorClosed',
    label: 'Puertas & Ventanas',
    group: 'Ferretería & Construcción',
    keywords: ['puerta', 'ventana', 'corredera', 'aluminio', 'marqueteria', 'cerradura']
  },
  {
    value: 'Layers',
    label: 'Losas & Revestimientos',
    group: 'Ferretería & Construcción',
    keywords: ['losa', 'azulejo', 'piso', 'ceramica', '30x30', 'porcelanato', 'revestimiento']
  },
  {
    value: 'Scissors',
    label: 'Corte & Cuchillas',
    group: 'Ferretería & Construcción',
    keywords: ['tijeras', 'cuchilla', 'corte', 'cutter', 'cizalla']
  },

  // ==========================================
  // HOGAR, MUEBLES & BAÑO
  // ==========================================
  {
    value: 'Home',
    label: 'Hogar General',
    group: 'Hogar, Muebles & Baño',
    keywords: ['hogar', 'casa', 'vivienda', 'habitacion', 'domestico']
  },
  {
    value: 'BedDouble',
    label: 'Cama / Colchón',
    group: 'Hogar, Muebles & Baño',
    keywords: ['cama', 'colchon', 'juego de cuarto', 'sabana', 'dormitorio', 'almohada', 'tapizar']
  },
  {
    value: 'Sofa',
    label: 'Muebles & Sofás',
    group: 'Hogar, Muebles & Baño',
    keywords: ['sofa', 'mueble', 'sillon', 'juego de sala', 'comedor', 'mesa', 'silla']
  },
  {
    value: 'Armchair',
    label: 'Sillones & Asientos',
    group: 'Hogar, Muebles & Baño',
    keywords: ['sillon', 'butaca', 'asiento', 'banqueta', 'poltrona']
  },
  {
    value: 'Bath',
    label: 'Juego de Baño',
    group: 'Hogar, Muebles & Baño',
    keywords: ['bano', 'juego de bano', 'inodoro', 'lavamanos', 'griferia', 'sanitario', 'taza']
  },
  {
    value: 'ShowerHead',
    label: 'Duchas & Baño',
    group: 'Hogar, Muebles & Baño',
    keywords: ['ducha', 'regadera', 'grifo', 'bano', 'hidromasaje']
  },
  {
    value: 'Lamp',
    label: 'Lámpara / Iluminación LED',
    group: 'Hogar, Muebles & Baño',
    keywords: ['lampara', 'led', '100w', 'foco', 'alumbrado', 'techo', 'noche']
  },
  {
    value: 'Lightbulb',
    label: 'Bombillo / Foco',
    group: 'Hogar, Muebles & Baño',
    keywords: ['bombillo', 'foco', 'luz', 'led', 'ahorrador', 'iluminar']
  },
  {
    value: 'Flower2',
    label: 'Jardín & Plantas',
    group: 'Hogar, Muebles & Baño',
    keywords: ['flor', 'jardin', 'plantas', 'decoracion', 'maceta', 'arbolito navidad']
  },

  // ==========================================
  // COMERCIO & FINANZAS
  // ==========================================
  {
    value: 'CircleDollarSign',
    label: 'Contadora de Dinero / Efectivo',
    group: 'Comercio & Finanzas',
    keywords: ['contadora', 'dinero', 'billetes', 'usd', 'cup', 'efectivo', 'dolar', 'divisa', 'pesos']
  },
  {
    value: 'Scale',
    label: 'Pesa / Balanza Digital',
    group: 'Comercio & Finanzas',
    keywords: ['pesa', 'balanza', 'gramera', 'bascula', 'kilos', 'peso comercial']
  },
  {
    value: 'Receipt',
    label: 'Caja Registradora / Recibos',
    group: 'Comercio & Finanzas',
    keywords: ['caja', 'recibo', 'ticket', 'factura', 'pos', 'tpv', 'impresora fiscal']
  },
  {
    value: 'ScanBarcode',
    label: 'Lector de Código de Barras',
    group: 'Comercio & Finanzas',
    keywords: ['lector', 'codigo de barras', 'scanner', 'laser', 'inventario']
  },
  {
    value: 'Store',
    label: 'Tienda & Negocio',
    group: 'Comercio & Finanzas',
    keywords: ['tienda', 'negocio', 'local', 'comercio', 'almacen']
  },
  {
    value: 'ShieldCheck',
    label: 'Seguridad / Garantía',
    group: 'Comercio & Finanzas',
    keywords: ['seguridad', 'garantia', 'alarma', 'camara de seguridad', 'proteccion', 'certificado']
  },
  {
    value: 'Lock',
    label: 'Cerraduras & Candados',
    group: 'Comercio & Finanzas',
    keywords: ['candado', 'cerradura', 'seguridad', 'cerrojo', 'llave', 'candados']
  },
  {
    value: 'Coins',
    label: 'Monedas / Cambio',
    group: 'Comercio & Finanzas',
    keywords: ['monedas', 'cambio', 'tasa', 'divisas', 'cambio oficial']
  },
  {
    value: 'Wallet',
    label: 'Billetera / Pagos',
    group: 'Comercio & Finanzas',
    keywords: ['billetera', 'pago', 'transferencia', 'tarjeta', 'monedero']
  },

  // ==========================================
  // MODA, BELLEZA & SALUD
  // ==========================================
  {
    value: 'Watch',
    label: 'Reloj de Pulsera / Smartwatch',
    group: 'Moda, Belleza & Salud',
    keywords: ['reloj', 'smartwatch', 'pulsera', 'reloj hombre', 'reloj mujer', 'cuarzo']
  },
  {
    value: 'Shirt',
    label: 'Ropa & Confecciones',
    group: 'Moda, Belleza & Salud',
    keywords: ['ropa', 'camisa', 'pulover', 'pantalon', 'vestido', 'moda', 'textil']
  },
  {
    value: 'ShoppingBag',
    label: 'Bolsos & Mochilas',
    group: 'Moda, Belleza & Salud',
    keywords: ['bolso', 'mochila', 'cartera', 'bolsa', 'equipaje']
  },
  {
    value: 'Crown',
    label: 'Joyería & Cadenas',
    group: 'Moda, Belleza & Salud',
    keywords: ['joyas', 'oro', 'plata', 'cadena', 'anillo', 'pulsera', 'corona']
  },
  {
    value: 'Glasses',
    label: 'Gafas & Accesorios',
    group: 'Moda, Belleza & Salud',
    keywords: ['gafas', 'lentes', 'espejuelos', 'sol', 'optica']
  },
  {
    value: 'Sparkle',
    label: 'Belleza & Cuidado Personal',
    group: 'Moda, Belleza & Salud',
    keywords: ['belleza', 'afeitadora', 'secador pelo', 'plancha pelo', 'maquillaje', 'perfume', 'cosmetico']
  },
  {
    value: 'Heart',
    label: 'Salud & Bienestar',
    group: 'Moda, Belleza & Salud',
    keywords: ['salud', 'bienestar', 'corazon', 'medico', 'cuidado', 'farmacia']
  },
  {
    value: 'Baby',
    label: 'Bebés & Niños',
    group: 'Moda, Belleza & Salud',
    keywords: ['bebe', 'nino', 'infantil', 'cuna', 'cochecito', 'juguete']
  },

  // ==========================================
  // ALIMENTOS & BEBIDAS
  // ==========================================
  {
    value: 'Pizza',
    label: 'Pizzería & Comida Rápida',
    group: 'Alimentos & Bebidas',
    keywords: ['pizza', 'comida rapida', 'hamburguesa', 'cena', 'almuerzo']
  },
  {
    value: 'Cake',
    label: 'Pastelería & Repostería',
    group: 'Alimentos & Bebidas',
    keywords: ['pastel', 'tarta', 'dulce', 'cake', 'reposteria', 'cumpleanos', 'postre']
  },
  {
    value: 'Beef',
    label: 'Carnes & Embutidos',
    group: 'Alimentos & Bebidas',
    keywords: ['carne', 'pollo', 'cerdo', 'res', 'jamon', 'embutido', 'chuleta']
  },
  {
    value: 'Fish',
    label: 'Pescados & Mariscos',
    group: 'Alimentos & Bebidas',
    keywords: ['pescado', 'mariscos', 'camaron', 'filete', 'atun']
  },
  {
    value: 'Apple',
    label: 'Frutas & Vegetales',
    group: 'Alimentos & Bebidas',
    keywords: ['fruta', 'vegetal', 'verdura', 'fresco', 'vianda']
  },
  {
    value: 'Sandwich',
    label: 'Panadería & Sandwiches',
    group: 'Alimentos & Bebidas',
    keywords: ['pan', 'sandwich', 'bocadito', 'panaderia', 'tostada']
  },
  {
    value: 'Croissant',
    label: 'Dulcería & Bollería',
    group: 'Alimentos & Bebidas',
    keywords: ['croissant', 'pan dulce', 'bolleria', 'desayuno']
  },
  {
    value: 'CupSoda',
    label: 'Refrescos & Jugos',
    group: 'Alimentos & Bebidas',
    keywords: ['refresco', 'jugo', 'bebida', 'soda', 'lata', 'botella']
  },
  {
    value: 'Beer',
    label: 'Cervezas & Licores',
    group: 'Alimentos & Bebidas',
    keywords: ['cerveza', 'licor', 'ron', 'vino', 'bebidas alcoholicas', 'bar']
  },
  {
    value: 'Wine',
    label: 'Vinos & Licores Finos',
    group: 'Alimentos & Bebidas',
    keywords: ['vino', 'copa', 'brindis', 'licores']
  },
  {
    value: 'Candy',
    label: 'Confitería & Golosinas',
    group: 'Alimentos & Bebidas',
    keywords: ['dulces', 'caramelos', 'chocolates', 'golosinas', 'confiteria']
  },

  // ==========================================
  // GENERAL & OTROS
  // ==========================================
  {
    value: 'Folder',
    label: 'Carpeta / General',
    group: 'General & Otros',
    keywords: ['carpeta', 'general', 'otros', 'clasificacion', 'archivo']
  },
  {
    value: 'Tag',
    label: 'Etiquetas & Ofertas',
    group: 'General & Otros',
    keywords: ['etiqueta', 'oferta', 'descuento', 'precio', 'rebaja', 'promocion']
  },
  {
    value: 'Box',
    label: 'Cajas & Embalaje',
    group: 'General & Otros',
    keywords: ['caja', 'paquete', 'embalaje', 'bulto', 'contenedor']
  },
  {
    value: 'Package',
    label: 'Combos & Envíos',
    group: 'General & Otros',
    keywords: ['combo', 'envio', 'paquete', 'entrega', 'pedido']
  },
  {
    value: 'Send',
    label: 'Domicilio & Mensajería',
    group: 'General & Otros',
    keywords: ['domicilio', 'mensajeria', 'envio', 'transporte', 'delivery']
  },
  {
    value: 'Gift',
    label: 'Regalos & Detalles',
    group: 'General & Otros',
    keywords: ['regalo', 'detalle', 'sorpresa', 'fiesta', 'obsequio']
  },
  {
    value: 'Star',
    label: 'Destacados / Top',
    group: 'General & Otros',
    keywords: ['estrella', 'destacado', 'favorito', 'top', 'premium', 'especial']
  },
  {
    value: 'CheckCircle2',
    label: 'Verificado / Garantizado',
    group: 'General & Otros',
    keywords: ['verificado', 'garantizado', 'oficial', 'calidad', 'aprobado']
  },
  {
    value: 'BookOpen',
    label: 'Manuales & Guías',
    group: 'General & Otros',
    keywords: ['libro', 'manual', 'guia', 'catalogo', 'instrucciones']
  }
];

// Selección rápida de iconos más representativos según las ventas reales de Matum
export const POPULAR_CATEGORY_ICONS: CategoryIconItem[] = CATEGORY_ICONS.filter(item => [
  'Sun',              // Energía Solar
  'Zap',              // Inversores / Electricidad
  'BatteryCharging',  // Estaciones de Energía / EcoFlow
  'Bike',             // Bicicletas / Bici eléctrica
  'Gauge',            // Motorinas / Motos
  'AirVent',          // Split / Clima
  'Wind',             // Ventilador / Abanico
  'Refrigerator',     // Refrigerador / Nevera
  'CookingPot',       // Olla Reina / Presión
  'Soup',             // Freidora de Aire
  'Flame',            // Fogón de Gas
  'WashingMachine',   // Lavadora
  'Tv',               // Smart TV
  'Speaker',          // Bocina / Audio
  'Smartphone',       // Celular
  'Laptop',           // Computación
  'Wrench',           // Herramientas
  'CircleDollarSign', // Contadora de Dinero
  'BedDouble',        // Colchones / Camas
  'Watch',            // Relojes
  'ShoppingBag',      // Bolsos
  'Utensils',         // Vajilla / Menaje
  'Coffee',           // Cafetera
  'Folder'            // General / Carpeta
].includes(item.value));

/**
 * Normaliza nombres de iconos entrantes para mapear a Lucide PascalCase
 */
export function normalizeCategoryIconName(name?: string | null): string {
  if (!name || typeof name !== 'string') return 'Folder';
  
  const raw = name.trim();
  const lower = raw.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Mapeo directo de alias históricos, Ionicons y términos en español comunes
  const synonymMap: Record<string, string> = {
    // Energía
    solar: 'Sun',
    sun: 'Sun',
    paneles: 'Sun',
    panelessolares: 'Sun',
    inversor: 'Zap',
    electricidad: 'Zap',
    corriente: 'Zap',
    zap: 'Zap',
    battery: 'Battery',
    bateria: 'Battery',
    baterias: 'Battery',
    lifepo4: 'Battery',
    estacion: 'BatteryCharging',
    ecoflow: 'BatteryCharging',
    bluetti: 'BatteryCharging',
    batterycharging: 'BatteryCharging',
    planta: 'Power',
    generador: 'Power',
    power: 'Power',
    enchufe: 'Plug',
    transfer: 'Plug',
    plug: 'Plug',
    cable: 'Cable',
    cables: 'Cable',

    // Vehículos
    bike: 'Bike',
    bici: 'Bike',
    bicicleta: 'Bike',
    bicimoto: 'Bike',
    moto: 'Gauge',
    motorina: 'Gauge',
    vedca: 'Gauge',
    bucatti: 'Gauge',
    gauge: 'Gauge',
    triciclo: 'Truck',
    truck: 'Truck',
    scooter: 'Navigation',
    patineta: 'Navigation',
    car: 'Car',
    carro: 'Car',
    auto: 'Car',

    // Frío y Clima
    refrigerator: 'Refrigerator',
    refrigerador: 'Refrigerator',
    nevera: 'Refrigerator',
    frio: 'Refrigerator',
    freezer: 'Snowflake',
    congelador: 'Snowflake',
    snowflake: 'Snowflake',
    airvent: 'AirVent',
    split: 'AirVent',
    aire: 'AirVent',
    aireacondicionado: 'AirVent',
    clima: 'AirVent',
    wind: 'Wind',
    fan: 'Wind',
    ventilador: 'Wind',
    abanico: 'Wind',

    // Cocina
    cookingpot: 'CookingPot',
    olla: 'CookingPot',
    ollareina: 'CookingPot',
    arrocera: 'CookingPot',
    soup: 'Soup',
    freidora: 'Soup',
    freidoradeaire: 'Soup',
    sarten: 'Soup',
    flame: 'Flame',
    fogon: 'Flame',
    gas: 'Flame',
    microwave: 'Microwave',
    horno: 'Microwave',
    microondas: 'Microwave',
    coffee: 'Coffee',
    cafetera: 'Coffee',
    cafe: 'Coffee',
    utensils: 'Utensils',
    cubiertos: 'Utensils',
    vajilla: 'Utensils',
    menaje: 'Utensils',
    batidora: 'ChefHat',
    merenguera: 'ChefHat',
    chefhat: 'ChefHat',

    // Lavado
    washingmachine: 'WashingMachine',
    lavadora: 'WashingMachine',
    secadora: 'WashingMachine',
    tanque: 'Droplet',
    calentador: 'Droplet',
    droplet: 'Droplet',
    sparkles: 'Sparkles',
    limpieza: 'Sparkles',

    // Audio & Video
    tv: 'Tv',
    televisor: 'Tv',
    smarttv: 'Tv',
    pantalla: 'Tv',
    speaker: 'Speaker',
    bocina: 'Speaker',
    altavoz: 'Speaker',
    equipodemusica: 'Speaker',
    parlante: 'Speaker',
    radio: 'Radio',
    cajita: 'Radio',
    headphones: 'Headphones',
    audifonos: 'Headphones',
    auriculares: 'Headphones',
    music: 'Music',
    musica: 'Music',
    gamepad: 'Gamepad2',
    gamepad2: 'Gamepad2',
    videojuegos: 'Gamepad2',

    // Tecnología
    smartphone: 'Smartphone',
    phoneportrait: 'Smartphone',
    celular: 'Smartphone',
    telefono: 'Smartphone',
    movil: 'Smartphone',
    laptop: 'Laptop',
    computadora: 'Laptop',
    pc: 'Laptop',
    monitor: 'Monitor',
    tablet: 'Tablet',
    impresora: 'Printer',
    printer: 'Printer',
    camara: 'Camera',
    camera: 'Camera',
    wifi: 'Wifi',
    router: 'Wifi',

    // Ferretería & Construcción
    wrench: 'Wrench',
    construct: 'Wrench',
    herramientas: 'Wrench',
    hammer: 'Hammer',
    martillo: 'Hammer',
    drill: 'Drill',
    taladro: 'Drill',
    construccion: 'Construction',
    construction: 'Construction',
    pintura: 'Paintbrush',
    paintbrush: 'Paintbrush',
    puerta: 'DoorClosed',
    puertas: 'DoorClosed',
    doorclosed: 'DoorClosed',
    losa: 'Layers',
    losas: 'Layers',
    layers: 'Layers',

    // Hogar & Muebles
    home: 'Home',
    hogar: 'Home',
    cama: 'BedDouble',
    colchon: 'BedDouble',
    bed: 'BedDouble',
    beddouble: 'BedDouble',
    sofa: 'Sofa',
    mueble: 'Sofa',
    muebles: 'Sofa',
    bano: 'Bath',
    bath: 'Bath',
    lampara: 'Lamp',
    lamp: 'Lamp',
    bombillo: 'Lightbulb',
    lightbulb: 'Lightbulb',

    // Comercio
    contadora: 'CircleDollarSign',
    dinero: 'CircleDollarSign',
    dolares: 'CircleDollarSign',
    circledollarsign: 'CircleDollarSign',
    pesa: 'Scale',
    balanza: 'Scale',
    scale: 'Scale',
    recibo: 'Receipt',
    receipt: 'Receipt',
    seguridad: 'ShieldCheck',
    shieldcheck: 'ShieldCheck',
    candado: 'Lock',
    lock: 'Lock',

    // Moda & Belleza
    reloj: 'Watch',
    watch: 'Watch',
    shirt: 'Shirt',
    ropa: 'Shirt',
    bolso: 'ShoppingBag',
    bolsos: 'ShoppingBag',
    shoppingbag: 'ShoppingBag',
    joyas: 'Crown',
    crown: 'Crown',
    gafas: 'Glasses',
    glasses: 'Glasses',
    belleza: 'Sparkle',
    perfume: 'Sparkle',
    sparkle: 'Sparkle',
    heart: 'Heart',
    salud: 'Heart',

    // Comida
    pizza: 'Pizza',
    fastfood: 'Pizza',
    cake: 'Cake',
    dulce: 'Cake',
    pastel: 'Cake',
    carne: 'Beef',
    beef: 'Beef',
    pescado: 'Fish',
    fish: 'Fish',
    refresco: 'CupSoda',
    cupsoda: 'CupSoda',
    cerveza: 'Beer',
    beer: 'Beer',
    comida: 'Utensils',

    // General
    folder: 'Folder',
    carpeta: 'Folder',
    tag: 'Tag',
    etiqueta: 'Tag',
    box: 'Box',
    caja: 'Box',
    package: 'Package',
    combo: 'Package',
    gift: 'Gift',
    regalo: 'Gift',
    star: 'Star',
    estrella: 'Star'
  };

  if (synonymMap[lower]) {
    return synonymMap[lower];
  }

  // 2. Si ya está registrado en nuestra lista maestra de CATEGORY_ICONS
  const foundInCatalog = CATEGORY_ICONS.find(
    i => i.value.toLowerCase() === lower || i.label.toLowerCase().replace(/[^a-z0-9]/g, '') === lower
  );
  if (foundInCatalog) {
    return foundInCatalog.value;
  }

  // 3. PascalCase capitalización directa
  const capitalized = raw.charAt(0).toUpperCase() + raw.slice(1);
  return capitalized;
}
