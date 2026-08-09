- [ ] Inspect backend/requirements.txt and backend entrypoints (main.py)
- [ ] Inspect frontend/package.json scripts and Vite dev command
- [ ] Check docker-compose.yml and whether to use containers for Postgres/Redis
- [ ] Create a local run plan (backend + frontend + optional simulator)
- [ ] Execute backend in dev mode (uvicorn main:app --reload --host 0.0.0.0 --port 8000)
- [ ] Execute frontend in dev mode (npm install + npm run dev)
- [ ] Start simulator (backend/simulator.py) to generate TCP data
- [ ] Verify websocket feed by opening frontend and checking /ws/frontend connection
- [ ] Document run commands in the final response

