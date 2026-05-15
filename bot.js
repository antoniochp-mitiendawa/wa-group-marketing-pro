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

const BACKUP_PATH    = "/storage/emulated/0/MiTiendaWA_backup.json";
const JID_PATH       = "/storage/emulated/0/MiTiendaWA_jid.txt";
const BLACKLIST_PATH = "/storage/emulated/0/MiTiendaWA_blacklist.json";

// --- MENSAJES DE ESPERA ---
const mensajesEspera = [
    "⏳ Sistema activo. Esperando instrucciones.",
    "🔋 Todo en línea. Listo para siguiente ráfaga.",
    "📊 Monitoreando. Sistema operando correctamente.",
    "🚀 En espera. Listo cuando me lo indiques.",
    "✅ Conexión estable. Esperando comando.",
    "🌟 Herramienta activa. Trabajando en segundo plano.",
    "📡 Señal estable. Listo para ejecutar.",
    "⚙️ Sistema en curso. Todo configurado correctamente.",
    "🎯 En espera de instrucciones. Listo.",
    "💡 Sistema encendido. Esperando tu orden.",
    "🔄 Verificando configuración. Todo en orden.",
    "📱 Conexión activa. Listo para disparar.",
    "🌐 En línea y monitoreando. Sin novedades.",
    "⭐ Sistema estable. Esperando comando de envío.",
    "🔔 Alerta activa. Todo funcionando correctamente.",
    "📦 Productos listos. Esperando instrucción.",
    "🛒 Configuración cargada. Sistema en espera.",
    "💎 Operando sin interrupciones. Listo.",
    "🏷️ Lista de grupos actualizada. En espera.",
    "📝 Configuración verificada. Todo listo.",
    "🌤️ Sistema funcionando. Esperando tu señal.",
    "☀️ Operación normal. Listo para siguiente campaña.",
    "🔍 Revisando parámetros. Sistema operativo.",
    "💹 Todo en orden. Esperando comando.",
    "🎈 Sistema activo y estable. Sin interrupciones.",
    "🌈 Conexión verificada. Listo para ejecutar.",
    "⚡ Energía total. Esperando instrucción de envío.",
    "🧠 Procesando. Sistema listo para siguiente campaña.",
    "🎓 Sistema optimizado. Esperando tu comando.",
    "🏹 En posición. Listo para siguiente ráfaga."
];

// --- EMOJIS ---
const dicEmoji = {
    saludo: ["✨","🌤️","🌅","☕","🤝","👋","🎈","🍀","🎐","☀️","🌈","🙌","⭐","🌻","🔋"],
    titulo: ["📖","📗","📘","📙","📓","📒","📑","📚","🔬","🎓","🧠","🧐","🚀","💎","💡"],
    desc:   ["📋","📌","📂","💾","🔍","📍","📝","🖋️","📁","🗂️","🎬","⚙️","📢","✅","⚖️"],
    precio: ["💰","🏷️","💵","💳","🎁","💎","💸","🪙","💹","🛒","💲","🎯","🔥","📦","🔔"],
    url:    ["🔗","⬇️","👉","📱","📥","📲","⚡","🏹","🖱️","🖥️","🌐","📍","✅","🔘","🚩"]
};
const getRandEmoji = (cat) => dicEmoji[cat][Math.floor(Math.random() * dicEmoji[cat].length)];

// --- BACKUP ---
function guardarBackup(conf) {
    try { fs.writeFileSync(BACKUP_PATH, JSON.stringify(conf, null, 2), 'utf8'); console.log("💾 Configuración guardada."); }
    catch (e) { console.log("⚠️ No se pudo guardar el backup."); }
}
function cargarBackup() {
    try { if (fs.existsSync(BACKUP_PATH)) return JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8')); }
    catch (e) { console.log("⚠️ Error al leer el backup."); }
    return null;
}

// --- JID ---
let jidAutorizado = null;
function cargarJid() {
    try { if (fs.existsSync(JID_PATH)) return fs.readFileSync(JID_PATH, 'utf8').trim(); }
    catch (e) {}
    return null;
}
function guardarJid(jid) {
    try { fs.writeFileSync(JID_PATH, jid, 'utf8'); } catch (e) {}
}

// --- LISTA NEGRA ---
let blacklist = [];
function cargarBlacklist() {
    try { if (fs.existsSync(BLACKLIST_PATH)) return JSON.parse(fs.readFileSync(BLACKLIST_PATH, 'utf8')); }
    catch (e) {}
    return [];
}
function guardarBlacklist() {
    try { fs.writeFileSync(BLACKLIST_PATH, JSON.stringify(blacklist, null, 2), 'utf8'); }
    catch (e) {}
}

// --- GRUPOS ---
async function extraerGrupos(sock) {
    console.log("\n🔍 Actualizando lista de grupos...");
    try {
        const chats = await sock.groupFetchAllParticipating();
        const listaGrupos = Object.values(chats).map(g => `${g.id} | ${g.subject}`);
        fs.writeFileSync("/storage/emulated/0/grupos_extraidos.txt", listaGrupos.join('\n'), 'utf8');
        console.log(`📊 Grupos detectados: ${listaGrupos.length}.`);
    } catch (e) { console.log("⚠️ Error al extraer grupos."); }
}

// --- SALUDO ---
function obtenerSaludo(nombreG) {
    const hora = new Date().getHours();
    const e = getRandEmoji('saludo');
    const mañana = ["Buenos días","Buen día","Excelente mañana"];
    const tarde  = ["Buenas tardes","Buena tarde","Un placer saludarte"];
    const noche  = ["Buenas noches","Linda noche","Saludos nocturnos"];
    let saludo = (hora >= 6 && hora < 12) ? mañana : (hora >= 12 && hora < 19) ? tarde : noche;
    return `${e} _${saludo[Math.floor(Math.random() * saludo.length)]} miembros de:_ *_${nombreG}_*`;
}

// --- IMÁGENES ---
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
    if (disponibles.length === 0) { imagenesUsadasEnSesion = []; disponibles = todasLasFotos; }
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
    if (tipoCampaña === "2") {
        console.log("\nA. Mensaje Global | B. Catálogo Individual");
        modoEnvio = (await question("Selecciona: ")).toUpperCase();
    }

    let productos = [];
    if (tipoCampaña === "1" || modoEnvio === "A") {
        const numProductos = parseInt(await question("\n¿Cuántos productos globales vas a configurar? "));
        for (let p = 0; p < numProductos; p++) {
            console.log(`\n--- Producto ${p+1} ---`);
            const titulo = await question("   Título: ");
            console.log("   Descripción (FIN para terminar):");
            let desc = [];
            while (true) { const l = await question(""); if (l.trim().toUpperCase() === 'FIN') break; desc.push(l.trim()); }
            const precio = await question("   Precio: ");
            const url = await question("   URL: ");
            let carpetas = [];
            if (tipoCampaña === "2") {
                const numCarp = parseInt(await question("   ¿Cuántas carpetas de imágenes? "));
                for (let c = 0; c < numCarp; c++) carpetas.push((await question(`   Ruta carpeta ${c+1}: `)).trim());
            }
            productos.push({ titulo, desc, precio, url, carpetas, activo: true });
        }
    } else {
        console.log("\nDescripción extra (FIN para terminar):");
        let desc = [];
        while (true) { const l = await question(""); if (l.trim().toUpperCase() === 'FIN') break; desc.push(l.trim()); }
        const url = await question("\nURL: ");
        const numCarp = parseInt(await question("¿Cuántas carpetas de imágenes? "));
        let carpetas = [];
        for (let c = 0; c < numCarp; c++) carpetas.push((await question(`   Ruta carpeta ${c+1}: `)).trim());
        productos.push({ titulo: "", desc, precio: "", url, carpetas, activo: true });
    }

    const rutaGrupos = (await question("\nRuta del archivo grupos.txt: ")).trim();
    const numRafagas = parseInt(await question("\n¿Cuántas ráfagas vas a configurar? "));
    let ráfagas = [];
    for (let i = 0; i < numRafagas; i++) {
        console.log(`\n--- Ráfaga ${i+1} ---`);
        const duracion = parseInt(await question(`   Duración en minutos: `));
        let productoIdx = 0;
        if (productos.length > 1) {
            console.log(`   Productos: ${productos.map((p,i) => `${i+1}. ${p.titulo}`).join(' | ')}`);
            productoIdx = parseInt(await question(`   ¿Qué producto usa esta ráfaga? (número): `)) - 1;
        }
        ráfagas.push({ duracion, productoIdx });
    }
    return { tipoCampaña, modoEnvio, productos, rutaGrupos, ráfagas };
}

// --- ROTACIÓN AUTOMÁTICA ---
function obtenerProductoDelDia(productos, rafagaIdx) {
    const productosActivos = productos.map((p, i) => ({ ...p, idx: i })).filter(p => p.activo !== false);
    if (productosActivos.length === 0) return 0;
    const diaDelAño = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    return productosActivos[(diaDelAño + rafagaIdx) % productosActivos.length].idx;
}

// --- GLOBALS ---
let sockGlobal = null;
let confGlobal = null;
let campañaActiva = false;
let rafagaEnCurso = false;
let cancelarRafagaActual = false;
let reiniciando = false;
let ejecutandoReinicio = false;
let mensajeEsperaIdx = Math.floor(Math.random() * mensajesEspera.length);
let keepAliveInterval = null;

// --- KEEP ALIVE ---
function iniciarKeepAlive(sock) {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = setInterval(async () => {
        if (rafagaEnCurso) return;
        if (!jidAutorizado) return;
        const msj = mensajesEspera[mensajeEsperaIdx % mensajesEspera.length];
        mensajeEsperaIdx++;
        try { await sock.sendMessage(jidAutorizado, { text: msj }); } catch(e) {}
    }, (10 + Math.floor(Math.random() * 6)) * 60000);
}

// --- EJECUTAR RÁFAGA ---
async function ejecutarRafaga(r, conf) {
    rafagaEnCurso = true;
    cancelarRafagaActual = false;
    imagenesUsadasEnSesion = [];

    const ventana = conf.ráfagas[r];
    let grupos = fs.readFileSync(conf.rutaGrupos, 'utf8').split('\n').filter(l => l.trim());
    grupos = grupos.filter(l => !blacklist.some(id => l.includes(id)));
    grupos = grupos.sort(() => Math.random() - 0.5);

    const pIdx = ventana.productoIdx !== undefined ? ventana.productoIdx : obtenerProductoDelDia(conf.productos, r);
    const producto = conf.productos[pIdx];

    // Corrección matemática: descontar overhead por grupo
    const overheadTotal = grupos.length * 5000;
    const durMs = (ventana.duracion * 60000) - overheadTotal;
    const pausaBase = Math.max(25000, Math.floor(durMs / Math.max(grupos.length - 1, 1)));
    const margen = Math.min(10000, pausaBase - 25000);

    console.log(`\n📋 Ráfaga ${r+1}: ${grupos.length} grupos | Producto: ${producto.titulo || 'Catálogo'} | Duración: ${ventana.duracion} min | Pausa: ${Math.floor((pausaBase-margen)/1000)}-${Math.floor(pausaBase/1000)}s`);

    try { await sockGlobal.sendMessage(jidAutorizado, { text: `🚀 *Ráfaga ${r+1} iniciada*\n📋 ${grupos.length} grupos\n⏱ ${ventana.duracion} minutos\n📦 ${producto.titulo || 'Catálogo'}` }); } catch(e) {}

    let enviados = 0, fallidos = 0;

    for (let i = 0; i < grupos.length; i++) {
        if (cancelarRafagaActual) {
            console.log(`\n⛔ Ráfaga ${r+1} cancelada.`);
            break;
        }

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

        for (let intento = 1; intento <= 2; intento++) {
            try {
                await sockGlobal.sendPresenceUpdate('composing', idG);
                await delay(2000);
                if (conf.tipoCampaña === "2" && imgPath) {
                    await sockGlobal.sendMessage(idG, { image: fs.readFileSync(imgPath), caption: msj });
                } else {
                    await sockGlobal.sendMessage(idG, { text: msj }, { linkPreview: true });
                }
                console.log(`✅ [${i+1}/${grupos.length}] -> ${nombreG}`);
                enviados++;
                break;
            } catch (e) {
                if (intento === 1) { console.log(`⚠️ Reintentando: ${nombreG}...`); await delay(5000); }
                else { console.log(`❌ Error en: ${nombreG}`); fallidos++; }
            }
        }

        if (i < grupos.length - 1 && !cancelarRafagaActual) {
            const espera = pausaBase - Math.floor(Math.random() * margen);
            console.log(`⏳ Pausa de ${Math.floor(espera/1000)}s...`);
            await delay(espera);
        }
    }

    const horaFin = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const reporte = `📊 *Reporte Ráfaga ${r+1}*\n\n` +
                    `🕐 Finalizada: ${horaFin}\n` +
                    `📦 Producto: ${producto.titulo || 'Catálogo'}\n` +
                    `✅ Enviados: ${enviados}\n` +
                    `❌ Fallidos: ${fallidos}\n` +
                    `📋 Total: ${grupos.length}\n` +
                    `🚫 Lista negra: ${blacklist.length} grupos`;
    console.log(`\n${reporte}`);
    try { await sockGlobal.sendMessage(jidAutorizado, { text: reporte }); } catch(e) {}

    rafagaEnCurso = false;
    cancelarRafagaActual = false;
}

// --- COMANDOS ---
async function procesarComandoWA(texto, conf) {
    const t = texto.trim();

    if (/^reiniciar$/i.test(t)) { reiniciando = true; return "🔄 Reiniciando conexión..."; }

    const mLanzar = t.match(/^lanzar\s+r[aá]faga\s+(\d+)$/i);
    if (mLanzar) {
        const r = parseInt(mLanzar[1]) - 1;
        if (r < 0 || r >= conf.ráfagas.length) return `❌ Ráfaga ${r+1} no existe.`;
        if (rafagaEnCurso) return `⚠️ Ya hay una ráfaga en curso.`;
        ejecutarRafaga(r, conf);
        return null;
    }

    const mCancelar = t.match(/^cancelar\s+r[aá]faga\s+(\d+)$/i);
    if (mCancelar) {
        if (!rafagaEnCurso) return `⚠️ No hay ninguna ráfaga en curso.`;
        cancelarRafagaActual = true;
        return `⛔ Cancelando ráfaga en curso...`;
    }

    const mRafagaProd = t.match(/^r[aá]faga\s+(\d+)\s+producto\s+(\d+)$/i);
    if (mRafagaProd) {
        const r = parseInt(mRafagaProd[1]) - 1;
        const p = parseInt(mRafagaProd[2]) - 1;
        if (r < 0 || r >= conf.ráfagas.length) return `❌ Ráfaga ${r+1} no existe.`;
        if (p < 0 || p >= conf.productos.length) return `❌ Producto ${p+1} no existe.`;
        conf.ráfagas[r].productoIdx = p;
        guardarBackup(conf);
        return `✅ Ráfaga ${r+1} usará producto ${p+1}: ${conf.productos[p].titulo}`;
    }

    const mDuracion = t.match(/^r[aá]faga\s+(\d+)\s+duracion\s+(\d+)$/i);
    if (mDuracion) {
        const r = parseInt(mDuracion[1]) - 1;
        const dur = parseInt(mDuracion[2]);
        if (r < 0 || r >= conf.ráfagas.length) return `❌ Ráfaga ${r+1} no existe.`;
        conf.ráfagas[r].duracion = dur;
        guardarBackup(conf);
        return `✅ Ráfaga ${r+1} duración: ${dur} minutos`;
    }

    const mProducto = t.match(/^producto\s+(\d+)\s+(precio|titulo|descripcion|url|carpeta|activar|desactivar)\s*([\s\S]*)$/i);
    if (mProducto) {
        const p = parseInt(mProducto[1]) - 1;
        const campo = mProducto[2].toLowerCase();
        const valor = mProducto[3] ? mProducto[3].trim() : "";
        if (p < 0 || p >= conf.productos.length) return `❌ Producto ${p+1} no existe.`;
        if (campo === 'activar')     { conf.productos[p].activo = true;    guardarBackup(conf); return `✅ Producto ${p+1} activado.`; }
        if (campo === 'desactivar')  { conf.productos[p].activo = false;   guardarBackup(conf); return `✅ Producto ${p+1} desactivado.`; }
        if (!valor) return `❌ Falta el valor para ${campo}.`;
        if (campo === 'precio')      { conf.productos[p].precio = valor;    guardarBackup(conf); return `✅ Precio actualizado: $${valor}`; }
        if (campo === 'titulo')      { conf.productos[p].titulo = valor;    guardarBackup(conf); return `✅ Título actualizado: ${valor}`; }
        if (campo === 'descripcion') { conf.productos[p].desc = valor.split('\n').filter(l => l.trim()); guardarBackup(conf); return `✅ Descripción actualizada.`; }
        if (campo === 'url')         { conf.productos[p].url = valor;       guardarBackup(conf); return `✅ URL actualizada: ${valor}`; }
        if (campo === 'carpeta')     { conf.productos[p].carpetas = [valor]; guardarBackup(conf); return `✅ Carpeta actualizada: ${valor}`; }
    }

    const mBloquear = t.match(/^(bloquear|desbloquear)\s+(\S+@g\.us)$/i);
    if (mBloquear) {
        const accion = mBloquear[1].toLowerCase();
        const idGrupo = mBloquear[2];
        if (accion === 'bloquear') {
            if (!blacklist.includes(idGrupo)) { blacklist.push(idGrupo); guardarBlacklist(); }
            return `🚫 Grupo bloqueado: ${idGrupo}`;
        } else {
            blacklist = blacklist.filter(id => id !== idGrupo);
            guardarBlacklist();
            return `✅ Grupo desbloqueado: ${idGrupo}`;
        }
    }
    return null;
}

// --- LISTENER ---
function registrarListenerMensajes(sock) {
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg || !msg.message) return;
        if (!msg.key.fromMe) return;

        const remitente = msg.key.remoteJid;
        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if (!texto) return;

        if (!jidAutorizado) {
            jidAutorizado = remitente;
            guardarJid(remitente);
            console.log(`\n🔐 JID autorizado registrado: ${remitente}`);
        }
        if (remitente !== jidAutorizado) return;
        if (!confGlobal) return;
        if (mensajesEspera.includes(texto)) return;

        const respuesta = await procesarComandoWA(texto, confGlobal);
        if (respuesta) {
            console.log(`\n📩 Comando: "${texto}"\n📤 Respuesta: ${respuesta}`);
            try { await sock.sendMessage(remitente, { text: respuesta }); } catch(e) {}
        }

        if (reiniciando) {
            reiniciando = false;
            ejecutandoReinicio = true;
            await delay(2000);
            console.log("\n🔄 Ejecutando reinicio de conexión...");
            if (keepAliveInterval) clearInterval(keepAliveInterval);
            try { sock.ws.close(); } catch(e) {}
        }
    });
}

// --- MOTOR PRINCIPAL ---
async function ejecutar() {
    ejecutandoReinicio = false;

    const { state, saveCreds } = await useMultiFileAuthState('sesion_auth');
    const sock = makeWASocket({ 
        auth: state, 
        printQRInTerminal: false,
        logger: pino({ level: "silent" }), 
        browser: ["Ubuntu", "Chrome", "20.0.04"] 
    });

    sockGlobal = sock;
    sock.ev.on("creds.update", saveCreds);
    registrarListenerMensajes(sock);

    sock.ev.on("connection.update", async (u) => {
        const { connection, lastDisconnect } = u;

        // EMPAREJAMIENTO - exactamente igual al original que funcionaba
        if (connection === "connecting" && !sock.authState.creds.registered) {
            console.log("\n--- INICIANDO CONEXIÓN SEGURA ---");
            await delay(5000);
            try {
                const numero = await question("\nIngresa tu número de WhatsApp (ej. 521...): ");
                const code = await sock.requestPairingCode(numero.trim());
                console.log("\n======================================");
                console.log(`✅ TU CÓDIGO DE EMPAREJAMIENTO ES: ${code}`);
                console.log("======================================\n");
            } catch (err) { console.log("Error al solicitar código:", err); }
        }

        if (connection === "close") {
            if (keepAliveInterval) clearInterval(keepAliveInterval);
            if (ejecutandoReinicio) { ejecutar(); return; }
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            if (shouldReconnect) ejecutar();
        }

        if (connection === "open") {
            console.log("\n✅ WhatsApp Conectado.");
            await extraerGrupos(sock);

            if (!jidAutorizado) jidAutorizado = cargarJid();
            if (jidAutorizado) console.log(`🔐 JID autorizado: ${jidAutorizado}`);
            blacklist = cargarBlacklist();
            if (blacklist.length > 0) console.log(`🚫 Lista negra: ${blacklist.length} grupos`);

            iniciarKeepAlive(sock);

            if (campañaActiva) { console.log("🔄 Reconexión exitosa. Continuando..."); return; }

            campañaActiva = true;
            let conf;

            const backup = cargarBackup();
            if (backup) {
                console.log("\n╔══════════════════════════════════════╗");
                console.log("║   💾 Configuración guardada encontrada ║");
                console.log("╠══════════════════════════════════════╣");
                console.log("║  1. Cargar configuración guardada     ║");
                console.log("║  2. Capturar nueva configuración      ║");
                console.log("╚══════════════════════════════════════╝");
                const opcion = await question("Selecciona (1 o 2): ");
                conf = (opcion.trim() === "1") ? backup : await iniciarCuestionario();
                if (opcion.trim() !== "1") guardarBackup(conf);
                else console.log("✅ Configuración cargada desde backup.");
            } else {
                conf = await iniciarCuestionario();
                guardarBackup(conf);
            }

            confGlobal = conf;

            if (jidAutorizado) {
                const info = conf.ráfagas.map((r, i) => 
                    `  Ráfaga ${i+1}: ${r.duracion} min | ${conf.productos[r.productoIdx || 0].titulo || 'Catálogo'}`
                ).join('\n');
                try {
                    await sock.sendMessage(jidAutorizado, { 
                        text: `✅ *Sistema listo*\n\n${info}\n\nEnvía *lanzar rafaga 1* para iniciar.`
                    });
                } catch(e) {}
            }

            console.log("\n✅ Sistema en espera. Envía comandos desde WhatsApp.");
        }
    });
}
ejecutar().catch(console.error);
