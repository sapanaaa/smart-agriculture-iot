#!/usr/bin/env bash
set -e
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d "$@"
echo ""
echo "AgriSense running at http://localhost"
echo "  Logs: docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
echo "  Stop: docker compose -f docker-compose.yml -f docker-compose.prod.yml down"
