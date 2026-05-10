const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const readline = require("readline");
const { exec } = require("child_process");

exec("termux-wake-lock");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// --- BASE DE DATOS DE EMOJIS ---
const dicEmoji = {
    saludo: ["✨", "🌤️", "🌅", "☕", "🤝", "👋", "🎈", "🍀", "🎐", "☀️", "🌈", "🙌", "⭐", "🌻", "🔋"],
    titulo: ["📖", "📗", "📘", "📙", "📓", "📒", "📑", "📚", "🔬", "🎓", "🧠", "🧐", "🚀", "💎", "💡"],
    desc:   ["📋", "📌", "📂", "💾", "🔍", "📍", "📝", "🖋️", "📁", "🗂️", "🎬", "⚙️", "📢", "✅", "⚖️"],
    precio: ["💰", "🏷️", "💵", "💳", "🎁", "💎", "💸", "🪙", "💹", "🛒", "💲", "🎯", "🔥", "📦", "🔔"],
    url:    ["🔗", "⬇️", "👉", "📱", "📥", "📲", "⚡", "🏹", "🖱️", "🖥️", "🌐", "📍", "✅", "🔘", "🚩"]
};

const getRandEmoji = (cat) => dicEmoji[cat][Math.floor(Math.random() * dicEmoji[cat].length)];

// --- EXTRACCIÓN DE GRUPOS ---
async function extraerGrupos(sock) {
    console.log("\n🔍 Actualizando lista de grupos...");
    try {
        const chats = await sock.groupFetchAllParticipating();
        const listaGrupos = Object.values(chats).map(g => `${g.id} | ${g.subject}`);
        const rutaDestino = "/storage/emulated/0/grupos_extraidos.txt";
        fs.writeFileSync(rutaDestino, listaGrupos.join('\n'), 'utf8');
        console.log(`📊 Grupos detectados: ${listaGrupos.length}`);
        console.log(`📁 Lista guardada en: ${rutaDestino}`);
    } catch (e) {
        console.log("⚠️ Error al extraer grupos:", e.message);
    }
}

// --- MANEJO DE HORA ---
function obtenerHoraActualNum() {
    const ahora = new Date();
    return parseInt(ahora.getHours().toString().padStart(2, '0') + ahora.getMinutes().toString().padStart(2, '0'));
}

async function esperarInicio(hInicio) {
    const inicioTarget = parseInt(hInicio);
    console.log(`\n⏳ Modo Vigilancia: Esperando a las ${hInicio}.`);
    while (obtenerHoraActualNum() < inicioTarget) {
        process.stdout.write(".");
        await delay(15000);
    }
    console.log(`\n✅ Hora alcanzada. Iniciando envíos...`);
}

async function esperarHastaMañana(hInicioPrimeraRafaga) {
    console.log(`\n🌙 Jornada diaria finalizada.`);
    console.log(`💤 Reposando hasta mañana a las ${hInicioPrimeraRafaga}...`);
    while (obtenerHoraActualNum() !== parseInt(hInicioPrimeraRafaga)) {
        await delay(60000);
    }
    console.log("\n☀️ ¡Nuevo día! Reiniciando ráfagas...");
}

// --- SALUDO DINÁMICO ---
function obtenerSaludo(nombreG) {
    const hora = new Date().getHours();
    const e = getRandEmoji('saludo');
    const mañana = ["Buenos días", "Buen día", "Excelente mañana"];
    const tarde  = ["Buenas tardes", "Buena tarde", "Un placer saludarte"];
    const noche  = ["Buenas noches", "Linda noche", "Saludos nocturnos"];
    const lista  = (hora >= 6 && hora < 12) ? mañana : (hora >= 12 && hora < 19) ? tarde : noche;
    return `${e} _${lista[Math.floor(Math.random() * lista.length)]} miembros de:_ *_${nombreG}_*`;
}

// --- POOL DE IMÁGENES SEGURO (SIN BORRADO) ---
let imagenesUsadasEnSesion = [];

function obtenerImagenAleatoria(carpetas) {
    let todasLasFotos = [];
    carpetas.forEach(ruta => {
        if (fs.existsSync(ruta)) {
            const fotos = fs.readdirSync(ruta)
                .filter(f => f.match(/\.(jpg|jpeg|png)$/i))
                .map(f => `${ruta}/${f}`);
            todasLasFotos = todasLasFotos.concat(fotos);
        }
    });

    if (todasLasFotos.length === 0) return null;

    let disponibles = todasLasFotos.filter(f => !imagenesUsadasEnSesion.includes(f));
    if (disponibles.length === 0) {
        imagenesUsadasEnSesion = [];
        disponibles = todasLasFotos;
    }

    const seleccionada = disponibles[Math.floor(Math.random() * disponibles.length)];
    imagenesUsadasEnSesion.push(seleccionada);
    return seleccionada;
}

// --- CUESTIONARIO DE CAMPAÑA ---
async function iniciarCuestionario() {
    console.log("\n╔══════════════════════════════════════╗");
    console.log("║   CONFIGURACIÓN DE CAMPAÑA - MiTiendaWA ║");
    console.log("╚══════════════════════════════════════╝\n");

    console.log("Tipo de envío:");
    console.log("  1. Solo Texto");
    console.log("  2. Imagen + Texto");
    const tipoCampaña = await question("Selecciona (1 o 2): ");

    let modoEnvio = "GLOBAL", carpetas = [];
    if (tipoCampaña === "2") {
        console.log("\nModo de imágenes:");
        console.log("  A. Mensaje Global (misma info para todos)");
        console.log("  B. Catálogo Individual (info desde nombre de archivo)");
        modoEnvio = (await question("Selecciona (A o B): ")).toUpperCase();

        const numCarp = parseInt(await question("\n¿Cuántas carpetas de imágenes usarás? "));
        for (let i = 0; i < numCarp; i++) {
            carpetas.push((await question(`  Ruta carpeta ${i + 1}: `)).trim());
        }
    }

    const rutaGrupos = (await question("\nRuta del archivo grupos.txt: ")).trim();

    let titulo = "", desc = [], precio = "";

    if (tipoCampaña === "1" || modoEnvio === "A") {
        titulo = await question("\nTítulo del producto/servicio: ");
        console.log("Descripción (escribe cada línea y cuando termines escribe FIN):");
        for await (const l of rl) {
            if (l.trim().toUpperCase() === 'FIN') break;
            desc.push(l.trim());
        }
        precio = await question("\nPrecio: ");
    } else {
        console.log("\nDescripción extra (FIN para terminar):");
        for await (const l of rl) {
            if (l.trim().toUpperCase() === 'FIN') break;
            desc.push(l.trim());
        }
    }

    const url = await question("\nURL o enlace de contacto: ");
    const numRafagas = parseInt(await question("\n¿Cuántas ráfagas de envío diarias quieres? "));

    let ráfagas = [];
    for (let i = 0; i < numRafagas; i++) {
        console.log(`\n--- Ráfaga ${i + 1} ---`);
        console.log("  Formato de hora: HHMM (ej: 0900 = 9:00am, 1430 = 2:30pm)");
        const hIni = await question("  Hora de inicio: ");
        const hFin = await question("  Hora de fin:    ");
        ráfagas.push({ hIni, hFin });
    }

    return { tipoCampaña, modoEnvio, carpetas, rutaGrupos, titulo, desc, precio, url, ráfagas };
}

// --- MOTOR PRINCIPAL ---
async function ejecutar() {
    console.log("\n╔══════════════════════════════════════╗");
    console.log("║      🛍️  MI TIENDA WA - BOT v2.0      ║");
    console.log("╚══════════════════════════════════════╝");
    console.log("Iniciando conexión con WhatsApp...\n");

    const { state, saveCreds } = await useMultiFileAuthState('sesion_auth');
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (u) => {
        if (u.qr) {
            // qrcode-terminal se importa solo si está disponible
            try {
                const qrcode = require('qrcode-terminal');
                qrcode.generate(u.qr, { small: true });
                console.log("\n📱 Escanea el QR con WhatsApp para conectarte.\n");
            } catch {
                console.log("QR disponible. Instala qrcode-terminal para verlo en pantalla.");
            }
        }

        if (u.connection === "open") {
            console.log("\n✅ WhatsApp Conectado exitosamente.");
            await extraerGrupos(sock);
            const conf = await iniciarCuestionario();

            // Bucle infinito de ráfagas diarias
            while (true) {
                for (let r = 0; r < conf.ráfagas.length; r++) {
                    const ventana = conf.ráfagas[r];
                    await esperarInicio(ventana.hIni);

                    imagenesUsadasEnSesion = []; // Reiniciar variedad por ráfaga

                    let grupos = fs.readFileSync(conf.rutaGrupos, 'utf8')
                        .split('\n')
                        .filter(l => l.trim());
                    grupos = grupos.sort(() => Math.random() - 0.5); // Orden aleatorio

                    const hIniMins = parseInt(ventana.hIni.slice(0, 2)) * 60 + parseInt(ventana.hIni.slice(2));
                    const hFinMins = parseInt(ventana.hFin.slice(0, 2)) * 60 + parseInt(ventana.hFin.slice(2));
                    const durMins  = hFinMins - hIniMins;

                    console.log(`\n📋 Grupos a enviar: ${grupos.length} | Ventana: ${durMins} minutos`);

                    for (let i = 0; i < grupos.length; i++) {
                        let [idG, nombreG] = grupos[i].split('|').map(s => s.trim());
                        if (!idG || !idG.includes('@g.us')) idG = idG + '@g.us';
                        nombreG = nombreG || "el grupo";

                        let tituloEnvio = conf.titulo;
                        let precioEnvio = conf.precio;
                        let imgPath = null;

                        if (conf.tipoCampaña === "2") {
                            imgPath = obtenerImagenAleatoria(conf.carpetas);
                            // Modo catálogo: leer título y precio desde el nombre del archivo
                            if (imgPath && conf.modoEnvio === "B") {
                                const nombreArchivo = imgPath.split('/').pop();
                                const partes = nombreArchivo.split('_');
                                if (partes.length >= 2) {
                                    tituloEnvio = partes[0].replace(/-/g, ' ');
                                    precioEnvio = partes[1].split('.')[0];
                                }
                            }
                        }

                        const msj = `> ${obtenerSaludo(nombreG)}\n\n` +
                                    `${getRandEmoji('titulo')} *_${tituloEnvio.toUpperCase()}_*\n\n` +
                                    `${getRandEmoji('desc')} *_Descripción:_*\n\n` +
                                    `_${conf.desc.join('_\n_')}_\n\n` +
                                    `${getRandEmoji('precio')} *_PRECIO:_* *_$${precioEnvio.trim()}_*\n\n` +
                                    `${getRandEmoji('url')} *_Más info:_*\n${conf.url.trim()}`;

                        try {
                            await sock.sendPresenceUpdate('composing', idG);
                            await delay(2000);

                            if (conf.tipoCampaña === "2" && imgPath) {
                                await sock.sendMessage(idG, {
                                    image: fs.readFileSync(imgPath),
                                    caption: msj
                                });
                            } else {
                                await sock.sendMessage(idG, { text: msj }, { linkPreview: true });
                            }

                            console.log(`✅ [${i + 1}/${grupos.length}] ${nombreG}`);
                        } catch (e) {
                            console.log(`❌ Error en: ${nombreG} → ${e.message}`);
                        }

                        // Pausa inteligente para distribuir envíos en la ventana de tiempo
                        if (i < grupos.length - 1) {
                            const base   = (durMins * 60000) / grupos.length;
                            const ruido  = (Math.random() * 180000) - 90000; // ±90 seg aleatorio
                            const espera = Math.max(25000, base + ruido);
                            console.log(`⏳ Pausa de ${Math.floor(espera / 1000)}s...`);
                            await delay(espera);
                        }
                    }

                    console.log(`\n✅ Ráfaga ${r + 1} completada.`);
                }

                // Esperar al inicio del nuevo día
                await esperarHastaMañana(conf.ráfagas[0].hIni);
            }
        }

        if (u.connection === "close") {
            console.log("\n🔌 Conexión cerrada. Reconectando en 5 segundos...");
            await delay(5000);
            ejecutar();
        }
    });
}

ejecutar().catch(console.error);
