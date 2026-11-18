# Test plan: Degrid backend (task 10)

Βασίζεται στο `docs/swagger.json` (26 operations). Base URL: `http://localhost:3000`.

## Πριν ξεκινήσεις

- `git pull origin main`, `npm install`, `npm start`
- Postman → Import → `docs/swagger.json` (δημιουργεί collection)
- Ο server ανοίγει Swagger UI στο `/api-docs`
- Τα IDs στα παραδείγματα (`gameId=1`, `playerId=1`, `cellId=1`) είναι υποθετικά. Αντικατάστησέ τα με IDs που υπάρχουν στα mock data (δες `GET /games` και `GET /games/{gameId}/players`)
- Το trade (`inputcoordinates`) είναι εκτός scope ως προς τη μεταφορά ιδιοκτησίας (δεν είναι bug)

## Κάθε απάντηση πρέπει να έχει τη μορφή
```json
{ "success": true, "data": {}, "error": null, "message": "..." }
```

## Δοκιμές ανά endpoint

Σημείωσε: ✅ δουλεύει, ❌ πρόβλημα (γράψε σχόλιο).

| # | Method | Path | Περιγραφή | Επιτυχία | Σφάλματα που ορίζει το Swagger | Query params | Παράδειγμα body | Αποτέλεσμα | Σχόλια |
|---|---|---|---|---|---|---|---|---|---|
| 1 | GET | `/games` | List all games | 200 | - | - |  |  |  |
| 2 | POST | `/games` | System creates a new game | 201 | 400 | - | `{"language": "text", "maxPlayers": 1, "players": [{"playerId": 1, "username": "text", "language": "text", "avatar": "text", "cells": 1, "isConnected": true, "inGame": true}]}` |  |  |
| 3 | GET | `/queue/players` | Get the players currently in the queue | 200 | - | - |  |  |  |
| 4 | POST | `/queue/players` | Player joins the queue | 200 | 400, 409 | - | `{"playerId": 1}` |  |  |
| 5 | GET | `/games/{gameId}/players` | List the players of a game (leaderboard) | 200 | 404 | - |  |  |  |
| 6 | GET | `/games/{gameId}/players/{playerId}` | Player views other players' information | 200 | 404 | - |  |  |  |
| 7 | DELETE | `/games/{gameId}/players/{playerId}` | Remove inactive player | 200 | 404 | isConnected, inGame |  |  |  |
| 8 | POST | `/games/{gameId}/profiles` | Initialize a player profile in a game | 201 | 400, 404, 409 | - | `{"playerId": 1}` |  |  |
| 9 | PUT | `/games/{gameId}/players/{playerId}/profile` | Edit player profile in a game | 200 | 400, 404 | - | multipart/form-data: username, language, avatar(file) |  |  |
| 10 | PUT | `/players/{playerId}/exit` | Player requests to exit the game | 200 | 404 | - | `{"exit": true}` |  |  |
| 11 | PUT | `/games/{gameId}/players/{playerId}/forfeit` | Player forfeits the game | 200 | 404 | - | `{"inGame": true}` |  |  |
| 12 | PUT | `/games/{gameId}/players/{playerId}/rematch-vote` | Player votes for a rematch | 200 | 400, 404 | - | `{"rematchVote": true}` |  |  |
| 13 | POST | `/games/{gameId}/players/{playerId}/popup` | Send popup message | 200 | 404 | - | `{"message": "text"}` |  |  |
| 14 | GET | `/games/{gameId}/grid` | Player retrieves the grid | 200 | 404 | - |  |  |  |
| 15 | PUT | `/games/{gameId}/grid` | Edit the game grid | 200 | 404 | - | `{"gameId": 1, "size": 1, "cells": [{"cellId": 1, "row": 1, "column": 1, "owner": 1, "cellColour": 1}]}` |  |  |
| 16 | PUT | `/games/{gameId}/grid/update` | Update the grid after each round | 200 | 404 | - |  |  |  |
| 17 | PUT | `/games/{gameId}/grid/cells/{cellId}` | Update cell in game grid | 200 | 404 | - | `{"cellId": 1, "row": 1, "column": 1, "owner": 1, "cellColour": 1}` |  |  |
| 18 | PUT | `/games/{gameId}/grid/cells/{cellId}/colour` | System sets the colour of a cell based on ownership | 200 | 400, 404 | - | `{"cellColour": 1}` |  |  |
| 19 | PUT | `/games/{gameId}/players/{playerId}/cells/{cellId}` | Player selects a cell | 200 | 404, 409 | - |  |  |  |
| 20 | POST | `/games/{gameId}/players/{playerId}/inputcoordinates` | Player initiates cell trade via coordinates | 200 | 400, 404 | - | `{"row": 1, "column": 1}` |  |  |
| 21 | POST | `/games/{gameId}/players/{playerId}/validate-input` | Validate player input | 200 | 400, 404 | - | `{"row": 1, "column": 1}` |  |  |
| 22 | GET | `/games/{gameId}/challenges/{challengeId}` | Retrieve a challenge for a game | 200 | 404 | playerId |  |  |  |
| 23 | POST | `/games/{gameId}/players/{playerId}/challenge-answer` | Player completes a challenge | 200 | 400, 404 | - | `{"challengeId": 1, "answer": "text"}` |  |  |
| 24 | GET | `/games/{gameId}/turn` | Get current turn information | 200 | 404 | - |  |  |  |
| 25 | POST | `/games/{gameId}/turn-order` | Set Turn Order | 200 | 400 | - |  |  |  |
| 26 | PUT | `/games/{gameId}/turn-order` | Set or update turn order | 200 | 400 | - | `{"turnOrder": [1]}` |  |  |

## Δοκιμές σφαλμάτων (για κάθε endpoint με παράμετρο)

- ID που δεν υπάρχει (π.χ. `gameId=9999`) → αναμένεται **404**
- Ελλιπές ή λάθος body (π.χ. χωρίς υποχρεωτικό πεδίο) → αναμένεται **400**
- Όπου το Swagger ορίζει 409 (ήδη στην ουρά, υπάρχον προφίλ, μη διαθέσιμο cell) → δοκίμασε να το προκαλέσεις
- Έλεγχος ότι το σφάλμα έχει τη μορφή `{success:false, error, message}`

## Ολοκληρωμένη ροή (end-to-end)

1. `POST /queue/players` → ο παίκτης μπαίνει στην ουρά
2. `GET /queue/players` → ο παίκτης φαίνεται στη λίστα και ο μετρητής αυξάνεται
3. `POST /games` → δημιουργείται game
4. `GET /games/{gameId}/players` → φαίνονται οι παίκτες (leaderboard)
5. `GET /games/{gameId}/grid` → grid 16×16 (256 cells)
6. `POST .../players/{playerId}/validate-input` με `{row, column}` → `isValid: true` και `challengeId`
7. `PUT .../players/{playerId}/cells/{cellId}` → επιστρέφει challengeId
8. `GET /games/{gameId}/challenges/{challengeId}?playerId=...` → ερώτηση και επιλογές (χωρίς τη σωστή απάντηση)
9. `POST .../players/{playerId}/challenge-answer` → σωστή απάντηση: `cellAcquired: true`
10. `GET /games/{gameId}/grid` → το cell έχει πλέον ιδιοκτήτη τον παίκτη
11. `GET /games/{gameId}/players` → ενημερωμένος αριθμός cells στο leaderboard
12. `GET /games/{gameId}/turn` → επιστρέφει τον παίκτη που παίζει
13. Επανάληψη του 9 με **λάθος** απάντηση → `cellAcquired: false`, το cell δεν αλλάζει ιδιοκτήτη
14. `PUT .../forfeit` → ο παίκτης αποχωρεί

## Άλλοι έλεγχοι
- CORS: το header `Access-Control-Allow-Origin` υπάρχει στις απαντήσεις (χρειάζεται για το frontend)
- Το `GET .../challenges/{challengeId}` δεν επιστρέφει τη σωστή απάντηση
- Το `.gitignore` αποκλείει το `node_modules`

## Αναφορά ευρημάτων
| Endpoint | Request που έστειλα | Αναμενόμενο | Πραγματικό | Σοβαρότητα |
|---|---|---|---|---|
|  |  |  |  |  |
