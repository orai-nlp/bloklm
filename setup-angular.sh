#!/bin/bash

# Angular Project Setup Script
# This script automates the setup of a new Angular project

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists (updated to handle nvm)
command_exists() {
    if [ "$1" = "nvm" ]; then
        # Special check for nvm since it's a shell function
        [ -n "$(command -v nvm)" ] || [ -n "$(type nvm 2>/dev/null)" ]
    else
        command -v "$1" >/dev/null 2>&1
    fi
}

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command_exists apt-get; then
            OS="ubuntu"
        elif command_exists yum; then
            OS="centos"
        elif command_exists dnf; then
            OS="fedora"
        elif command_exists pacman; then
            OS="arch"
        else
            OS="linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
    else
        OS="unknown"
    fi
}

# Function to install NVM
install_nvm() {
    print_status "Installing NVM (Node Version Manager)..."
    
    # Download and install nvm
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    
    # Source nvm script
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    
    # Verify nvm installation
    if command_exists nvm; then
        print_success "NVM installed successfully!"
        return 0
    else
        # Try to source nvm again
        if [ -s "$HOME/.nvm/nvm.sh" ]; then
            \. "$HOME/.nvm/nvm.sh"
            if command_exists nvm; then
                print_success "NVM installed successfully!"
                return 0
            fi
        fi
        
        print_error "NVM installation failed. Please install manually."
        return 1
    fi
}

# Function to install Node.js using NVM
install_nodejs_with_nvm() {
    print_status "Installing Node.js v24 (LTS) using NVM..."
    
    # Install latest LTS version (v24)
    nvm install 24
    nvm use 24
    nvm alias default 24
    
    # Verify installation
    if command_exists node && command_exists npm; then
        NODE_VERSION=$(node -v)
        NPM_VERSION=$(npm -v)
        print_success "Node.js installed: $NODE_VERSION"
        print_success "npm installed: $NPM_VERSION"
        return 0
    else
        print_error "Node.js installation via NVM failed."
        return 1
    fi
}

# Function to install Node.js
install_nodejs() {
    print_status "Installing Node.js..."
    
    case $OS in
        "ubuntu"|"centos"|"fedora"|"arch"|"linux")
            print_status "Using NVM (Node Version Manager) for Linux installation..."
            
            # Check if nvm is already installed
            if command_exists nvm; then
                print_success "NVM is already installed!"
                install_nodejs_with_nvm
            else
                # Install NVM first
                if install_nvm; then
                    install_nodejs_with_nvm
                else
                    print_error "Failed to install NVM. Falling back to manual installation instructions."
                    print_status "Please run the following commands manually:"
                    echo "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash"
                    echo "\. \"\$HOME/.nvm/nvm.sh\""
                    echo "nvm install 24"
                    echo "nvm use 24"
                    exit 1
                fi
            fi
            ;;
        "macos")
            print_status "For macOS, you can choose between NVM or Homebrew:"
            echo "1) NVM (Node Version Manager) - Recommended"
            echo "2) Homebrew"
            read -p "Choose installation method (1-2, default is 1): " INSTALL_METHOD
            INSTALL_METHOD=${INSTALL_METHOD:-1}
            
            if [ "$INSTALL_METHOD" = "1" ]; then
                if command_exists nvm; then
                    print_success "NVM is already installed!"
                    install_nodejs_with_nvm
                else
                    if install_nvm; then
                        install_nodejs_with_nvm
                    else
                        exit 1
                    fi
                fi
            else
                if command_exists brew; then
                    print_status "Installing Node.js via Homebrew..."
                    brew install node
                else
                    print_warning "Homebrew not found. Installing Homebrew first..."
                    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                    brew install node
                fi
            fi
            ;;
        "windows")
            print_error "Windows detected. Please use one of the following methods:"
            print_status "1. Download Node.js manually from https://nodejs.org"
            print_status "2. Use chocolatey: choco install nodejs"
            print_status "3. Use scoop: scoop install nodejs"
            print_status "4. Use NVM for Windows: https://github.com/coreybutler/nvm-windows"
            exit 1
            ;;
        *)
            print_error "Unable to automatically install Node.js on this system."
            print_status "Please install Node.js manually using NVM:"
            print_status "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash"
            print_status "\. \"\$HOME/.nvm/nvm.sh\""
            print_status "nvm install 24"
            exit 1
            ;;
    esac
    
    print_success "Node.js installation completed!"
}

# Check if Node.js is installed
check_nodejs() {
    print_status "Checking Node.js installation..."
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
        
        # Check if version is 16 or higher
        NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR_VERSION" -lt 16 ]; then
            print_error "Node.js version 16 or higher is required. Current version: $NODE_VERSION"
            print_warning "Would you like to update Node.js?"
            read -p "Update Node.js? (Y/n): " UPDATE_NODE
            if [[ "$UPDATE_NODE" =~ ^[Yy]$|^$ ]]; then
                install_nodejs
            else
                exit 1
            fi
        fi
    else
        print_warning "Node.js is not installed."
        read -p "Would you like to install Node.js now? (Y/n): " INSTALL_NODE
        if [[ "$INSTALL_NODE" =~ ^[Yy]$|^$ ]]; then
            install_nodejs
        else
            print_error "Node.js is required to continue. Exiting..."
            exit 1
        fi
    fi
}

# Check if npm is installed
check_npm() {
    print_status "Checking npm installation..."
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_success "npm is installed: $NPM_VERSION"
    else
        print_warning "npm is not installed."
        if command_exists node; then
            print_status "Node.js is installed but npm is missing. This is unusual."
            print_status "npm usually comes with Node.js. Trying to install npm separately..."
            
            case $OS in
                "ubuntu"|"debian")
                    sudo apt-get update
                    sudo apt-get install -y npm
                    ;;
                "centos"|"fedora")
                    sudo yum install -y npm
                    ;;
                "macos")
                    if command_exists brew; then
                        brew install npm
                    else
                        print_error "Please install npm manually"
                        exit 1
                    fi
                    ;;
                *)
                    print_error "Please install npm manually or reinstall Node.js"
                    exit 1
                    ;;
            esac
        else
            print_error "Node.js is not installed. npm comes with Node.js installation."
            exit 1
        fi
    fi
}

# Install Angular CLI
install_angular_cli() {
    print_status "Checking Angular CLI installation..."
    if command_exists ng; then
        NG_VERSION=$(ng version --json 2>/dev/null | grep -o '"@angular/cli": "[^"]*"' | cut -d'"' -f4 || echo "unknown")
        print_success "Angular CLI is already installed: $NG_VERSION"
    else
        print_warning "Angular CLI is not installed."
        read -p "Would you like to install Angular CLI now? (Y/n): " INSTALL_CLI
        if [[ "$INSTALL_CLI" =~ ^[Yy]$|^$ ]]; then
            print_status "Installing Angular CLI globally..."
            npm install -g @angular/cli
            
            # Verify installation
            if command_exists ng; then
                print_success "Angular CLI installed successfully!"
            else
                print_error "Angular CLI installation failed. Please check npm permissions."
                print_status "You might need to configure npm to install global packages without sudo:"
                print_status "npm config set prefix ~/.npm-global"
                print_status "export PATH=~/.npm-global/bin:\$PATH"
                exit 1
            fi
        else
            print_error "Angular CLI is required to continue. Exiting..."
            exit 1
        fi
    fi
}

# Get project name from user
get_project_name() {
    while true; do
        read -p "Enter project name (or press Enter for 'my-angular-app'): " PROJECT_NAME
        PROJECT_NAME=${PROJECT_NAME:-my-angular-app}
        
        # Validate project name (basic validation)
        if [[ "$PROJECT_NAME" =~ ^[a-zA-Z][a-zA-Z0-9-]*$ ]]; then
            break
        else
            print_error "Invalid project name. Use only letters, numbers, and hyphens. Must start with a letter."
        fi
    done
}

# Get user preferences
get_user_preferences() {
    echo
    print_status "Project configuration:"
    
    # Routing
    read -p "Would you like to add Angular routing? (Y/n): " ADD_ROUTING
    ADD_ROUTING=${ADD_ROUTING:-Y}
    
    # Stylesheet
    echo "Select stylesheet format:"
    echo "1) CSS"
    echo "2) SCSS"
    echo "3) Sass"
    echo "4) Less"
    read -p "Enter choice (1-4, default is 1): " STYLE_CHOICE
    STYLE_CHOICE=${STYLE_CHOICE:-1}
    
    case $STYLE_CHOICE in
        1) STYLESHEET="css" ;;
        2) STYLESHEET="scss" ;;
        3) STYLESHEET="sass" ;;
        4) STYLESHEET="less" ;;
        *) STYLESHEET="css" ;;
    esac
}

# Create Angular project
create_project() {
    print_status "Creating Angular project: $PROJECT_NAME"
    
    # Check if directory already exists
    if [ -d "$PROJECT_NAME" ]; then
        print_error "Directory '$PROJECT_NAME' already exists!"
        read -p "Do you want to continue anyway? This might overwrite files. (y/N): " CONTINUE
        if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
            print_status "Project creation cancelled."
            exit 0
        fi
    fi
    
    # Build ng new command
    NG_NEW_CMD="ng new $PROJECT_NAME --style=$STYLESHEET"
    
    if [[ "$ADD_ROUTING" =~ ^[Yy]$ ]]; then
        NG_NEW_CMD="$NG_NEW_CMD --routing"
    else
        NG_NEW_CMD="$NG_NEW_CMD --routing=false"
    fi
    
    # Add skip-git flag to avoid git init issues in some environments
    NG_NEW_CMD="$NG_NEW_CMD --skip-git"
    
    print_status "Running: $NG_NEW_CMD"
    eval $NG_NEW_CMD
    
    print_success "Angular project '$PROJECT_NAME' created successfully!"
}

# ------------------------------------------------------------------
# Offer to append NVM source lines to the user’s shell start-up file
# ------------------------------------------------------------------
offer_to_source_nvm() {
    # Only makes sense if we installed or used NVM
    if ! command_exists nvm; then
        return 0
    fi

    echo
    print_status "NVM (Node Version Manager) detected."
    read -p "Would you like to automatically re-source NVM in every new shell? (Y/n): " REPLY
    REPLY=${REPLY:-Y}

    [[ $REPLY =~ ^[Yy]$ ]] || return 0

    # Detect the right RC file
    case "$SHELL" in
        */zsh)   RC_FILE="$HOME/.zshrc" ;;
        */bash)  RC_FILE="$HOME/.bashrc" ;;
        *)       RC_FILE="$HOME/.profile" ;;
    esac

    # Lines we want
    NVM_LINES=$(cat <<'EOF'

# --- Angular project setup script: NVM auto-source ---
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
# -----------------------------------------------------
EOF
    )

    # Skip if already present
    if grep -q 'NVM_DIR.*nvm.sh' "$RC_FILE" 2>/dev/null; then
        print_success "NVM already configured in $RC_FILE — nothing to add."
    else
        print_status "Appending NVM configuration to $RC_FILE ..."
        echo "$NVM_LINES" >> "$RC_FILE"
        print_success "Done. Open a new terminal or run 'source $RC_FILE' to load changes."
    fi
}

# Show next steps
show_next_steps() {
    echo
    print_success "Setup completed! Here are your next steps:"
    echo
    echo -e "${BLUE}1. Navigate to your project:${NC}"
    echo "   cd $PROJECT_NAME"
    echo
    echo -e "${BLUE}2. Start the development server:${NC}"
    echo "   ng serve"
    echo
    echo -e "${BLUE}3. Open your browser and go to:${NC}"
    echo "   http://localhost:4200"
    echo
    echo -e "${BLUE}4. Common commands:${NC}"
    echo "   ng generate component component-name    # Create a component"
    echo "   ng generate service service-name        # Create a service"
    echo "   ng build                                # Build for production"
    echo "   ng test                                 # Run unit tests"
    echo
    
    read -p "Would you like to start the development server now? (Y/n): " START_SERVER
    if [[ "$START_SERVER" =~ ^[Yy]$|^$ ]]; then
        print_status "Starting development server..."
        cd "$PROJECT_NAME"
        ng serve --open
    fi
}

# Install npm dependencies
install_dependencies(){
    print_status "Installing npm dependencies..."
    echo
    npm install
    echo
    print_success "Installation completed!"
    echo
}

# Main execution
main() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Angular Project Setup Script${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    
    detect_os
    print_status "Detected OS: $OS"
    echo
    
    check_nodejs
    check_npm
    install_angular_cli
    # get_project_name
    # get_user_preferences
    # create_project
    # offer_to_source_nvm
    install_dependencies
    show_next_steps
}

# Run main function
main "$@"
