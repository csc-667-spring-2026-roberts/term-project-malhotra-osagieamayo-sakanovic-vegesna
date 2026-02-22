# HTTP/1.1 Document Server

CSC 667 Web Server Project — Spring 2026

## Team Members

| Name | GitHub | Email |
|------|--------|-------|
| Vishrut Malhotra | @Agentwolf27 | vmalhotra@sfsu.edu |
| Member 2 | @username | email@sfsu.edu |
| Member 3 | @username | email@sfsu.edu |
| Member 4 | @username | email@sfsu.edu |

## Requirements

- **Methods**: GET, PUT, DELETE
- **File operations**: Serve, create, delete files in `public/`
- **Auth**: Basic Auth required for PUT and DELETE
- **Status codes**: 200, 201, 204, 400, 401, 403, 404, 405, 500
- **Headers**: Date, Content-Type, Content-Length, Connection, WWW-Authenticate

## Setup

```bash
npm install
cp .env.example .env
# Edit .env to set AUTH_USER and AUTH_PASS (default: admin/secret)
npm run dev
```

## Usage

- **GET** `/` — Serves `public/index.html`
- **GET** `/path/to/file` — Serves file from `public/`
- **PUT** `/path/to/file` — Create/overwrite file (Basic Auth required)
- **DELETE** `/path/to/file` — Delete file (Basic Auth required)

## Scripts

- `npm run dev` — Start development server with hot reload
- `npm run build` — Compile TypeScript
- `npm start` — Run compiled server
- `npm run lint` — Check for lint errors
- `npm run lint:fix` — Auto-fix lint errors
- `npm run format` — Format code with Prettier
