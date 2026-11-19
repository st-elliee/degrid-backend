# Αναφορά χειροκίνητων δοκιμών backend (Postman)

Στο πλαίσιο του Παραδοτέου 1 δοκίμασα χειροκίνητα το backend του Degrid με το Postman. Η collection προήλθε από την εισαγωγή του `docs/swagger.json`. Τα tests έγιναν στο branch `dev-anastasia`, που περιέχει το backend όπως το παρέδωσε η ομάδα. Οι δοκιμές κάλυψαν την ανάγνωση δεδομένων, την κύρια ροή του παιχνιδιού (επιλογή cell, challenge, απάντηση, αλλαγή ιδιοκτησίας και leaderboard, επόμενη σειρά), τα σφάλματα (400 και 404), την ουρά και την ενημέρωση και διαγραφή παικτών. Συνολικά εκτελέστηκαν 22 requests, με αποτέλεσμα ότι το backend συμπεριφέρεται όπως ορίζει το Swagger. Ο πίνακας των ευρημάτων περιέχει μικρές παρατηρήσεις βελτίωσης και καμία βλάβη που να εμποδίζει τη χρήση του API.

## Ρυθμίσεις δοκιμών

- Server: `npm start`, port 3000, branch `dev-anastasia`.
- `.env` (τοπικά, δεν μπαίνει στο repo): `TURN_SECONDS=3600`, `INACTIVITY_SECONDS=3600`.
- Προσωρινή αλλαγή (δεν υπάρχει στο repo): `CHALLENGE_SECONDS` από 40 σε 300 στο `config/constants.js`, για να προλαβαίνω να απαντήσω στο challenge.
- Collection: `tests/degrid.postman_collection.json` (εισαγωγή από το `docs/swagger.json`).

## Αποτελέσματα

| TC | Request | Αναμενόμενο | Πραγματικό | Αποτέλεσμα |
|---|---|---|---|---|
| 01 | GET /games | 200, λίστα με game 1 | 200, game 1 `in_progress` με παίκτες 1-4 | ✔ |
| 02 | GET /queue/players | 200, παίκτες 5, 6 | 200, count 2 | ✔ |
| 03 | GET /games/1/players | 200, παίκτες 1-4 | 200, 4 παίκτες με `cells: 1` | ✔ |
| 04 | GET /games/1/players/1 | 200, ο παίκτης 1 | 200 | ✔ |
| 05 | GET /games/1/grid | 200, 256 cells | 200, 256 cells, owners στα cells 1, 16, 129, 242 | ✔ |
| 06 | GET /games/1/turn | 200, currentPlayerId | 200, παίκτης 1, `turnNumber: 1` | ✔ |
| 07 | POST /games/1/players/1/validate-input `{row:4, column:6}` | 200, challengeId | 200, `cellId: 54`, `challengeId: 1` | ✔ |
| 07b | Ίδιο, από παίκτη που δεν έχει σειρά | 400 | 400 `TURN_CONFLICT` | ✔ |
| 08 | GET /games/1/challenges/1?playerId=1 | 200, χωρίς σωστή απάντηση | 200, `question`, `options`, `timeLimit`, χωρίς απάντηση | ✔ |
| 08b | Ίδιο χωρίς playerId | 400 | 400 `INVALID_INPUT` | ✔ |
| 09 | POST .../players/1/challenge-answer `{challengeId:1, answer:"4"}` | 200, cell στον παίκτη | 200, `correct: true`, cell 54 → owner 1 | ✔ |
| 10 | GET /games/1/players και /turn | cells 2, σειρά στον 2 | cells 2, `currentPlayerId: 2` | ✔ |
| 11 | validate-input παίκτη 2, μετά λάθος απάντηση | 200, `cellAcquired: false`, σειρά στον 3 | 200, cell 71 χωρίς owner, `currentPlayerId: 3` | ✔ |
| 12 | GET /games/999/players | 404 | 404 `NOT_FOUND` | ✔ |
| 13 | GET /games/1/players/999 | 404 | 404 `NOT_FOUND` | ✔ |
| 14 | validate-input `{row:20, column:3}` | 400 | 400 `INVALID_INPUT` | ✔ |
| 15 | validate-input με `{}` | 400 | 400, `body.row is required.` | ✔ |
| 16 | POST /queue/players `{playerId:7}` | 200, ο 7 στην ουρά | 200, count 3 | ✔ |
| 17 | PUT /players/7/exit `{exit:true}` | 200, ο 7 φεύγει από την ουρά | 200 | ✔ (βλ. 19) |
| 18 | DELETE /games/1/players/4 | 200, ο 4 φεύγει | 200, `Player removed.`, 3 παίκτες | ✔ |
| 19 | GET /queue/players μετά το exit | Ο 7 δεν είναι στην ουρά | 1η φορά: ο 7 παρέμενε. Στην επανάληψη (POST → PUT exit → GET): ο 7 έφυγε | ✔ (δεν αναπαράγεται) |
| 20 | PUT /games/1/players/1/profile (form-data: username, language) | 200, νέα στοιχεία | 200, `username: Elisavet`, `language: el` | ✔ |

Μέθοδοι που καλύφθηκαν: GET, POST, PUT, DELETE.

## Ευρήματα

Τα ευρήματα αφορούν κυρίως ρυθμίσεις που δυσκολεύουν τη δοκιμή και το demo, και μικρές βελτιώσεις. Κανένα δεν σταματά την κύρια ροή του παιχνιδιού.

| # | Εύρημα | Σοβαρότητα | Ενέργεια |
|---|---|---|---|
| F-1 | Ο χρόνος του challenge (40 δευτ.) είναι σταθερός στον κώδικα και δεν ρυθμίζεται από `.env` (σε αντίθεση με `TURN_SECONDS` και `INACTIVITY_SECONDS`). Δυσκολεύει τη δοκιμή και το demo. | Χαμηλή | Πρόταση: `CHALLENGE_SECONDS` από `.env` (Cyclopt #10c) |
| F-2 | Με τα προεπιλεγμένα 300 δευτ. αδράνειας, το mock game αδειάζει και γίνεται `finished` αν δεν γίνει καμία κίνηση. Επηρεάζει τα tests και το demo του frontend. | Χαμηλή | Πρόταση: μεγαλύτερο default ή ρύθμιση από `.env` (Cyclopt #10a) |
| F-3 | Αφού το game γίνει `finished`, ο παίκτης που έμεινε εμφανίζει `cells: 1`, ενώ στο grid όλα τα cells έχουν `owner: null`. | Χαμηλή | Να ελεγχθεί από τον Α (Cyclopt #10b) |
| F-4 | Το `challenge-answer` δέχεται απάντηση που δεν υπάρχει στις επιλογές (π.χ. `"999"`) και την κρίνει λάθος, αντί για 400. | Πολύ χαμηλή | Προαιρετική βελτίωση (χωρίς task) |
| F-5 | Το README δεν ήταν προσαρμοσμένο στο repo (απευθυνόταν σε συγκεκριμένο πρόσωπο, ανέφερε ZIP και Windows PowerShell, έλεγε ότι το `SCOPE.md` δεν παραδόθηκε). | Τεκμηρίωση | Το README ξαναγράφτηκε (Cyclopt #10d, διορθώθηκε) |
| Παρατήρηση | Το `PUT /players/{id}/exit` δεν αφαίρεσε τον παίκτη 7 από την ουρά την πρώτη φορά, αλλά στην επανάληψη ολόκληρης της ακολουθίας τον αφαίρεσε. Δεν αναπαράγεται. | - | Καταγράφεται, όχι bug |

## Γνωστός περιορισμός (εκτός scope)

Το `POST .../inputcoordinates` (trade) αξιολογεί το αίτημα αλλά δεν μεταφέρει ιδιοκτησία cells, όπως συμφωνήθηκε στο scope.

## Δοκιμές που καλύπτονται από τα αυτοματοποιημένα tests του Α

`npm test` (52 tests, όλα πέρασαν): λήξη χρόνου challenge και σειράς, ουρά με 4 και με 36 παίκτες, forfeit, rematch, τέλος παιχνιδιού με τα 4 κεντρικά cells, CORS, upload avatar. `npm run check:spec`: 26/26 operations ταιριάζουν με το `swagger.json`.
