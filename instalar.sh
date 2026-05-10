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
echo -e "${AZUL}⌛ Iniciando instalación profesional... Por favor, espera.${NC}"

# 1. Reparación de Librerías y Actualización (MÉTODO ROBUSTO)
echo -e "${VERDE}🔄 Reparando librerías de sistema y SSL...${NC}"
pkg update -y
pkg install openssl libcurl curl -y

# 2. Instalación de Herramientas
echo -e "${VERDE}📦 Instalando Node.js, Git y dependencias multimedia...${NC}"
pkg install nodejs git ffmpeg -y

# 3. Crear Carpeta del Proyecto
echo -e "${VERDE}📂 Creando carpeta MiTiendaWA...${NC}"
mkdir -p ~/MiTiendaWA
cd ~/MiTiendaWA

# 4. Inicializar Proyecto y Librerías de WhatsApp
echo -e "${VERDE}⚙️ Instalando librerías de conexión...${NC}"
npm init -y
npm install @whiskeysockets/baileys pino readline qrcode-terminal

# 5. Descargar Código Maestro (Ya ofuscado)
echo -e "${VERDE}📥 Descargando archivo maestro desde GitHub...${NC}"
curl -sL https://raw.githubusercontent.com/antoniochp-mitiendawa/WA-Group-Marketing-Pro/main/bot.js -o bot.js

echo ""
echo -e "${CYAN}===============================================${NC}"
echo -e "${BLANCO}✅ INSTALACIÓN COMPLETADA CON ÉXITO${NC}"
echo -e "${CYAN}===============================================${NC}"
echo -e "${VERDE}Iniciando el bot automáticamente...${NC}"
echo ""

node bot.js
