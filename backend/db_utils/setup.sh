#!/bin/bash

# -------------------------------
# Check if PostgreSQL is already installed
# -------------------------------
echo "Checking if PostgreSQL is already installed..."
if dpkg -l | grep -q postgresql; then
    echo "PostgreSQL is already installed. Skipping installation."
else
    echo "PostgreSQL not found. Installing..."
    # Update package list and install PostgreSQL
    echo "Installing postgresql and extra utilities..."
    sudo apt update
    sudo apt install postgresql postgresql-contrib -y  # Installs PostgreSQL server and extra utilities
fi

# -------------------------------
# Check if PostgreSQL service is running
# -------------------------------
echo "Checking PostgreSQL service status..."
if systemctl is-active --quiet postgresql; then
    echo "PostgreSQL service is already running."
else
    echo "PostgreSQL service is not running. Starting..."
    sudo systemctl enable postgresql  # Ensures PostgreSQL starts on boot
    sudo systemctl start postgresql   # Starts PostgreSQL service immediately
fi

# -------------------------------
# Configure PostgreSQL to use port 6000
# -------------------------------
echo "Configuring PostgreSQL to use port 6000..."
PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '(\d+)\.\d+' | head -1 | cut -d'.' -f1)
PG_CONFIG_PATH="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"

# Check if port is already set to 6000
if grep -q "^port = 6000" "$PG_CONFIG_PATH"; then
    echo "PostgreSQL is already configured to use port 6000."
else
    echo "Setting PostgreSQL port to 6000..."
    sudo sed -i "s/^#port = 5432/port = 6000/" "$PG_CONFIG_PATH"
    sudo sed -i "s/^port = 5432/port = 6000/" "$PG_CONFIG_PATH"
    
    # Restart PostgreSQL to apply port change
    echo "Restarting PostgreSQL service to apply port change..."
    sudo systemctl restart postgresql
    
    # Wait a moment for service to restart
    sleep 3
fi

# -------------------------------
# Load environment variables from .env file
# -------------------------------
echo "Loading environment variables from .env file..."
if [ -f ".env" ]; then
    set -o allexport      # Automatically export all variables loaded from .env
    source .env           # Load DB_NAME, DB_USER, DB_PASSWORD, etc.
    set +o allexport      # Stop auto-exporting after .env is loaded
    echo "Environment variables loaded successfully."
else
    echo "❌ Error: .env file not found!"
    exit 1
fi

# -------------------------------
# Check if virtual environment already exists
# -------------------------------
echo "Checking if virtual environment exists..."
if [ -d "db_venv" ]; then
    echo "Virtual environment already exists. Skipping creation."
else
    echo "Creating virtual environment..."
    python3 -m venv db_venv           # Creates a virtual environment named db_venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source db_venv/bin/activate       # Activates the virtual environment

# -------------------------------
# Install required Python packages (only if requirements.txt exists)
# -------------------------------
if [ -f "requirements.txt" ]; then
    echo "Installing dependencies from requirements.txt..."
    pip install -r requirements.txt   # Installs psycopg2 and python-dotenv
else
    echo "⚠️  Warning: requirements.txt not found. Skipping package installation."
fi

# -------------------------------
# Create PostgreSQL database and user using values from .env
# -------------------------------
echo "Creating PostgreSQL database and user using .env values..."

# Use port 6000 for PostgreSQL connection
sudo -u postgres psql -p 6000 <<EOF
CREATE DATABASE ${DB_NAME};
CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASSWORD}' LOGIN;
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

# -------------------------------
# Create tables
# -------------------------------
echo "Creating bilduma and fitxategia tables..."
python create_tables.py


# -------------------------------
# Insert mock data
# -------------------------------


# -------------------------------
# Final message and exit
# -------------------------------
echo "✅ Done. Exiting..."
deactivate                     # Deactivate the virtual environment
