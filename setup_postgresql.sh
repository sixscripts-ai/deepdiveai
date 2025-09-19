#!/bin/bash

# DigitalOcean PostgreSQL Setup Helper Script
# This script helps you configure and test your PostgreSQL connection

echo "🐘 DigitalOcean PostgreSQL Setup Helper"
echo "======================================="
echo ""

# Check if required tools are installed
if ! command -v psql &> /dev/null; then
    echo "❌ psql is not installed. Please install PostgreSQL client:"
    echo "   brew install postgresql"
    exit 1
fi

echo "📝 Please provide your DigitalOcean PostgreSQL connection details:"
echo ""

# Collect connection details
read -p "Host (e.g., your-cluster.db.ondigitalocean.com): " PGHOST
read -p "Port (usually 25060): " PGPORT
read -p "Database name (e.g., deepdiveai): " PGDATABASE
read -p "Username (usually doadmin): " PGUSER
read -s -p "Password: " PGPASSWORD
echo ""

# Export environment variables
export PGHOST="$PGHOST"
export PGPORT="$PGPORT"
export PGDATABASE="$PGDATABASE"
export PGUSER="$PGUSER"
export PGPASSWORD="$PGPASSWORD"
export PGSSL=true
export PGSSLMODE=require

# Create connection string
DATABASE_URL="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE?sslmode=require"
export DATABASE_URL="$DATABASE_URL"

echo ""
echo "🔧 Environment variables set:"
echo "PGHOST=$PGHOST"
echo "PGPORT=$PGPORT"
echo "PGDATABASE=$PGDATABASE"
echo "PGUSER=$PGUSER"
echo "PGPASSWORD=***hidden***"
echo "DATABASE_URL=postgresql://$PGUSER:***@$PGHOST:$PGPORT/$PGDATABASE?sslmode=require"
echo ""

# Test connection
echo "🧪 Testing PostgreSQL connection..."
if pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE"; then
    echo "✅ PostgreSQL server is ready!"
else
    echo "❌ PostgreSQL server is not ready. Please check your connection details."
    exit 1
fi

# Test actual connection
echo ""
echo "🔗 Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Database connection successful!"
    
    # Show database info
    echo ""
    echo "📊 Database Information:"
    psql "$DATABASE_URL" -c "SELECT version();" -t
    psql "$DATABASE_URL" -c "SELECT current_database(), current_user;" -t
    
else
    echo "❌ Database connection failed. Please check your credentials."
    exit 1
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Run migration: node migrate_to_postgresql.cjs"
echo "2. Test app locally: npm run dev:full"
echo "3. Deploy to DigitalOcean with these environment variables"
echo ""

# Save environment variables to a file for reference
cat > .env.postgresql << EOF
# DigitalOcean PostgreSQL Configuration
# Add these to your DigitalOcean App Platform environment variables

PGHOST=$PGHOST
PGPORT=$PGPORT
PGDATABASE=$PGDATABASE
PGUSER=$PGUSER
PGPASSWORD=$PGPASSWORD
PGSSL=true
DATABASE_URL=$DATABASE_URL

# For local testing with PostgreSQL:
# source .env.postgresql
# npm run dev:full
EOF

echo "💾 Environment variables saved to .env.postgresql"
echo "   Use: source .env.postgresql (for local PostgreSQL testing)"
echo ""
echo "🚀 Ready for migration and deployment!"