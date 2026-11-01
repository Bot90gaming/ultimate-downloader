#!/usr/bin/env bash

# ==============================================================================
# Ultimate Downloader - Cross-Platform Development Launcher (Linux & macOS)
# ==============================================================================

set -e

# Terminal formatting
BOLD="\033[1m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
DIM="\033[2m"
RESET="\033[0m"

echo -e "${CYAN}${BOLD}"
echo "  _   _ _ _   _                 _          ____  _"
echo " | | | | | |_(_)_ __ ___   __ _| |_ ___   |  _ \| |"
echo " | | | | | __| | '_ \` _ \ / _\` | __/ _ \  | | | | |"
echo " | |_| | | |_| | | | | | | (_| | ||  __/  | |_| | |___"
echo "  \___/|_|\__|_|_| |_| |_|\__,_|\__\___|  |____/|_____|"
echo -e "${RESET}"
echo -e "${BOLD}Universal Cross-Platform Video and Image Media Extractor${RESET}"
echo -e "${DIM}https://github.com/hoshirun/ultimate-downloader${RESET}"
echo "--------------------------------------------------------"

# 1. Check Node.js
echo -ne "${BOLD}[1/4] Checking Node.js environment... ${RESET}"
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}FAILED${RESET}"
    echo -e "${RED}Error: Node.js is not installed.${RESET}"
    echo "Please install Node.js 22 LTS or 20 LTS from https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node -v)
NODE_MAJOR=$(echo "$NODE_VERSION" | tr -d 'v' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo -e "${YELLOW}WARNING (Found $NODE_VERSION)${RESET}"
    echo -e "${YELLOW}Notice: Node.js 20+ or 22 LTS is strongly recommended for best performance.${RESET}"
else
    echo -e "${GREEN}OK ($NODE_VERSION)${RESET}"
fi

# 2. Check npm
echo -ne "${BOLD}[2/4] Checking npm package manager... ${RESET}"
if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}FAILED${RESET}"
    echo -e "${RED}Error: npm is not installed.${RESET}"
    exit 1
fi
NPM_VERSION=$(npm -v)
echo -e "${GREEN}OK (v$NPM_VERSION)${RESET}"

# 3. Check FFmpeg
echo -ne "${BOLD}[3/4] Checking FFmpeg audio/video encoder... ${RESET}"
if ! command -v ffmpeg >/dev/null 2>&1; then
    echo -e "${YELLOW}NOT FOUND${RESET}"
    echo -e "${YELLOW}Warning: ffmpeg was not detected in your PATH.${RESET}"
    echo "FFmpeg is required for high-res video muxing and audio conversions."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "  To install on macOS: ${CYAN}brew install ffmpeg${RESET}"
    elif command -v apt-get >/dev/null 2>&1; then
        echo -e "  To install on Debian/Ubuntu: ${CYAN}sudo apt install -y ffmpeg${RESET}"
    elif command -v dnf >/dev/null 2>&1; then
        echo -e "  To install on Fedora/RHEL: ${CYAN}sudo dnf install -y ffmpeg${RESET}"
    elif command -v pacman >/dev/null 2>&1; then
        echo -e "  To install on Arch Linux: ${CYAN}sudo pacman -S ffmpeg${RESET}"
    fi
    echo "Continuing startup with fallback mode..."
else
    FFMPEG_VER=$(ffmpeg -version 2>&1 | head -n1 | cut -d' ' -f3)
    echo -e "${GREEN}OK (v$FFMPEG_VER)${RESET}"
fi

# Ensure downloads folder exists
mkdir -p downloads

# 4. Check & Install Dependencies
echo -ne "${BOLD}[4/4] Verifying dependencies... ${RESET}"
if [ ! -d "node_modules" ] || [ ! -d "client/node_modules" ] || [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}Installing missing modules...${RESET}"
    npm install
    echo -e "${GREEN}Dependencies installed successfully!${RESET}"
else
    echo -e "${GREEN}Up to date${RESET}"
fi

echo "--------------------------------------------------------"
echo -e "${GREEN}${BOLD}Starting Ultimate Downloader development cluster...${RESET}"
echo -e "  - Server API:     ${CYAN}http://localhost:4000/api/health${RESET}"
echo -e "  - Client Web UI:  ${CYAN}http://localhost:5173${RESET}"
echo -e "  - Press ${BOLD}Ctrl+C${RESET} to gracefully terminate both services."
echo "--------------------------------------------------------"

# Function to auto-open default browser once the frontend is responsive
open_browser() {
    local target_url="http://localhost:5173"
    local attempts=0
    local max_attempts=30

    while [ $attempts -lt $max_attempts ]; do
        sleep 1
        if command -v curl >/dev/null 2>&1; then
            if curl -s -o /dev/null -w "%{http_code}" "$target_url" 2>/dev/null | grep -q "200\|304"; then
                break
            fi
        fi
        attempts=$((attempts + 1))
    done

    # Open using OS specific tool
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$target_url" >/dev/null 2>&1 || true
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$target_url" >/dev/null 2>&1 || true
    fi
}

# Run browser launcher in background
open_browser &

# Start backend and frontend concurrently
exec npm run dev
