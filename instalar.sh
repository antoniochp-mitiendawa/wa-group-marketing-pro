#!/data/data/com.termux/files/usr/bin/bash

# ================================================
#   MI TIENDA WA - Script de Instalación v2.0
# ================================================

ROJO='\033[0;31m'
VERDE='\033[0;32m'
AZUL='\033[0;34m'
CYAN='\033[0;36m'
AMARILLO='\033[1;33m'
BLANCO='\033[1;37m'
NC='\033[0m'

REPO_URL="https://raw.githubusercontent.com/antoniochp-mitiendawa/WA-Group-Marketing-Pro/main/bot.js"

clear
echo -e "${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                           ║${NC}"
echo -e "${BLANCO}║        🛍️   MI TIENDA WA  🛍️              ${CYAN}║${NC}"
echo -e "${BLANCO}║     >> WA GROUP MARKETING PRO <<          ${CYAN}║${NC}"
echo -e "${CYAN}║                                           ║${NC}"
echo -e "${CYAN}╠═══════════════════════════════════════════╣${NC}"
echo -e "${VERDE}║  👤 Creador : MiTiendaWA                  ║${NC}"
echo -e "${VERDE}║  📅 Año     : 2026                        ║${NC}"
echo -e "${VERDE}║  📺 YouTube : youtube.com/@MitiendaWA     ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""

# ---------- PASO 1: Sistema ----------
echo -e "${AZUL}[ 1/5 ] 🔄 Actualizando Termux...${NC}"
pkg update -y && pkg upgrade -y
if [ $? -ne 0 ]; then
    echo -e "${ROJO}❌ Error al actualizar. Verifica tu conexión a internet.${NC}"
    exit 1
fi

# ---------- PASO 2: Dependencias ----------
echo -e "${AZUL}[ 2/5 ] 📦 Instalando Node.js, Git y ffmpeg...${NC}"
pkg install nodejs git ffmpeg -y
if [ $? -ne 0 ]; then
    echo -e "${ROJO}❌ Error al instalar dependencias.${NC}"
    exit 1
fi

# ---------- PASO 3: Carpeta del proyecto ----------
echo -e "${AZUL}[ 3/5 ] 📂 Preparando carpeta ~/MiTiendaWA...${NC}"
mkdir -p ~/MiTiendaWA
cd ~/MiTiendaWA

# ---------- PASO 4: Librerías npm ----------
echo -e "${AZUL}[ 4/5 ] ⚙️  Instalando librerías de WhatsApp...${NC}"
npm init -y
npm install @whiskeysockets/baileys pino readline qrcode-terminal
if [ $? -ne 0 ]; then
    echo -e "${ROJO}❌ Error al instalar librerías npm.${NC}"
    exit 1
fi

# ---------- PASO 5: Descargar bot ----------
echo -e "${AZUL}[ 5/5 ] ⬇️  Descargando bot.js desde GitHub...${NC}"
curl -fsSL "$REPO_URL" -o bot.js

if [ $? -ne 0 ] || [ ! -s bot.js ]; then
    echo -e "${ROJO}❌ No se pudo descargar bot.js.${NC}"
    echo -e "${AMARILLO}   Verifica que el archivo exista en:${NC}"
    echo -e "${AMARILLO}   $REPO_URL${NC}"
    exit 1
fi

echo -e "${VERDE}✅ bot.js descargado correctamente.${NC}"

# ---------- LISTO ----------
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLANCO}║    ✅  INSTALACIÓN COMPLETADA CON ÉXITO   ${CYAN}║${NC}"
echo -e "${CYAN}╠═══════════════════════════════════════════╣${NC}"
echo -e "${VERDE}║                                           ║${NC}"
echo -e "${VERDE}║  Para iniciar el bot escribe:             ║${NC}"
echo -e "${BLANCO}║     cd ~/MiTiendaWA && node bot.js        ${VERDE}║${NC}"
echo -e "${VERDE}║                                           ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Lanzar node con stdin del terminal real
cd ~/MiTiendaWA && node bot.js < /dev/tty
