# Degrid: Αποφάσεις scope (Παραδοτέο 1)

## Οθόνες (React)

| # | Οθόνη | Mockups | Endpoints |
|---|---|---|---|
| 1 | Home | M-1 | `POST /queue/players` |
| 2 | Queue lobby | M-2, M-4, M-5, M-6 | `GET /queue/players`, `PUT /players/{playerId}/exit`, `PUT /games/{gameId}/players/{playerId}/profile` |
| 3 | Game board | M-3, M-7, M-8 | `GET /games/{gameId}/grid`, `GET /games/{gameId}/turn`, `GET /games/{gameId}/players`, `POST .../validate-input`, `PUT .../forfeit` |
| 4 | Challenge | M-13, M-9, M-10, M-11 | `GET /games/{gameId}/challenges/{challengeId}`, `POST .../challenge-answer`, `PUT .../cells/{cellId}` |
| 5 | Edit profile (modal) | M-2 | `GET /games/{gameId}/players/{playerId}`, `PUT .../profile` |

## Backend

- Υλοποιούνται **και τα 26 operations** του `swagger.json` (23 από τη ΜΛ1 και 3 νέα), με hardcoded mock data.
- Οντότητες: **Player, Game, Cell (Grid), Challenge**. Η ουρά (Queue) και η σειρά (Turn) λειτουργούν ως πρόσθετα resources.
- Το grid είναι **16×16** (256 cells), όπως στα mockups.
- Μορφή απαντήσεων: `{success, data, error, message}`.

## Αλλαγές σε σχέση με το Swagger της ΜΛ1

**Νέα endpoints**
- `GET /games`: λίστα games.
- `GET /queue/players`: παίκτες και μετρητής ουράς (π.χ. 4/36).
- `GET /games/{gameId}/players`: λίστα παικτών και cells, για το Leaderboard.

**Διορθώσεις**
- Ενιαίο όνομα παραμέτρου `playerId` (πριν υπήρχε και `playerid`). Τα πεδία των schemas έγιναν camelCase (`playerId`, `gameId`, `challengeId`, `cellId`).
- Προστέθηκαν schemas στα responses (Grid, Player, Game, Challenge κ.λπ.) και responses σφάλματος.
- Στο **Cell** προστέθηκαν `row` και `column`.
- `inputcoordinates`: από GET έγινε **POST**, με body `{row, column}`.
- `validate-input`: το `coordinates` (integer) έγινε `{row, column}` και το response επιστρέφει το `challengeId` που θα ζητηθεί στη συνέχεια.
- `PUT .../cells/{cellId}`: το response επιστρέφει το `challengeId`.
- Το schema **Challenge** δεν περιέχει πλέον το πεδίο `answer`, ώστε η σωστή απάντηση να μην φτάνει στον client. Προστέθηκαν `question`, `options` και `timeLimit`.
- Προστέθηκαν tags ανά resource.
