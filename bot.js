const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay,
    DisconnectReason
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
    desc: ["📋", "📌", "📂", "💾", "🔍", "📍", "📝", "🖋️", "📁", "🗂️", "🎬", "⚙️", "📢", "✅", "⚖️"],
    precio: ["💰", "🏷️", "💵", "💳", "🎁", "💎", "💸", "🪙", "💹", "🛒", "💲", "🎯", "🔥", "📦", "🔔"],
    url: ["🔗", "⬇️", "👉", "📱", "📥", "📲", "⚡", "🏹", "🖱️", "🖥️", "🌐", "📍", "✅", "🔘", "🚩"]
};

const getRandEmoji = (cat) => dicEmoji[cat][Math.floor(Math.random() * dicEmoji[cat].length)];

async function extraerGrupos(sock) {
    console.log("\n🔍 Actualizando lista de grupos...");
    try {
        const chats = await sock.groupFetchAllParticipating();
        const listaGrupos = Object.values(chats).map(g => `${g.id} | ${g.subject}`);
        const rutaDestino = "/storage/emulated/0/grupos_extraidos.txt";
        fs.writeFileSync(rutaDestino, listaGrupos.join('\n'), 'utf8');
        console.log(`📊 Grupos detectados: ${listaGrupos.length}.`);
    } catch (e) { console.log("⚠️ Error al extraer grupos."); }
}

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

function obtenerSaludo(nombreG) {
    const hora = new Date().getHours();
    const e = getRandEmoji('saludo');
    const mañana = ["Buenos días", "Buen día", "Excelente mañana"];
    const tarde = ["Buenas tardes", "Buena tarde", "Un placer saludarte"];
    const noche = ["Buenas noches", "Linda noche", "Saludos nocturnos"];
    let saludo = (hora >= 6 && hora < 12) ? mañana : (hora >= 12 && hora < 19) ? tarde : noche;
    return `${e} _${saludo[Math.floor(Math.random() * saludo.length)]} miembros de:_ *_${nombreG}_*`;
}

let imagenesUsadasEnSesion = [];

function obtenerImagenAleatoria(carpetas) {
    let todasLasFotos = [];
    carpetas.forEach(ruta => {
        if (fs.existsSync(ruta)) {
            const fotos = fs.readdirSync(ruta).filter(f => f.match(/\.(jpg|jpeg|png)$/i)).map(f => `${ruta}/${f}`);
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

// --- LÓGICA DE PERSISTENCIA Y CUESTIONARIO ---
async function iniciarCuestionario() {
    const rutaConfig = "./config_campana.json";
    
    if (fs.existsSync(rutaConfig)) {
        console.log("\n♻️ Se detectó una configuración de campaña activa.");
        const resp = await question("¿Deseas continuar con la campaña anterior? (S/N): ");
        if (resp.toLowerCase() === 's') {
            return JSON.parse(fs.readFileSync(rutaConfig, 'utf8'));
        }
    }

    console.log("\n=== CONFIGURACIÓN DE CAMPAÑA 🛍️   MI TIENDA WA  🛍️ ===\n");
    console.log("1. Solo Texto | 2. Imagen + Texto");
    const tipoCampaña = await question("Selecciona: ");

    let modoEnvio = "GLOBAL", carpetas = [];
    if (tipoCampaña === "2") {
        console.log("\nA. Mensaje Global | B. Catálogo Individual");
        modoEnvio = (await question("Selecciona: ")).toUpperCase();
        const numCarp = parseInt(await question("\n1. ¿Cuántas carpetas de imágenes? "));
        for (let i = 0; i < numCarp; i++) carpetas.push((await question(`   Ruta carpeta ${i+1}: `)).trim());
    }
    
    const rutaGrupos = (await question("\n2. Ruta del archivo grupos.txt: ")).trim();
    let titulo = "", desc = [], precio = "";

    if (tipoCampaña === "1" || modoEnvio === "A") {
        titulo = await question("\n3. Título: ");
        console.log("4. Descripción (FIN para terminar):");
        for await (const l of rl) { if (l.trim().toUpperCase() === 'FIN') break; desc.push(l.trim()); }
        precio = await question("\n5. Precio: ");
    } else {
        console.log("\n4. Descripción extra (FIN para terminar):");
        for await (const l of rl) { if (l.trim().toUpperCase() === 'FIN') break; desc.push(l.trim()); }
    }

    const url = await question("\n6. URL: ");
    const numRafagas = parseInt(await question("\n7. ¿Cuántas ráfagas diarias? "));
    let ráfagas = [];
    for (let i = 0; i < numRafagas; i++) {
        console.log(`\n--- Ráfaga ${i+1} ---`);
        const hIni = await question(`   Hora inicio: `);
        const hFin = await question(`   Hora fin: `);
        ráfagas.push({ hIni, hFin });
    }
    
    const configFinal = { tipoCampaña, modoEnvio, carpetas, rutaGrupos, titulo, desc, precio, url, ráfagas };
    fs.writeFileSync(rutaConfig, JSON.stringify(configFinal, null, 2));
    return configFinal;
}

async function ejecutar() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_auth');
    const sock = makeWASocket({ 
        auth: state, 
        printQRInTerminal: false,
        logger: pino({ level: "silent" }), 
        browser: ["Ubuntu", "Chrome", "20.0.04"] 
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (u) => {
        const { connection, lastDisconnect } = u;

        if (connection === "connecting" && !sock.authState.creds.registered) {
            console.log("\n--- INICIANDO CONEXIÓN SEGURA ---");
            await delay(5000);
            try {
                const numero = await question("\nIngresa tu número de WhatsApp (ej. 521...): ");
                const code = await sock.requestPairingCode(numero.trim());
                console.log("\n======================================");
                console.log(`✅ TU CÓDIGO DE EMPAREJAMIENTO ES: ${code}`);
                console.log("======================================\n");
            } catch (err) {
                console.log("Error al solicitar código, reintentando...", err);
            }
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                console.log("🔄 Conexión perdida, reintentando...");
                ejecutar();
            }
        }

        if (connection === "open") {
            console.log("\n✅ WhatsApp Conectado.");
            await extraerGrupos(sock);
            const conf = await iniciarCuestionario();
            
            while (true) {
                for (let r = 0; r < conf.ráfagas.length; r++) {
                    const ventana = conf.ráfagas[r];
                    await esperarInicio(ventana.hIni);
                    
                    imagenesUsadasEnSesion = [];
                    // RECARGA DINÁMICA DE GRUPOS EN CADA RÁFAGA
                    if (!fs.existsSync(conf.rutaGrupos)) {
                        console.log("❌ Archivo de grupos no encontrado. Saltando ráfaga.");
                        continue;
                    }
                    let grupos = fs.readFileSync(conf.rutaGrupos, 'utf8').split('\n').filter(l => l.trim());
                    grupos = grupos.sort(() => Math.random() - 0.5);

                    for (let i = 0; i < grupos.length; i++) {
                        // SEGURO DE CONEXIÓN: Solo enviar si el socket está activo
                        if (sock.ws.readyState !== 1) {
                            console.log("⏳ Esperando que el socket se estabilice...");
                            while (sock.ws.readyState !== 1) await delay(2000);
                        }

                        let [idG, nombreG] = grupos[i].split('|').map(s => s.trim());
                        if (!idG.includes('@g.us')) idG += '@g.us';

                        let tituloEnvio = conf.titulo, precioEnvio = conf.precio, imgPath = null;

                        if (conf.tipoCampaña === "2") {
                            imgPath = obtenerImagenAleatoria(conf.carpetas);
                            if (imgPath && (conf.modoEnvio === "B" || imgPath.includes('_'))) {
                                const nombreArchivo = imgPath.split('/').pop();
                                const partes = nombreArchivo.split('_');
                                if (partes.length > 1) {
                                    tituloEnvio = partes[0].replace(/-/g, ' ');
                                    precioEnvio = partes[1].split('.')[0];
                                }
                            }
                        }

                        const msj = `> ${obtenerSaludo(nombreG)}\n\n` +
                                    `${getRandEmoji('titulo')} *_${tituloEnvio.toUpperCase()}_*\n\n` +
                                    `${getRandEmoji('desc')} *_Descripción:_* \n\n` +
                                    `_${conf.desc.join('_\n_')}_\n\n` +
                                    `${getRandEmoji('precio')} *_PRECIO:_* *_$${precioEnvio.trim()}_*\n\n` +
                                    `${getRandEmoji('url')} *_Más info:_* \n${conf.url.trim()}`;

                        try {
                            await sock.sendPresenceUpdate('composing', idG);
                            await delay(2000);
                            if (conf.tipoCampaña === "2" && imgPath) {
                                await sock.sendMessage(idG, { image: fs.readFileSync(imgPath), caption: msj });
                            } else {
                                await sock.sendMessage(idG, { text: msj }, { linkPreview: true });
                            }
                            console.log(`✅ [${i+1}/${grupos.length}] -> ${nombreG}`);
                        } catch (e) { console.log(`❌ Error en: ${nombreG}`); }

                        if (i < grupos.length - 1) {
                            // --- CÁLCULO DINÁMICO DE TIEMPO ---
                            const ahora = new Date();
                            const ahoraMins = (ahora.getHours() * 60) + ahora.getMinutes();
                            const finMins = (parseInt(ventana.hFin.slice(0,2)) * 60) + parseInt(ventana.hFin.slice(2));
                            const minsRestantes = finMins - ahoraMins;
                            const gruposRestantes = grupos.length - i;
                            
                            let espera = 30000; // Por defecto 30s
                            if (minsRestantes > 0) {
                                espera = (minsRestantes * 60000) / gruposRestantes;
                            }
                            
                            // Seguridad anti-ban (mínimo 15s)
                            espera = Math.max(15000, espera);
                            
                            console.log(`⏳ Pausa dinámica: ${Math.floor(espera/1000)}s. (Faltan ${minsRestantes} min para el fin)`);
                            await delay(espera);
                        }
                    }
                }
                await esperarHastaMañana(conf.ráfagas[0].hIni);
            }
        }
    });
}
ejecutar().catch(console.error);
