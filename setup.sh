#!/bin/bash
set -e

echo "=== ROI2PAN2 System Center Setup ==="

# Check for .env file
if [ ! -f ".env" ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "Please edit .env with your database credentials, then run this script again."
  exit 1
fi

echo "Installing dependencies..."
npm install

echo "Generating Prisma client..."
npx prisma generate

echo "Running database migrations..."
npx prisma db push

echo "Seeding database..."
npx prisma db seed

echo ""
echo "=== Setup complete! ==="
echo "Run: npm run dev"
echo ""
echo "Default credentials:"
echo "  Admin: admin / admin1234"
echo "  Staff: staff / staff1234"
echo ""
echo "IMPORTANT: If upgrading from a previous version, run the migration:"
echo "  psql \$DATABASE_URL -f prisma/migrations/add_status/migration.sql"
