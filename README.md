# legendary-parakeet

Legendary Parakeet is a demo web app that includes a small game (Flappy Parakeet)
and a social feed. The project can run as a static client-only site or with a
minimal Node/Express backend that persists posts and a global highscore.

Contents
--------

- `index.html` — main single-page app
- `css/style.css` — styles for layout, game, and feed
- `js/app.js` — game logic (canvas), social feed, and auth handling
- `server/server.js` — small Express backend and API
- `server/data.json` — simple JSON store (posts, users, tokens, highscore)
- `server/test_api.js` — scripted API test (register/login/post/highscore)

Run / Development
------------------

Static mode (no backend):

```bash
cd /workspaces/legendary-parakeet
python3 -m http.server 8000
# open http://127.0.0.1:8000
```

With backend (recommended for full features):

```bash
cd /workspaces/legendary-parakeet
npm install
npm start
# open http://127.0.0.1:3000
```

Accounts & API
--------------

The app includes a minimal account system. Passwords are hashed with `scrypt`
and tokens are stored in `server/data.json` (demo-only). Use the following API
endpoints when running the backend:

- `POST /api/register` { username, password }
- `POST /api/login` { username, password } -> { token, user }
- `POST /api/logout` (Authorization header)
- `GET /api/me` (Authorization: Bearer <token>) -> current user
- `GET /api/posts` -> list posts (includes username)
- `POST /api/posts` (Authorization optional) { text }
- `POST /api/posts/:id/like` -> like a post
- `DELETE /api/posts/:id` (Authorization required if post owned)
- `GET /api/highscore` -> { highscore }
- `POST /api/highscore` { score } -> update global highscore if higher

Testing
-------

I added `server/test_api.js` which runs a register/login/post/like/delete/highscore
flow against the local server. To run it:

```bash
# start server
cd /workspaces/legendary-parakeet
npm install
npm start

# run the test script in another terminal
node server/test_api.js
```

Security & Notes
----------------

- This project is a demo. The auth/token approach is intentionally simple and
  not suitable for production. If you want a production-ready auth flow I can
  add sessions, JWTs, database storage, and password reset flows.
- Data stored in `server/data.json` is persisted between runs in this workspace.

Next steps I can take (pick one or I'll choose):

- Add a real database (SQLite) and migrate the store
- Add password-reset and email verification flows
- Add a leaderboard page showing recent top scores and player names

Enjoy the parakeet!
# legendary-parakeet

Legendary Parakeet is a demo static web app that includes a small game (Flappy Parakeet)
and a local social feed — everything runs entirely in the browser and data is stored in
# legendary-parakeet

Legendary Parakeet is a demo web app: a small Flappy Parakeet game plus a simple
social feed. The project runs as a static client-only app or with a minimal
Node/Express backend that provides accounts, persistent posts, and a leaderboard.

Files
-----

- `index.html` — main single-page app (game + feed)
- `leaderboard.html` — dedicated leaderboard page
- `css/style.css` — styles
- `js/app.js` — frontend logic (game, feed, auth, leaderboard)
- `server/` — Express server, simple JSON store, and helpers

Quick start
-----------

Static mode (no backend):

```bash
cd /workspaces/legendary-parakeet
python3 -m http.server 8000
# open http://127.0.0.1:8000
```

With backend (recommended):

```bash
cd /workspaces/legendary-parakeet
npm install
npm start
# open http://127.0.0.1:3000
```

APIs & Accounts
----------------

The server provides a small API and a minimal account system (scrypt-hashed
passwords stored in `server/data.json` for demo purposes). Important endpoints:

- `POST /api/register` { username, password }
- `POST /api/login` { username, password } -> { token, user }
- `GET /api/me` (Authorization: Bearer <token>) -> current user
- `GET /api/posts`, `POST /api/posts`, `POST /api/posts/:id/like`, `DELETE /api/posts/:id`
- `GET /api/highscore`, `POST /api/highscore`
- `GET /api/leaderboard`, `POST /api/leaderboard/clear` (requires auth)
 - `GET /api/leaderboard`, `POST /api/leaderboard/clear` (requires auth)
 - `GET /api/chats` -> public chat messages
 - `POST /api/chats` { text } -> create public chat message (optionally authenticated)

Leaderboard
-----------

- Small leaderboard panel is included in the main UI.
- A dedicated leaderboard page is available at `/leaderboard.html` (download/export/clear).

Notes
-----

- This project is a demo and not production-grade authentication or storage.
- The server tries to use SQLite (`better-sqlite3`) when available; if native
  modules can't be built in the environment the app falls back to using
  `server/data.json` for leaderboard persistence.

If you'd like, I can continue by switching to a prebuilt, cross-platform DB
library, or I can add more features (multiplayer, persistent user profiles,
ranked leaderboards, etc.).

Enjoy the parakeet!

Chats
-----

- **GET /api/chats** -> returns an array of public chat messages (JSON). Each
  message contains `id`, `text`, `t` (unix ms timestamp), and `username`.
- **POST /api/chats** { text } -> create a new chat message. If you are
  authenticated (Authorization: Bearer <token>) the message will include your
  username; otherwise it will be stored as `anonymous`/`anon` depending on
  the server config.

Example `curl` commands:

```bash
# post a chat (anonymous)
curl -s -X POST -H "Content-Type: application/json" -d '{"text":"Hello from curl"}' http://localhost:3000/api/chats

# fetch the latest chats
curl -s http://localhost:3000/api/chats | jq .
```

Notes
-----

- Chats are persisted to `server/data.json` in demo mode. Messages are public
  and intended for demonstration only; no moderation or rate-limiting is in
  place.