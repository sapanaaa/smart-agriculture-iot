#!/bin/bash
set -e

echo "🔍 Checking ML models..."

MODELS_DIR="/app/ml/saved_models"

if [ ! -d "$MODELS_DIR" ] || [ -z "$(ls -A $MODELS_DIR 2>/dev/null)" ]; then
    echo "⚠️  ML models not found in $MODELS_DIR"
    echo "📦 ML endpoints will fail until models are uploaded to S3 and synced."
    echo "💡 To upload models: Run GitHub Action 'Upload ML Models to S3'"
else
    echo "✅ ML models found:"
    ls -lh $MODELS_DIR
fi

# Execute the main command
exec "$@"
