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

const BACKUP_PATH = "/storage/emulated/0/MiTiendaWA_backup.json";
const JID_PATH = "/storage/emulated/0/MiTiendaWA_jid.txt";

// --- BASE DE DATOS DE EMOJIS ---
const dicEmoji = {
    saludo: ["✨", "🌤️", "🌅", "☕", "🤝", "👋", "🎈", "🍀", "🎐", "☀️", "🌈", "🙌", "⭐", "🌻", "🔋"],
    titulo: ["📖", "📗", "📘", "📙", "📓", "📒", "📑", "📚", "🔬", "🎓", "🧠", "🧐", "🚀", "💎", "💡"],
    desc:   ["📋", "📌", "📂", "💾", "🔍", "📍", "📝", "🖋️", "📁", "🗂️", "🎬", "⚙️", "📢", "✅", "⚖️"],
    precio: ["💰", "🏷️", "💵", "💳", "🎁", "💎", "💸", "🪙", "💹", "🛒", "💲", "🎯", "🔥", "📦", "🔔"],
    url:    ["🔗", "⬇️", "👉", "📱", "📥", "📲", "⚡", "🏹", "🖱️", "🖥️", "🌐", "📍", "✅", "🔘", "🚩"]
};

const getRandEmoji = (cat) => dicEmoji[cat][Math.floor(Math.random() * dicEmoji[cat].length)];

// --- BACKUP ---
function guardarBackup(conf) {
    try {
        fs.writeFileSync(BACKUP_PATH, JSON.stringify(conf, null, 2), 'utf8');
        console.log(`💾 Configuración guardada en backup.`);
    } catch (e) { console.log("⚠️ No se pudo guardar el backup."); }
}

function cargarBackup() {
    try {
        if (fs.existsSync(BACKUP_PATH)) return JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
    } catch (e) { console.log("⚠️ Error al leer el backup."); }
    return null;
}

// --- JID AUTORIZADO ---
let jidAutorizado = null;

function cargarJid() {
    try {
        if (fs.existsSync(JID_PATH)) return fs.readFileSync(JID_PATH, 'utf8').trim();
    } catch (e) {}
    return null;
}

function guardarJid(jid) {
    try {
        fs.writeFileSync(JID_PATH, jid, 'utf8');
    } catch (e) {}
}

// --- EXTRACCIÓN DE GRUPOS ---
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

// --- HORA ---
function obtenerHoraActualNum() {
    const ahora = new Date();
    return parseInt(ahora.getHours().toString().padStart(2, '0') + ahora.getMinutes().toString().padStart(2, '0'));
}

function obtenerMinutosActuales() {
    const ahora = new Date();
    return ahora.getHours() * 60 + ahora.getMinutes();
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

// --- SALUDO ---
function obtenerSaludo(nombreG) {
    const hora = new Date().getHours();
    const e = getRandEmoji('saludo');
    const mañana = ["Buenos días", "Buen día", "Excelente mañana"];
    const tarde  = ["Buenas tardes", "Buena tarde", "Un placer saludarte"];
    const noche  = ["Buenas noches", "Linda noche", "Saludos nocturnos"];
    let saludo = (hora >= 6 && hora < 12) ? mañana : (hora >= 12 && hora < 19) ? tarde : noche;
    return `${e} _${saludo[Math.floor(Math.random() * saludo.length)]} miembros de:_ *_${nombreG}_*`;
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

// --- CUESTIONARIO ---
async function iniciarCuestionario() {
    console.log("\n=== WA GROUP MARKETING PRO - MI TIENDA WA ===\n");
    console.log("1. Solo Texto | 2. Imagen + Texto");
    const tipoCampaña = await question("Selecciona: ");

    let modoEnvio = "GLOBAL";
    let productos = [];

    if (tipoCampaña === "2") {
        console.log("\nA. Mensaje Global | B. Catálogo Individual");
        modoEnvio = (await question("Selecciona: ")).toUpperCase();
    }

    if (tipoCampaña === "1" || modoEnvio === "A") {
        // --- MENSAJE GLOBAL: capturar productos con sus carpetas ---
        const numProductos = parseInt(await question("\n¿Cuántos productos globales vas a configurar? "));
        for (let p = 0; p < numProductos; p++) {
            console.log(`\n--- Producto ${p+1} ---`);
            const titulo = await question("   Título: ");
            console.log("   Descripción (FIN para terminar):");
            let desc = [];
            while (true) {
                const l = await question("");
                if (l.trim().toUpperCase() === 'FIN') break;
                desc.push(l.trim());
            }
            const precio = await question("   Precio: ");
            const url = await question("   URL: ");

            // Carpeta de imágenes por producto (solo si es imagen+texto)
            let carpetas = [];
            if (tipoCampaña === "2") {
                const numCarp = parseInt(await question("   ¿Cuántas carpetas de imágenes? "));
                for (let c = 0; c < numCarp; c++) {
                    carpetas.push((await question(`   Ruta carpeta ${c+1}: `)).trim());
                }
            }
            productos.push({ titulo, desc, precio, url, carpetas });
        }
    } else {
        // --- CATÁLOGO INDIVIDUAL ---
        console.log("\nDescripción extra (FIN para terminar):");
        let desc = [];
        while (true) {
            const l = await question("");
            if (l.trim().toUpperCase() === 'FIN') break;
            desc.push(l.trim());
        }
        const url = await question("\nURL: ");
        const numCarp = parseInt(await question("¿Cuántas carpetas de imágenes? "));
        let carpetas = [];
        for (let c = 0; c < numCarp; c++) {
            carpetas.push((await question(`   Ruta carpeta ${c+1}: `)).trim());
        }
        productos.push({ titulo: "", desc, precio: "", url, carpetas });
    }

    // --- GRUPOS: solo se pide una vez ---
    const rutaGrupos = (await question("\nRuta del archivo grupos.txt: ")).trim();

    // --- RÁFAGAS ---
    const numRafagas = parseInt(await question("\n¿Cuántas ráfagas diarias? "));
    let ráfagas = [];
    for (let i = 0; i < numRafagas; i++) {
        console.log(`\n--- Ráfaga ${i+1} ---`);
        const hIni = await question(`   Hora inicio (HHMM): `);
        const hFin = await question(`   Hora fin (HHMM):   `);
        let productoIdx = 0;
        if (productos.length > 1) {
            console.log(`   Productos: ${productos.map((p, i) => `${i+1}. ${p.titulo}`).join(' | ')}`);
            productoIdx = parseInt(await question(`   ¿Qué producto usa esta ráfaga? (número): `)) - 1;
        }
        ráfagas.push({ hIni, hFin, productoIdx });
    }

    return { tipoCampaña, modoEnvio, productos, rutaGrupos, ráfagas };
}

// --- RÁFAGA INICIAL SEGÚN HORA ACTUAL ---
function obtenerRafagaInicial(ráfagas) {
    const minutosActuales = obtenerMinutosActuales();
    for (let i = 0; i < ráfagas.length; i++) {
        const hIniMins = parseInt(ráfagas[i].hIni.slice(0,2)) * 60 + parseInt(ráfagas[i].hIni.slice(2));
        if (minutosActuales < hIniMins) {
            if (i > 0) console.log(`\n⏩ Ráfagas anteriores ya pasadas. Arrancando desde ráfaga ${i+1}.`);
            return i;
        }
    }
    console.log(`\n🌙 Todas las ráfagas del día ya pasaron. Esperando mañana...`);
    return -1;
}

// --- CONTROL POR WHATSAPP ---
let productoActivoPorRafaga = [];

function procesarComandoWA(texto, conf) {
    const match = texto.match(/r[aá]faga\s*(\d+)\s*producto\s*(\d+)/i);
    if (match) {
        const r = parseInt(match[1]) - 1;
        const p = parseInt(match[2]) - 1;
        if (r >= 0 && r < conf.ráfagas.length && p >= 0 && p < conf.productos.length) {
            productoActivoPorRafaga[r] = p;
            return `✅ Ráfaga ${r+1} usará producto ${p+1}: ${conf.productos[p].titulo}`;
        }
        return `❌ Número de ráfaga o producto inválido.`;
    }
    return null;
}

// --- FLAG CAMPAÑA ACTIVA ---
let campañaActiva = false;

async function ejecutar() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_auth');
    const sock = makeWASocket({ 
        auth: state, 
        printQRInTerminal: false,
        logger: pino({ level: "silent" }), 
        browser: ["Ubuntu", "Chrome", "20.0.04"] 
    });

    sock.ev.on("creds.update", saveCreds);

    // --- ESCUCHAR COMANDOS POR WHATSAPP ---
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg || !msg.message || msg.key.fromMe === false) return;

        const remitente = msg.key.remoteJid;
        const texto = msg.message.conversation || 
                      msg.message.extendedTextMessage?.text || "";
        if (!texto) return;

        // Registrar JID autorizado la primera vez
        if (!jidAutorizado) {
            jidAutorizado = remitente;
            guardarJid(remitente);
            console.log(`\n🔐 JID autorizado registrado: ${remitente}`);
        }

        if (remitente !== jidAutorizado) return;

        console.log(`\n📩 Comando recibido: "${texto}"`);
        const respuesta = procesarComandoWA(texto, sock._conf);
        if (respuesta) {
            console.log(`📤 Respondiendo: ${respuesta}`);
            await sock.sendMessage(remitente, { text: respuesta });
        }
    });

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
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            if (shouldReconnect) ejecutar();
        }

        if (connection === "open") {
            console.log("\n✅ WhatsApp Conectado.");
            await extraerGrupos(sock);

            // Cargar JID autorizado si existe
            if (!jidAutorizado) jidAutorizado = cargarJid();
            if (jidAutorizado) console.log(`🔐 JID autorizado cargado: ${jidAutorizado}`);

            if (campañaActiva) {
                console.log("🔄 Reconexión exitosa. Continuando campaña...");
                return;
            }

            campañaActiva = true;
            let conf;

            // --- BACKUP ---
            const backup = cargarBackup();
            if (backup) {
                console.log("\n╔══════════════════════════════════════╗");
                console.log("║   💾 Configuración guardada encontrada ║");
                console.log("╠══════════════════════════════════════╣");
                console.log("║  1. Cargar configuración guardada     ║");
                console.log("║  2. Capturar nueva configuración      ║");
                console.log("╚══════════════════════════════════════╝");
                const opcion = await question("Selecciona (1 o 2): ");
                if (opcion.trim() === "1") {
                    conf = backup;
                    console.log("✅ Configuración cargada desde backup.");
                } else {
                    conf = await iniciarCuestionario();
                    guardarBackup(conf);
                }
            } else {
                conf = await iniciarCuestionario();
                guardarBackup(conf);
            }

            productoActivoPorRafaga = conf.ráfagas.map(r => r.productoIdx || 0);
            sock._conf = conf;

            while (true) {
                let rafagaInicial = obtenerRafagaInicial(conf.ráfagas);
                if (rafagaInicial === -1) {
                    await esperarHastaMañana(conf.ráfagas[0].hIni);
                    rafagaInicial = 0;
                }

                for (let r = rafagaInicial; r < conf.ráfagas.length; r++) {
                    const ventana = conf.ráfagas[r];
                    await esperarInicio(ventana.hIni);

                    imagenesUsadasEnSesion = [];

                    // Grupos frescos en cada ráfaga
                    let grupos = fs.readFileSync(conf.rutaGrupos, 'utf8').split('\n').filter(l => l.trim());
                    grupos = grupos.sort(() => Math.random() - 0.5);

                    const pIdx = productoActivoPorRafaga[r] || 0;
                    const producto = conf.productos[pIdx];

                    const hIniMins = parseInt(ventana.hIni.slice(0,2)) * 60 + parseInt(ventana.hIni.slice(2));
                    const hFinMins = parseInt(ventana.hFin.slice(0,2)) * 60 + parseInt(ventana.hFin.slice(2));
                    const durMs = (hFinMins - hIniMins) * 60000;

                    // Pausa base = tiempo total / grupos. Nunca superar ese valor.
                    const pausaBase = Math.max(25000, Math.floor(durMs / grupos.length));
                    // Margen de variación: hasta 10s ANTES, nunca después
                    const margen = Math.min(10000, pausaBase - 25000);

                    console.log(`\n📋 Ráfaga ${r+1}: ${grupos.length} grupos | Producto: ${producto.titulo || 'Catálogo'} | Ventana: ${hFinMins-hIniMins} min | Pausa: ${Math.floor((pausaBase-margen)/1000)}-${Math.floor(pausaBase/1000)}s`);

                    for (let i = 0; i < grupos.length; i++) {
                        let [idG, nombreG] = grupos[i].split('|').map(s => s.trim());
                        if (!idG.includes('@g.us')) idG += '@g.us';

                        let tituloEnvio = producto.titulo;
                        let precioEnvio = producto.precio;
                        let descEnvio   = producto.desc;
                        let urlEnvio    = producto.url;
                        let imgPath     = null;

                        if (conf.tipoCampaña === "2") {
                            imgPath = obtenerImagenAleatoria(producto.carpetas);
                            if (imgPath && conf.modoEnvio === "B") {
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
                                    `_${descEnvio.join('_\n_')}_\n\n` +
                                    `${getRandEmoji('precio')} *_PRECIO:_* *_$${precioEnvio.trim()}_*\n\n` +
                                    `${getRandEmoji('url')} *_Más info:_* \n${urlEnvio.trim()}`;

                        let enviado = false;
                        for (let intento = 1; intento <= 2; intento++) {
                            try {
                                await sock.sendPresenceUpdate("composing", idG);
                                await delay(2000);
                                if (conf.tipoCampaña === "2" && imgPath) {
                                    await sock.sendMessage(idG, { image: fs.readFileSync(imgPath), caption: msj });
                                } else {
                                    await sock.sendMessage(idG, { text: msj }, { linkPreview: true });
                                }
                                console.log(`✅ [${i+1}/${grupos.length}] -> ${nombreG}`);
                                enviado = true;
                                break;
                            } catch (e) {
                                if (intento === 1) {
                                    console.log(`⚠️ Reintentando: ${nombreG}...`);
                                    await delay(5000);
                                } else {
                                    console.log(`❌ Error en: ${nombreG}`);
                                }
                            }
                        }

                        if (i < grupos.length - 1) {
                            // Variación aleatoria: entre (pausaBase - margen) y pausaBase
                            const espera = pausaBase - Math.floor(Math.random() * margen);
                            console.log(`⏳ Pausa de ${Math.floor(espera/1000)}s...`);
                            await delay(espera);
                        }
                    }
                    console.log(`\n✅ Ráfaga ${r+1} finalizada.`);
                }
                await esperarHastaMañana(conf.ráfagas[0].hIni);
            }
        }
    });
}
ejecutar().catch(console.error);
