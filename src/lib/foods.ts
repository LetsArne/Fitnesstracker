import type { Food } from './types'

// Eingebaute Grunddatenbank mit typischen Durchschnittswerten pro 100 g / 100 ml.
// Format: [Name, Suchbegriffe (|-getrennt), kcal, Protein, KH, Fett, Einheit, Portionen "Label:Gramm|..."]
// Die erste Portion ist die Standardportion.
type Row = [string, string, number, number, number, number, 'g' | 'ml', string]

const ROWS: Row[] = [
  // Eier & Frühstück
  ['Ei', 'ei|eier|hühnerei|hühnereier|gekochtes ei|gekochte eier|frühstücksei', 145, 12.5, 0.7, 10, 'g', 'Stück:58'],
  ['Spiegelei', 'spiegelei|spiegeleier', 190, 13, 0.8, 15, 'g', 'Stück:60'],
  ['Rührei', 'rührei|rühreier', 160, 11, 1.5, 12, 'g', 'Portion:130'],
  ['Haferflocken', 'haferflocken|hafer|oats', 370, 13.5, 59, 7, 'g', 'Portion:50|EL:10'],
  ['Porridge (mit Milch)', 'porridge|haferbrei|oatmeal', 100, 4, 14, 3, 'g', 'Schale:300'],
  ['Müsli', 'müsli|muesli|granola|knuspermüsli', 370, 9, 62, 9, 'g', 'Portion:60'],
  ['Cornflakes', 'cornflakes|cerealien|cereals', 375, 7, 84, 0.9, 'g', 'Portion:30'],
  ['Pfannkuchen', 'pfannkuchen|pancake|pancakes|eierkuchen|crepe|crêpe', 225, 7, 30, 8, 'g', 'Stück:70'],

  // Brot & Backwaren
  ['Toast', 'toast|toastbrot|weißbrot|weissbrot', 265, 8, 48, 4, 'g', 'Scheibe:25'],
  ['Vollkorntoast', 'vollkorntoast', 250, 9, 42, 4.5, 'g', 'Scheibe:28'],
  ['Brötchen', 'brötchen|semmel|schrippe|weizenbrötchen|weck|wecken', 270, 9, 53, 1.5, 'g', 'Stück:55'],
  ['Vollkornbrötchen', 'vollkornbrötchen|körnerbrötchen|dinkelbrötchen', 250, 10, 43, 3, 'g', 'Stück:60'],
  ['Brot (Mischbrot)', 'brot|mischbrot|graubrot|bauernbrot', 230, 7, 46, 1.5, 'g', 'Scheibe:45'],
  ['Vollkornbrot', 'vollkornbrot|roggenbrot|schwarzbrot|körnerbrot|pumpernickel', 215, 7, 39, 1.5, 'g', 'Scheibe:50'],
  ['Knäckebrot', 'knäckebrot|knäcke', 365, 10, 66, 2, 'g', 'Scheibe:10'],
  ['Laugenbrezel', 'brezel|breze|laugenbrezel|brezn', 280, 8, 56, 2, 'g', 'Stück:80'],
  ['Croissant', 'croissant|croissants|hörnchen', 400, 8, 45, 21, 'g', 'Stück:60'],
  ['Wrap / Tortilla', 'wrap|wraps|tortilla|tortillas', 300, 8, 50, 7, 'g', 'Stück:60'],
  ['Reiswaffel', 'reiswaffel|reiswaffeln', 385, 8, 80, 3, 'g', 'Stück:8'],

  // Beilagen
  ['Reis (gekocht)', 'reis|gekochter reis|basmati|basmatireis|jasminreis', 130, 2.7, 28, 0.3, 'g', 'Portion:180'],
  ['Reis (roh)', 'reis roh|roher reis|reis ungekocht', 350, 7, 78, 0.6, 'g', 'Portion:70'],
  ['Nudeln (gekocht)', 'nudeln|pasta|spaghetti|penne|fusilli|gekochte nudeln|makkaroni|tagliatelle', 150, 5.5, 30, 0.9, 'g', 'Portion:200'],
  ['Nudeln (roh)', 'nudeln roh|rohe nudeln|pasta roh|nudeln ungekocht', 355, 12.5, 70, 1.5, 'g', 'Portion:100'],
  ['Vollkornnudeln (gekocht)', 'vollkornnudeln|vollkornpasta', 140, 6, 26, 1.2, 'g', 'Portion:200'],
  ['Kartoffeln (gekocht)', 'kartoffel|kartoffeln|salzkartoffeln|pellkartoffeln', 75, 2, 16, 0.1, 'g', 'Stück:80|Portion:200'],
  ['Kartoffelpüree', 'kartoffelpüree|püree|kartoffelbrei', 95, 2, 13, 4, 'g', 'Portion:200'],
  ['Pommes', 'pommes|pommes frites|fritten|fries', 290, 3.5, 37, 14, 'g', 'Portion:150'],
  ['Süßkartoffel', 'süßkartoffel|süßkartoffeln|suesskartoffel', 86, 1.6, 20, 0.1, 'g', 'Stück:200'],
  ['Quinoa (gekocht)', 'quinoa', 120, 4.4, 21, 1.9, 'g', 'Portion:150'],
  ['Couscous (gekocht)', 'couscous|bulgur', 112, 3.8, 23, 0.2, 'g', 'Portion:150'],

  // Fleisch & Fisch
  ['Hähnchenbrust', 'hähnchen|hähnchenbrust|hühnchen|hühnerbrust|chicken|hähnchenfilet|hühnchenbrust', 110, 23, 0, 1.5, 'g', 'Portion:150'],
  ['Putenbrust', 'pute|putenbrust|truthahn|putenfilet|putenschnitzel', 105, 24, 0, 1, 'g', 'Portion:150'],
  ['Hackfleisch (gemischt)', 'hack|hackfleisch|gehacktes|mett', 250, 18, 0, 20, 'g', 'Portion:125'],
  ['Rinderhack', 'rinderhack|rinderhackfleisch', 215, 19, 0, 15, 'g', 'Portion:125'],
  ['Rindersteak', 'steak|rindersteak|rumpsteak|rinderfilet|rind', 125, 22, 0, 4, 'g', 'Stück:200'],
  ['Schweineschnitzel (natur)', 'schnitzel|schweineschnitzel|schweinefleisch', 110, 22, 0, 2, 'g', 'Stück:150'],
  ['Wiener Schnitzel (paniert)', 'paniertes schnitzel|wiener schnitzel|schnitzel paniert', 230, 16, 13, 13, 'g', 'Stück:180'],
  ['Lachs', 'lachs|lachsfilet|salmon', 200, 20, 0, 13.5, 'g', 'Portion:125'],
  ['Räucherlachs', 'räucherlachs|graved lachs', 180, 21, 0, 10, 'g', 'Portion:50|Scheibe:15'],
  ['Thunfisch (Dose, natur)', 'thunfisch|thun|tuna|thunfischdose', 110, 25, 0, 1, 'g', 'Dose:150'],
  ['Garnelen', 'garnelen|shrimps|krabben|scampi|gambas', 90, 19, 0, 1.5, 'g', 'Portion:100'],
  ['Fischstäbchen', 'fischstäbchen', 210, 12, 19, 9, 'g', 'Stück:30'],
  ['Kochschinken', 'schinken|kochschinken|hinterschinken', 110, 19, 1, 3.5, 'g', 'Scheibe:20'],
  ['Putenaufschnitt', 'putenaufschnitt|putenbrustaufschnitt|geflügelaufschnitt', 105, 21, 1, 2, 'g', 'Scheibe:15'],
  ['Salami', 'salami|pfefferbeißer|chorizo', 380, 21, 0.5, 33, 'g', 'Scheibe:10'],
  ['Wiener Würstchen', 'würstchen|wiener|wienerle|frankfurter|wienerwurst', 270, 13, 0.5, 24, 'g', 'Stück:50'],
  ['Bratwurst', 'bratwurst|rostbratwurst|grillwurst', 300, 13, 0.5, 27, 'g', 'Stück:100'],
  ['Bacon', 'bacon|speck|frühstücksspeck', 400, 14, 0, 38, 'g', 'Scheibe:10'],

  // Pflanzliche Proteine
  ['Tofu (natur)', 'tofu|räuchertofu', 125, 13, 1.5, 7.5, 'g', 'Portion:125'],
  ['Kichererbsen (gekocht)', 'kichererbsen', 120, 7, 16, 2.5, 'g', 'Portion:125'],
  ['Linsen (gekocht)', 'linsen|rote linsen|berglinsen', 115, 9, 17, 0.4, 'g', 'Portion:150'],
  ['Kidneybohnen (Dose)', 'kidneybohnen|bohnen|weiße bohnen|schwarze bohnen', 100, 7, 14, 0.5, 'g', 'Portion:125'],
  ['Edamame', 'edamame|sojabohnen', 120, 11, 9, 5, 'g', 'Portion:100'],
  ['Falafel', 'falafel', 330, 13, 31, 18, 'g', 'Stück:20'],

  // Milchprodukte
  ['Milch 1,5 %', 'milch|fettarme milch|milch 1,5', 47, 3.4, 4.8, 1.5, 'ml', 'Glas:200|Tasse:150|Schuss:30'],
  ['Vollmilch 3,5 %', 'vollmilch|milch 3,5', 64, 3.3, 4.8, 3.5, 'ml', 'Glas:200|Tasse:150|Schuss:30'],
  ['Haferdrink', 'haferdrink|hafermilch|oatly', 46, 1, 6.7, 1.5, 'ml', 'Glas:200|Tasse:150|Schuss:30'],
  ['Sojadrink', 'sojadrink|sojamilch', 39, 3, 2.5, 1.8, 'ml', 'Glas:200|Tasse:150|Schuss:30'],
  ['Skyr', 'skyr', 63, 11, 4, 0.2, 'g', 'Becher:150|EL:25'],
  ['Magerquark', 'quark|magerquark|speisequark', 67, 12, 4, 0.3, 'g', 'Becher:250|EL:30'],
  ['Hüttenkäse', 'hüttenkäse|körniger frischkäse|cottage cheese', 98, 12, 2.6, 4.3, 'g', 'Becher:200'],
  ['Naturjoghurt 3,5 %', 'joghurt|jogurt|naturjoghurt|naturjogurt', 66, 3.8, 4.5, 3.5, 'g', 'Becher:150|EL:20'],
  ['Griechischer Joghurt 10 %', 'griechischer joghurt|griechischer jogurt|greek yogurt', 120, 4, 4, 10, 'g', 'Becher:150|EL:20'],
  ['Proteinpudding', 'proteinpudding|protein pudding|high protein pudding', 75, 10, 6, 1.4, 'g', 'Becher:200'],
  ['Gouda', 'käse|gouda|emmentaler|edamer|bergkäse|scheibenkäse', 360, 25, 0, 29, 'g', 'Scheibe:25'],
  ['Mozzarella', 'mozzarella', 250, 18, 1, 19, 'g', 'Kugel:125'],
  ['Feta', 'feta|schafskäse|hirtenkäse', 260, 17, 0.5, 21, 'g', 'Portion:50'],
  ['Parmesan', 'parmesan|grana padano', 400, 33, 0, 29, 'g', 'EL:7'],
  ['Frischkäse', 'frischkäse|philadelphia', 240, 5.5, 3.5, 23, 'g', 'EL:20'],
  ['Butter', 'butter', 740, 0.7, 0.6, 82, 'g', 'Portion:10|TL:5|EL:10'],
  ['Sahne', 'sahne|schlagsahne|kochsahne', 290, 2.4, 3.2, 30, 'g', 'EL:15|Becher:200'],

  // Obst
  ['Apfel', 'apfel|äpfel', 52, 0.3, 12, 0.2, 'g', 'Stück:150'],
  ['Banane', 'banane|bananen', 90, 1.1, 20, 0.2, 'g', 'Stück:120'],
  ['Orange', 'orange|orangen|apfelsine|mandarine|mandarinen|clementine', 47, 1, 9, 0.2, 'g', 'Stück:150'],
  ['Birne', 'birne|birnen', 55, 0.5, 12, 0.3, 'g', 'Stück:160'],
  ['Erdbeeren', 'erdbeeren|erdbeere', 32, 0.7, 5.5, 0.4, 'g', 'Portion:150|Handvoll:80'],
  ['Heidelbeeren', 'heidelbeeren|blaubeeren|beeren|blueberries', 42, 0.6, 7.4, 0.6, 'g', 'Handvoll:50|Portion:125'],
  ['Himbeeren', 'himbeeren|himbeere', 35, 1.3, 4.8, 0.3, 'g', 'Handvoll:50|Portion:125'],
  ['Weintrauben', 'trauben|weintrauben|weintraube', 70, 0.7, 16, 0.3, 'g', 'Handvoll:80'],
  ['Kiwi', 'kiwi|kiwis', 60, 1, 10, 0.6, 'g', 'Stück:75'],
  ['Mango', 'mango|mangos', 60, 0.6, 13, 0.4, 'g', 'Stück:300|Portion:150'],
  ['Ananas', 'ananas', 55, 0.5, 12, 0.2, 'g', 'Portion:150'],
  ['Wassermelone', 'melone|wassermelone|honigmelone', 30, 0.6, 7.5, 0.2, 'g', 'Stück:300'],
  ['Avocado', 'avocado|avocados|avo', 160, 2, 3.6, 14.7, 'g', 'Halbe:70|Stück:140'],
  ['Datteln', 'datteln|dattel', 280, 2.5, 65, 0.4, 'g', 'Stück:8'],

  // Gemüse
  ['Tomate', 'tomate|tomaten|cherrytomaten|kirschtomaten', 18, 0.9, 2.6, 0.2, 'g', 'Stück:80'],
  ['Gurke', 'gurke|gurken|salatgurke', 12, 0.6, 2, 0.1, 'g', 'Stück:400|Portion:100'],
  ['Paprika', 'paprika|paprikaschote', 30, 1, 5, 0.3, 'g', 'Stück:160'],
  ['Karotte', 'karotte|karotten|möhre|möhren|mohrrübe', 36, 0.8, 7, 0.2, 'g', 'Stück:80'],
  ['Brokkoli', 'brokkoli|broccoli', 34, 3.5, 3, 0.4, 'g', 'Portion:200'],
  ['Blumenkohl', 'blumenkohl', 25, 2, 3, 0.3, 'g', 'Portion:200'],
  ['Spinat', 'spinat|blattspinat', 23, 2.9, 1.6, 0.4, 'g', 'Portion:150'],
  ['Blattsalat', 'salat|blattsalat|eisbergsalat|rucola|feldsalat|kopfsalat', 15, 1.3, 1.5, 0.2, 'g', 'Schale:80'],
  ['Zucchini', 'zucchini', 20, 1.5, 2.5, 0.4, 'g', 'Stück:250'],
  ['Champignons', 'champignons|pilze|champignon', 22, 3, 0.6, 0.3, 'g', 'Portion:150'],
  ['Zwiebel', 'zwiebel|zwiebeln', 40, 1.2, 8, 0.2, 'g', 'Stück:80'],
  ['Mais (Dose)', 'mais|maiskörner', 85, 3, 15, 1.2, 'g', 'EL:20|Portion:100'],
  ['Erbsen', 'erbsen', 80, 5, 12, 0.4, 'g', 'Portion:150'],
  ['Grüne Bohnen', 'grüne bohnen|brechbohnen|prinzessbohnen', 30, 2, 5, 0.2, 'g', 'Portion:150'],

  // Nüsse, Samen, Öle, Aufstriche
  ['Mandeln', 'mandeln|mandel', 610, 24, 6, 54, 'g', 'Handvoll:25'],
  ['Walnüsse', 'walnüsse|walnuss|nüsse|nussmischung|studentenfutter', 690, 15, 11, 68, 'g', 'Handvoll:25'],
  ['Erdnüsse', 'erdnüsse|erdnuss', 590, 25, 12, 49, 'g', 'Handvoll:30'],
  ['Cashews', 'cashews|cashewkerne|cashew', 575, 18, 30, 44, 'g', 'Handvoll:25'],
  ['Erdnussbutter', 'erdnussbutter|erdnussmus|peanut butter|nussmus|mandelmus', 610, 25, 13, 50, 'g', 'EL:15|TL:6'],
  ['Chiasamen', 'chia|chiasamen|leinsamen', 480, 17, 8, 31, 'g', 'EL:12'],
  ['Olivenöl', 'öl|olivenöl|rapsöl|sonnenblumenöl|speiseöl', 884, 0, 0, 100, 'g', 'EL:10|TL:4'],
  ['Honig', 'honig', 310, 0.4, 76, 0, 'g', 'TL:8|EL:20'],
  ['Marmelade', 'marmelade|konfitüre|gelee', 250, 0.3, 60, 0.1, 'g', 'TL:10|EL:20'],
  ['Nuss-Nougat-Creme', 'nutella|nuss-nougat-creme|nougatcreme|schokocreme', 540, 6.3, 57, 31, 'g', 'TL:7|EL:15'],
  ['Hummus', 'hummus|humus', 250, 7.5, 11, 19, 'g', 'EL:25|Portion:50'],

  // Süßes & Snacks
  ['Vollmilchschokolade', 'schokolade|schoki|vollmilchschokolade|milchschokolade', 540, 7, 56, 31, 'g', 'Stück:6|Riegel:25|Tafel:100'],
  ['Zartbitterschokolade', 'zartbitter|zartbitterschokolade|dunkle schokolade|bitterschokolade', 580, 8, 33, 43, 'g', 'Stück:6|Tafel:100'],
  ['Gummibärchen', 'gummibärchen|gummibären|haribo|fruchtgummi', 345, 7, 77, 0.1, 'g', 'Handvoll:30|Tüte:200'],
  ['Chips', 'chips|kartoffelchips', 535, 6, 50, 34, 'g', 'Handvoll:25|Tüte:175'],
  ['Butterkeks', 'keks|kekse|butterkeks|butterkekse|cookies', 445, 8, 73, 12, 'g', 'Stück:5'],
  ['Kuchen', 'kuchen|marmorkuchen|rührkuchen|apfelkuchen|torte', 380, 6, 50, 18, 'g', 'Stück:80'],
  ['Speiseeis', 'eis|eiscreme|vanilleeis|schokoeis|eiskugel', 205, 3.5, 23, 11, 'g', 'Kugel:60'],
  ['Müsliriegel', 'müsliriegel|haferriegel|granola riegel|energy bar', 400, 6, 65, 13, 'g', 'Riegel:25'],
  ['Proteinriegel', 'proteinriegel|protein riegel|eiweißriegel', 350, 33, 30, 11, 'g', 'Riegel:55'],
  ['Proteinshake (Pulver)', 'proteinshake|protein shake|eiweißshake|whey|proteinpulver|eiweißpulver', 380, 75, 7, 6, 'g', 'Portion:30'],

  // Getränke
  ['Kaffee schwarz', 'kaffee|espresso|americano|filterkaffee', 2, 0.2, 0.3, 0, 'ml', 'Tasse:200'],
  ['Cappuccino', 'cappuccino|milchkaffee|flat white', 38, 2, 3, 2, 'ml', 'Tasse:150'],
  ['Latte Macchiato', 'latte|latte macchiato|caffe latte', 45, 2.6, 3.8, 2.3, 'ml', 'Glas:300'],
  ['Cola', 'cola|coca cola|limo|limonade|fanta|sprite', 42, 0, 10.6, 0, 'ml', 'Dose:330|Glas:250|Flasche:500'],
  ['Cola Zero', 'cola zero|cola light|coke zero|zero', 0.3, 0, 0, 0, 'ml', 'Dose:330|Glas:250'],
  ['Orangensaft', 'saft|orangensaft|o-saft|apfelsaft|multivitaminsaft', 45, 0.7, 9, 0.2, 'ml', 'Glas:200'],
  ['Apfelschorle', 'schorle|apfelschorle|saftschorle', 24, 0, 5.5, 0, 'ml', 'Glas:300'],
  ['Bier', 'bier|pils|helles|weizen|weißbier', 43, 0.5, 3.6, 0, 'ml', 'Flasche:500|Glas:300'],
  ['Wein', 'wein|rotwein|weißwein|rosé|sekt|prosecco', 83, 0.1, 2.6, 0, 'ml', 'Glas:150'],
  ['Wasser', 'wasser|mineralwasser|sprudel|tee', 0, 0, 0, 0, 'ml', 'Glas:250|Flasche:500'],

  // Backen & Kochen
  ['Weizenmehl', 'mehl|weizenmehl|weissmehl|mehl type 405|type 405', 340, 10, 72, 1, 'g', 'EL:10|Tasse:120'],
  ['Dinkelmehl', 'dinkelmehl|vollkornmehl|dinkelvollkornmehl|type 630', 340, 12, 68, 2, 'g', 'EL:10|Tasse:120'],
  ['Mandelmehl', 'mandelmehl|gemahlene mandeln|mandeln gemahlen', 580, 22, 7, 49, 'g', 'EL:8'],
  ['Zucker', 'zucker|rohrzucker|puderzucker|brauner zucker|vanillezucker', 400, 0, 100, 0, 'g', 'TL:5|EL:12|Päckchen:8'],
  ['Süßstoff / Erythrit', 'süssstoff|süßstoff|erythrit|xylit|stevia|sukrin', 0, 0, 0, 0, 'g', 'TL:5|EL:12'],
  ['Ahornsirup', 'ahornsirup|agavendicksaft|sirup|dattelsirup', 260, 0, 67, 0, 'g', 'EL:20|TL:7'],
  ['Backpulver', 'backpulver|natron', 100, 0, 25, 0, 'g', 'TL:4|Päckchen:15'],
  ['Backkakao', 'kakao|backkakao|kakaopulver', 350, 20, 10, 22, 'g', 'EL:8|TL:3'],
  ['Eiklar', 'eiklar|eiweiss vom ei|eiweiß vom ei|flüssiges eiweiß|eiweiss flussig', 48, 11, 0.7, 0.2, 'g', 'Stück:33|Portion:100'],
  ['Salz', 'salz|prise salz|meersalz', 0, 0, 0, 0, 'g', 'Prise:1|TL:5'],
  ['Gewürze', 'pfeffer|zimt|vanille|muskat|paprikapulver|curry|kurkuma|oregano|basilikum|kräuter|gewürz|gewürze|chili', 0, 0, 0, 0, 'g', 'Prise:1|TL:2'],
  ['Knoblauch', 'knoblauch|knoblauchzehe', 140, 6, 28, 0.1, 'g', 'Zehe:4'],
  ['Kokosöl', 'kokosöl|kokosfett', 880, 0, 0, 100, 'g', 'EL:10|TL:4'],
  ['Mandeldrink', 'mandelmilch|mandeldrink', 24, 0.5, 3, 1.1, 'ml', 'Glas:200|Schuss:30'],
  ['Passierte Tomaten', 'passierte tomaten|tomatenpüree|tomaten dose|dosentomaten|stückige tomaten|tomatensoße|tomatensauce', 35, 1.5, 6, 0.2, 'g', 'Dose:400|Packung:500'],
  ['Tomatenmark', 'tomatenmark', 80, 4.5, 13, 0.5, 'g', 'EL:15'],
  ['Kokosmilch', 'kokosmilch', 180, 1.6, 3, 18, 'ml', 'Dose:400'],
  ['Sojasoße', 'sojasosse|sojasoße|sojasauce|soja sauce', 60, 8, 6, 0, 'ml', 'EL:15'],
  ['Gemüsebrühe', 'brühe|gemüsebrühe|hühnerbrühe|bouillon', 5, 0.3, 0.6, 0.2, 'ml', 'Glas:250'],

  // Gerichte
  ['Pizza Margherita', 'pizza|pizza margherita|tiefkühlpizza', 245, 10.5, 30, 9, 'g', 'Pizza:350|Stück:90'],
  ['Döner', 'döner|döner kebab|kebab|dürüm', 190, 10, 18, 9, 'g', 'Stück:400'],
  ['Burger', 'burger|hamburger|cheeseburger', 250, 13, 26, 11, 'g', 'Stück:200'],
  ['Spaghetti Bolognese', 'bolognese|spaghetti bolognese|nudeln mit hackfleischsoße', 140, 7, 17, 4.5, 'g', 'Teller:400'],
  ['Lasagne', 'lasagne', 150, 8, 12, 8, 'g', 'Portion:350'],
  ['Currywurst', 'currywurst', 250, 10, 9, 19, 'g', 'Portion:200'],
  ['Sushi', 'sushi|maki|nigiri', 150, 6, 28, 1.5, 'g', 'Stück:30'],
  ['Gemüsesuppe', 'suppe|gemüsesuppe|eintopf|tomatensuppe', 35, 1.5, 5, 1, 'g', 'Teller:300'],
  ['Caesar Salad mit Hähnchen', 'caesar salad|hähnchensalat|salat mit hähnchen', 130, 10, 5, 8, 'g', 'Teller:300'],
]

function parsePortions(s: string) {
  return s.split('|').map((p) => {
    const [label, grams] = p.split(':')
    return { label, grams: Number(grams) }
  })
}

export const FOODS: (Food & { aliases: string[] })[] = ROWS.map(
  ([name, aliases, kcal, protein, carbs, fat, unit, portions], i) => ({
    id: `db-${i}`,
    name,
    per100: { kcal, protein, carbs, fat },
    unit,
    portions: parsePortions(portions),
    source: 'db',
    aliases: aliases.split('|'),
  }),
)
