const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware para leer JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de la Base de Datos SQLite Local
const dbFile = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Error al abrir la base de datos', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite local.');
        
        // Crear tabla de usuarios si no existe
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT,
            name TEXT
        )`, () => {
            db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
                if (row.count === 0) {
                    const stmt = db.prepare(`INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)`);
                    stmt.run('jefe', '1234', 'jefe', 'Teniente (Jefe)');
                    stmt.run('sup1', '1234', 'superior', 'Superior 1');
                    stmt.run('sup2', '1234', 'superior', 'Superior 2');
                    stmt.run('prof', '1234', 'profesional', 'Profesional Asistente');
                    stmt.finalize();
                    console.log('Usuarios iniciales creados.');
                }
            });
        });

        // Crear tabla de documentos pendientes (solo texto y metadatos)
        db.run(`CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            referencia TEXT,
            remitente TEXT,
            asignado TEXT,
            observacion TEXT,
            status TEXT DEFAULT 'Pendiente',
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// --- API ENDPOINTS ---

// 1. Login local
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
        if (err) return res.status(500).json({ error: 'Error en el servidor' });
        if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
        res.json({ success: true, user: { username: user.username, role: user.role, name: user.name } });
    });
});

// 2. Obtener lista de documentos pendientes
app.get('/api/documents', (req, res) => {
    db.all(`SELECT * FROM documents ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al consultar documentos' });
        res.json(rows);
    });
});

// 3. Registrar nuevo documento pendiente (Solo texto)
app.post('/api/documents', (req, res) => {
    const { referencia, remitente, asignado, observacion } = req.body;

    const query = `INSERT INTO documents (referencia, remitente, asignado, observacion) VALUES (?, ?, ?, ?)`;
    db.run(query, [referencia, remitente, asignado, observacion], function(err) {
        if (err) return res.status(500).json({ error: 'Error al guardar en la base de datos' });
        res.json({ success: true, message: 'Documento registrado correctamente en la lista.', id: this.lastID });
    });
});

// 4. Cambiar estado del documento (Pendiente / Atendido)
app.patch('/api/documents/:id', (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    db.run(`UPDATE documents SET status = ? WHERE id = ?`, [status, id], function(err) {
        if (err) return res.status(500).json({ error: 'Error al actualizar estado' });
        res.json({ success: true });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Acceso local para otros teléfonos en la red: http://<IP-DE-TU-PC>:${PORT}`);
});