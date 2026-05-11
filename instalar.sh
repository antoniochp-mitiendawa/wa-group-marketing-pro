#!/data/data/com.termux/files/usr/bin/bash

# ================================================
#   MI TIENDA WA - Script de Instalación v2.1
# ================================================

ROJO='\033[0;31m'
VERDE='\033[0;32m'
AZUL='\033[0;34m'
CYAN='\033[0;36m'
AMARILLO='\033[1;33m'
BLANCO='\033[1;37m'
NC='\033[0m'

# URL del repositorio (Asegúrate de que apunte a tu versión actualizada)
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
echo -e "${AZUL}[ 1/6 ] 🔄 Actualizando Termux...${NC}"
pkg update -y && pkg upgrade -y
if [ $? -ne 0 ]; then
    echo -e "${ROJO}❌ Error al actualizar. Verifica tu conexión a internet.${NC}"
    exit 1
fi

# ---------- PASO 2: Dependencias ----------
echo -e "${AZUL}[ 2/6 ] 📦 Instalando Node.js, Git y ffmpeg...${NC}"
pkg install nodejs git ffmpeg -y
if [ $? -ne 0 ]; then
    echo -e "${ROJO}❌ Error al instalar dependencias.${NC}"
    exit 1
fi

# ---------- PASO 3: Carpeta del proyecto ----------
echo -e "${AZUL}[ 3/6 ] 📂 Preparando carpeta ~/MiTiendaWA...${NC}"
mkdir -p ~/MiTiendaWA
cd ~/MiTiendaWA

# ---------- PASO 4: Librerías npm ----------
echo -e "${AZUL}[ 4/6 ] ⚙️  Instalando librerías de WhatsApp...${NC}"
npm init -y
npm install @whiskeysockets/baileys pino readline qrcode-terminal
if [ $? -ne 0 ]; then
    echo -e "${ROJO}❌ Error al instalar librerías npm.${NC}"
    exit 1
fi

# ---------- PASO 5: Instalar pm2 ----------
echo -e "${AZUL}[ 5/6 ] 🔁 Instalando pm2 (gestor de procesos)...${NC}"
npm install -g pm2
if [ $? -ne 0 ]; then
    echo -e "${ROJO}❌ Error al instalar pm2.${NC}"
    exit 1
fi

# ---------- PASO 6: Descargar bot ----------
echo -e "${AZUL}[ 6/6 ] ⬇️  Descargando bot.js...${NC}"
# Nota: Si aún no lo subes a GitHub, puedes crear el archivo manualmente
curl -fsSL "$REPO_URL" -o bot.js

if [ $? -ne 0 ] || [ ! -s bot.js ]; then
    echo -e "${AMARILLO}⚠️ No se pudo descargar bot.js automáticamente.${NC}"
    echo -e "${AMARILLO}   Asegúrate de colocar tu bot.js en ~/MiTiendaWA manualmente.${NC}"
fi

echo -e "${VERDE}✅ Entorno preparado correctamente.${NC}"

# ---------- LISTO ----------
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLANCO}║    ✅  INSTALACIÓN COMPLETADA CON ÉXITO   ${CYAN}║${NC}"
echo -e "${CYAN}╠═══════════════════════════════════════════╣${NC}"
echo -e "${VERDE}║                                           ║${NC}"
echo -e "${VERDE}║  Comandos útiles pm2:                     ║${NC}"
echo -e "${BLANCO}║   pm2 status                              ${VERDE}║${NC}"
echo -e "${BLANCO}║   pm2 logs MiTiendaWA                     ${VERDE}║${NC}"
echo -e "${BLANCO}║   pm2 restart MiTiendaWA                  ${VERDE}║${NC}"
echo -e "${BLANCO}║   pm2 stop MiTiendaWA                     ${VERDE}║${NC}"
echo -e "${VERDE}║                                           ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""

cd ~/MiTiendaWA && pm2 start bot.js --name "MiTiendaWA" && pm2 save && pm2 logs MiTiendaWA < /dev/tty
