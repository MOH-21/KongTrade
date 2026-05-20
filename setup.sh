#!/usr/bin/env bash
set -e

echo "=== KongTrade Setup ==="

# ---- Docker ----
if ! command -v docker &>/dev/null; then
    echo "[1/4] Installing Docker..."
    if command -v snap &>/dev/null && snap list docker &>/dev/null 2>&1; then
        sudo snap remove docker
    fi
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    echo "Docker installed. You may need to log out and back in."
else
    echo "[1/4] Docker found: $(docker --version)"
fi

# ---- Docker group check ----
if ! groups "$USER" | grep -q docker; then
    echo "[2/4] Adding $USER to docker group..."
    sudo groupadd -f docker
    sudo usermod -aG docker "$USER"
fi

# ---- .env ----
if [ ! -f .env ]; then
    echo "[3/4] Creating .env from .env.example..."
    cp .env.example .env
    # Generate random secrets
    SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
    ENCKEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
    sed -i "s/SECRET_KEY=.*/SECRET_KEY=$SECRET/" .env
    sed -i "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$ENCKEY/" .env
else
    echo "[3/4] .env already exists, skipping."
fi

# ---- Start ----
echo "[4/4] Starting KongTrade..."
if docker compose version &>/dev/null 2>&1; then
    docker compose up -d --build
elif command -v docker-compose &>/dev/null 2>&1; then
    docker-compose up -d --build
else
    echo "Error: docker compose not found."
    exit 1
fi

echo ""
echo "=== KongTrade is running ==="
echo "  App:  http://localhost:3000"
echo "  API:  http://localhost:8000/docs"
echo ""
echo "If this is your first time, you may need to log out and back in for docker permissions."
