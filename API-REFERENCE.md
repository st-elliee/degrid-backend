# Αναφορά API — 26 λειτουργίες

Βάση: `http://127.0.0.1:3000`. Πλήρης πρωτογενής προδιαγραφή: `docs/swagger.json`.
Διαδραστική εκτέλεση: `/api-docs/`. Κάθε επιτυχής απόκριση έχει
`{success:true,data:...,error:null,message:"..."}`. Κάθε αποτυχία έχει
`{success:false,data:null,error:"CODE",message:"..."}`.

Όλα τα `{gameId}`, `{playerId}`, `{cellId}`, `{challengeId}` είναι θετικοί ακέραιοι.
Τα σώματα είναι JSON με `Content-Type: application/json`, εκτός από το profile.
Στον πίνακα το «—» σημαίνει ότι δεν απαιτείται σώμα.

| # | Μέθοδος και διαδρομή | Σώμα / παράμετροι | Επιτυχία: data |
|---:|---|---|---|
| 1 | GET `/games` | — | 200: Game[] |
| 2 | POST `/games` | `players` υποχρεωτικό, `language`, `maxPlayers` προαιρετικά | 201: Game |
| 3 | GET `/queue/players` | — | 200: QueueState |
| 4 | POST `/queue/players` | `{"playerId":7}` | 200: QueueState |
| 5 | GET `/games/{gameId}/players` | — | 200: Player[], ταξινομημένο leaderboard |
| 6 | GET `/games/{gameId}/players/{playerId}` | — | 200: Player |
| 7 | DELETE `/games/{gameId}/players/{playerId}` | Προαιρετικό query `isConnected=true/false`, `inGame=true/false` | 200: null |
| 8 | POST `/games/{gameId}/profiles` | `{"playerId":9}` | 201: Player |
| 9 | PUT `/games/{gameId}/players/{playerId}/profile` | Multipart: `username`, `language` υποχρεωτικά, `avatar` προαιρετική εικόνα | 200: Player |
| 10 | PUT `/players/{playerId}/exit` | `{"exit":true}` | 200: Player |
| 11 | PUT `/games/{gameId}/players/{playerId}/forfeit` | Προαιρετικό `{"inGame":false}` | 200: Player |
| 12 | PUT `/games/{gameId}/players/{playerId}/rematch-vote` | `{"rematchVote":true}` | 200: null |
| 13 | POST `/games/{gameId}/players/{playerId}/popup` | Προαιρετικό `{"message":"Hello"}` | 200: null, κείμενο στο message |
| 14 | GET `/games/{gameId}/grid` | — | 200: Grid |
| 15 | PUT `/games/{gameId}/grid` | Προαιρετικό Grid, π.χ. `{"cells":[{"cellId":18,"owner":1}]}` | 200: Grid |
| 16 | PUT `/games/{gameId}/grid/update` | — | 200: Grid |
| 17 | PUT `/games/{gameId}/grid/cells/{cellId}` | Cell, π.χ. `{"owner":1}` | 200: Cell |
| 18 | PUT `/games/{gameId}/grid/cells/{cellId}/colour` | `{"cellColour":123}` | 200: Cell |
| 19 | PUT `/games/{gameId}/players/{playerId}/cells/{cellId}` | — | 200: CellSelection |
| 20 | POST `/games/{gameId}/players/{playerId}/inputcoordinates` | `{"row":1,"column":16}` | 200: Cell, αξιολόγηση ανταλλαγής |
| 21 | POST `/games/{gameId}/players/{playerId}/validate-input` | `{"row":2,"column":2}` | 200: InputValidation |
| 22 | GET `/games/{gameId}/challenges/{challengeId}` | Υποχρεωτικό query `playerId=1` | 200: Challenge |
| 23 | POST `/games/{gameId}/players/{playerId}/challenge-answer` | `{"challengeId":1,"answer":"4"}` | 200: ChallengeResult |
| 24 | GET `/games/{gameId}/turn` | — | 200: Turn |
| 25 | POST `/games/{gameId}/turn-order` | — | 200: Turn |
| 26 | PUT `/games/{gameId}/turn-order` | `{"turnOrder":[4,3,2,1]}` | 200: Turn |

## Δημόσια σχήματα

| Σχήμα | Πεδία |
|---|---|
| Player | playerId, username, language, avatar, cells, isConnected, inGame |
| Game | gameId, maxPlayers, language, status, players |
| Cell | cellId, row, column, owner (ακέραιος ή null), cellColour |
| Grid | gameId, size, cells |
| QueueState | count, minPlayers, maxPlayers, remainingTime, players |
| Challenge | challengeId, question, options, timeLimit |
| CellSelection | cell, challengeId |
| InputValidation | isValid, message, cellId, challengeId |
| ChallengeResult | correct, cellAcquired, cell |
| Turn | currentPlayerId, turnNumber, turnOrder |

Τα `cells` του Player υπολογίζονται από το grid. Δεν εμπιστευόμαστε αριθμό κελιών
ή `inGame` που στέλνει ο client κατά τη δημιουργία. Το `status` του Game είναι
`in_progress` ή `finished` στις παρούσες ροές· το `waiting` παραμένει επιτρεπτό
από το Swagger αλλά δεν απαιτείται για παιχνίδι που δημιουργείται μόνο με 4+ παίκτες.

## Διευκρινίσεις ανά ροή

**Δημιουργία:** 4–36 παίκτες, χωρίς διπλά IDs ή συμμετοχή σε άλλο ενεργό παιχνίδι.
Αν λείπει playerId, αποδίδεται νέο. Αρχικές τιμές username/language/avatar συμπληρώνονται.
Για ήδη γνωστό ID χρησιμοποιείται το υπάρχον προφίλ και τα στοιχεία επεξεργάζονται
με το κατάλληλο profile endpoint. Ολόκληρο το αίτημα ελέγχεται πριν αποθηκευτεί.

**Profile initialization:** αρχικοποιεί μία φορά μέλος που ήδη υπάρχει στο συγκεκριμένο
παιχνίδι. Τα αρχικά seed προφίλ και τα προφίλ από την αυτόματη ουρά είναι ήδη
αρχικοποιημένα (409 σε επανάληψη). Για χειροκίνητη επίδειξη δημιούργησε νέο παιχνίδι,
πάρε το gameId και ένα playerId από την απόκριση και κάλεσε το endpoint.

**DELETE / forfeit:** αφαιρούν πάντα τον παίκτη από το συγκεκριμένο παιχνίδι.
Τα προαιρετικά flags δεν αναιρούν τη σημασία της διαγραφής/παραίτησης.
Το query `isConnected` ενημερώνει τη σημαία σύνδεσης· το `inGame` επικυρώνεται
ως boolean αλλά η τελική τιμή προκύπτει από την πραγματική συμμετοχή.

**Exit:** με `true` επεξεργάζεται την αποχώρηση αμέσως. Με `false` ακυρώνει μόνο
τη σημαία, χωρίς αυτόματη επανένταξη σε παιχνίδι. Δεν απαιτεί authentication.

**Grid:** τα system PUT επιτρέπουν μερικές ενημερώσεις. Δεν αλλάζουν το μέγεθος,
τις συντεταγμένες ή τα IDs των κελιών. Άκυρη ενημέρωση ενός στοιχείου απορρίπτει
ολόκληρο το batch. Ο ιδιοκτήτης πρέπει να είναι μέλος του παιχνιδιού ή null.
Το colour είναι ακέραιος 0..16777215. Το `grid/update` επαναφέρει συνεπή χρώματα
βάσει ιδιοκτησίας και ελέγχει την κατάκτηση του κέντρου· δεν καταναλώνει επιπλέον σειρά.

**Challenge:** ένα μόνο pending challenge ανά παιχνίδι. Δεν μπορεί άλλος παίκτης
ή άλλο παιχνίδι να το χρησιμοποιήσει. Επανάληψη απάντησης απορρίπτεται.
Ληγμένο challenge επιστρέφει μία φορά `correct:false, cellAcquired:false` και μήνυμα
λήξης χρόνου. Αν το κελί άλλαξε μέσω system endpoint στο μεταξύ, δεν αντικαθίσταται
ο νέος ιδιοκτήτης από παλιά επιτυχή απάντηση.

**Trade:** το inputcoordinates αξιολογεί στόχο που ανήκει σε άλλον παίκτη.
Δεν αλλάζει ιδιοκτησία ούτε καταναλώνει σειρά, αφού δεν εκτελείται ανταλλαγή.
Αυτό ακολουθεί το «evaluated or executed» της απόκρισης του Swagger. Μηχανισμός
προσφοράς/αποδοχής δεν έχει δοθεί στις πηγές και δεν επινοήθηκε.

**Turn order:** απαιτεί ακριβή μετάθεση όλων των εναπομεινάντων παικτών,
χωρίς διπλότυπα ή ξένα IDs. Η αλλαγή διατηρεί τον τρέχοντα παίκτη και το χρονόμετρό
του, ώστε να μην ακυρώνει challenge ή χαρίζει πρόσθετο χρόνο.

## Παραδείγματα σφαλμάτων

```json
{"success":false,"data":null,"error":"INVALID_INPUT","message":"Coordinates must be integers between 1 and 16."}
```

```json
{"success":false,"data":null,"error":"CONFLICT","message":"Player is already in a game or queue."}
```

Το Swagger απαριθμεί 400/404/409 σε συγκεκριμένες λειτουργίες. Για επιπλέον
λανθασμένες εισόδους, όπως μη ακέραιο path ID ή άκυρο JSON, ο server επιστρέφει
400 με το ίδιο ErrorResponse και στις διαδρομές που δεν το απαριθμούν ρητά.
Για άγνωστη διαδρομή επιστρέφει 404. Απρόβλεπτο σφάλμα δίνει 500 χωρίς stack trace.
