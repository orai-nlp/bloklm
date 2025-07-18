# Stop the service first
sudo systemctl stop postgresql
sudo systemctl disable postgresql

# Remove all PostgreSQL packages
sudo apt purge postgresql postgresql-* 

# Remove data directories
sudo rm -rf /var/lib/postgresql/
sudo rm -rf /etc/postgresql/
sudo rm -rf /var/log/postgresql/

# Remove PostgreSQL user
sudo deluser postgres

sudo apt autoremove
sudo apt autoclean