#!/usr/bin/env bash
set -e

echo "=== KongTrade ==="

# ---- .env ----
if [ ! -f backend/.env ]; then
    cp .env.example backend/.env
    SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
    ENCKEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
    sed -i "s/SECRET_KEY=.*/SECRET_KEY=$SECRET/" backend/.env
    sed -i "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$ENCKEY/" backend/.env
    echo "Created backend/.env with random secrets"
fi

# ---- Backend ----
echo "Starting backend..."
cd backend
if [ ! -d venv ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt > /dev/null
else
    source venv/bin/activate
fi
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# ---- Frontend ----
echo "Starting frontend..."
cd frontend
if [ ! -d node_modules ]; then
    npm install > /dev/null 2>&1
fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=== KongTrade running ==="
echo "  App:  http://localhost:5173"
echo "  API:  http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
