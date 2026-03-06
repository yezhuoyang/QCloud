#!/bin/bash
set -e

echo "=== QCloud Deploy Script ==="

# 1. Kill existing uvicorn if running
echo "[1/5] Stopping existing server..."
if lsof -t -i:8000 > /dev/null 2>&1; then
  kill $(lsof -t -i:8000)
  sleep 2
  echo "  Server stopped."
else
  echo "  No server running on port 8000."
fi

# 2. Pull latest code
echo "[2/5] Pulling latest code..."
cd /root/QCloud
git pull

# 3. Install/update backend dependencies
echo "[3/5] Installing backend dependencies..."
cd /root/QCloud/backend
source venv/bin/activate
pip install -r requirements.txt --quiet

# 4. Build and deploy frontend
echo "[4/5] Building and deploying frontend..."
cd /root/QCloud
npm install --silent
npm run build
cp -r dist/* /var/www/qcloud/

# 5. Start backend server
echo "[5/5] Starting backend server..."
cd /root/QCloud/backend
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/uvicorn.log 2>&1 &
sleep 2

if lsof -t -i:8000 > /dev/null 2>&1; then
  echo "=== Deploy complete! Server running on port 8000 ==="
else
  echo "=== ERROR: Server failed to start. Check /tmp/uvicorn.log ==="
  tail -20 /tmp/uvicorn.log
  exit 1
fi
