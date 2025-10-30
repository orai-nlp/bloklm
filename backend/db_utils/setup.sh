# -------------------------------
# Create PostgreSQL database and user using values from .env
# -------------------------------
echo "Creating PostgreSQL database and user using .env values..."

# Use port 5432 for PostgreSQL connection
sudo -u postgres psql -p 5432 <<EOF
CREATE DATABASE ${DB_NAME};
CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASSWORD}' LOGIN;
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

# -------------------------------
# Create tables
# -------------------------------
echo "Creating bilduma and fitxategia tables..."
python create_tables.py
