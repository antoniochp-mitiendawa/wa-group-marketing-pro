#!/data/data/com.termux/files/usr/bin/bash

# --- CONFIGURACIÓN VISUAL ---
ROJO='\033[0;31m'
VERDE='\033[0;32m'
AZUL='\033[0;34m'
CYAN='\033[0;36m'
BLANCO='\033[1;37m'
NC='\033[0m' # Sin Color

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

# 1. Actualización de Sistema
echo -e "${VERDE}🔄 Actualizando Termux...${NC}"
pkg update -y && pkg upgrade -y

# 2. Instalación de Herramientas Necesarias
echo -e "${VERDE}📦 Instalando Node.js, Git y dependencias...${NC}"
pkg install nodejs git ffmpeg -y

# 3. Crear Carpeta del Proyecto
echo -e "${VERDE}📂 Creando carpeta MiTiendaWA...${NC}"
mkdir -p ~/MiTiendaWA
cd ~/MiTiendaWA

# 4. Inicializar Proyecto y Librerías
echo -e "${VERDE}⚙️ Configurando librerías de WhatsApp...${NC}"
npm init -y
npm install @whiskeysockets/baileys pino readline qrcode-terminal

# 5. Mensaje Final
echo ""
echo -e "${CYAN}===============================================${NC}"
echo -e "${BLANCO}✅ INSTALACIÓN COMPLETADA CON ÉXITO${NC}"
echo -e "${CYAN}===============================================${NC}"
echo -e "${VERDE}El siguiente paso es subir tu archivo bot.js${NC}"
echo -e "${VERDE}ofuscado a GitHub para activarlo.${NC}"
