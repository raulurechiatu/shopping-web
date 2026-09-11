import { normalize } from "@/lib/itemIcons";

export type CategoryId =
  | "produce"
  | "dairy"
  | "meat"
  | "bakery"
  | "pantry"
  | "frozen"
  | "snacks"
  | "beverages"
  | "household"
  | "personal_care"
  | "other";

export const CATEGORY_ORDER: { id: CategoryId; label: string; icon: string }[] = [
  { id: "produce", label: "Produce", icon: "🥦" },
  { id: "dairy", label: "Dairy & Eggs", icon: "🥛" },
  { id: "meat", label: "Meat & Seafood", icon: "🥩" },
  { id: "bakery", label: "Bakery", icon: "🍞" },
  { id: "pantry", label: "Pantry", icon: "🥫" },
  { id: "frozen", label: "Frozen", icon: "🧊" },
  { id: "snacks", label: "Snacks & Sweets", icon: "🍫" },
  { id: "beverages", label: "Beverages", icon: "🥤" },
  { id: "household", label: "Household", icon: "🧽" },
  { id: "personal_care", label: "Personal Care", icon: "🧴" },
  { id: "other", label: "Other", icon: "📦" },
];

export const CATEGORY_LABELS: Record<CategoryId, string> = Object.fromEntries(
  CATEGORY_ORDER.map((c) => [c.id, c.label]),
) as Record<CategoryId, string>;

export const CATEGORY_ICONS: Record<CategoryId, string> = Object.fromEntries(
  CATEGORY_ORDER.map((c) => [c.id, c.icon]),
) as Record<CategoryId, string>;

// Same keyword coverage as itemIcons.ts's ICON_RULES, grouped by grocery
// aisle instead of by exact emoji. Checked in order, first match wins.
const CATEGORY_RULES: Array<[RegExp, CategoryId]> = [
  // Produce
  [
    /\b(apple|apples|mar|mere|banana|bananas|banane|orange|oranges|mandarin|tangerine|portocale|portocala|lemon|lime|lamaie|lamai|grape|grapes|struguri|strawberr(y|ies)|capsuni|capsuna|blueberr(y|ies)|afine|raspberr(y|ies)|blackberr(y|ies)|zmeura|mure|watermelon|pepene verde|pepene|melon|cantaloupe|pepene galben|pineapple|ananas|peach|peaches|piersica|piersici|cherry|cherries|cirese|cireasa|plum|plums|prune|prunes|apricot|apricots|caise|caisa|kiwi|mango|coconut|nuca de cocos|fig|figs|smochine|pomegranate|rodie|dragon ?fruit|pitaya|passion ?fruit|maracuja|persimmon|curmal japonez|cranberr(y|ies)|merisoare|currant|coacaze|nectarine|avocado)\b/,
    "produce",
  ],
  [
    /\b(tomato|tomatoes|rosie|rosii|potato|potatoes|cartof|cartofi|sweet potato|cartof dulce|carrot|carrots|morcov|morcovi|onion|onions|shallot|ceapa|leek|praz|garlic|usturoi|pepper|peppers|bell pepper|chili|chilli|ardei|corn|porumb|cucumber|castravete|castraveti|broccoli|cauliflower|conopida|cabbage|varza|lettuce|salad|greens|spinach|kale|salata|spanac|eggplant|aubergine|vinete|vinata|zucchini|courgette|dovlecel|dovlecei|pumpkin|squash|dovleac|beet|beetroot|sfecla|celery|telina|radish|ridichi|asparagus|sparanghel|fennel|fenicul|okra|bamie|artichoke|anghinare|turnip|parsnip|pastarnac|nap|brussels sprouts|varza de bruxelles|ginger|ghimbir|peas|mazare|green beans|fasole verde|beans|fasole|lentils|linte|chickpeas|naut|mushroom|mushrooms|ciuperca|ciuperci|herbs|basil|busuioc|parsley|patrunjel|dill|marar|mint|menta|oregano|thyme|cimbru|rosemary|rozmarin)\b/,
    "produce",
  ],
  // Dairy & Eggs
  [
    /\b(milk|almond milk|oat milk|soy milk|lapte|egg|eggs|ou|oua|oue|butter|margarine|unt|cheese|mozzarella|cheddar|feta|parmesan|branza|cascaval|telemea|ricotta|cottage cheese|branza de vaci|urda|cream|sour cream|whipped cream|smantana|frisca|kefir|buttermilk|lapte batut|yogurt|yoghurt|iaurt|tofu|tempeh)\b/,
    "dairy",
  ],
  // Meat & Seafood
  [
    /\b(chicken|poultry|turkey|pui|curcan|duck|rata|beef|steak|meat|carne|vita|pork|porc|lamb|miel|liver|ficat|veal|vitel|rabbit|iepure|goose|gasca|meatball|meatballs|chiftea|chiftele|bacon|ham|sausage|salami|prosciutto|sunca|carnati|carnat|salam|muschi|muschiulet|pastrama|slanina|jambon|cabanos|parizer|toba|caltabos|afumatura|afumaturi|cotlet|antricot|ceafa|gizzard|gizzards|pipote|chicken wings|aripioare|shank|rasol|giblets|maruntaie|fish|salmon|tuna|cod|peste|somon|shrimp|prawn|prawns|creveti|creveta|crab|lobster|homar|squid|octopus|calamar|caracatita|mussels|oysters|midii|stridii|anchov(y|ies)|sardine|caviar)\b/,
    "meat",
  ],
  // Bakery
  [/\b(bread|baguette|loaf|bun|bagel|toast|paine|franzela|covrig|croissant|pretzel|pita|muffin|cake|tort|prajitura|pie|placinta|tortilla|wrap|taco)\b/, "bakery"],
  // Frozen
  [/\b(frozen|congelat|congelata|ice cream|gelato|inghetata)\b/, "frozen"],
  // Snacks & Sweets
  [
    /\b(chocolate|cocoa|nutella|ciocolata|candy|sweets|gummy|bomboane|dulciuri|cookie|cookies|biscuit|biscuiti|biscuite|crackers|biscuiti sarati|popcorn|floricele|chips|crisps|chipsuri)\b/,
    "snacks",
  ],
  // Beverages
  [
    /\b(coffee|espresso|cafea|tea|ceai|juice|suc|smoothie|milkshake|lemonade|limonada|water|sparkling water|apa|soda|cola|soft drink|suc acidulat|energy drink|beer|bere|wine|vin|champagne|sampanie|prosecco|whiskey|whisky|vodka|rum|rom|gin|cider|tequila|triple sec|liqueur|lichior|bitters|vermouth|absinth|cognac|brandy|palinca|tonic|tonic water|soda water|club soda|apa tonica|sifon|simple syrup|sirop|ice|gheata|ice cubes)\b/,
    "beverages",
  ],
  // Pantry
  [
    /\b(rice|orez|quinoa|couscous|pasta|spaghetti|noodles|macaroni|paste|pizza|cereal|oats|oatmeal|granola|muesli|cereale|ovaz|flour|faina|breadcrumbs|pesmet|yeast|drojdie|baking powder|praf de copt|barley|orz|buckwheat|hrisca|bulgur|cornstarch|amidon|cocoa powder|pudra de cacao|chocolate chips|fulgi de ciocolata|powdered sugar|zahar pudra|curry|sugar|zahar|salt|sare|spice|spices|condimente|condiment|cinnamon|scortisoara|vanilla|vanilie|honey|miere|jam|marmalade|preserve|gem|dulceata|oil|olive oil|ulei|vinegar|otet|soy sauce|sos de soia|sauce|ketchup|mustard|mayo|mayonnaise|sos|mustar|soup|supa|ciorba|nuts|almond|almonds|walnut|peanut|cashew|nuci|alune|migdale|sesame|susan|seaweed|nori|alge marine|tomato paste|bulion|pasta de tomate|pasta de rosii|canned|can|tin|conserva|conserve|peanut butter|unt de arahide|stock|broth|zeama|zeama de oase)\b/,
    "pantry",
  ],
  // Personal Care
  [
    /\b(toothpaste|toothbrush|pasta de dinti|periuta|floss|ata dentara|shampoo|sampon|conditioner|balsam|deodorant|lotion|crema|sunscreen|crema de plaja|perfume|parfum|razor|aparat de ras|pads|tampoane|hand sanitizer|dezinfectant|band-?aid|plasture|plasturi|cotton balls|vata|nail polish|oja|nail clippers|cleste de unghii|medicine|pill|vitamin|vitamins|medicament|pastile|vitamine|mask|masca|diaper|diapers|nappies|scutec|scutece|baby food|formula|lapte praf|pacifier|suzeta|baby wipes|servetele umede)\b/,
    "personal_care",
  ],
  // Household (cleaning, paper goods, tools, misc home/office/pets)
  [
    /\b(toilet paper|tissue|napkin|paper towel|hartie igienica|servetele|soap|detergent|cleaner|cleaning|sapun|balsam de rufe|dish soap|detergent de vase|sponge|burete|broom|matura|mop|bucket|galeata|gloves|manusi|foil|aluminum foil|folie de aluminiu|cling film|folie alimentara|matches|chibrituri|lighter|bricheta|trash bag|garbage bag|bin bag|punga de gunoi|saci menajeri|battery|batteries|baterie|baterii|light bulb|bulb|bec|flower|flowers|bouquet|flori|plant|planta|candle|lumanare|dog food|cat food|pet food|mancare caine|mancare pisica|cat litter|asternut pisica|leash|lesa|pen|pix|pencil|creion|notebook|caiet|tape|banda adeziva|string|sfoara|scissors|foarfeca|glue|lipici|stapler|capsator|marker|highlighter|eraser|guma|ruler|rigla|sticker|stickere|folder|dosar|air freshener|odorizant|insect spray|insecticid|bug spray|charger|incarcator|cable|cablu|usb|screwdriver|surubelnita|hammer|ciocan|nails|cuie|screws|suruburi|gift|cadou|wrapping paper|hartie de cadou|christmas tree|brad de craciun|decorations|decoratiuni|bird food|mancare pasari|fish food|mancare pesti|umbrella|umbrela|sunglasses|ochelari de soare)\b/,
    "household",
  ],
];

export function getItemCategory(name: string): CategoryId {
  const normalized = normalize(name);
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(normalized)) return category;
  }
  return "other";
}
