#!/bin/bash

# Advanced Chat App Setup Script
echo "🚀 Setting up Advanced Chat Application..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 14+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d 'v' -f 2)
REQUIRED_VERSION="14.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 14+"
    exit 1
fi

print_status "Node.js version: $NODE_VERSION ✓"

# Check if MongoDB is available
if ! command -v mongod &> /dev/null; then
    print_warning "MongoDB is not installed locally. Make sure you have MongoDB Atlas or local MongoDB setup."
fi

# Install root dependencies
print_status "Installing root dependencies..."
npm install

# Install server dependencies
print_status "Installing server dependencies..."
cd server
npm install

# Install client dependencies
print_status "Installing client dependencies..."
cd ../client
npm install
cd ..

# Create environment file
print_status "Setting up environment configuration..."
if [ ! -f "server/.env" ]; then
    cp server/.env.example server/.env
    print_status "Created server/.env file from template"
    print_warning "Please edit server/.env with your configuration:"
    echo "  - MONGO_URI: Your MongoDB connection string"
    echo "  - JWT_SECRET: A secure random string"
    echo "  - OPENAI_API_KEY: Your OpenAI API key (optional)"
else
    print_status "server/.env already exists"
fi

# Create uploads directory
print_status "Creating uploads directory..."
mkdir -p server/uploads

# Generate JWT secret if not provided
if [ -f "server/.env" ]; then
    if grep -q "JWT_SECRET=your-super-secure-jwt-secret-key-here" server/.env; then
        JWT_SECRET=$(openssl rand -hex 32)
        sed -i.bak "s/JWT_SECRET=your-super-secure-jwt-secret-key-here/JWT_SECRET=$JWT_SECRET/" server/.env
        print_status "Generated random JWT secret"
    fi
fi

# Check if all dependencies are installed
print_status "Verifying installation..."

# Function to check if package.json exists and has dependencies
check_dependencies() {
    local dir=$1
    local name=$2
    
    if [ -f "$dir/package.json" ]; then
        if [ -d "$dir/node_modules" ]; then
            print_status "$name dependencies installed ✓"
        else
            print_error "$name dependencies not installed"
            return 1
        fi
    else
        print_error "$name package.json not found"
        return 1
    fi
}

check_dependencies "." "Root"
check_dependencies "server" "Server"
check_dependencies "client" "Client"

# Print setup completion message
echo ""
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}🔧 Next steps:${NC}"
echo "1. Edit server/.env with your configuration"
echo "2. Start MongoDB (if running locally)"
echo "3. Run the application:"
echo "   ${YELLOW}npm run dev${NC}"
echo ""
echo -e "${BLUE}📖 Configuration needed:${NC}"
echo "• MongoDB URI in server/.env"
echo "• OpenAI API key for ChatGPT features (optional)"
echo ""
echo -e "${BLUE}🚀 Application URLs:${NC}"
echo "• Client: http://localhost:5173"
echo "• Server: http://localhost:5000"
echo ""
echo -e "${GREEN}Happy chatting! 💬✨${NC}"