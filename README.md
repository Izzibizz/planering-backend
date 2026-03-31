# Planering Backend

Express + TypeScript API for the `planering` Vite frontend.

## Features

- Stores page content (`badge`, `title`, `subtitle`)
- Stores both checklists (`personal`, `artworks`)
- Stores calendar notes by exact `YYYY-MM-DD` date
- Persists planner data in **MongoDB Atlas**
- Seeds the first database document from `data/planner.json` if it exists

## Environment variables

Create a `.env` file locally or add these in Render:

```bash
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB_NAME=planering
FRONTEND_ORIGIN=http://localhost:5173
PORT=4000
```

> `MONGODB_URI` is required. `MONGODB_DB_NAME` is optional and defaults to `planering`.

## Scripts

```bash
npm install
npm run dev
npm run build
npm start
```

## Main routes

- `GET /api/health`
- `GET /api/planner`
- `GET /api/content`
- `PUT /api/content`
- `GET /api/checklists`
- `GET /api/checklists/:listId`
- `POST /api/checklists/:listId/items`
- `PATCH /api/checklists/:listId/items/:itemId`
- `DELETE /api/checklists/:listId/items/:itemId`
- `DELETE /api/checklists/:listId/items/completed`
- `GET /api/calendar-notes?month=YYYY-MM`
- `GET /api/calendar-notes/:date`
- `PUT /api/calendar-notes/:date`
- `DELETE /api/calendar-notes/:date`

## Render setup

- **Root Directory:** leave blank if this folder is the repo root
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Environment Variables:** add at least `MONGODB_URI` and `FRONTEND_ORIGIN`

## Notes

Use this as a sibling folder to the frontend:

- `c:\Users\46729\Desktop\development\planering`
- `c:\Users\46729\Desktop\development\planering-backend`
