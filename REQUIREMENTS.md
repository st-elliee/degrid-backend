# Αντιστοίχιση πηγών, απαιτήσεων και ελέγχων

Προτεραιότητα: το πλήρες OpenAPI 1.1.0 που παραδόθηκε στις 18/11/2026,
έπειτα stories, requirements και τα συνοδευτικά mockups/διαγράμματα.
Δεν υπάρχει παραδομένο SCOPE.md. Οι παρακάτω διακρίσεις περιγράφουν την πραγματική
παράδοση και δεν ισχυρίζονται επιπλέον συμφωνία με την ομάδα.

## Ιστορίες χρήσης

| Πηγή | Υλοποίηση | Έλεγχος |
|---|---|---|
| S-1 δημιουργία παιχνιδιού | Αυτόματη ουρά 4..36, υπόλοιπο, αναμονή 360s | HTTP ελάχιστου, batching 36+3, fake clock 360s |
| S-2 είσοδος στην ουρά | Έλεγχος σύνδεσης, ενεργού παιχνιδιού, διπλοεγγραφής | HTTP 200/400/409 |
| S-3 αίτημα κελιού | 1-based coordinates, έλεγχος διαθεσιμότητας, challengeId | Επιτυχία, κακές συντεταγμένες, ξένη σειρά, κατειλημμένο κελί |
| S-4 κατάκτηση | Σωστή/λάθος απάντηση, server deadline, ενημέρωση ownership/count/turn | Πλήρης HTTP ροή, timeout στο όριο, replay και ταυτόχρονες υποβολές |

Τα activity diagrams AD-1..AD-4 διαβάστηκαν για τα βήματα των ιστοριών.
Τα M-7/M-12 εξετάστηκαν οπτικά: συντεταγμένες 1..16, χωριστά Request/Trade,
challenge με επιλογές και χρονόμετρο 40s. Δεν απαιτήθηκε υλοποίηση του οπτικού frontend.

## Requirements R-1..R-27

| ID | Κάλυψη backend / όριο |
|---|---|
| R-1 | validate-input με row/column, έλεγχος ορίων και challengeId |
| R-2 | challenge-answer → ownership/leaderboard |
| R-3 | system PUT grid και cell, atomic batch validation |
| R-4 | Αξιολόγηση στόχου ανταλλαγής σύμφωνα με το OpenAPI. Δεν εκτελείται μη καθορισμένη ανταλλαγή χωρίς στοιχεία προσφοράς/αποδοχής. |
| R-5 | GET grid. Η οπτική προβολή ανήκει στο frontend. |
| R-6 | Popup endpoint αποθηκεύει τελευταίο μήνυμα και το επιστρέφει. Η προβολή ανήκει στο frontend· δεν υπάρχει WebSocket/push endpoint στο contract. |
| R-7 | Schema και business validation, 400/404/409 |
| R-8 | Δημιουργία με 4..36, overflow matching. Δεν έγινε μέτρηση πραγματικού φορτίου 36 browser clients. |
| R-9 | POST profiles, μοναδική αρχικοποίηση υφιστάμενου μέλους |
| R-10 | Multipart username/language/avatar, με in-memory εικόνα |
| R-11 | HTTP API, CORS και Swagger UI. Δεν περιλαμβάνεται frontend. |
| R-12 | GET challenge με query playerId και ασφαλή δημόσια προβολή |
| R-13 | Το backend παρέχει αποτελέσματα/μηνύματα. Αναπαραγωγή ήχων απαιτεί frontend. |
| R-14 | Κεντρικό JSON error handling· δεν εκτίθεται stack. Μήνυμα διακοπής διεργασίας/δικτύου χρειάζεται χειρισμό frontend, αφού ένας σταματημένος server δεν μπορεί να απαντήσει. |
| R-15 | Forfeit, καθαρισμός κελιών και σειράς |
| R-16 | Ακέραια χρώματα ανά παίκτη, colour endpoint, grid reconciliation |
| R-17 | Answer evaluation, δέσμευση challenge σε game/player, replay prevention |
| R-18 | PUT grid/update, επανυπολογισμός και άμεση ενημέρωση grid |
| R-19 | Queue, turn και challenge timers ελεγχόμενα από server |
| R-20 | Αποθήκευση γλώσσας στο profile/game. Μετάφραση περιβάλλοντος/όλων των mock ερωτήσεων δεν προδιαγράφεται και δεν περιλαμβάνεται. |
| R-21 | Exit flag, άμεσο cleanup, αφαίρεση από ουρά |
| R-22 | POST games και αυτόματη δημιουργία από ουρά |
| R-23 | POST queue/players και GET queue/players |
| R-24 | GET players και profile, δυναμικά cell counts |
| R-25 | Turn/order endpoints, μία σειρά τη φορά, validation permutation |
| R-26 | Αυτόματο περιοδικό tick και inactivity removal, ρυθμιζόμενο όριο |
| R-27 | Ψήφοι μετά το τέλος, ομόφωνη επανεκκίνηση 4+ συνδεδεμένων παικτών |

## Prompt checklist

| Ζητούμενο | Πραγματική υλοποίηση / τεκμήριο |
|---|---|
| Incremental approach | Foundation smoke, έπειτα game flows, έπειτα contract/error tests, τελικό καθαρό package check |
| 26 exact operations | routes inventory ισούται με OpenAPI και κάθε λειτουργία έχει επιτυχή HTTP/schema test |
| Express ES modules, async/await | type:module, async controller που κάνει await το service, Express 5 propagation |
| Κεντρικά errors | ApiError/JSON/upload/unexpected διακρίνονται· ελεγμένη async rejection |
| Response envelope | success/data/error/message σε επιτυχίες και API σφάλματα |
| Mock/in-memory | 48 players, active game, 256 cells, queue, τέσσερα templates challenge· reset στην εκκίνηση |
| Απόκρυψη answer | Public projection μόνο τεσσάρων πεδίων Challenge, έλεγχοι για private fields |
| Αλληλεπίδραση οντοτήτων | Player → Cell → Challenge → Game/Turn/leaderboard |
| CORS, PORT, Swagger | Όλα origins, PORT/.env, `/api-docs` και asset smoke |
| JSDoc | Έλεγχος σύνταξης και σχολίων σε κάθε συνάρτηση |
| docs αμετάβλητα | Τα SHA256 των τριών αρχείων ισούνται με τις παραδομένες πηγές |
| Χωρίς placeholders | Όλες οι δηλωμένες διαδρομές συνδέονται σε υλοποιημένη λειτουργία και ελέγχθηκαν |
| Αναλυτική παράδοση | README, API reference, implementation decisions, examples, tests, lockfile |

Οι δοκιμές δεν πιστοποιούν frontend integration που δεν παραδόθηκε, αξιολόγηση
διδάσκοντα, production ασφάλεια ή κανόνες παιχνιδιού που δεν ορίζονται στις πηγές.
