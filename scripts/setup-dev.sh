#!/bin/bash
# =============================================================================
# ConstrutorPro - Development Setup Script
# =============================================================================

set -e

echo "🚀 Setting up ConstrutorPro development environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    
    # Generate random secrets
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    CRON_SECRET=$(openssl rand -hex 16)
    
    # Update .env with generated values
    sed -i "s|your-super-secret-key-at-least-32-characters-long|$NEXTAUTH_SECRET|g" .env
    sed -i "s|0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef|$ENCRYPTION_KEY|g" .env
    sed -i "s|your-secure-cron-secret|$CRON_SECRET|g" .env
    
    echo "✅ Generated secure secrets"
fi

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
bunx prisma generate

# Setup SQLite database for development
echo "🗄️ Setting up SQLite database..."
if [ ! -f db/custom.db ]; then
    mkdir -p db
    cp prisma/schema.sqlite.prisma prisma/schema.current.prisma
    bunx prisma db push --schema=prisma/schema.sqlite.prisma --accept-data-loss
    echo "✅ Database created"
fi

# Run tests
echo "🧪 Running tests..."
bun run test

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the development server:"
echo "  bun run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
