// ============================================================
// SERVEUR MCP & PWA — Islam Agent Épistémique (TOSSARA)
// ============================================================
// Ce serveur fournit :
// 1. L'hébergement PWA (index.html, manifest.json, sw.js)
// 2. L'accès MCP aux sources islamiques (Coran, Hadiths, Tafsir)
// ============================================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================================
// HÉBERGEMENT DES FICHIERS STATIQUES (PWA / TOSSARA)
// ============================================================
// Permet de servir index.html, manifest.json, sw.js et les icônes
app.use(express.static(__dirname));

// ============================================================
// 1. CHARGEMENT DES DONNÉES
// ============================================================

const DATA_DIR = path.join(__dirname, 'data');

let quranData = null;
let hadithData = null;
let tafsirData = null;

function loadData() {
    try {
        const quranPath = path.join(DATA_DIR, 'quran_fr.json');
        if (fs.existsSync(quranPath)) {
            quranData = JSON.parse(fs.readFileSync(quranPath, 'utf-8'));
            console.log('✅ Coran chargé :', quranData.sourates ? quranData.sourates.length : '0 sourates');
        } else {
            console.warn('⚠️ Fichier quran_fr.json introuvable. Utilisation des données par défaut.');
            quranData = getDefaultQuran();
        }

        const hadithPath = path.join(DATA_DIR, 'hadiths_fr.json');
        if (fs.existsSync(hadithPath)) {
            hadithData = JSON.parse(fs.readFileSync(hadithPath, 'utf-8'));
            console.log('✅ Hadiths chargés :', hadithData.hadiths ? hadithData.hadiths.length : '0 hadiths');
        } else {
            console.warn('⚠️ Fichier hadiths_fr.json introuvable.');
            hadithData = getDefaultHadiths();
        }

        const tafsirPath = path.join(DATA_DIR, 'tafsir_ibn_kathir_fr.json');
        if (fs.existsSync(tafsirPath)) {
            tafsirData = JSON.parse(fs.readFileSync(tafsirPath, 'utf-8'));
            console.log('✅ Tafsir chargé');
        } else {
            console.warn('⚠️ Fichier tafsir_ibn_kathir_fr.json introuvable.');
            tafsirData = getDefaultTafsir();
        }

        return true;
    } catch (error) {
        console.error('❌ Erreur chargement des données:', error);
        return false;
    }
}

// ============================================================
// 2. DONNÉES PAR DÉFAUT
// ============================================================

function getDefaultQuran() {
    return {
        sourates: [
            { id: 1, nom: 'Al-Fatiha', versets: 7, traduction: 'L\'Ouvrante' },
            { id: 2, nom: 'Al-Baqarah', versets: 286, traduction: 'La Vache' },
            { id: 3, nom: 'Al-Imran', versets: 200, traduction: 'La Famille d\'Imran' },
            { id: 4, nom: 'An-Nisa', versets: 176, traduction: 'Les Femmes' },
            { id: 5, nom: 'Al-Ma\'idah', versets: 120, traduction: 'La Table Servie' }
        ],
        versets: {
            1: [
                { id: 1, texte_arabe: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', traduction: 'Au nom d\'Allah, le Tout Miséricordieux, le Très Miséricordieux.' },
                { id: 2, texte_arabe: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', traduction: 'Louange à Allah, Seigneur de l\'univers.' },
                { id: 3, texte_arabe: 'الرَّحْمَٰنِ الرَّحِيمِ', traduction: 'Le Tout Miséricordieux, le Très Miséricordieux.' },
                { id: 4, texte_arabe: 'مَالِكِ يَوْمِ الدِّينِ', traduction: 'Maître du Jour de la Rétribution.' },
                { id: 5, texte_arabe: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', traduction: 'C\'est Toi que nous adorons, et c\'est Toi dont nous implorons l\'aide.' }
            ]
        }
    };
}

function getDefaultHadiths() {
    return {
        hadiths: [
            { id: 1, source: 'Bukhari', texte: 'Les actions ne valent que par leurs intentions.', grade: 'Sahih' },
            { id: 2, source: 'Muslim', texte: 'Le meilleur d\'entre vous est celui qui est le meilleur envers sa famille.', grade: 'Sahih' },
            { id: 3, source: 'Bukhari', texte: 'La propreté est la moitié de la foi.', grade: 'Sahih' }
        ]
    };
}

function getDefaultTafsir() {
    return {
        versets: {
            '1:1': { auteur: 'Ibn Kathir', texte: 'Le nom d\'Allah est le plus grand des noms.' }
        }
    };
}

// ============================================================
// 3. FONCTIONS DE RECHERCHE
// ============================================================

function searchQuran(query, maxResults = 10) {
    const results = [];
    const qLower = query.toLowerCase();

    if (quranData && quranData.sourates) {
        for (const sourate of quranData.sourates) {
            if (sourate.nom.toLowerCase().includes(qLower) || 
                sourate.traduction.toLowerCase().includes(qLower)) {
                results.push({
                    type: 'sourate',
                    sourate_id: sourate.id,
                    sourate_name: sourate.nom,
                    sourate_traduction: sourate.traduction,
                    versets: sourate.versets
                });
            }
        }
    }

    if (quranData && quranData.versets) {
        for (const [sourateId, versets] of Object.entries(quranData.versets)) {
            for (const verset of versets) {
                if (verset.traduction && verset.traduction.toLowerCase().includes(qLower)) {
                    results.push({
                        type: 'verset',
                        sourate_id: parseInt(sourateId),
                        sourate_name: getSourateName(parseInt(sourateId)),
                        verset_id: verset.id,
                        texte_arabe: verset.texte_arabe || '',
                        traduction: verset.traduction || ''
                    });
                }
            }
        }
    }

    return results.slice(0, maxResults);
}

function getSourateName(id) {
    if (quranData && quranData.sourates) {
        const sourate = quranData.sourates.find(s => s.id === id);
        if (sourate) return sourate.nom;
    }
    return 'Sourate ' + id;
}

function searchHadiths(query, maxResults = 10) {
    const results = [];
    const qLower = query.toLowerCase();

    if (hadithData && hadithData.hadiths) {
        for (const hadith of hadithData.hadiths) {
            if (hadith.texte && hadith.texte.toLowerCase().includes(qLower)) {
                results.push({
                    type: 'hadith',
                    id: hadith.id,
                    source: hadith.source || 'Inconnue',
                    texte: hadith.texte,
                    grade: hadith.grade || 'Non vérifié'
                });
            }
        }
    }

    return results.slice(0, maxResults);
}

function searchTafsir(query, maxResults = 5) {
    const results = [];
    const qLower = query.toLowerCase();

    if (tafsirData && tafsirData.versets) {
        for (const [versetId, entry] of Object.entries(tafsirData.versets)) {
            if (entry.texte && entry.texte.toLowerCase().includes(qLower)) {
                results.push({
                    type: 'tafsir',
                    verset: versetId,
                    auteur: entry.auteur || 'Ibn Kathir',
                    texte: entry.texte
                });
            }
        }
    }

    return results.slice(0, maxResults);
}

// ============================================================
// 4. ROUTES API ET MCP
// ============================================================

app.get('/api/status', (req, res) => {
    res.json({
        name: 'Serveur MCP - Islam Agent Épistémique (TOSSARA)',
        version: '1.0.0',
        status: 'online',
        endpoints: {
            mcp: 'POST /mcp',
            quran: 'GET /quran/search?q=...',
            hadiths: 'GET /hadiths/search?q=...',
            tafsir: 'GET /tafsir/search?q=...'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ROUTE MCP
app.post('/mcp', async (req, res) => {
    try {
        const { tool, params } = req.body;
        if (!tool) return res.status(400).json({ error: 'Paramètre "tool" requis' });

        let results = [];
        let source = '';

        switch (tool) {
            case 'search_quran':
                results = searchQuran(params.query || '', params.max_results || 10);
                source = 'Coran';
                break;
            case 'search_hadiths':
                results = searchHadiths(params.query || '', params.max_results || 10);
                source = 'Hadiths';
                break;
            case 'search_tafsir':
                results = searchTafsir(params.query || '', params.max_results || 5);
                source = 'Tafsir';
                break;
            default:
                return res.status(400).json({ error: `Outil non reconnu : "${tool}"` });
        }

        res.json({ tool: tool, source: source, count: results.length, results: results });

    } catch (error) {
        console.error('Erreur MCP:', error);
        res.status(500).json({ error: 'Erreur interne du serveur', details: error.message });
    }
});

// ============================================================
// 5. INITIALISATION
// ============================================================

function ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function createDefaultDataFiles() {
    const quranPath = path.join(DATA_DIR, 'quran_fr.json');
    if (!fs.existsSync(quranPath)) fs.writeFileSync(quranPath, JSON.stringify(getDefaultQuran(), null, 2), 'utf-8');

    const hadithPath = path.join(DATA_DIR, 'hadiths_fr.json');
    if (!fs.existsSync(hadithPath)) fs.writeFileSync(hadithPath, JSON.stringify(getDefaultHadiths(), null, 2), 'utf-8');

    const tafsirPath = path.join(DATA_DIR, 'tafsir_ibn_kathir_fr.json');
    if (!fs.existsSync(tafsirPath)) fs.writeFileSync(tafsirPath, JSON.stringify(getDefaultTafsir(), null, 2), 'utf-8');
}

ensureDataDirectory();
createDefaultDataFiles();
loadData();

app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('🕌 Serveur MCP & PWA — Islam Agent Épistémique (TOSSARA)');
    console.log('='.repeat(60));
    console.log(`🌐 Application accessible sur : http://localhost:${PORT}`);
    console.log(`📲 Installation PWA prête avec l'étiquette TOSSARA`);
    console.log('='.repeat(60));
});
