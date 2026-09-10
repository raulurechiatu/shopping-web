// Patterns are matched against a diacritic-stripped, lowercased name, so
// Romanian words with diacritics (lapte, brânză, pâine...) and their
// plain-letter spellings (branza, paine...) both match.
const ICON_RULES: Array<[RegExp, string]> = [
  [/\b(milk|almond milk|oat milk|soy milk|lapte)\b/, "🥛"],
  [/\b(egg|eggs|ou|oua|oue)\b/, "🥚"],
  [/\b(bread|baguette|loaf|bun|bagel|toast|paine|franzela|covrig)\b/, "🍞"],
  [/\b(butter|margarine|unt)\b/, "🧈"],
  [/\b(cheese|mozzarella|cheddar|feta|parmesan|branza|cascaval|telemea)\b/, "🧀"],
  [/\b(yogurt|yoghurt|iaurt)\b/, "🥣"],
  [/\b(apple|apples|mar|mere)\b/, "🍎"],
  [/\b(banana|bananas|banane)\b/, "🍌"],
  [/\b(orange|oranges|mandarin|tangerine|portocale|portocala)\b/, "🍊"],
  [/\b(lemon|lime|lamaie|lamai)\b/, "🍋"],
  [/\b(grape|grapes|struguri)\b/, "🍇"],
  [/\b(strawberr(y|ies)|capsuni|capsuna)\b/, "🍓"],
  [/\b(watermelon|pepene verde|pepene)\b/, "🍉"],
  [/\b(pineapple|ananas)\b/, "🍍"],
  [/\b(peach|peaches|piersica|piersici)\b/, "🍑"],
  [/\b(cherry|cherries|cirese|cireasa)\b/, "🍒"],
  [/\b(avocado)\b/, "🥑"],
  [/\b(tomato|tomatoes|rosie|rosii)\b/, "🍅"],
  [/\b(potato|potatoes|cartof|cartofi)\b/, "🥔"],
  [/\b(carrot|carrots|morcov|morcovi)\b/, "🥕"],
  [/\b(onion|onions|shallot|ceapa)\b/, "🧅"],
  [/\b(garlic|usturoi)\b/, "🧄"],
  [/\b(pepper|peppers|bell pepper|chili|chilli|ardei)\b/, "🌶️"],
  [/\b(corn|porumb)\b/, "🌽"],
  [/\b(cucumber|castravete|castraveti)\b/, "🥒"],
  [/\b(broccoli)\b/, "🥦"],
  [/\b(lettuce|salad|greens|spinach|kale|salata|spanac)\b/, "🥬"],
  [/\b(mushroom|mushrooms|ciuperca|ciuperci)\b/, "🍄"],
  [/\b(chicken|poultry|turkey|pui|curcan)\b/, "🍗"],
  [/\b(beef|steak|meat|carne|vita)\b/, "🥩"],
  [/\b(bacon|ham|sausage|salami|prosciutto|sunca|carnati|carnat)\b/, "🥓"],
  [/\b(fish|salmon|tuna|cod|peste|somon)\b/, "🐟"],
  [/\b(shrimp|prawn|prawns|creveti|creveta)\b/, "🦐"],
  [/\b(rice|orez)\b/, "🍚"],
  [/\b(pasta|spaghetti|noodles|macaroni|paste)\b/, "🍝"],
  [/\b(pizza)\b/, "🍕"],
  [/\b(cereal|oats|oatmeal|granola|muesli|cereale|ovaz)\b/, "🥣"],
  [/\b(flour|faina)\b/, "🌾"],
  [/\b(sugar|zahar)\b/, "🧂"],
  [/\b(salt|sare)\b/, "🧂"],
  [/\b(honey|miere)\b/, "🍯"],
  [/\b(jam|marmalade|preserve|gem|dulceata)\b/, "🍓"],
  [/\b(chocolate|cocoa|nutella|ciocolata)\b/, "🍫"],
  [/\b(candy|sweets|gummy|bomboane|dulciuri)\b/, "🍬"],
  [/\b(cookie|cookies|biscuit|biscuiti|biscuite)\b/, "🍪"],
  [/\b(cake|tort|prajitura)\b/, "🍰"],
  [/\b(ice cream|gelato|inghetata)\b/, "🍦"],
  [/\b(popcorn|floricele)\b/, "🍿"],
  [/\b(chips|crisps|chipsuri)\b/, "🥔"],
  [/\b(nuts|almond|almonds|walnut|peanut|cashew|nuci|alune|migdale)\b/, "🥜"],
  [/\b(coffee|espresso|cafea)\b/, "☕"],
  [/\b(tea|ceai)\b/, "🍵"],
  [/\b(juice|suc)\b/, "🧃"],
  [/\b(water|sparkling water|apa)\b/, "💧"],
  [/\b(soda|cola|soft drink|suc acidulat)\b/, "🥤"],
  [/\b(beer|bere)\b/, "🍺"],
  [/\b(wine|vin)\b/, "🍷"],
  [/\b(oil|olive oil|ulei)\b/, "🫒"],
  [/\b(vinegar|otet)\b/, "🍶"],
  [/\b(sauce|ketchup|mustard|mayo|mayonnaise|sos|mustar)\b/, "🍯"],
  [/\b(soup|soup|supa|ciorba)\b/, "🍲"],
  [/\b(tortilla|wrap|taco)\b/, "🌮"],
  [/\b(pie|placinta)\b/, "🥧"],
  [/\b(diaper|diapers|nappies|scutec|scutece)\b/, "🍼"],
  [/\b(baby food|formula|lapte praf)\b/, "🍼"],
  [/\b(toilet paper|tissue|napkin|paper towel|hartie igienica|servetele)\b/, "🧻"],
  [/\b(soap|detergent|cleaner|cleaning|sapun|balsam de rufe)\b/, "🧼"],
  [/\b(sponge|burete)\b/, "🧽"],
  [/\b(toothpaste|toothbrush|pasta de dinti|periuta)\b/, "🪥"],
  [/\b(shampoo|sampon)\b/, "🧴"],
  [/\b(conditioner|balsam)\b/, "🧴"],
  [/\b(trash bag|garbage bag|bin bag|punga de gunoi|saci menajeri)\b/, "🗑️"],
  [/\b(battery|batteries|baterie|baterii)\b/, "🔋"],
  [/\b(light bulb|bulb|bec)\b/, "💡"],
  [/\b(flower|flowers|bouquet|flori)\b/, "💐"],
  [/\b(plant|planta)\b/, "🪴"],
  [/\b(candle|lumanare)\b/, "🕯️"],
  [/\b(medicine|pill|vitamin|vitamins|medicament|pastile|vitamine)\b/, "💊"],
  [/\b(mask|masca)\b/, "😷"],
  [/\b(dog food|cat food|pet food|mancare caine|mancare pisica)\b/, "🐾"],
];

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[ăâ]/g, "a")
    .replace(/î/g, "i")
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t");
}

export function getItemIcon(name: string): string {
  const normalized = normalize(name);
  for (const [pattern, icon] of ICON_RULES) {
    if (pattern.test(normalized)) return icon;
  }
  return "🛒";
}
