#!/bin/bash
set -e
echo "Setting up ReliefLensAI backend..."
cd "$(dirname "$0")/../backend"
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
mkdir -p data
echo "Backend setup complete!"
