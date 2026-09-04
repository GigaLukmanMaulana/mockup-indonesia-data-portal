const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data.json');
const geoPath = path.join(__dirname, 'indonesia-kab.json');

const regData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const geoData = JSON.parse(fs.readFileSync(geoPath, 'utf8'));

const cleanStr = s => (s || '').toString().toUpperCase()
    .replace(/^(KABUPATEN|KOTA|KAB\.|KOTA\.)\s+/, '')
    .replace(/[^A-Z0-9]/g, '')
    .trim();

// Extract all coordinate pairs from GeoJSON geometry
function getFeatureCoords(f) {
    const coords = [];
    if (!f || !f.geometry || !f.geometry.coordinates) return coords;
    function extract(arr) {
        if (!arr || arr.length === 0) return;
        if (typeof arr[0] === 'number') {
            coords.push(arr);
        } else {
            arr.forEach(extract);
        }
    }
    extract(f.geometry.coordinates);
    return coords;
}

// Calculate minimum Euclidean distance between polygon boundary coordinates
function minCoordDistance(coords1, coords2) {
    let minDist = Infinity;
    const step1 = Math.max(1, Math.floor(coords1.length / 200));
    const step2 = Math.max(1, Math.floor(coords2.length / 200));

    for (let i = 0; i < coords1.length; i += step1) {
        const [x1, y1] = coords1[i];
        for (let j = 0; j < coords2.length; j += step2) {
            const [x2, y2] = coords2[j];
            const dx = x1 - x2;
            const dy = y1 - y2;
            const d = dx * dx + dy * dy;
            if (d < minDist) {
                minDist = d;
                if (minDist === 0) return 0;
            }
        }
    }
    return Math.sqrt(minDist);
}

// Helper: Calculate bounding box
function getFeatureBounds(f) {
    const coords = getFeatureCoords(f);
    if (coords.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    coords.forEach(([x, y]) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    });
    return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

// Clean raw boundary text from BPS data
function cleanBpsText(text) {
    if (!text) return null;
    let str = text.toString().trim();
    if (!str || str.toLowerCase() === 'null') return null;

    // Check if sea/water body
    const seaTerms = ['LAUT', 'SELAT', 'SAMUDRA', 'SAMUDERA', 'TELUK'];
    const isWater = seaTerms.some(t => str.toUpperCase().includes(t));
    if (isWater) {
        return str.replace(/^Kab\.\s+/i, '').replace(/^Kota\s+/i, '').trim();
    }

    // Split multiple regions (e.g. "Kab. Muara Enim dan Kab. Ogan Ilir" -> ["Kab. Muara Enim", "Kab. Ogan Ilir"])
    const parts = str.split(/&|,|\sdan\s/i).map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return null;

    // Pick first clean region name
    let primary = parts[0];
    primary = primary.replace(/^Kab\.\s+/i, 'Kabupaten ')
                     .replace(/^Kabupaten\s+/i, 'Kabupaten ')
                     .replace(/^Kota\s+/i, 'Kota ')
                     .trim();

    return primary;
}

// Capital & Metro Dictionary Overrides
const OVERRIDES = {
    '112': { u: 'Kabupaten Banyuasin', s: 'Kabupaten Ogan Ilir', t: 'Kabupaten Banyuasin', b: 'Kabupaten Muara Enim' }, // Palembang
    '158': { u: 'Kota Jakarta Utara', s: 'Kota Jakarta Selatan', t: 'Kota Jakarta Timur', b: 'Kota Jakarta Barat' }, // Jakarta Pusat
    '159': { u: 'Laut Jawa', s: 'Kota Jakarta Pusat', t: 'Kabupaten Bekasi', b: 'Kota Jakarta Barat' }, // Jakarta Utara
    '160': { u: 'Kota Jakarta Utara', s: 'Kota Tangerang Selatan', t: 'Kota Jakarta Pusat', b: 'Kota Tangerang' }, // Jakarta Barat
    '161': { u: 'Kota Jakarta Pusat', s: 'Kota Depok', t: 'Kota Jakarta Timur', b: 'Kota Tangerang Selatan' }, // Jakarta Selatan
    '162': { u: 'Kota Jakarta Utara', s: 'Kota Depok', t: 'Kota Bekasi', b: 'Kota Jakarta Pusat' }, // Jakarta Timur
    '193': { u: 'Kota Semarang & Kabupaten Demak', s: 'Kabupaten Boyolali', t: 'Kabupaten Grobogan', b: 'Kabupaten Temanggung & Kabupaten Kendal', e: 'Kota Salatiga' }, // Kabupaten Semarang
    '213': { u: 'Laut Jawa', s: 'Kabupaten Semarang', t: 'Kabupaten Demak', b: 'Kabupaten Kendal', e: null }, // Kota Semarang
    '242': { u: 'Kabupaten Pasuruan', s: 'Samudra Hindia', t: 'Kabupaten Lumajang', b: 'Kabupaten Blitar', e: 'Kota Malang' } // Kabupaten Malang
};

const TRUE_ENCLAVES = {
    'MALANG': 'Kota Malang',
    'BOGOR': 'Kota Bogor',
    'SUKABUMI': 'Kota Sukabumi',
    'KEDIRI': 'Kota Kediri',
    'BLITAR': 'Kota Blitar',
    'MAGELANG': 'Kota Magelang',
    'SEMARANG': 'Kota Salatiga',
    'MOJOKERTO': 'Kota Mojokerto',
    'TASIKMALAYA': 'Kota Tasikmalaya',
    'MUARA ENIM': 'Kota Prabumulih',
    'SIMALUNGUN': 'Kota Pematangsiantar'
};

function findStrictGeoFeature(rObj) {
    if (!rObj) return null;
    const targetClean = cleanStr(rObj.kabkota);
    const provClean = cleanStr(rObj.prov);
    const rIsKota = (rObj.kabkota || '').toUpperCase().startsWith('KOTA ');

    let match = geoData.features.find(f => {
        if (!f || !f.properties) return false;
        const name1 = f.properties.NAME_1 || f.properties.KABKOTA || '';
        const country = f.properties.COUNTRY || f.properties.NAME_2 || '';
        const type2 = (f.properties.VARNAME_2 || '').toUpperCase();
        const fIsKota = type2 === 'KOTA' || name1.toUpperCase().startsWith('KOTA ');

        const fClean = cleanStr(name1);
        const cClean = cleanStr(country);

        const nameMatches = (fClean === targetClean);
        const provMatches = !cClean || !provClean || cClean === provClean || cClean.includes(provClean) || provClean.includes(cClean);

        return nameMatches && provMatches && (rIsKota === fIsKota);
    });

    if (!match) {
        match = geoData.features.find(f => {
            if (!f || !f.properties) return false;
            const name1 = f.properties.NAME_1 || f.properties.KABKOTA || '';
            const type2 = (f.properties.VARNAME_2 || '').toUpperCase();
            const fIsKota = type2 === 'KOTA' || name1.toUpperCase().startsWith('KOTA ');
            const fClean = cleanStr(name1);
            return (fClean === targetClean) && (rIsKota === fIsKota);
        });
    }

    return match || null;
}

// Pre-process all feature coordinates & bounds for optimization
const preparedFeatures = geoData.features.map(f => ({
    feature: f,
    coords: getFeatureCoords(f),
    bounds: getFeatureBounds(f),
    name: f.properties ? (f.properties.NAME_1 || f.properties.KABKOTA || '') : '',
    type2: f.properties ? (f.properties.VARNAME_2 || '') : ''
})).filter(pf => pf.coords.length > 0 && pf.bounds);

function getTrueEnclave(r) {
    if (!r || !r.kabkota || r.kabkota.toUpperCase().startsWith('KOTA ')) return null;
    const regClean = cleanStr(r.kabkota);
    if (!regClean) return null;
    if (TRUE_ENCLAVES[regClean]) return TRUE_ENCLAVES[regClean];

    const matchingKota = regData.find(k => k.prov === r.prov && cleanStr(k.kabkota) === regClean && k.kabkota.toUpperCase().startsWith('KOTA '));
    if (matchingKota) {
        const fReg = findStrictGeoFeature(r);
        const fCity = findStrictGeoFeature(matchingKota);
        if (fReg && fCity) {
            const bR = getFeatureBounds(fReg);
            const bC = getFeatureBounds(fCity);
            if (bR && bC) {
                const w = bR.maxX - bR.minX;
                const h = bR.maxY - bR.minY;
                const inX = bC.cx > (bR.minX + 0.15 * w) && bC.cx < (bR.maxX - 0.15 * w);
                const inY = bC.cy > (bR.minY + 0.15 * h) && bC.cy < (bR.maxY - 0.15 * h);
                if (inX && inY) {
                    return matchingKota.kabkota.toUpperCase().startsWith('KOTA ') ? matchingKota.kabkota : 'Kota ' + matchingKota.kabkota;
                }
            }
        }
    }
    return null;
}

// Spatial fallback calculation using angular deviation scoring (for compass compatibility)
function computeSpatialFallback(r, enclaveName) {
    const curFeature = findStrictGeoFeature(r);
    const southOceanProvs = ['JAWA TIMUR', 'JAWA TENGAH', 'DI YOGYAKARTA', 'JAWA BARAT', 'BANTEN', 'BALI', 'NUSA TENGGARA BARAT', 'NUSA TENGGARA TIMUR', 'SUMATERA BARAT', 'BENGKULU', 'LAMPUNG'];
    const northOceanProvs = ['JAWA TIMUR', 'JAWA TENGAH', 'JAWA BARAT', 'BANTEN', 'DKI JAKARTA'];

    const defaultSouth = southOceanProvs.includes(r.prov) ? 'Samudra Hindia' : `Laut/Perairan Selatan Prov. ${r.prov}`;
    const defaultNorth = northOceanProvs.includes(r.prov) ? 'Laut Jawa' : `Laut/Perairan Utara Prov. ${r.prov}`;

    if (!curFeature) return { u: defaultNorth, s: defaultSouth, t: `Kawasan Timur Prov. ${r.prov}`, b: `Kawasan Barat Prov. ${r.prov}` };

    const b0 = getFeatureBounds(curFeature);
    if (!b0) return { u: defaultNorth, s: defaultSouth, t: `Kawasan Timur Prov. ${r.prov}`, b: `Kawasan Barat Prov. ${r.prov}` };

    const cleanEnclave = enclaveName ? cleanStr(enclaveName) : null;

    const list = geoData.features.map(f => {
        if (f === curFeature) return null;
        const name = f.properties.NAME_1 || f.properties.KABKOTA || '';
        const type2 = f.properties.VARNAME_2 || '';
        const fClean = cleanStr(name);

        if (cleanEnclave && fClean === cleanEnclave) return null;

        const b = getFeatureBounds(f);
        if (!b) return null;

        const dy = b.cy - b0.cy;
        const dx = b.cx - b0.cx;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 2.0) return null;

        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const displayName = (type2 === 'Kota' || name.startsWith('Kota')) && !name.startsWith('Kota ') ? 'Kota ' + name : (name.startsWith('Kabupaten ') || name.startsWith('Kota ') ? name : 'Kabupaten ' + name);
        return { name: displayName, dist, angle };
    }).filter(Boolean);

    function getBestForAngle(targetAngle, minA, maxA) {
        const cand = list.filter(item => {
            if (targetAngle === 180 || targetAngle === -180) return item.angle >= 120 || item.angle <= -120;
            return item.angle >= minA && item.angle <= maxA;
        });
        if (cand.length === 0) return null;
        return cand.map(item => {
            let diff = Math.abs(item.angle - targetAngle);
            if (diff > 180) diff = 360 - diff;
            return { ...item, score: item.dist + (diff / 90) * 0.18 };
        }).sort((a, b) => a.score - b.score)[0];
    }

    const nBest = getBestForAngle(90, 30, 150);
    const eBest = getBestForAngle(0, -60, 60);
    const sBest = getBestForAngle(-90, -150, -30);
    const wBest = getBestForAngle(180, 120, -120);

    return {
        u: nBest ? nBest.name : defaultNorth,
        s: sBest ? sBest.name : defaultSouth,
        t: eBest ? eBest.name : `Kawasan Timur Prov. ${r.prov}`,
        b: wBest ? wBest.name : `Kawasan Barat Prov. ${r.prov}`
    };
}

function computeBordersList(r) {
    const borders = [];
    const addedNames = new Set();

    function addBorderItem(name, type, badge) {
        if (!name || name === 'null') return;
        let cleanN = name.trim();
        if (cleanN.startsWith('Kab. ')) cleanN = cleanN.replace(/^Kab\.\s+/i, 'Kabupaten ');
        if (cleanN.startsWith('Kota.')) cleanN = cleanN.replace(/^Kota\.\s+/i, 'Kota ');
        const key = cleanN.toUpperCase();
        if (addedNames.has(key)) return;

        // Skip adding the main region itself as its own neighbor (comparing cleanStr + Kota vs Kab type)
        const isMainKota = r.kabkota.toUpperCase().startsWith('KOTA ');
        const itemIsKota = cleanN.toUpperCase().startsWith('KOTA ');
        if (cleanStr(cleanN) === cleanStr(r.kabkota) && isMainKota === itemIsKota) return;

        addedNames.add(key);
        borders.push({ name: cleanN, type, badge });
    }

    // 1. Check Enclave
    const enclaveName = getTrueEnclave(r);
    if (enclaveName) {
        addBorderItem(enclaveName, 'enclave', 'Kota Enklave');
    }

    // 2. Strict Spatial Adjacency Check (min polygon coordinate distance <= 0.02 deg ~2.2km)
    const curFeature = findStrictGeoFeature(r);
    if (curFeature) {
        const pfTarget = preparedFeatures.find(pf => pf.feature === curFeature);
        if (pfTarget) {
            const b0 = pfTarget.bounds;
            const list = preparedFeatures.map(pf => {
                if (pf.feature === curFeature) return null;
                const b = pf.bounds;

                // Quick bounding box check with 0.03 deg buffer
                if (b0.minX - 0.03 > b.maxX || b0.maxX + 0.03 < b.minX ||
                    b0.minY - 0.03 > b.maxY || b0.maxY + 0.03 < b.minY) {
                    return null;
                }

                const dist = minCoordDistance(pfTarget.coords, pf.coords);
                // Strict threshold for physically touching boundaries (<= 0.02 deg / ~2.2km)
                if (dist > 0.02) return null;

                const name = pf.name;
                const isKota = (pf.type2 === 'Kota' || name.startsWith('Kota'));
                const displayName = isKota && !name.startsWith('Kota ') ? 'Kota ' + name : (name.startsWith('Kabupaten ') || name.startsWith('Kota ') ? name : 'Kabupaten ' + name);
                const isEnclave = enclaveName && cleanStr(displayName) === cleanStr(enclaveName);

                return {
                    name: displayName,
                    dist,
                    type: isEnclave ? 'enclave' : (isKota ? 'kota' : 'kabupaten'),
                    badge: isEnclave ? 'Kota Enklave' : (isKota ? 'Kota' : 'Kabupaten')
                };
            }).filter(Boolean).sort((a, b) => a.dist - b.dist);

            list.forEach(item => {
                addBorderItem(item.name, item.type, item.badge);
            });
        }
    }

    // 3. Add Water / Ocean bodies from BPS Text boundaries
    [r.batas_utara, r.batas_timur, r.batas_selatan, r.batas_barat].forEach(b => {
        if (!b) return;
        const clean = cleanBpsText(b);
        if (!clean) return;
        const seaTerms = ['LAUT', 'SELAT', 'SAMUDRA', 'SAMUDERA', 'TELUK'];
        const isWater = seaTerms.some(t => clean.toUpperCase().includes(t));
        if (isWater) {
            addBorderItem(clean, 'water', 'Perairan / Laut');
        }
    });

    // 4. Ocean fallback if coastal province
    const southOceanProvs = ['JAWA TIMUR', 'JAWA TENGAH', 'DI YOGYAKARTA', 'JAWA BARAT', 'BANTEN', 'BALI', 'NUSA TENGGARA BARAT', 'NUSA TENGGARA TIMUR', 'SUMATERA BARAT', 'BENGKULU', 'LAMPUNG'];
    const northOceanProvs = ['JAWA TIMUR', 'JAWA TENGAH', 'JAWA BARAT', 'BANTEN', 'DKI JAKARTA'];
    if (southOceanProvs.includes(r.prov) && (r.batas_selatan && r.batas_selatan.toUpperCase().includes('SAMUDRA') || !r.batas_selatan)) {
        if (![...addedNames].some(n => n.includes('SAMUDRA') || n.includes('LAUT'))) {
            addBorderItem('Samudra Hindia', 'water', 'Perairan / Samudra');
        }
    }
    if (northOceanProvs.includes(r.prov) && (r.batas_utara && r.batas_utara.toUpperCase().includes('LAUT') || !r.batas_utara)) {
        if (![...addedNames].some(n => n.includes('SAMUDRA') || n.includes('LAUT'))) {
            addBorderItem('Laut Jawa', 'water', 'Perairan / Laut');
        }
    }

    return borders;
}

const RESULT = {};

regData.forEach(r => {
    const idKey = String(r.id || r.no);
    const override = OVERRIDES[idKey];
    const enclaveName = getTrueEnclave(r);

    let uClean = cleanBpsText(r.batas_utara);
    let sClean = cleanBpsText(r.batas_selatan);
    let tClean = cleanBpsText(r.batas_timur);
    let bClean = cleanBpsText(r.batas_barat);

    if (enclaveName) {
        const encClean = cleanStr(enclaveName);
        if (uClean && cleanStr(uClean) === encClean) uClean = null;
        if (sClean && cleanStr(sClean) === encClean) sClean = null;
        if (tClean && cleanStr(tClean) === encClean) tClean = null;
        if (bClean && cleanStr(bClean) === encClean) bClean = null;
    }

    const spatialFallback = computeSpatialFallback(r, enclaveName);

    RESULT[idKey] = {
        name: r.kabkota,
        prov: r.prov,
        u: override ? override.u : (uClean || spatialFallback.u),
        s: override ? override.s : (sClean || spatialFallback.s),
        t: override ? override.t : (tClean || spatialFallback.t),
        b: override ? override.b : (bClean || spatialFallback.b),
        e: override ? (typeof override.e !== 'undefined' ? override.e : enclaveName) : enclaveName,
        borders: computeBordersList(r)
    };
});

// Output JSON file
fs.writeFileSync(path.join(__dirname, 'region-boundaries.json'), JSON.stringify(RESULT, null, 2), 'utf8');

// Output JS file for zero-CORS script tag inclusion
const jsContent = `window.REGION_BOUNDARIES = ${JSON.stringify(RESULT, null, 2)};`;
fs.writeFileSync(path.join(__dirname, 'region-boundaries.js'), jsContent, 'utf8');

console.log('Successfully built region-boundaries.json & region-boundaries.js for', Object.keys(RESULT).length, 'regions.');
