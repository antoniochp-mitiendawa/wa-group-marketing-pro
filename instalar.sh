#!/data/data/com.termux/files/usr/bin/bash

# --- CONFIGURACIÓN VISUAL ---
ROJO='\033[0;31m'
VERDE='\033[0;32m'
AZUL='\033[0;34m'
CYAN='\033[0;36m'
BLANCO='\033[1;37m'
NC='\033[0m'

clear
echo -e "${CYAN}###############################################${NC}"
echo -e "${CYAN}#                                             #${NC}"
echo -e "${BLANCO}#          🛍️  MI TIENDA WA 🛍️               ${CYAN}#${NC}"
echo -e "${BLANCO}#      >> WA GROUP MARKETING PRO <<           ${CYAN}#${NC}"
echo -e "${CYAN}#                                             #${NC}"
echo -e "${CYAN}###############################################${NC}"
echo -e "${VERDE}#                                             #${NC}"
echo -e "${VERDE}#  👤 Creador: MiTiendaWA                     #${NC}"
echo -e "${VERDE}#  📅 Año: 2026                               #${NC}"
echo -e "${VERDE}#  📺 YouTube: youtube.com/@MitiendaWA        #${NC}"
echo -e "${VERDE}#                                             #${NC}"
echo -e "${CYAN}###############################################${NC}"
echo ""

# 1. Preparación Total del Sistema
echo -e "${VERDE}🔄 Preparando entorno de ejecución...${NC}"
pkg update -y && pkg upgrade -y
pkg install openssl libcurl curl nodejs git ffmpeg -y

# 2. Configuración de Carpeta y Archivos
echo -e "${VERDE}📂 Creando directorio MiTiendaWA...${NC}"
mkdir -p $HOME/MiTiendaWA
cd $HOME/MiTiendaWA

# 3. Instalación de Librerías (Silencioso para no ensuciar la pantalla)
echo -e "${VERDE}⚙️ Instalando dependencias de WhatsApp...${NC}"
npm init -y > /dev/null 2>&1
npm install @whiskeysockets/baileys pino readline qrcode-terminal

# 4. Descarga del Código Maestro Ofuscado
echo -e "${VERDE}📥 Descargando archivo maestro...${NC}"
curl -sL "https://raw.githubusercontent.com/antoniochp-mitiendawa/WA-Group-Marketing-Pro/main/bot.js" -o bot.js

# 5. Arranque Automático Directo
echo ""
echo -e "${CYAN}===============================================${NC}"
echo -e "${BLANCO}✅ SISTEMA LISTO. INICIANDO...${NC}"
echo -e "${CYAN}===============================================${NC}"
echo ""

# Aquí está el cambio: Usamos la ruta completa para que no haya error de comando
exec node $HOME/MiTiendaWA/bot.js
