# Planering Backend

Express + TypeScript API for the `planering` Vite frontend.

## Features

- Stores page content (`badge`, `title`, `subtitle`)
- Stores both checklists (`personal`, `artworks`)
- Stores calendar notes by exact `YYYY-MM-DD` date
- Saves data to `data/planner.json`

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

## Notes

Use this as a sibling folder to the frontend:

- `c:\Users\46729\Desktop\development\planering`
- `c:\Users\46729\Desktop\development\planering-backend`
