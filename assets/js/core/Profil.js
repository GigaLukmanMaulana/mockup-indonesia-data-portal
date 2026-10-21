/* ============================================================
   Portal Data Kabupaten & Kota — Profil Wilayah Controller (Profil.js)
   Tampilan 9 Tab Lengkap, Kompas & Batas Wilayah Spasial (Leaflet flyToBounds),
   Diagram Kursi DPRD 2024, Piramida Penduduk, & Bar PDRB 17 Sektor.
   ============================================================ */

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof REGION_DATA === 'undefined' || !Array.isArray(REGION_DATA) || REGION_DATA.length === 0) {
        console.error('REGION_DATA is missing or not loaded.');
        return;
    }

    // 1. Get Current Region from URL & Storage
    const urlParams = new URLSearchParams(window.location.search);
    let targetId = urlParams.get('id');
    let targetSlug = urlParams.get('slug');
    const returnView = urlParams.get('view') || urlParams.get('from');

    // Fallback ke hash jika URL memakai hash (#19 atau #id=19 atau #id=19&slug=...)
    if ((!targetId || !targetSlug) && window.location.hash) {
        const hashStr = window.location.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hashStr);
        if (!targetId) {
            targetId = hashParams.get('id') || (!hashStr.includes('=') && !isNaN(hashStr) ? hashStr : null);
        }
        if (!targetSlug) {
            targetSlug = hashParams.get('slug') || (!hashStr.includes('=') && isNaN(hashStr) ? hashStr : null);
        }
    }

    // Fallback ke sessionStorage / localStorage jika query string di-strip oleh server (misal cleanUrls /profil)
    if (!targetId && !targetSlug) {
        try {
            targetId = sessionStorage.getItem('selected_region_id') || localStorage.getItem('selected_region_id');
            targetSlug = sessionStorage.getItem('selected_region_slug') || localStorage.getItem('selected_region_slug');
        } catch (e) {}
    }

    // Dynamic Back Button Adjustment
    const backLink = document.getElementById('backLink');
    const backLinkLabel = document.getElementById('backLinkLabel');
    if (backLink) {
        if (returnView === 'table') {
            backLink.href = 'index.html?view=table';
            if (backLinkLabel) backLinkLabel.textContent = 'Kembali ke Tabel Peringkat';
        } else {
            backLink.href = 'index.html?view=map';
            if (backLinkLabel) backLinkLabel.textContent = 'Kembali ke Peta & Dashboard';
        }
    }

    let r = null;
    if (targetId) {
        r = REGION_DATA.find(x => String(x.id) === String(targetId) || String(x.no) === String(targetId));
    }
    if (!r && targetSlug) {
        r = REGION_DATA.find(x => x.slug === targetSlug);
    }
    if (!r) {
        try {
            const savedName = sessionStorage.getItem('selected_region_name') || localStorage.getItem('selected_region_name');
            if (savedName) {
                r = REGION_DATA.find(x => (x.kabkota || '').toLowerCase() === savedName.toLowerCase());
            }
        } catch (e) {}
    }
    if (!r) {
        r = REGION_DATA[0];
    }

    // Selalu simpan daerah aktif ke storage agar persisten
    try {
        localStorage.setItem('selected_region_id', String(r.id || r.no));
        localStorage.setItem('selected_region_slug', String(r.slug || ''));
        localStorage.setItem('selected_region_name', String(r.kabkota || ''));
        sessionStorage.setItem('selected_region_id', String(r.id || r.no));
        sessionStorage.setItem('selected_region_slug', String(r.slug || ''));
        sessionStorage.setItem('selected_region_name', String(r.kabkota || ''));
    } catch (e) {}

    // Perbarui URL address bar jika query string hilang tanpa mereload halaman
    if (!urlParams.get('id') && window.history && window.history.replaceState) {
        const hashSuffix = `#id=${r.id}&slug=${r.slug}`;
        window.history.replaceState(null, '', `profil.html?id=${r.id}&slug=${r.slug}${hashSuffix}`);
    }

    document.title = `${r.kabkota || 'Wilayah'} — Profil Data & Statistik Resmi`;

    // 2. Populate Header Masthead
    const judulEl = document.getElementById('judul');
    const subjudulEl = document.getElementById('subjudul');
    if (judulEl) judulEl.textContent = r.kabkota || 'Nama Wilayah';
    if (subjudulEl) subjudulEl.textContent = `PROVINSI ${r.prov || 'INDONESIA'} · kode BPS #${r.id || r.no || '1'}`;

    // 3. Setup Region Picker
    setupRegionPicker(r, returnView);

    // 4. Leaflet Map Initialization
    let map = null;
    let mainRegionLayer = null;
    let selectedBoundaryLayer = null;

    function initMap() {
        const mapContainer = document.getElementById('map');
        if (!mapContainer || map) return;

        const lat = r.lat || -6.2;
        const lng = r.lng || 106.8;

        map = L.map('map', {
            center: [lat, lng],
            zoom: 10,
            zoomControl: true,
            scrollWheelZoom: false
        });

        // Use standard OpenStreetMap tile layer (same as Map.js) for clean, watermark-free maps
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
        }).addTo(map);

        if (typeof INDONESIA_KAB_GEOJSON !== 'undefined' && INDONESIA_KAB_GEOJSON.features) {
            const matchedFeatures = INDONESIA_KAB_GEOJSON.features.filter(f => isRegionMatchStrict(f, r));
            if (matchedFeatures.length > 0) {
                mainRegionLayer = L.geoJSON(matchedFeatures, {
                    style: {
                        fillColor: '#0FB5A0',
                        weight: 2.5,
                        opacity: 1,
                        color: '#0E9E9A',
                        fillOpacity: 0.45
                    },
                    onEachFeature: (feature, layer) => {
                        const name = feature.properties.NAME_1 || feature.properties.KABKOTA || r.kabkota;
                        layer.bindTooltip(`Wilayah Utama: ${name}`, { sticky: true });
                        layer.bindPopup(`
                            <div style="font-family:sans-serif;font-size:12px;padding:3px">
                                <div style="font-size:9.5px;font-family:monospace;letter-spacing:.12em;text-transform:uppercase;color:#0FB5A0;font-weight:700;margin-bottom:3px">
                                    [ WILAYAH UTAMA ]
                                </div>
                                <b style="font-size:14px;color:#12212E">${name}</b>
                                <br><span style="font-size:11px;color:#5A7086">Provinsi ${r.prov || 'Indonesia'}</span>
                            </div>
                        `);
                    }
                }).addTo(map);

                map.fitBounds(mainRegionLayer.getBounds(), { padding: [30, 30] });
            }
        }
    }

    // Helper: Strict Kota vs Kabupaten & Province matching to prevent cross-matching
    function isRegionMatchStrict(feature, regionObj) {
        if (!feature || !feature.properties || !regionObj) return false;
        const props = feature.properties;
        const name1 = props.NAME_1 || props.KABKOTA || '';
        const country = props.COUNTRY || props.NAME_2 || '';
        const type2 = (props.VARNAME_2 || '').toUpperCase();

        const cleanStr = s => (s || '').toString().toUpperCase()
            .replace(/^(KABUPATEN|KOTA|KAB\.|KOTA\.)\s+/, '')
            .replace(/[^A-Z0-9]/g, '')
            .trim();

        const normProv = s => {
            let clean = cleanStr(s);
            if (clean.includes('JAKARTA')) return 'JAKARTA';
            if (clean.includes('YOGYAKARTA')) return 'YOGYAKARTA';
            if (clean.includes('BANGKABELITUNG')) return 'BANGKABELITUNG';
            if (clean.includes('PAPUABARAT') || clean.includes('IRIANJAYABARAT')) return 'PAPUABARAT';
            return clean;
        };

        const cleanR = cleanStr(regionObj.kabkota);
        const cleanF = cleanStr(name1);
        const cleanRProv = normProv(regionObj.prov);
        const cleanC = normProv(country);

        if (!cleanF || cleanF === 'NA') return false;

        const rIsKota = (regionObj.kabkota || '').toUpperCase().startsWith('KOTA ');
        const fIsKota = type2 === 'KOTA' || name1.toUpperCase().startsWith('KOTA ');

        const nameMatches = (cleanR === cleanF);
        const provMatches = !cleanC || !cleanRProv || cleanC === cleanRProv || cleanC.includes(cleanRProv) || cleanRProv.includes(cleanC);

        if (nameMatches && provMatches && (rIsKota === fIsKota)) return true;
        // Fallback: If province name differs in GeoJSON (e.g. DKI JAKARTA vs Jakarta Raya), match by name + Kota/Kab type
        return nameMatches && (rIsKota === fIsKota);
    }

    // Helper: Smoothly fly & fit bounds to boundary region on Leaflet map
    function showBoundaryOnMap(directionKey, targetText, boundaryFeature) {
        if (!targetText) return;

        if (!map) {
            initMap();
        }

        if (!map || typeof INDONESIA_KAB_GEOJSON === 'undefined') return;

        if (directionKey === 'reset') {
            if (selectedBoundaryLayer) {
                map.removeLayer(selectedBoundaryLayer);
                selectedBoundaryLayer = null;
            }
            if (mainRegionLayer && mainRegionLayer.getBounds && mainRegionLayer.getBounds().isValid()) {
                if (typeof map.flyToBounds === 'function') {
                    map.flyToBounds(mainRegionLayer.getBounds(), { padding: [30, 30], duration: 0.8 });
                } else {
                    map.fitBounds(mainRegionLayer.getBounds(), { padding: [30, 30] });
                }
            }
            showMapMessage(`Tampilan peta kembali ke wilayah utama ${r.kabkota}.`);
            return;
        }

        let matchedFeatures = [];

        if (boundaryFeature) {
            matchedFeatures = Array.isArray(boundaryFeature) ? boundaryFeature : [boundaryFeature];
        } else {
            const foundFeat = findGeoJSONFeatureByName(targetText, r.prov);
            matchedFeatures = foundFeat ? [foundFeat] : [];
        }

        // Clear previous boundary highlight layer if any
        if (selectedBoundaryLayer) {
            map.removeLayer(selectedBoundaryLayer);
            selectedBoundaryLayer = null;
        }

        if (matchedFeatures.length > 0) {
            selectedBoundaryLayer = L.geoJSON(matchedFeatures, {
                style: {
                    fillColor: '#D9962B',
                    weight: 3.5,
                    opacity: 1,
                    color: '#B4781C',
                    fillOpacity: 0.65
                },
                onEachFeature: (feature, layer) => {
                    const name = feature.properties.NAME_1 || feature.properties.KABKOTA || targetText;
                    layer.bindTooltip(`Wilayah Berbatasan: ${name}`, { sticky: true });
                    layer.bindPopup(`
                        <div style="font-family:sans-serif;font-size:12px;padding:3px">
                            <div style="font-size:9.5px;font-family:monospace;letter-spacing:.12em;text-transform:uppercase;color:#D9962B;font-weight:700;margin-bottom:3px">
                                [ WILAYAH BERBATASAN ]
                            </div>
                            <b style="font-size:14px;color:#12212E">${name}</b>
                        </div>
                    `);
                }
            }).addTo(map);
            if (typeof selectedBoundaryLayer.bringToFront === 'function') {
                selectedBoundaryLayer.bringToFront();
            }

            try {
                let combinedBounds = selectedBoundaryLayer.getBounds();
                if (mainRegionLayer && mainRegionLayer.getBounds && mainRegionLayer.getBounds().isValid()) {
                    combinedBounds = combinedBounds.extend(mainRegionLayer.getBounds());
                }
                if (combinedBounds && combinedBounds.isValid()) {
                    if (typeof map.flyToBounds === 'function') {
                        map.flyToBounds(combinedBounds, { padding: [35, 35], duration: 0.8 });
                    } else {
                        map.fitBounds(combinedBounds, { padding: [35, 35], animate: true });
                    }
                }
            } catch (err) {
                console.warn('fitBounds error:', err);
            }
            showMapMessage(`${targetText} ditampilkan pada peta.`);
        } else {
            showMapMessage(`Wilayah Berbatasan: ${targetText}`);
        }
    }

    // 5. Setup 9-Tab Switching Logic
    const TABS = [
        { btn: 'tab-btn-investasi', pane: 'tab-investasi', eyebrow: 'Deck Investasi · Dossier Daerah' },
        { btn: 'tab-btn-wilayah', pane: 'tab-wilayah', eyebrow: 'Profil Wilayah · Dossier Daerah' },
        { btn: 'tab-btn-pemerintahan', pane: 'tab-pemerintahan', eyebrow: 'Profil Pemerintahan · Dossier Daerah' },
        { btn: 'tab-btn-penduduk', pane: 'tab-penduduk', eyebrow: 'Penduduk & SDM · Dossier Daerah' },
        { btn: 'tab-btn-ekonomi', pane: 'tab-ekonomi', eyebrow: 'Ekonomi · Dossier Daerah' },
        { btn: 'tab-btn-konsumsi', pane: 'tab-konsumsi', eyebrow: 'Konsumsi · Dossier Daerah' },
        { btn: 'tab-btn-pertanian', pane: 'tab-pertanian', eyebrow: 'Data Pertanian · Dossier Daerah' },
        { btn: 'tab-btn-sosial', pane: 'tab-sosial', eyebrow: 'Sosial · Dossier Daerah' },
        { btn: 'tab-btn-podes', pane: 'tab-podes', eyebrow: 'Data PODES · Dossier Daerah' }
    ];

    function switchTab(idx) {
        TABS.forEach((t, i) => {
            const on = i === idx;
            const btnEl = document.getElementById(t.btn);
            const paneEl = document.getElementById(t.pane);
            if (btnEl) {
                btnEl.setAttribute('aria-selected', on ? 'true' : 'false');
                if (on && typeof btnEl.scrollIntoView === 'function') {
                    btnEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                }
            }
            if (paneEl) paneEl.hidden = !on;
            if (on) {
                const eb = document.getElementById('eyebrow');
                if (eb) eb.textContent = t.eyebrow;
            }
        });

        if (idx === 1) {
            setTimeout(() => {
                initMap();
                if (map) map.invalidateSize();
            }, 100);
        }
    }

    TABS.forEach((t, i) => {
        const btn = document.getElementById(t.btn);
        if (btn) btn.addEventListener('click', () => switchTab(i));
    });

    const tabbar = document.getElementById('tabbar');
    if (tabbar) {
        tabbar.addEventListener('keydown', e => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            const cur = TABS.findIndex(t => {
                const b = document.getElementById(t.btn);
                return b && b.getAttribute('aria-selected') === 'true';
            });
            const next = (cur + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
            switchTab(next);
            const nextBtn = document.getElementById(TABS[next].btn);
            if (nextBtn) nextBtn.focus();
        });
    }

    // 6. Render All Tab Renderers
    renderInvestasi(r);
    renderWilayah(r, showBoundaryOnMap);
    renderPemerintahan(r);
    renderPenduduk(r);
    renderEkonomi(r);
    renderKonsumsi(r);
    renderPertanian(r);
    renderSosial(r);
    renderPodes();

    // Default to Wilayah Tab (index 1)
    switchTab(1);

    // Copy JSON action
    const btnCopyJson = document.getElementById('btnCopyJson');
    if (btnCopyJson) {
        btnCopyJson.addEventListener('click', () => {
            navigator.clipboard.writeText(JSON.stringify(r, null, 2));
            toast('JSON data daerah tersalin ke clipboard!');
        });
    }

    const btnPrint = document.getElementById('btnPrint');
    if (btnPrint) {
        btnPrint.addEventListener('click', () => window.print());
    }
});

/* ============================================================
   UTIL & TOAST HELPERS
   ============================================================ */
const fmt = n => Number(n || 0).toLocaleString('id-ID');
const fmt1 = n => Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.dataset.on = '1';
    clearTimeout(t._x);
    t._x = setTimeout(() => t.dataset.on = '0', 2200);
}

function showMapMessage(msg) {
    const el = document.getElementById('mapMessage');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(window.mapMsgTimer);
    window.mapMsgTimer = setTimeout(() => { el.style.display = 'none'; }, 3000);
}

/* Helper: Find feature bounding box and center */
function getFeatureBounds(f) {
    if (!f || !f.geometry || !f.geometry.coordinates) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    function processCoords(coords) {
        if (!coords) return;
        if (typeof coords[0] === 'number') {
            if (coords[0] < minX) minX = coords[0];
            if (coords[0] > maxX) maxX = coords[0];
            if (coords[1] < minY) minY = coords[1];
            if (coords[1] > maxY) maxY = coords[1];
        } else {
            coords.forEach(processCoords);
        }
    }
    processCoords(f.geometry.coordinates);
    if (minX === Infinity) return null;
    return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/* Helper: Find GeoJSON feature by region name string with strict Kota/Kabupaten & Province matching */
function findGeoJSONFeatureByName(rawName, provName) {
    if (!rawName || typeof INDONESIA_KAB_GEOJSON === 'undefined' || !INDONESIA_KAB_GEOJSON.features) return null;
    const cleanStr = s => (s || '').toString().toUpperCase()
        .replace(/^(KABUPATEN|KOTA|KAB\.|KOTA\.)\s+/, '')
        .replace(/[^A-Z0-9]/g, '')
        .trim();

    const normProv = s => {
        let clean = cleanStr(s);
        if (clean.includes('JAKARTA')) return 'JAKARTA';
        if (clean.includes('YOGYAKARTA')) return 'YOGYAKARTA';
        if (clean.includes('BANGKABELITUNG')) return 'BANGKABELITUNG';
        if (clean.includes('PAPUABARAT') || clean.includes('IRIANJAYABARAT')) return 'PAPUABARAT';
        return clean;
    };

    const targetClean = cleanStr(rawName);
    if (!targetClean) return null;

    const provClean = normProv(provName);
    const isKotaTarget = rawName.toUpperCase().includes('KOTA');

    const features = INDONESIA_KAB_GEOJSON.features;
    let match = features.find(f => {
        if (!f || !f.properties) return false;
        const name1 = f.properties.NAME_1 || f.properties.KABKOTA || '';
        const country = f.properties.COUNTRY || f.properties.NAME_2 || '';
        const type2 = (f.properties.VARNAME_2 || '').toUpperCase();
        const fIsKota = type2 === 'KOTA' || name1.toUpperCase().startsWith('KOTA ');
        const cleanF = cleanStr(name1);
        const cClean = normProv(country);

        const nameMatches = (cleanF === targetClean);
        const provMatches = !cClean || !provClean || cClean === provClean || cClean.includes(provClean) || provClean.includes(cClean);

        return nameMatches && provMatches && (isKotaTarget === fIsKota);
    });

    if (!match) {
        match = features.find(f => {
            if (!f || !f.properties) return false;
            const name1 = f.properties.NAME_1 || f.properties.KABKOTA || '';
            const type2 = (f.properties.VARNAME_2 || '').toUpperCase();
            const fIsKota = type2 === 'KOTA' || name1.toUpperCase().startsWith('KOTA ');
            const cleanF = cleanStr(name1);
            return (cleanF === targetClean) && (isKotaTarget === fIsKota);
        });
    }

    return match || null;
}

/* Helper: Get spatial neighbors from GeoJSON using 4-quadrant polar angle classification */
function getSpatialNeighbors(r) {
    if (typeof INDONESIA_KAB_GEOJSON === 'undefined' || !INDONESIA_KAB_GEOJSON.features) return null;
    const features = INDONESIA_KAB_GEOJSON.features;

    const curFeature = findGeoJSONFeatureByName(r.kabkota, r.prov);
    if (!curFeature) return null;

    const b0 = getFeatureBounds(curFeature);
    if (!b0) return null;

    const list = features.map(f => {
        if (f === curFeature) return null;
        const b = getFeatureBounds(f);
        if (!b) return null;
        const dy = b.cy - b0.cy; // positive = north
        const dx = b.cx - b0.cx; // positive = east
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1.8) return null;

        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        const name = f.properties.NAME_1 || f.properties.KABKOTA || '';
        const type2 = f.properties.VARNAME_2 || '';
        const displayName = type2 === 'Kota' && !name.startsWith('Kota') ? 'Kota ' + name : name;
        return { name: displayName, dx, dy, dist, angle, feature: f };
    }).filter(Boolean);

    function getBestForDir(targetAngle, minAngle, maxAngle) {
        const candidates = list.filter(item => {
            if (targetAngle === 180 || targetAngle === -180) {
                return item.angle >= 120 || item.angle <= -120;
            }
            return item.angle >= minAngle && item.angle <= maxAngle;
        });
        if (candidates.length === 0) return null;
        return candidates.map(item => {
            let diff = Math.abs(item.angle - targetAngle);
            if (diff > 180) diff = 360 - diff;
            return { ...item, angularDiff: diff, score: item.dist + (diff / 90) * 0.18 };
        }).sort((a, b) => a.score - b.score);
    }

    const north = getBestForDir(90, 30, 150) || [];
    const east = getBestForDir(0, -60, 60) || [];
    const south = getBestForDir(-90, -150, -30) || [];
    const west = getBestForDir(180, 120, -120) || [];

    const fmtN = (items, fallback) => {
        if (!items || items.length === 0) return fallback;
        return items[0].name;
    };
    const getFeat = items => (items && items.length > 0 ? [items[0].feature] : []);

    return {
        utara: north.length > 0 ? { name: fmtN(north, ''), feature: getFeat(north) } : null,
        selatan: south.length > 0 ? { name: fmtN(south, ''), feature: getFeat(south) } : null,
        timur: east.length > 0 ? { name: fmtN(east, ''), feature: getFeat(east) } : null,
        barat: west.length > 0 ? { name: fmtN(west, ''), feature: getFeat(west) } : null
    };
}

/* Helper: Resolve administrative boundaries using precomputed REGION_BOUNDARIES dataset */
function getRegionBoundaries(r) {
    const idKey = String(r.id || r.no);
    const precomputed = (typeof window.REGION_BOUNDARIES !== 'undefined') ? window.REGION_BOUNDARIES[idKey] : null;

    let bordersList = [];
    if (precomputed && Array.isArray(precomputed.borders) && precomputed.borders.length > 0) {
        bordersList = precomputed.borders;
    } else {
        const u = (precomputed && precomputed.u) || r.batas_utara;
        const s = (precomputed && precomputed.s) || r.batas_selatan;
        const t = (precomputed && precomputed.t) || r.batas_timur;
        const b = (precomputed && precomputed.b) || r.batas_barat;
        const e = (precomputed && (precomputed.e || precomputed.tengah));

        if (e) bordersList.push({ name: e, type: 'enclave', badge: 'Kota Enklave' });
        if (u) bordersList.push({ name: u, type: u.includes('Kota') ? 'kota' : (u.includes('Laut') || u.includes('Samudra') ? 'water' : 'kabupaten'), badge: u.includes('Kota') ? 'Kota' : (u.includes('Laut') || u.includes('Samudra') ? 'Perairan / Laut' : 'Kabupaten') });
        if (s) bordersList.push({ name: s, type: s.includes('Kota') ? 'kota' : (s.includes('Laut') || s.includes('Samudra') ? 'water' : 'kabupaten'), badge: s.includes('Kota') ? 'Kota' : (s.includes('Laut') || s.includes('Samudra') ? 'Perairan / Laut' : 'Kabupaten') });
        if (t) bordersList.push({ name: t, type: t.includes('Kota') ? 'kota' : (t.includes('Laut') || t.includes('Samudra') ? 'water' : 'kabupaten'), badge: t.includes('Kota') ? 'Kota' : (t.includes('Laut') || t.includes('Samudra') ? 'Perairan / Laut' : 'Kabupaten') });
        if (b) bordersList.push({ name: b, type: b.includes('Kota') ? 'kota' : (b.includes('Laut') || b.includes('Samudra') ? 'water' : 'kabupaten'), badge: b.includes('Kota') ? 'Kota' : (b.includes('Laut') || b.includes('Samudra') ? 'Perairan / Laut' : 'Kabupaten') });
    }

    const seaTerms = ['LAUT', 'SELAT', 'SAMUDRA', 'SAMUDERA', 'TELUK', 'PERAIRAN', 'OCEAN'];
    return bordersList.map(item => {
        const isWater = seaTerms.some(term => item.name.toUpperCase().includes(term));
        if (isWater) {
            return { ...item, feature: null };
        }
        const parts = item.name.split(/&|,|\sdan\s/i).map(st => st.trim()).filter(Boolean);
        const feats = parts.map(p => findGeoJSONFeatureByName(p, r.prov)).filter(Boolean);
        return {
            ...item,
            feature: feats.length > 0 ? feats : null
        };
    });
}

/* ============================================================
   TAB 1: DECK INVESTASI
   ============================================================ */
function renderInvestasi(r) {
    const pdrbPerKapita = r.pdrb_perkapita || 40;
    const lpe = r.pertumbuhan_ekonomi || 5.0;
    const ipm = r.ipm_total || 75;
    const miskin = r.persentase_miskin || 8.0;

    const p1 = Math.min(100, Math.max(40, ipm * 0.9));
    const p2 = Math.min(100, Math.max(40, (r.kepadatan || 500) > 1000 ? 88 : 72));
    const p3 = Math.min(100, Math.max(40, lpe * 14));
    const p4 = Math.min(100, Math.max(40, ipm));
    const p5 = Math.min(100, Math.max(40, 100 - miskin * 3));
    const p6 = Math.min(100, Math.max(40, 85 - (r.gini || 300) / 10));

    const totalScore = (p1 + p2 + p3 + p4 + p5 + p6) / 6;

    const hero = document.getElementById('invHero');
    if (hero) {
        hero.innerHTML = `
            <div class="inv-gauge">
                <svg width="140" height="140" viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r="58" fill="none" stroke="#ffffff33" stroke-width="10"/>
                    <circle cx="70" cy="70" r="58" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round"
                        stroke-dasharray="364" stroke-dashoffset="${364 * (1 - totalScore / 100)}" transform="rotate(-90 70 70)"/>
                </svg>
                <div class="ig-score">
                    <div class="ig-num">${fmt1(totalScore)}</div>
                    <div class="ig-grade">Grade ${totalScore >= 75 ? 'AA' : 'A'}</div>
                </div>
            </div>
            <div>
                <div style="font-family:var(--mono);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#d6fff8;margin-bottom:6px">Indeks Daya Tarik Investasi Daerah · IDTID</div>
                <h2 style="font-size:23px;font-weight:700;margin:0;line-height:1.15">${r.kabkota} — ${totalScore >= 75 ? 'Siap Investasi' : 'Layak & Potensial'}</h2>
                <p style="font-size:13px;color:#eafffb;margin-top:8px;line-height:1.5;max-width:62ch">Sintesis enam pilar dari data wilayah, pemerintahan, SDM, dan ekonomi. Skor agregat dihitung secara transparan berbasis data BPS resmi.</p>
            </div>
        `;
    }

    const idxChip = document.getElementById('invIdxChip');
    if (idxChip) idxChip.textContent = `IDTID ${fmt1(totalScore)} · Grade ${totalScore >= 75 ? 'AA' : 'A'}`;

    const pillars = document.getElementById('invPillars');
    if (pillars) {
        const items = [
            { k: 'P1', n: 'Perizinan & Tata Kelola', v: p1, c: '#0FB5A0', desc: 'PTSP digital & kepastian izin' },
            { k: 'P2', n: 'Infrastruktur & Spasial', v: p2, c: '#2E9BD6', desc: 'Akses transportasi & jaringan' },
            { k: 'P3', n: 'Pasar & Ekonomi', v: p3, c: '#D9962B', desc: `PDRB ${fmt1(pdrbPerKapita)} jt & LPE ${fmt1(lpe)}%` },
            { k: 'P4', n: 'SDM & Tenaga Kerja', v: p4, c: '#5B6EE0', desc: `IPM ${fmt1(ipm)} (kategori tinggi)` },
            { k: 'P5', n: 'Struktur Biaya', v: p5, c: '#E8A93C', desc: 'Biaya operasional & efisiensi' },
            { k: 'P6', n: 'Risiko & Stabilitas', v: p6, c: '#2FA65E', desc: `Kemiskinan ${fmt1(miskin)}%` }
        ];
        pillars.innerHTML = items.map(p => `
            <div class="inv-pill">
                <div style="font-size:12px;font-weight:600;color:var(--text);line-height:1.3">${p.n}</div>
                <div class="ip-score" style="color:${p.c}">${fmt1(p.v)}</div>
                <div style="height:5px;background:var(--track);border-radius:3px;overflow:hidden;margin-top:8px">
                    <div style="height:100%;width:${p.v}%;background:${p.c};border-radius:3px"></div>
                </div>
                <div style="font-size:10px;color:var(--muted-2);margin-top:8px">${p.desc}</div>
            </div>
        `).join('');
    }

    const metrics = document.getElementById('invMetrics');
    if (metrics) {
        metrics.innerHTML = `
            <div style="border:1px solid var(--line);border-radius:6px;padding:10px;background:var(--panel-2)">
                <div style="font-family:var(--mono);font-size:20px;font-weight:600;color:#0FB5A0">${fmt(r.penduduk)}</div>
                <div style="font-size:11px;color:var(--muted)">Ukuran Pasar (Penduduk)</div>
            </div>
            <div style="border:1px solid var(--line);border-radius:6px;padding:10px;background:var(--panel-2)">
                <div style="font-family:var(--mono);font-size:20px;font-weight:600;color:#2E9BD6">${fmt1(lpe)}%</div>
                <div style="font-size:11px;color:var(--muted)">Laju Pertumbuhan Ekonomi</div>
            </div>
        `;
    }

    const sectors = document.getElementById('invSectors');
    if (sectors) {
        sectors.innerHTML = `
            <div style="border:1px solid var(--line);border-radius:6px;padding:10px;background:var(--panel-2);margin-bottom:8px">
                <div style="font-size:13px;font-weight:650;color:var(--text)">Perdagangan &amp; Ritel Modern</div>
                <div style="font-size:11px;color:var(--muted)">Dukungan basis konsumen ${fmt(r.penduduk)} jiwa.</div>
            </div>
            <div style="border:1px solid var(--line);border-radius:6px;padding:10px;background:var(--panel-2)">
                <div style="font-size:13px;font-weight:650;color:var(--text)">Konstruksi &amp; Properti</div>
                <div style="font-size:11px;color:var(--muted)">Kepadatan ${fmt(Math.round(r.kepadatan || 0))} jiwa/km².</div>
            </div>
        `;
    }

    const thesis = document.getElementById('invThesis');
    if (thesis) {
        thesis.innerHTML = `
            <div>
                <h4 style="font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#0FB5A0;margin:0 0 8px">Faktor Pendukung Utama</h4>
                <div style="font-size:12px;line-height:1.5;color:var(--text)">• Pasar konsumen sebesar ${fmt(r.penduduk)} jiwa dengan persentase kemiskinan ${fmt1(miskin)}%.</div>
                <div style="font-size:12px;line-height:1.5;color:var(--text);margin-top:6px">• Kualitas SDM dengan IPM ${fmt1(ipm)} (kategori tinggi).</div>
            </div>
            <div>
                <h4 style="font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#E8A93C;margin:0 0 8px">Pertimbangan &amp; Risiko</h4>
                <div style="font-size:12px;line-height:1.5;color:var(--text)">• Kepadatan wilayah ${fmt(Math.round(r.kepadatan || 0))} jiwa/km² membutuhkan ketersediaan lahan matang.</div>
            </div>
        `;
    }
}

/* ============================================================
   TAB 2: PROFIL WILAYAH & BATAS
   ============================================================ */
function renderWilayah(r, showBoundaryOnMapFn) {
    const pimpinan = document.getElementById('pimpinan');
    if (pimpinan) {
        pimpinan.innerHTML = `
            <div class="lead">
                <div class="avatar" style="background:#0FB5A01A;color:#0FB5A0;border:1px solid #0FB5A055">${(r.kepala || 'B').slice(0, 2).toUpperCase()}</div>
                <div>
                    <div class="lead-role">Bupati / Walikota</div>
                    <div class="lead-name">${r.kepala || 'Belum terdata'}</div>
                    <div class="lead-meta">Kepala Daerah Otonom</div>
                </div>
            </div>
            <div class="lead">
                <div class="avatar" style="background:#5B6EE01A;color:#5B6EE0;border:1px solid #5B6EE055">${(r.wakil || 'W').slice(0, 2).toUpperCase()}</div>
                <div>
                    <div class="lead-role">Wakil Bupati / Walikota</div>
                    <div class="lead-name">${r.wakil || 'Belum terdata'}</div>
                    <div class="lead-meta">Wakil Kepala Daerah</div>
                </div>
            </div>
        `;
    }

    const kpis = document.getElementById('kpis');
    if (kpis) {
        kpis.innerHTML = `
            <div class="kpi">
                <div class="k-label">Jumlah penduduk</div>
                <div class="k-val">${fmt(r.penduduk)} <span class="k-unit">jiwa</span></div>
                <div class="k-note">hasil pendataan resmi</div>
            </div>
            <div class="kpi">
                <div class="k-label">Jumlah keluarga</div>
                <div class="k-val">${fmt(r.keluarga)} <span class="k-unit">KK</span></div>
                <div class="k-note">rata-rata ${fmt1(r.penduduk_per_keluarga || (r.penduduk / Math.max(1, r.keluarga)))} jiwa/KK</div>
            </div>
            <div class="kpi">
                <div class="k-label">Kepadatan penduduk</div>
                <div class="k-val">${fmt(Math.round(r.kepadatan || 0))} <span class="k-unit">jiwa/km²</span></div>
                <div class="k-note">dihitung per km²</div>
            </div>
            <div class="kpi">
                <div class="k-label">Luas wilayah</div>
                <div class="k-val">${fmt1(r.luas)} <span class="k-unit">km²</span></div>
                <div class="k-note">${fmt(Math.round(r.luas * 100))} hektare</div>
            </div>
        `;
    }

    // Topografi
    const dataran = r.dataran || 0;
    const lembah = r.lembah || 0;
    const lereng = r.lereng || 0;
    const puncak = r.puncak || 0;
    const totalTopo = Math.max(1, dataran + lembah + lereng + puncak);

    const topoBar = document.getElementById('topoBar');
    if (topoBar) {
        topoBar.innerHTML = `
            <div class="topo-seg" style="width:${(dataran / totalTopo) * 100}%;background:#0FB5A0" title="Dataran"></div>
            <div class="topo-seg" style="width:${(lembah / totalTopo) * 100}%;background:#2E9BD6" title="Lembah"></div>
            <div class="topo-seg" style="width:${(lereng / totalTopo) * 100}%;background:#D9962B" title="Lereng"></div>
            <div class="topo-seg" style="width:${(puncak / totalTopo) * 100}%;background:#E8604C" title="Puncak"></div>
        `;
    }

    const topoList = document.getElementById('topoList');
    if (topoList) {
        topoList.innerHTML = `
            <div class="topo-item"><span class="swatch" style="background:#0FB5A0"></span><span class="topo-name">Dataran</span><span class="topo-val">${dataran} Desa</span></div>
            <div class="topo-item"><span class="swatch" style="background:#2E9BD6"></span><span class="topo-name">Lembah</span><span class="topo-val">${lembah} Desa</span></div>
            <div class="topo-item"><span class="swatch" style="background:#D9962B"></span><span class="topo-name">Lereng</span><span class="topo-val">${lereng} Desa</span></div>
            <div class="topo-item"><span class="swatch" style="background:#E8604C"></span><span class="topo-name">Puncak</span><span class="topo-val">${puncak} Desa</span></div>
        `;
    }

    const topoTotal = document.getElementById('topoTotal');
    if (topoTotal) topoTotal.textContent = `total ${r.total_desa || r.desa_kel || totalTopo} desa`;

    // Interactive Border List Handling
    setupBorderList(r, showBoundaryOnMapFn);

    // Elevasi & Curah Hujan
    renderElevChart(r);
    renderRainChart(r);
}

function setupBorderList(r, showBoundaryOnMapFn) {
    const borders = getRegionBoundaries(r);

    const borderListWrap = document.getElementById('borderListWrap');
    const btnResetMap = document.getElementById('btnResetMap');
    let activeItemName = null;

    function renderList() {
        if (!borderListWrap) return;
        if (borders.length === 0) {
            borderListWrap.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:10px;text-align:center">Data wilayah berbatasan tidak tersedia.</div>`;
            return;
        }

        borderListWrap.innerHTML = borders.map(item => {
            const isActive = activeItemName === item.name;
            const badgeClass = item.type || 'kabupaten';
            return `
                <div class="border-chip ${isActive ? 'active' : ''}" data-name="${item.name}">
                    <span class="bc-name">${item.name}</span>
                    <span class="bc-badge ${badgeClass}">${item.badge || 'Wilayah'}</span>
                </div>
            `;
        }).join('');

        borderListWrap.querySelectorAll('.border-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const targetName = chip.dataset.name;
                const foundItem = borders.find(b => b.name === targetName);
                if (!foundItem) return;

                if (activeItemName === targetName) {
                    activeItemName = null;
                    renderList();
                    showBoundaryOnMapFn('reset', r.kabkota, null);
                } else {
                    activeItemName = targetName;
                    renderList();
                    showBoundaryOnMapFn(foundItem.type || 'batas', foundItem.name, foundItem.feature);
                }
            });
        });
    }

    if (btnResetMap) {
        btnResetMap.onclick = () => {
            activeItemName = null;
            renderList();
            showBoundaryOnMapFn('reset', r.kabkota, null);
        };
    }

    renderList();
}

function renderElevChart(r) {
    const min = 50, max = 150, rata = 95;
    const svg = document.getElementById('elev');
    if (!svg) return;
    const W = 520, H = 176, P = { l: 44, r: 16, t: 14, b: 26 };
    const y = v => H - P.b - (v / 200) * (H - P.t - P.b);
    let s = `<rect x="${P.l}" y="${y(max)}" width="${W - P.l - P.r}" height="${y(min) - y(max)}" fill="#0FB5A014" stroke="#0FB5A066"/>`;
    s += `<line x1="${P.l}" y1="${y(rata)}" x2="${W - P.r}" y2="${y(rata)}" stroke="#D9962B" stroke-width="2"/>`;
    s += `<text class="axis-n" x="${P.l + 10}" y="${y(rata) - 6}" fill="#D9962B">rata-rata ${rata} mdpl</text>`;
    svg.innerHTML = s;

    const note = document.getElementById('elevNote');
    if (note) note.innerHTML = `<span>ketinggian ${min}–${max} mdpl</span><span>dataran rendah</span>`;
}

function renderRainChart(r) {
    const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const d = [320, 290, 260, 220, 180, 120, 90, 80, 110, 210, 280, 340];
    const svg = document.getElementById('rain');
    if (!svg) return;
    const W = 520, H = 176, P = { l: 40, r: 14, t: 16, b: 28 };
    const bw = (W - P.l - P.r) / 12;
    const y = v => H - P.b - (v / 400) * (H - P.t - P.b);
    let s = '';
    d.forEach((v, i) => {
        const x = P.l + i * bw + bw * 0.18, w = bw * 0.64;
        s += `<rect class="bar-hover" x="${x}" y="${y(v)}" width="${w}" height="${H - P.b - y(v)}" rx="2" fill="#2E9BD6"><title>${BULAN[i]}: ${v} mm</title></rect>`;
        s += `<text class="m-lbl" x="${x + w / 2}" y="${H - P.b + 14}" text-anchor="middle">${BULAN[i]}</text>`;
    });
    svg.innerHTML = s;

    const note = document.getElementById('rainNote');
    if (note) note.innerHTML = `<span>total 2.220 mm/tahun</span><span>iklim tropis</span>`;
}

/* ============================================================
   TAB 3: PROFIL PEMERINTAHAN
   ============================================================ */
function renderPemerintahan(r) {
    const adminStrip = document.getElementById('adminStrip');
    if (adminStrip) {
        adminStrip.innerHTML = `
            <div class="admin-cell">
                <div class="a-ghost">K</div>
                <div class="a-num">${fmt(r.kecamatan)}</div>
                <div class="a-lbl">Kecamatan</div>
                <div class="a-sub">wilayah administratif</div>
            </div>
            <div class="admin-cell">
                <div class="a-ghost">L</div>
                <div class="a-num">${fmt(r.desa_kel || r.total_desa)}</div>
                <div class="a-lbl">Desa / Kelurahan</div>
                <div class="a-sub">pemerintahan terdepan</div>
            </div>
            <div class="admin-cell">
                <div class="a-ghost">RW</div>
                <div class="a-num">${r.rw ? fmt(r.rw) : '—'}</div>
                <div class="a-lbl">RW &amp; Setingkat</div>
                <div class="a-sub">rukun warga</div>
            </div>
            <div class="admin-cell">
                <div class="a-ghost">RT</div>
                <div class="a-num">${r.rt ? fmt(r.rt) : '—'}</div>
                <div class="a-lbl">RT &amp; Setingkat</div>
                <div class="a-sub">rukun tetangga</div>
            </div>
        `;
    }

    // 2024 DPRD Parliament Semicircle
    const P = [
        { nama: 'Golkar', kursi: r.p_golkar || 0, c: '#F5C542' },
        { nama: 'PKB', kursi: r.p_pkb || 0, c: '#2FA65E' },
        { nama: 'NasDem', kursi: r.p_nasdem || 0, c: '#2FA8C0' },
        { nama: 'Gerindra', kursi: r.p_gerindra || 0, c: '#D2452F' },
        { nama: 'PKS', kursi: r.p_pks || 0, c: '#F09E2E' },
        { nama: 'PDIP', kursi: r.p_pdip || 0, c: '#D24866' },
        { nama: 'Demokrat', kursi: r.p_demokrat || 0, c: '#3E82CC' },
        { nama: 'PPP & PAN', kursi: r.p_ppp_pan || 0, c: '#4FB0E0' },
        { nama: 'Hanura', kursi: r.p_hanura || 0, c: '#5B6EE0' },
        { nama: 'PBB', kursi: r.p_pbb || 0, c: '#8398AC' }
    ].filter(p => p.kursi > 0);

    const totalSeats = P.reduce((s, p) => s + p.kursi, 0) || 50;

    const kursiTotal = document.getElementById('kursiTotal');
    if (kursiTotal) kursiTotal.textContent = `${totalSeats} kursi · ${P.length} partai`;

    const parlemenSvg = document.getElementById('parlemen');
    if (parlemenSvg) {
        const seats = [];
        P.forEach((p, pi) => {
            for (let k = 0; k < p.kursi; k++) seats.push({ party: pi, c: p.c });
        });

        const cx = 220, cy = 180, rows = 4, rInner = 74, rStep = 26;
        let s = ''; let idx = 0;
        for (let row = 0; row < rows; row++) {
            const rad = rInner + row * rStep;
            const n = Math.round(seats.length / rows);
            for (let i = 0; i < n && idx < seats.length; i++) {
                const t = n === 1 ? 0.5 : i / (n - 1);
                const ang = Math.PI * (1 - t);
                const x = cx + Math.cos(ang) * rad;
                const y = cy - Math.sin(ang) * rad;
                const seat = seats[idx++];
                s += `<circle class="seat" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.4" fill="${seat.c}" stroke="#FFFFFF" stroke-width="1"/>`;
            }
        }
        s += `<text x="${cx}" y="${cy - 14}" text-anchor="middle" style="font-family:var(--mono);font-size:34px;font-weight:600;fill:#12212E">${totalSeats}</text>`;
        s += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" style="font-family:var(--mono);font-size:10px;letter-spacing:.16em;fill:#5A7086;text-transform:uppercase">KURSI DPRD 2024</text>`;
        parlemenSvg.innerHTML = s;
    }

    const partyList = document.getElementById('partyList');
    if (partyList) {
        partyList.innerHTML = P.map(p => `
            <div class="party-chip">
                <i style="background:${p.c}"></i>${p.nama} <b>${p.kursi}</b>
            </div>
        `).join('');
    }

    // APBD Tree
    const revTree = document.getElementById('revTree');
    if (revTree) {
        const pdrbTotal = r.pdrb_total || 1000000;
        revTree.innerHTML = `
            <div class="tree-row lvl1">
                <div class="t-name"><b>1.</b> Pendapatan Daerah (Estimasi APBD)</div>
                <div class="t-amt">Rp${fmt(Math.round(pdrbTotal / 1000))} M</div>
            </div>
            <div class="tree-row lvl2">
                <div class="t-name"><b>1.1</b> Pendapatan Asli Daerah (PAD)</div>
                <div class="t-amt">Rp${fmt(Math.round((r.sek_g_dagang || pdrbTotal * 0.25) / 1000))} M</div>
            </div>
            <div class="tree-row lvl2">
                <div class="t-name"><b>1.2</b> Dana Transfer Pemerintah Pusat</div>
                <div class="t-amt">Rp${fmt(Math.round(pdrbTotal * 0.65 / 1000))} M</div>
            </div>
        `;
    }
}

/* ============================================================
   TAB 4: PENDUDUK & SDM
   ============================================================ */
function renderPenduduk(r) {
    const ak = r.angkatan_kerja || Math.round(r.penduduk * 0.5);
    const bek = r.bekerja || Math.round(ak * 0.94);
    const nganggur = r.pengangguran || (ak - bek);
    const tpak = (ak / Math.max(1, r.penduduk * 0.65)) * 100;
    const tpt = ak > 0 ? (nganggur / ak) * 100 : 5.5;

    const sdmKpis = document.getElementById('sdmKpis');
    if (sdmKpis) {
        sdmKpis.innerHTML = `
            <div class="kpi">
                <div class="k-label">Total penduduk</div>
                <div class="k-val">${fmt(r.penduduk)} <span class="k-unit">jiwa</span></div>
                <div class="k-note">administrasi BPS</div>
            </div>
            <div class="kpi">
                <div class="k-label">Angkatan kerja</div>
                <div class="k-val">${fmt(ak)} <span class="k-unit">jiwa</span></div>
                <div class="k-note">penduduk produktif</div>
            </div>
            <div class="kpi">
                <div class="k-label">TPAK</div>
                <div class="k-val">${fmt1(tpak)}<span class="k-unit">%</span></div>
                <div class="k-note">tingkat partisipasi angkatan kerja</div>
            </div>
            <div class="kpi">
                <div class="k-label">TPT</div>
                <div class="k-val" style="color:#E8604C">${fmt1(tpt)}<span class="k-unit">%</span></div>
                <div class="k-note">tingkat pengangguran terbuka</div>
            </div>
        `;
    }

    const sexWrap = document.getElementById('sexWrap');
    if (sexWrap) {
        const laki = r.pddk_laki || Math.round(r.penduduk * 0.505);
        const wanita = r.pddk_wanita || (r.penduduk - laki);
        const pl = (laki / r.penduduk) * 100;
        const pw = (wanita / r.penduduk) * 100;

        sexWrap.innerHTML = `
            <div class="sex-split">
                <div class="sex-seg" style="width:${pl}%;background:#2E9BD6"><span>${pl.toFixed(1)}%</span></div>
                <div class="sex-seg" style="width:${pw}%;background:#C4568A;justify-content:flex-end"><span>${pw.toFixed(1)}%</span></div>
            </div>
            <div class="sex-cards">
                <div class="sex-card">
                    <div class="sc-icon" style="color:#2E9BD6">♂ Laki-laki</div>
                    <div class="sc-num">${fmt(laki)}</div>
                    <div class="sc-lbl">jiwa</div>
                </div>
                <div class="sex-card">
                    <div class="sc-icon" style="color:#C4568A">♀ Perempuan</div>
                    <div class="sc-num">${fmt(wanita)}</div>
                    <div class="sc-lbl">jiwa</div>
                </div>
            </div>
        `;
    }

    // Piramida Penduduk SVG
    const pyramidSvg = document.getElementById('pyramid');
    if (pyramidSvg) {
        const U = [
            { g: '0–4', l: r.u04 || 35000 },
            { g: '5–9', l: r.u59 || 38000 },
            { g: '10–14', l: r.u1014 || 37000 },
            { g: '15–19', l: r.u1519 || 34000 },
            { g: '20–24', l: r.u2024 || 35000 },
            { g: '25–29', l: r.u2529 || 36000 },
            { g: '30–34', l: r.u3034 || 35000 },
            { g: '35–39', l: r.u3539 || 33000 },
            { g: '40–44', l: r.u4044 || 30000 },
            { g: '45–49', l: r.u4549 || 26000 },
            { g: '50–54', l: r.u5054 || 22000 },
            { g: '55–59', l: r.u5559 || 18000 },
            { g: '60–64', l: r.u6064 || 14000 },
            { g: '65–69', l: r.u6569 || 10000 },
            { g: '70–74', l: r.u7074 || 7000 },
            { g: '75+', l: r.u75p || 5000 }
        ];

        const W = 460, H = 420, P = { l: 8, r: 8, t: 14, b: 30, mid: 52 };
        const half = (W - P.l - P.r - P.mid) / 2;
        const rowH = (H - P.t - P.b) / U.length;
        const maxV = Math.max(...U.map(u => u.l)) || 1;
        const cxL = P.l + half, cxR = P.l + half + P.mid;
        let s = '';

        U.forEach((u, i) => {
            const y = P.t + i * rowH + 2, h = rowH - 4;
            const wl = (u.l / maxV) * half;
            const wr = (u.l * 0.97 / maxV) * half;
            s += `<rect class="bar-hover" x="${cxL - wl}" y="${y}" width="${wl}" height="${h}" rx="2" fill="#2E9BD6" fill-opacity=".85"><title>Laki-laki ${u.g}: ${fmt(u.l)}</title></rect>`;
            s += `<rect class="bar-hover" x="${cxR}" y="${y}" width="${wr}" height="${h}" rx="2" fill="#C4568A" fill-opacity=".85"><title>Perempuan ${u.g}: ${fmt(u.l * 0.97)}</title></rect>`;
            s += `<text x="${cxL + P.mid / 2}" y="${y + h / 2 + 3.5}" text-anchor="middle" style="font-family:var(--mono);font-size:9.5px;fill:#5A7086">${u.g}</text>`;
        });
        pyramidSvg.innerHTML = s;
    }

    const akTree = document.getElementById('akTree');
    if (akTree) {
        akTree.innerHTML = `
            <div class="tree-row lvl1">
                <div class="t-name"><b>I.</b> Angkatan Kerja</div>
                <div class="t-amt">${fmt(ak)}</div>
            </div>
            <div class="tree-row lvl2">
                <div class="t-name">Bekerja</div>
                <div class="t-amt" style="color:#0FB5A0">${fmt(bek)}</div>
            </div>
            <div class="tree-row lvl2">
                <div class="t-name">Pengangguran Terbuka</div>
                <div class="t-amt" style="color:#E8604C">${fmt(nganggur)}</div>
            </div>
        `;
    }

    const ipmWrap = document.getElementById('ipmWrap');
    if (ipmWrap) {
        const ipm = r.ipm_total || 75.0;
        ipmWrap.innerHTML = `
            <div class="ipm-row">
                <div class="ipm-name">Total IPM</div>
                <div class="ipm-track"><div class="ipm-fill" style="width:${(ipm / 100) * 100}%;background:#0FB5A0"></div></div>
                <div class="ipm-val" style="color:#0FB5A0">${fmt1(ipm)}</div>
            </div>
        `;
    }
}

/* ============================================================
   TAB 5: EKONOMI
   ============================================================ */
function renderEkonomi(r) {
    const ekoKpis = document.getElementById('ekoKpis');
    if (ekoKpis) {
        ekoKpis.innerHTML = `
            <div class="kpi">
                <div class="k-label">PDRB per kapita</div>
                <div class="k-val">${fmt1(r.pdrb_perkapita)} <span class="k-unit">juta/th</span></div>
                <div class="k-note">harga berlaku</div>
            </div>
            <div class="kpi">
                <div class="k-label">Pertumbuhan ekonomi</div>
                <div class="k-val">${fmt1(r.pertumbuhan_ekonomi)}<span class="k-unit">%</span></div>
                <div class="k-note">laju tahunan</div>
            </div>
            <div class="kpi">
                <div class="k-label">Penduduk miskin</div>
                <div class="k-val" style="color:#D9962B">${fmt1(r.persentase_miskin)}<span class="k-unit">%</span></div>
                <div class="k-note">${fmt1(r.penduduk_miskin_ribu)} ribu jiwa</div>
            </div>
            <div class="kpi">
                <div class="k-label">Garis kemiskinan</div>
                <div class="k-val">Rp${fmt(r.garis_kemiskinan)}</div>
                <div class="k-note">per kapita/bulan</div>
            </div>
        `;
    }

    // PDRB Bar Chart (17 Sektor)
    const pdrbBarSvg = document.getElementById('pdrbBar');
    if (pdrbBarSvg) {
        const P = [
            { k: 'A', n: 'Pertanian & Perikanan', v: r.sek_a_pertanian || 0 },
            { k: 'B', n: 'Pertambangan & Penggalian', v: r.sek_b_tambang || 0 },
            { k: 'C', n: 'Industri Pengolahan', v: r.sek_c_industri || 0 },
            { k: 'D', n: 'Pengadaan Listrik & Gas', v: r.sek_d_listrik || 0 },
            { k: 'E', n: 'Pengadaan Air & Sampah', v: r.sek_e_air || 0 },
            { k: 'F', n: 'Konstruksi', v: r.sek_f_konstruksi || 0 },
            { k: 'G', n: 'Perdagangan Besar/Eceran', v: r.sek_g_dagang || 0 },
            { k: 'H', n: 'Transportasi & Pergudangan', v: r.sek_h_transport || 0 },
            { k: 'I', n: 'Akomodasi & Makan Minum', v: r.sek_i_akomodasi || 0 },
            { k: 'J', n: 'Informasi & Komunikasi', v: r.sek_j_infokom || 0 },
            { k: 'K', n: 'Jasa Keuangan & Asuransi', v: r.sek_k_keuangan || 0 },
            { k: 'L', n: 'Real Estate', v: r.sek_l_realestate || 0 },
            { k: 'M,N', n: 'Jasa Perusahaan', v: r.sek_mn_jasaperusahaan || 0 },
            { k: 'O', n: 'Administrasi Pemerintahan', v: r.sek_o_admpem || 0 },
            { k: 'P', n: 'Jasa Pendidikan', v: r.sek_p_pendidikan || 0 },
            { k: 'Q', n: 'Jasa Kesehatan', v: r.sek_q_kesehatan || 0 },
            { k: 'R,S,T,U', n: 'Jasa Lainnya', v: r.sek_rstu_jasalain || 0 }
        ].sort((a, b) => b.v - a.v);

        const totalPdrb = r.pdrb_total || 1000000;
        const pdrbTotalEl = document.getElementById('pdrbTotal');
        if (pdrbTotalEl) pdrbTotalEl.textContent = `total Rp${fmt(Math.round(totalPdrb / 1000))} M`;

        const W = 480, rowH = 30, top = 8, labelW = 210, barMax = W - labelW - 56;
        const H = top + P.length * rowH + 6;
        const maxV = Math.max(...P.map(p => p.v)) || 1;
        let s = '';

        P.forEach((p, i) => {
            const y = top + i * rowH;
            const w = (p.v / maxV) * barMax;
            const pct = (p.v / totalPdrb) * 100;
            s += `<text class="pd-cat" x="0" y="${y + rowH / 2 + 3}">${p.k}</text>`;
            s += `<text class="pd-lbl" x="26" y="${y + rowH / 2 + 3}">${p.n.length > 30 ? p.n.slice(0, 29) + '…' : p.n}</text>`;
            s += `<rect class="pd-bar" x="${labelW}" y="${y + 5}" width="${Math.max(2, w)}" height="${rowH - 12}" rx="2" fill="#0FB5A0"/>`;
            s += `<text class="pd-val" x="${labelW + w + 6}" y="${y + rowH / 2 + 3}">${fmt1(pct)}%</text>`;
        });
        pdrbBarSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        pdrbBarSvg.innerHTML = s;
    }

    const miskinWrap = document.getElementById('miskinWrap');
    if (miskinWrap) {
        const giniVal = ((r.gini || 300) / 1000).toFixed(3);
        miskinWrap.innerHTML = `
            <div class="miskin-hero">
                <div class="mh-lbl">Garis kemiskinan</div>
                <div class="mh-num">Rp${fmt(r.garis_kemiskinan)}</div>
                <div class="mh-sub">per kapita/bulan</div>
            </div>
            <div class="miskin-cards">
                <div class="miskin-card">
                    <div class="mc-num" style="color:#D9962B">${fmt1(r.penduduk_miskin_ribu)} rb</div>
                    <div class="mc-lbl">penduduk miskin</div>
                </div>
                <div class="miskin-card">
                    <div class="mc-num" style="color:#E8604C">${fmt1(r.persentase_miskin)}%</div>
                    <div class="mc-lbl">persentase miskin</div>
                </div>
            </div>
            <div style="padding:10px;background:var(--panel-2);border-radius:6px;border:1px solid var(--line);margin-top:10px">
                <div style="font-size:11px;color:var(--muted-2);font-family:var(--mono);text-transform:uppercase">Rasio Gini Daerah</div>
                <div style="font-family:var(--mono);font-size:22px;font-weight:600;margin-top:2px">${giniVal}</div>
                <div style="font-size:11px;color:var(--muted)">Kategori Pemerataan Sedang</div>
            </div>
        `;
    }
}

/* ============================================================
   TAB 6: KONSUMSI
   ============================================================ */
function renderKonsumsi(r) {
    const grid = document.getElementById('konGrpGrid');
    if (!grid) return;

    const regId = r ? String(r.id || r.no || '') : '';
    const dataKon = (typeof window.KONSUMSI_DATA !== 'undefined' && window.KONSUMSI_DATA)
        ? window.KONSUMSI_DATA[regId]
        : null;

    // 1. KPI Summary
    const konKpis = document.getElementById('konKpis');
    if (konKpis) {
        if (dataKon && dataKon.groups) {
            const g = dataKon.groups;
            const padiTon = (g['Padi-Padian']?.total_volume || 0) + (g['Umbi-Umbian']?.total_volume || 0);
            const dagingTon = (g['Daging']?.total_volume || 0);
            const ikanTon = (g['Ikan-Ikanan']?.total_volume || 0);
            const sayurBuahTon = (g['Sayur-Sayuran']?.total_volume || 0) + (g['Buah-Buahan']?.total_volume || 0);
            const rokokJt = ((g['Rokok & Tembakau']?.total_volume || 0) / 1000000).toFixed(1).replace('.', ',');

            konKpis.innerHTML = `
                <div class="kpi">
                    <div class="k-label">Karbohidrat Pokok</div>
                    <div class="k-val">${fmt(Math.round(padiTon))} <span class="k-unit">Ton/th</span></div>
                    <div class="k-note">Padi-padian &amp; Umbi-umbian</div>
                </div>
                <div class="kpi">
                    <div class="k-label">Protein Hewani</div>
                    <div class="k-val">${fmt(Math.round(dagingTon + ikanTon))} <span class="k-unit">Ton/th</span></div>
                    <div class="k-note">Daging ${fmt(Math.round(dagingTon))} Ton + Ikan ${fmt(Math.round(ikanTon))} Ton</div>
                </div>
                <div class="kpi">
                    <div class="k-label">Sayur &amp; Buah</div>
                    <div class="k-val">${fmt(Math.round(sayurBuahTon))} <span class="k-unit">Ton/th</span></div>
                    <div class="k-note">Hortikultura Segar Tahunan</div>
                </div>
                <div class="kpi">
                    <div class="k-label">Konsumsi Rokok</div>
                    <div class="k-val" style="color:#E8604C">${rokokJt} <span class="k-unit">Juta Batang</span></div>
                    <div class="k-note">Kretek Filter, Putih &amp; Non-Filter</div>
                </div>
            `;
        } else {
            konKpis.innerHTML = `
                <div class="kpi">
                    <div class="k-label">Status Survei</div>
                    <div class="k-val">Susenas BPS</div>
                    <div class="k-note">Volume Konsumsi Rumah Tangga</div>
                </div>
            `;
        }
    }

    // 2. 14 Group Cards
    const standardCategories = [
        { label: 'Padi-Padian', icon: '🌾', color: '#0FB5A0' },
        { label: 'Umbi-Umbian', icon: '🥔', color: '#D9962B' },
        { label: 'Ikan-Ikanan', icon: '🐟', color: '#2E9BD6' },
        { label: 'Daging', icon: '🥩', color: '#E8604C' },
        { label: 'Telur & Susu', icon: '🥚', color: '#F59E0B' },
        { label: 'Sayur-Sayuran', icon: '🥬', color: '#10B981' },
        { label: 'Kacang-Kacangan', icon: '🥜', color: '#B45309' },
        { label: 'Buah-Buahan', icon: '🍎', color: '#EC4899' },
        { label: 'Minyak & Kelapa', icon: '🥥', color: '#6366F1' },
        { label: 'Bahan Minuman', icon: '☕', color: '#8B5CF6' },
        { label: 'Bumbu-Bumbuan', icon: '🌶️', color: '#DC2626' },
        { label: 'Bahan Makanan', icon: '🍜', color: '#14B8A6' },
        { label: 'Makanan Jadi', icon: '🍲', color: '#F97316' },
        { label: 'Rokok & Tembakau', icon: '🚬', color: '#64748B' }
    ];

    function renderCards(filterQuery = '') {
        const q = filterQuery.toLowerCase().trim();
        let matchedCount = 0;

        const cards = standardCategories.map(cat => {
            const grpData = (dataKon && dataKon.groups) ? dataKon.groups[cat.label] : null;
            if (!grpData) {
                if (q && !cat.label.toLowerCase().includes(q)) return '';
                matchedCount++;
                return `
                    <div class="grp-card">
                        <div class="gc-header">
                            <div class="gc-name">${cat.icon} ${cat.label}</div>
                        </div>
                        <div class="gc-count" style="color:var(--muted-2)">–</div>
                        <div style="font-size:11px;color:var(--muted)">Belum terdata</div>
                    </div>
                `;
            }

            const catMatches = !q || cat.label.toLowerCase().includes(q);

            // If group has distinct sub_groups
            if (grpData.has_subgroups && grpData.sub_groups && grpData.sub_groups.length > 0) {
                let filteredSubGroups = grpData.sub_groups.map(sg => {
                    const sgMatches = catMatches || sg.label.toLowerCase().includes(q);
                    const matchingItems = (sg.items || []).filter(it => sgMatches || it.name.toLowerCase().includes(q));
                    return {
                        ...sg,
                        displayItems: q && !sgMatches ? matchingItems : (matchingItems.length > 0 ? (q ? matchingItems : matchingItems.slice(0, 3)) : (q ? [] : (sg.items || []).slice(0, 3))),
                        hasMatch: sgMatches || matchingItems.length > 0
                    };
                });

                if (q) {
                    filteredSubGroups = filteredSubGroups.filter(sg => sg.hasMatch);
                    if (filteredSubGroups.length === 0) return '';
                }

                matchedCount++;

                const subGroupsHtml = filteredSubGroups.map((sg, sgIdx) => {
                    const sgVol = sg.total_volume ? (
                        sg.total_volume >= 1000000 
                            ? (sg.total_volume / 1000000).toFixed(1).replace('.', ',') + ' Jt' 
                            : fmt(Math.round(sg.total_volume))
                    ) : '';
                    const sgVolLabel = sgVol ? `${sgVol} <small>${sg.unit}</small>` : '';

                    const itemsHtml = (sg.displayItems || []).map(it => {
                        const itemVol = it.val >= 1000000 
                            ? (it.val / 1000000).toFixed(1).replace('.', ',') + ' Jt' 
                            : fmt(Math.round(it.val));
                        return `
                            <div class="gc-sub-item">
                                <span>${it.name.length > 20 ? it.name.slice(0, 19) + '…' : it.name}</span>
                                <b>${itemVol} <span style="font-weight:400;font-size:10px">${it.unit}</span></b>
                            </div>
                        `;
                    }).join('');

                    const blockClass = sgIdx === 0 ? '' : 'gc-sub-block';

                    return `
                        <div class="${blockClass}">
                            <div class="gc-sub-title">
                                <span>${sg.icon || ''} ${sg.label}</span>
                                ${sgVolLabel ? `<span class="gc-sub-vol" style="color:${cat.color}">${sgVolLabel}</span>` : ''}
                            </div>
                            <div class="gc-sub-list" style="border-top:none;padding-top:0;margin-top:2px">${itemsHtml || '<div style="font-size:10px;color:var(--muted)">Tidak ada item cocok</div>'}</div>
                        </div>
                    `;
                }).join('');

                return `
                    <div class="grp-card">
                        <div class="gc-header">
                            <div class="gc-name">${cat.icon} ${cat.label}</div>
                            <span style="font-size:10px;font-family:var(--mono);color:var(--muted);background:var(--surface);padding:2px 6px;border-radius:4px">
                                ${q ? 'Cocok' : `${grpData.all_items_count} item`}
                            </span>
                        </div>
                        <div style="margin-top:6px">${subGroupsHtml}</div>
                    </div>
                `;
            }

            // Standard single volume card
            const allItems = grpData.top_items || [];
            const matchingItems = allItems.filter(it => catMatches || it.name.toLowerCase().includes(q));

            if (q && !catMatches && matchingItems.length === 0) return '';
            matchedCount++;

            const vol = grpData.total_volume || 0;
            let formattedVol = fmt(Math.round(vol));
            if (vol >= 1000000) {
                formattedVol = (vol / 1000000).toFixed(2).replace('.', ',') + ' Jt';
            }

            const displayItems = q && !catMatches ? matchingItems : (q ? matchingItems : allItems.slice(0, 3));
            const topItemsHtml = displayItems.map(it => {
                const itemVol = it.val >= 1000000 
                    ? (it.val / 1000000).toFixed(1).replace('.', ',') + ' Jt' 
                    : fmt(Math.round(it.val));
                return `
                    <div class="gc-sub-item">
                        <span>${it.name.length > 22 ? it.name.slice(0, 21) + '…' : it.name}</span>
                        <b>${itemVol} <span style="font-weight:400;font-size:10px">${it.unit}</span></b>
                    </div>
                `;
            }).join('');

            return `
                <div class="grp-card">
                    <div class="gc-header">
                        <div class="gc-name">${cat.icon} ${cat.label}</div>
                        <span style="font-size:10px;font-family:var(--mono);color:var(--muted);background:var(--surface);padding:2px 6px;border-radius:4px">
                            ${q ? `${displayItems.length} cocok` : `${grpData.all_items_count} item`}
                        </span>
                    </div>
                    <div class="gc-count" style="color:${cat.color}">
                        ${formattedVol} <span class="unit">${grpData.default_unit}</span>
                    </div>
                    ${topItemsHtml ? `<div class="gc-sub-list">${topItemsHtml}</div>` : ''}
                </div>
            `;
        }).filter(Boolean).join('');

        if (matchedCount === 0 && q) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 36px 20px; text-align: center; color: var(--muted); font-size: 13px; background: var(--panel-2); border: 1px dashed var(--line); border-radius: 8px;">
                    Tidak ada komoditas konsumsi yang cocok dengan pencarian "<b>${filterQuery}</b>"
                </div>
            `;
        } else {
            grid.innerHTML = cards;
        }
    }

    renderCards();

    // Hook search input
    const searchInput = document.getElementById('konSearch');
    if (searchInput && !searchInput._bound) {
        searchInput._bound = true;
        searchInput.addEventListener('input', e => renderCards(e.target.value));
    }

    // 3. Source Footnote (dihilangkan sesuai preferensi tampilan)
    const srcEl = document.getElementById('srcKonGrp');
    if (srcEl) {
        srcEl.innerHTML = '';
    }
}

/* ============================================================
   TAB 7: PERTANIAN
   ============================================================ */
function renderPertanian(r) {
    const kpisEl = document.getElementById('taniKpis');
    const gridEl = document.getElementById('taniSektorGrid');
    const srcEl = document.getElementById('srcTaniSektor');
    if (!gridEl) return;

    if (!r) return;
    const regId = String(r.id || r.no || '');
    const pData = (typeof window.PERTANIAN_DATA !== 'undefined' && window.PERTANIAN_DATA) 
        ? window.PERTANIAN_DATA[regId] 
        : null;

    if (!pData || !pData.has_data) {
        if (kpisEl) {
            kpisEl.innerHTML = `
                <div class="kpi"><div class="k-label">Tanaman Pangan</div><div class="k-val" style="color:var(--muted)">0 <span class="k-unit">Ton</span></div><div class="k-note">Data Resmi BPS</div></div>
                <div class="kpi"><div class="k-label">Hortikultura</div><div class="k-val" style="color:var(--muted)">0 <span class="k-unit">Ton</span></div><div class="k-note">Data Resmi BPS</div></div>
                <div class="kpi"><div class="k-label">Perkebunan</div><div class="k-val" style="color:var(--muted)">0 <span class="k-unit">Ton</span></div><div class="k-note">Data Resmi BPS</div></div>
                <div class="kpi"><div class="k-label">Peternakan</div><div class="k-val" style="color:var(--muted)">0 <span class="k-unit">Ekor</span></div><div class="k-note">Data Resmi BPS</div></div>
            `;
        }
        gridEl.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 36px 20px; text-align: center; background: var(--panel-2); border: 1px dashed var(--line); border-radius: 8px; color: var(--muted);">
                <div style="font-size: 28px; margin-bottom: 8px;">🚜</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 5px;">Tidak Tercatat Aktivitas Produksi Pertanian Signifikan</div>
                <div style="font-size: 12px; max-width: 540px; margin: 0 auto; line-height: 1.6;">
                    Wilayah <b>${r.kabkota}</b> tidak memiliki catatan produksi komoditas tanaman pangan, hortikultura, perkebunan, maupun peternakan dalam publikasi resmi BPS / Kementerian Pertanian RI (umumnya kawasan perkotaan / non-agraris).
                </div>
            </div>
        `;
        if (srcEl) {
            srcEl.innerHTML = '';
        }
        return;
    }

    // 1. Render KPI Cards
    const ring = pData.ringkasan || {};
    const fmtVol = (v) => {
        if (!v || v === 0) return '0';
        if (v >= 1000000) return (v / 1000000).toFixed(2).replace('.', ',') + ' Jt';
        if (v >= 10000) return (v / 1000).toFixed(1).replace('.', ',') + ' Rb';
        return fmt(Math.round(v));
    };

    if (kpisEl) {
        kpisEl.innerHTML = `
            <div class="kpi">
                <div class="k-label">Tanaman Pangan</div>
                <div class="k-val" style="color:#0FB5A0">${fmtVol(ring.tanaman_pangan_total_produksi_ton)} <span class="k-unit">Ton</span></div>
                <div class="k-note">Total Produksi Pangan</div>
            </div>
            <div class="kpi">
                <div class="k-label">Hortikultura</div>
                <div class="k-val" style="color:#2FA65E">${fmtVol(ring.hortikultura_total_produksi_ton)} <span class="k-unit">Ton</span></div>
                <div class="k-note">Estimasi Produksi Hortikultura</div>
            </div>
            <div class="kpi">
                <div class="k-label">Perkebunan</div>
                <div class="k-val" style="color:#D9962B">${fmtVol(ring.perkebunan_total_produksi_ton)} <span class="k-unit">Ton</span></div>
                <div class="k-note">Total Panen Perkebunan</div>
            </div>
            <div class="kpi">
                <div class="k-label">Peternakan (Populasi)</div>
                <div class="k-val" style="color:#E8604C">${fmtVol(ring.peternakan_total_populasi_ekor)} <span class="k-unit">Ekor</span></div>
                <div class="k-note">Populasi Ternak Hidup</div>
            </div>
        `;
    }

    // 2. Render 4 Sector Cards
    const sektor = pData.sektor || {};
    const tpItems = sektor.tanaman_pangan || [];
    const hortiItems = sektor.hortikultura || [];
    const kebunItems = sektor.perkebunan || [];
    const ternakPop = (sektor.peternakan && sektor.peternakan.populasi) || [];
    const ternakProd = (sektor.peternakan && sektor.peternakan.produksi) || [];
    const totalTernakCount = ternakPop.length + ternakProd.length;

    const fmtItemVal = (v) => {
        if (!v || v === 0) return '0';
        if (v >= 1000000) return (v / 1000000).toFixed(1).replace('.', ',') + ' Jt';
        if (v >= 10000) return (v / 1000).toFixed(1).replace('.', ',') + ' Rb';
        return typeof v === 'number' ? v.toLocaleString('id-ID') : v;
    };

    function renderSectorCards(filterQuery = '') {
        const q = filterQuery.toLowerCase().trim();

        // Filter lists
        const filteredTp = q ? tpItems.filter(it => it.komoditas.toLowerCase().includes(q)) : tpItems.slice(0, 5);
        const filteredHorti = q ? hortiItems.filter(it => it.komoditas.toLowerCase().includes(q)) : hortiItems.slice(0, 5);
        const filteredKebun = q ? kebunItems.filter(it => it.komoditas.toLowerCase().includes(q)) : kebunItems.slice(0, 5);
        const filteredPop = q ? ternakPop.filter(it => it.komoditas.toLowerCase().includes(q)) : ternakPop.slice(0, 3);
        const filteredProd = q ? ternakProd.filter(it => it.komoditas.toLowerCase().includes(q)) : ternakProd.slice(0, 3);

        let cardsHtml = '';

        // Card 1: Tanaman Pangan
        const tpListHtml = filteredTp.map(it => {
            const prod = it.produksi ? `${fmtItemVal(it.produksi.val)} ${it.produksi.unit}` : '-';
            const luas = it.luas_panen ? `${fmtItemVal(it.luas_panen.val)} ${it.luas_panen.unit}` : '';
            const prodv = it.produktivitas ? `${fmtItemVal(it.produktivitas.val)} ${it.produktivitas.unit}` : '';
            const metaStr = [luas ? `Luas: ${luas}` : '', prodv ? `Prod: ${prodv}` : ''].filter(Boolean).join(' · ');
            return `
                <div class="gc-sub-item" style="flex-direction:column;gap:1px;padding:3px 0">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <span style="font-weight:600;color:var(--text)">${it.komoditas}</span>
                        <b style="font-family:var(--mono);color:#0FB5A0">${prod}</b>
                    </div>
                    ${metaStr ? `<div style="font-size:10px;color:var(--muted);font-family:var(--mono)">${metaStr}</div>` : ''}
                </div>
            `;
        }).join('');

        cardsHtml += `
            <div class="grp-card" style="border-top:3px solid #0FB5A0">
                <div class="gc-header">
                    <div class="gc-name">🌾 Tanaman Pangan</div>
                    <span style="font-size:10px;font-family:var(--mono);color:var(--muted);background:var(--surface);padding:2px 6px;border-radius:4px">
                        ${q ? `${filteredTp.length} cocok` : `${tpItems.length} komoditas`}
                    </span>
                </div>
                <div class="gc-count" style="color:#0FB5A0">
                    ${fmtVol(ring.tanaman_pangan_total_produksi_ton)} <span class="unit">Ton/th</span>
                </div>
                ${tpListHtml ? `<div class="gc-sub-list">${tpListHtml}</div>` : '<div style="font-size:11px;color:var(--muted);padding:8px 0">Tidak ada komoditas cocok</div>'}
                ${tpItems.length > 5 ? `<button type="button" class="btn-see-all" data-sektor="tp">Lihat Semua ${tpItems.length} Komoditas</button>` : ''}
            </div>
        `;

        // Card 2: Hortikultura
        const hortiListHtml = filteredHorti.map(it => {
            const prod = it.produksi ? `${fmtItemVal(it.produksi.val)} ${it.produksi.unit}` : '-';
            const luas = it.luas_panen ? `${fmtItemVal(it.luas_panen.val)} ${it.luas_panen.unit}` : '';
            const prodv = it.produktivitas ? `${fmtItemVal(it.produktivitas.val)} ${it.produktivitas.unit}` : '';
            const metaStr = [luas ? `Luas: ${luas}` : '', prodv ? `Prod: ${prodv}` : ''].filter(Boolean).join(' · ');
            return `
                <div class="gc-sub-item" style="flex-direction:column;gap:1px;padding:3px 0">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <span style="font-weight:600;color:var(--text)">${it.komoditas}</span>
                        <b style="font-family:var(--mono);color:#2FA65E">${prod}</b>
                    </div>
                    ${metaStr ? `<div style="font-size:10px;color:var(--muted);font-family:var(--mono)">${metaStr}</div>` : ''}
                </div>
            `;
        }).join('');

        cardsHtml += `
            <div class="grp-card" style="border-top:3px solid #2FA65E">
                <div class="gc-header">
                    <div class="gc-name">🥬 Hortikultura</div>
                    <span style="font-size:10px;font-family:var(--mono);color:var(--muted);background:var(--surface);padding:2px 6px;border-radius:4px">
                        ${q ? `${filteredHorti.length} cocok` : `${hortiItems.length} komoditas`}
                    </span>
                </div>
                <div class="gc-count" style="color:#2FA65E">
                    ${fmtVol(ring.hortikultura_total_produksi_ton)} <span class="unit">Ton/th</span>
                </div>
                ${hortiListHtml ? `<div class="gc-sub-list">${hortiListHtml}</div>` : '<div style="font-size:11px;color:var(--muted);padding:8px 0">Tidak ada komoditas cocok</div>'}
                ${hortiItems.length > 5 ? `<button type="button" class="btn-see-all" data-sektor="horti">Lihat Semua ${hortiItems.length} Komoditas</button>` : ''}
            </div>
        `;

        // Card 3: Perkebunan
        const kebunListHtml = filteredKebun.map(it => {
            const prod = it.produksi ? `${fmtItemVal(it.produksi.val)} ${it.produksi.unit}` : '-';
            const luas = it.luas_areal ? `${fmtItemVal(it.luas_areal.val)} ${it.luas_areal.unit}` : '';
            const prodv = it.produktivitas ? `${fmtItemVal(it.produktivitas.val)} ${it.produktivitas.unit}` : '';
            const metaStr = [luas ? `Areal: ${luas}` : '', prodv ? `Prod: ${prodv}` : ''].filter(Boolean).join(' · ');
            return `
                <div class="gc-sub-item" style="flex-direction:column;gap:1px;padding:3px 0">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <span style="font-weight:600;color:var(--text)">${it.komoditas}</span>
                        <b style="font-family:var(--mono);color:#D9962B">${prod}</b>
                    </div>
                    ${metaStr ? `<div style="font-size:10px;color:var(--muted);font-family:var(--mono)">${metaStr}</div>` : ''}
                </div>
            `;
        }).join('');

        cardsHtml += `
            <div class="grp-card" style="border-top:3px solid #D9962B">
                <div class="gc-header">
                    <div class="gc-name">🌴 Perkebunan</div>
                    <span style="font-size:10px;font-family:var(--mono);color:var(--muted);background:var(--surface);padding:2px 6px;border-radius:4px">
                        ${q ? `${filteredKebun.length} cocok` : `${kebunItems.length} komoditas`}
                    </span>
                </div>
                <div class="gc-count" style="color:#D9962B">
                    ${fmtVol(ring.perkebunan_total_produksi_ton)} <span class="unit">Ton/th</span>
                </div>
                ${kebunListHtml ? `<div class="gc-sub-list">${kebunListHtml}</div>` : '<div style="font-size:11px;color:var(--muted);padding:8px 0">Tidak ada komoditas cocok</div>'}
                ${kebunItems.length > 5 ? `<button type="button" class="btn-see-all" data-sektor="kebun">Lihat Semua ${kebunItems.length} Komoditas</button>` : ''}
            </div>
        `;

        // Card 4: Peternakan
        const popListHtml = filteredPop.map(it => `
            <div class="gc-sub-item" style="padding:2px 0">
                <span>${it.komoditas}</span>
                <b style="font-family:var(--mono);color:#E8604C">${fmtItemVal(it.val)} <span style="font-weight:400;font-size:10px">${it.unit}</span></b>
            </div>
        `).join('');

        const prodListHtml = filteredProd.map(it => `
            <div class="gc-sub-item" style="padding:2px 0">
                <span>${it.komoditas}</span>
                <b style="font-family:var(--mono);color:#E8604C">${fmtItemVal(it.val)} <span style="font-weight:400;font-size:10px">${it.unit}</span></b>
            </div>
        `).join('');

        const matchedTernakTotal = filteredPop.length + filteredProd.length;

        cardsHtml += `
            <div class="grp-card" style="border-top:3px solid #E8604C">
                <div class="gc-header">
                    <div class="gc-name">🐄 Peternakan</div>
                    <span style="font-size:10px;font-family:var(--mono);color:var(--muted);background:var(--surface);padding:2px 6px;border-radius:4px">
                        ${q ? `${matchedTernakTotal} cocok` : `${totalTernakCount} item`}
                    </span>
                </div>
                <div class="gc-count" style="color:#E8604C">
                    ${fmtVol(ring.peternakan_total_populasi_ekor)} <span class="unit">Ekor Populasi</span>
                </div>
                <div>
                    ${popListHtml ? `
                        <div style="font-size:10.5px;font-weight:700;color:var(--text);margin-top:6px;margin-bottom:2px">Populasi Ternak Hidup:</div>
                        <div class="gc-sub-list" style="border-top:none;padding-top:0;margin-top:0">${popListHtml}</div>
                    ` : (q && !prodListHtml ? '<div style="font-size:11px;color:var(--muted);padding:8px 0">Tidak ada komoditas cocok</div>' : '')}
                    ${prodListHtml ? `
                        <div style="font-size:10.5px;font-weight:700;color:var(--text);margin-top:7px;margin-bottom:2px;border-top:1px dashed var(--line);padding-top:5px">Produksi Hasil Ternak:</div>
                        <div class="gc-sub-list" style="border-top:none;padding-top:0;margin-top:0">${prodListHtml}</div>
                    ` : ''}
                </div>
                ${totalTernakCount > 6 ? `<button type="button" class="btn-see-all" data-sektor="ternak">Lihat Semua ${totalTernakCount} Item Peternakan</button>` : ''}
            </div>
        `;

        gridEl.innerHTML = cardsHtml;
        bindModalTriggers();
    }

    function bindModalTriggers() {
        gridEl.querySelectorAll('.btn-see-all').forEach(btn => {
            btn.addEventListener('click', () => {
                const sType = btn.getAttribute('data-sektor');
                openModal(sType);
            });
        });
    }

    // Render awal
    renderSectorCards();

    // Event listener search di luar modal
    const taniSearchInput = document.getElementById('taniSearch');
    if (taniSearchInput && !taniSearchInput._bound) {
        taniSearchInput._bound = true;
        taniSearchInput.addEventListener('input', e => renderSectorCards(e.target.value));
    }

    // 3. Modal Popup Logic
    const modalEl = document.getElementById('taniModal');
    const modalTitleEl = document.getElementById('taniModalTitle');
    const modalSubEl = document.getElementById('taniModalSub');
    const modalCountEl = document.getElementById('taniModalCount');
    const modalTableEl = document.getElementById('taniModalTable');
    const modalSearchEl = document.getElementById('taniModalSearch');
    const modalCloseBtn = document.getElementById('btnTaniModalClose');

    let currentModalRows = [];
    let currentModalSektor = '';

    function renderModalTable(filterQuery = '') {
        if (!modalTableEl) return;
        const q = filterQuery.toLowerCase().trim();
        const filtered = q ? currentModalRows.filter(r => r.name.toLowerCase().includes(q)) : currentModalRows;
        if (modalCountEl) modalCountEl.textContent = `${filtered.length} Komoditas`;

        const isTernak = currentModalSektor === 'ternak';

        if (filtered.length === 0) {
            modalTableEl.innerHTML = `
                <tbody><tr><td colspan="${isTernak ? 4 : 5}" style="text-align:center;padding:28px;color:var(--muted)">Tidak ada komoditas yang cocok dengan pencarian "<b>${filterQuery}</b>"</td></tr></tbody>
            `;
            return;
        }

        const theadHtml = isTernak ? `
            <thead>
                <tr>
                    <th style="width:45px">No</th>
                    <th>Nama Komoditas</th>
                    <th style="text-align:right">Populasi / Produksi</th>
                    <th style="text-align:right">Kategori</th>
                </tr>
            </thead>
        ` : `
            <thead>
                <tr>
                    <th style="width:45px">No</th>
                    <th>Nama Komoditas</th>
                    <th style="text-align:right">Volume Produksi</th>
                    <th style="text-align:right">Luas Lahan / Areal</th>
                    <th style="text-align:right">Produktivitas</th>
                </tr>
            </thead>
        `;

        modalTableEl.innerHTML = `
            ${theadHtml}
            <tbody>
                ${filtered.map((item, idx) => `
                    <tr>
                        <td style="font-family:var(--mono);color:var(--muted-2);font-weight:600">${idx + 1}</td>
                        <td style="font-weight:600;color:var(--text)">${item.name}</td>
                        <td style="text-align:right;font-family:var(--mono);color:${item.color || 'var(--text)'};font-weight:600">${item.prod}</td>
                        <td style="text-align:right;font-family:var(--mono);color:var(--muted)">${item.luas || '–'}</td>
                        ${!isTernak ? `<td style="text-align:right;font-family:var(--mono);color:var(--muted)">${item.prodv || '–'}</td>` : ''}
                    </tr>
                `).join('')}
            </tbody>
        `;
    }

    function openModal(sektorType) {
        if (!modalEl) return;
        if (modalSearchEl) modalSearchEl.value = '';
        currentModalSektor = sektorType;

        if (sektorType === 'tp') {
            if (modalTitleEl) modalTitleEl.textContent = `🌾 Sektor Tanaman Pangan (${r.kabkota})`;
            if (modalSubEl) modalSubEl.textContent = `Basis Data Resmi BPS · Seluruh Komoditas Pangan`;
            currentModalRows = tpItems.map(it => ({
                name: it.komoditas,
                prod: it.produksi ? `${fmtItemVal(it.produksi.val)} ${it.produksi.unit}` : '–',
                luas: it.luas_panen ? `${fmtItemVal(it.luas_panen.val)} ${it.luas_panen.unit}` : '–',
                prodv: it.produktivitas ? `${fmtItemVal(it.produktivitas.val)} ${it.produktivitas.unit}` : '–',
                color: '#0FB5A0'
            }));
        } else if (sektorType === 'horti') {
            if (modalTitleEl) modalTitleEl.textContent = `🥬 Sektor Hortikultura (${r.kabkota})`;
            if (modalSubEl) modalSubEl.textContent = `Basis Data Resmi BPS · Sayuran, Buah, Biofarmaka & Florikultura`;
            currentModalRows = hortiItems.map(it => ({
                name: it.komoditas,
                prod: it.produksi ? `${fmtItemVal(it.produksi.val)} ${it.produksi.unit}` : '–',
                luas: it.luas_panen ? `${fmtItemVal(it.luas_panen.val)} ${it.luas_panen.unit}` : '–',
                prodv: it.produktivitas ? `${fmtItemVal(it.produktivitas.val)} ${it.produktivitas.unit}` : '–',
                color: '#2FA65E'
            }));
        } else if (sektorType === 'kebun') {
            if (modalTitleEl) modalTitleEl.textContent = `🌴 Sektor Perkebunan (${r.kabkota})`;
            if (modalSubEl) modalSubEl.textContent = `Basis Data Resmi BPS · Komoditas Perkebunan Rakyat & Swasta`;
            currentModalRows = kebunItems.map(it => ({
                name: it.komoditas,
                prod: it.produksi ? `${fmtItemVal(it.produksi.val)} ${it.produksi.unit}` : '–',
                luas: it.luas_areal ? `${fmtItemVal(it.luas_areal.val)} ${it.luas_areal.unit}` : '–',
                prodv: it.produktivitas ? `${fmtItemVal(it.produktivitas.val)} ${it.produktivitas.unit}` : '–',
                color: '#D9962B'
            }));
        } else if (sektorType === 'ternak') {
            if (modalTitleEl) modalTitleEl.textContent = `🐄 Sektor Peternakan (${r.kabkota})`;
            if (modalSubEl) modalSubEl.textContent = `Basis Data Resmi BPS · Populasi Ternak Hidup & Produksi Olahan`;
            const popRows = ternakPop.map(it => ({
                name: `${it.komoditas} (Populasi Ternak)`,
                prod: `${fmtItemVal(it.val)} ${it.unit}`,
                luas: 'Populasi Hidup',
                color: '#E8604C'
            }));
            const prodRows = ternakProd.map(it => ({
                name: `${it.komoditas} (Hasil Olahan)`,
                prod: `${fmtItemVal(it.val)} ${it.unit}`,
                luas: 'Daging/Telur/Susu',
                color: '#E8604C'
            }));
            currentModalRows = [...popRows, ...prodRows];
        }

        renderModalTable();
        modalEl.hidden = false;
        setTimeout(() => { if (modalSearchEl) modalSearchEl.focus(); }, 50);
    }

    function closeModal() {
        if (modalEl) modalEl.hidden = true;
    }

    if (modalCloseBtn && !modalCloseBtn._bound) {
        modalCloseBtn._bound = true;
        modalCloseBtn.addEventListener('click', closeModal);
    }
    if (modalEl && !modalEl._bound) {
        modalEl._bound = true;
        modalEl.addEventListener('click', (e) => {
            if (e.target === modalEl) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modalEl.hidden) closeModal();
        });
    }
    if (modalSearchEl && !modalSearchEl._bound) {
        modalSearchEl._bound = true;
        modalSearchEl.addEventListener('input', (e) => {
            renderModalTable(e.target.value);
        });
    }

    // 4. Source Footnote (dihilangkan sesuai preferensi tampilan)
    if (srcEl) {
        srcEl.innerHTML = '';
    }
}

/* ============================================================
   TAB 8: SOSIAL
   ============================================================ */
function renderSosial(r) {
    if (!r) return;
    const regId = String(r.id || r.no || '');
    const sData = (typeof window.SOSIAL_DATA !== 'undefined' && window.SOSIAL_DATA)
        ? window.SOSIAL_DATA[regId]
        : null;

    const sosKpis = document.getElementById('sosKpis');
    const eduBar = document.getElementById('eduBar');
    const healthGrid = document.getElementById('healthGrid');
    const eduTotalBadge = document.getElementById('eduTotalBadge');
    const healthTotalBadge = document.getElementById('healthTotalBadge');
    const eduStatusRow = document.getElementById('eduStatusRow');
    const healthActionRow = document.getElementById('healthActionRow');
    const kampusList = document.getElementById('kampusList');
    const kampusCountBadge = document.getElementById('kampusCountBadge');
    const akredGrid = document.getElementById('akredGrid');

    if (!sData || !sData.has_data) {
        if (sosKpis) {
            sosKpis.innerHTML = `
                <div class="kpi"><div class="k-label">Satuan Pendidikan</div><div class="k-val" style="color:var(--muted)">–</div><div class="k-note">Data belum tersedia</div></div>
                <div class="kpi"><div class="k-label">Peserta Didik</div><div class="k-val" style="color:var(--muted)">–</div><div class="k-note">Data belum tersedia</div></div>
                <div class="kpi"><div class="k-label">Tenaga Pendidik</div><div class="k-val" style="color:var(--muted)">–</div><div class="k-note">Data belum tersedia</div></div>
                <div class="kpi"><div class="k-label">Fasilitas Kesehatan</div><div class="k-val" style="color:var(--muted)">–</div><div class="k-note">Data belum tersedia</div></div>
            `;
        }
        return;
    }

    const ring = sData.ringkasan || {};
    const pend = sData.pendidikan || {};
    const kes = sData.kesehatan || {};
    const rekap = pend.rekap_jenjang || {};
    const fmt = (n) => typeof n === 'number' ? n.toLocaleString('id-ID') : (n || '0');

    // 1. Render KPI Cards
    if (sosKpis) {
        const rasio = ring.total_guru > 0 ? (ring.total_siswa / ring.total_guru).toFixed(1) : '–';
        sosKpis.innerHTML = `
            <div class="kpi">
                <div class="k-label">Satuan Pendidikan</div>
                <div class="k-val" style="color:#0FB5A0">${fmt(ring.total_sekolah)} <span class="k-unit">Unit</span></div>
                <div class="k-note">PAUD/TK s.d. Menengah</div>
            </div>
            <div class="kpi">
                <div class="k-label">Peserta Didik (Siswa)</div>
                <div class="k-val" style="color:#2E9BD6">${fmt(ring.total_siswa)} <span class="k-unit">Jiwa</span></div>
                <div class="k-note">Rasio Guru: 1 : ${rasio}</div>
            </div>
            <div class="kpi">
                <div class="k-label">Tenaga Pendidik (Guru)</div>
                <div class="k-val" style="color:#D9962B">${fmt(ring.total_guru)} <span class="k-unit">Orang</span></div>
                <div class="k-note">Guru &amp; Tenaga Pengajar</div>
            </div>
            <div class="kpi">
                <div class="k-label">Fasilitas Kesehatan</div>
                <div class="k-val" style="color:#E8604C">${fmt(ring.total_faskes || (ring.total_puskesmas + ring.total_rs))} <span class="k-unit">Faskes</span></div>
                <div class="k-note">${ring.total_puskesmas} Puskesmas · ${ring.total_rs} RS</div>
            </div>
        `;
    }

    if (eduTotalBadge) {
        eduTotalBadge.textContent = `${fmt(ring.total_sekolah)} Sekolah Terdata`;
    }
    if (healthTotalBadge) {
        healthTotalBadge.textContent = `${fmt(ring.total_puskesmas + ring.total_rs)} Faskes Resmi`;
    }

    // 2. Render Grafik Batang Pendidikan (eduBar)
    if (eduBar) {
        const sdTotal = (rekap.sd ? rekap.sd.total : 0);
        const smpTotal = (rekap.smp ? rekap.smp.total : 0);
        const smaTotal = (rekap.sma ? rekap.sma.total : 0);
        const smkTotal = (rekap.smk ? rekap.smk.total : 0);
        const madrasahTotal = (rekap.madrasah ? rekap.madrasah.total : 0);
        const paudTotal = (rekap.paud_tk ? rekap.paud_tk.total : 0);
        const slbTotal = (rekap.slb ? rekap.slb.total : 0);
        const kampusTotal = ring.total_kampus || (pend.daftar_kampus ? pend.daftar_kampus.length : 0);

        const E = [
            { n: 'SD / Sederajat', v: sdTotal, c: '#0FB5A0' },
            { n: 'SMP / Sederajat', v: smpTotal, c: '#2E9BD6' },
            { n: 'SMA / Sederajat', v: smaTotal, c: '#D9962B' },
            { n: 'SMK', v: smkTotal, c: '#5B6EE0' },
            { n: 'Madrasah (MI/MTs/MA)', v: madrasahTotal, c: '#2FA65E' },
            { n: 'PAUD & TK', v: paudTotal, c: '#E8604C' },
            { n: 'Perguruan Tinggi', v: kampusTotal, c: '#8E44AD' }
        ].filter(item => item.v > 0);

        if (E.length === 0) {
            eduBar.innerHTML = `<text x="230" y="140" text-anchor="middle" fill="var(--muted)" font-size="12">Belum ada rincian sekolah terdata</text>`;
        } else {
            const W = 460, rowH = 36, labelW = 160, barMax = W - labelW - 60;
            const maxV = Math.max(...E.map(e => e.v)) || 1;
            eduBar.setAttribute('viewBox', `0 0 460 ${E.length * rowH + 20}`);
            let s = '';
            E.forEach((e, i) => {
                const y = i * rowH + 8;
                const w = Math.max(4, (e.v / maxV) * barMax);
                s += `<text class="pd-lbl" x="0" y="${y + rowH / 2 + 1}" font-size="11" font-weight="600" fill="var(--text)">${e.n}</text>`;
                s += `<rect x="${labelW}" y="${y + 5}" width="${w}" height="${rowH - 12}" rx="3" fill="${e.c}" opacity="0.88"/>`;
                s += `<text class="pd-val" x="${labelW + w + 8}" y="${y + rowH / 2 + 2}" font-size="11" font-weight="700" font-family="var(--mono)" fill="${e.c}">${fmt(e.v)}</text>`;
            });
            eduBar.innerHTML = s;
        }
    }

    // 3. Render Status Negeri vs Swasta
    if (eduStatusRow) {
        let negCount = 0, swasCount = 0;
        ['sd', 'smp', 'sma', 'smk', 'paud_tk', 'slb'].forEach(k => {
            if (rekap[k]) {
                negCount += (rekap[k].negeri || 0);
                swasCount += (rekap[k].swasta || 0);
            }
        });
        const totalStatus = negCount + swasCount;
        const pctNeg = totalStatus > 0 ? Math.round((negCount / totalStatus) * 100) : 0;
        const pctSwas = totalStatus > 0 ? (100 - pctNeg) : 0;
        eduStatusRow.innerHTML = `
            <div>Negeri: <b style="color:#0FB5A0">${fmt(negCount)}</b> (${pctNeg}%)</div>
            <div style="flex:1;max-width:180px;height:7px;background:var(--line);border-radius:4px;overflow:hidden;margin:0 12px;align-self:center">
                <div style="width:${pctNeg}%;height:100%;background:#0FB5A0"></div>
            </div>
            <div>Swasta: <b style="color:#D9962B">${fmt(swasCount)}</b> (${pctSwas}%)</div>
        `;
    }

    // 4. Render Fasilitas Kesehatan Grid
    if (healthGrid) {
        const pkmCount = ring.total_puskesmas || (kes.puskesmas ? kes.puskesmas.length : 0);
        const rsCount = ring.total_rs || (kes.rumah_sakit ? kes.rumah_sakit.length : 0);
        healthGrid.innerHTML = `
            <div style="padding:14px;background:var(--panel-2);border:1px solid var(--line);border-radius:8px">
                <div style="font-family:var(--mono);font-size:24px;font-weight:700;color:#0FB5A0">${fmt(pkmCount)}</div>
                <div style="font-size:12px;font-weight:600;color:var(--text);margin-top:2px">Puskesmas</div>
                <div style="font-size:10px;color:var(--muted);margin-top:3px">Pusat Kesehatan Masyarakat Resmi</div>
            </div>
            <div style="padding:14px;background:var(--panel-2);border:1px solid var(--line);border-radius:8px">
                <div style="font-family:var(--mono);font-size:24px;font-weight:700;color:${rsCount > 0 ? '#E8604C' : 'var(--muted)'}">${fmt(rsCount)}</div>
                <div style="font-size:12px;font-weight:600;color:var(--text);margin-top:2px">Rumah Sakit</div>
                <div style="font-size:10px;color:var(--muted);margin-top:3px">RS Vertikal Rujukan Kemenkes</div>
            </div>
        `;
    }

    // 5. Action Buttons untuk Faskes
    if (healthActionRow) {
        const pkmList = kes.puskesmas || [];
        const rsList = kes.rumah_sakit || [];
        healthActionRow.innerHTML = `
            ${pkmList.length > 0 ? `<button type="button" class="btn btn-sm" id="btnSeePuskesmas" style="font-size:11.5px;padding:6px 12px;cursor:pointer">Lihat ${pkmList.length} Puskesmas &rarr;</button>` : ''}
            ${rsList.length > 0 ? `<button type="button" class="btn btn-sm" id="btnSeeRS" style="font-size:11.5px;padding:6px 12px;cursor:pointer">Lihat ${rsList.length} RS Rujukan &rarr;</button>` : ''}
        `;
        document.getElementById('btnSeePuskesmas')?.addEventListener('click', () => openSosModal('puskesmas', r, sData));
        document.getElementById('btnSeeRS')?.addEventListener('click', () => openSosModal('rs', r, sData));
    }

    // 6. Render Daftar Kampus
    if (kampusList && kampusCountBadge) {
        const campuses = pend.daftar_kampus || [];
        kampusCountBadge.textContent = `${campuses.length} Kampus`;
        if (campuses.length === 0) {
            kampusList.innerHTML = `<div style="font-size:11.5px;color:var(--muted);padding:10px 0">Tidak ada kampus perguruan tinggi beroperasi di wilayah ini.</div>`;
        } else {
            kampusList.innerHTML = campuses.map(c => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:var(--surface);border-radius:6px;font-size:11.5px">
                    <span style="font-weight:600;color:var(--text);max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(c.nama)}</span>
                    <span style="font-family:var(--mono);font-size:10px;color:#8E44AD;background:rgba(142,68,173,0.1);padding:2px 6px;border-radius:4px">${escapeHtml(c.akreditasi || 'Aktif')}</span>
                </div>
            `).join('');
        }
    }

    // 7. Render Akreditasi Sekolah
    if (akredGrid) {
        const ak = pend.akreditasi || { a: 0, b: 0, c: 0, belum: 0 };
        akredGrid.innerHTML = `
            <div style="padding:10px;background:var(--surface);border-radius:6px">
                <div style="font-family:var(--mono);font-size:18px;font-weight:700;color:#0FB5A0">${fmt(ak.a)}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:2px">Akreditasi A</div>
            </div>
            <div style="padding:10px;background:var(--surface);border-radius:6px">
                <div style="font-family:var(--mono);font-size:18px;font-weight:700;color:#2E9BD6">${fmt(ak.b)}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:2px">Akreditasi B</div>
            </div>
            <div style="padding:10px;background:var(--surface);border-radius:6px">
                <div style="font-family:var(--mono);font-size:18px;font-weight:700;color:#D9962B">${fmt(ak.c)}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:2px">Akreditasi C</div>
            </div>
            <div style="padding:10px;background:var(--surface);border-radius:6px">
                <div style="font-family:var(--mono);font-size:18px;font-weight:700;color:var(--muted)">${fmt(ak.belum)}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:2px">Lainnya</div>
            </div>
        `;
    }
}

function openSosModal(type, r, sData) {
    const modalEl = document.getElementById('sosModal');
    const modalTitleEl = document.getElementById('sosModalTitle');
    const modalSubEl = document.getElementById('sosModalSub');
    const modalCountEl = document.getElementById('sosModalCount');
    const modalSearchEl = document.getElementById('sosModalSearch');
    const modalTableEl = document.getElementById('sosModalTable');
    const closeBtn = document.getElementById('btnSosModalClose');
    if (!modalEl || !modalTableEl) return;

    let rows = [];
    if (type === 'puskesmas') {
        if (modalTitleEl) modalTitleEl.textContent = `Puskesmas di ${r.kabkota}`;
        if (modalSubEl) modalSubEl.textContent = `Basis Data Resmi Kemenkes RI · Fasilitas Kesehatan Tingkat Pertama`;
        rows = (sData.kesehatan && sData.kesehatan.puskesmas) || [];
    } else if (type === 'rs') {
        if (modalTitleEl) modalTitleEl.textContent = `Rumah Sakit di ${r.kabkota}`;
        if (modalSubEl) modalSubEl.textContent = `Basis Data Resmi Kemenkes RI · Fasilitas Rujukan Tingkat Lanjut`;
        rows = (sData.kesehatan && sData.kesehatan.rumah_sakit) || [];
    }

    const renderTable = (q = '') => {
        const query = q.toLowerCase().trim();
        const filtered = rows.filter(it => (it.nama + ' ' + (it.alamat || '') + ' ' + (it.telepon || '')).toLowerCase().includes(query));
        if (modalCountEl) modalCountEl.textContent = `${filtered.length} Fasilitas`;
        
        if (filtered.length === 0) {
            modalTableEl.innerHTML = `<tbody><tr><td style="padding:24px;text-align:center;color:var(--muted)">Tidak ada fasilitas cocok dengan "${escapeHtml(q)}"</td></tr></tbody>`;
            return;
        }

        if (type === 'puskesmas') {
            modalTableEl.innerHTML = `
                <thead>
                    <tr>
                        <th style="width:40px;text-align:center">No</th>
                        <th>Nama Puskesmas</th>
                        <th style="width:140px">Kontak Telepon</th>
                        <th>Email Resmi</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map((it, idx) => `
                        <tr>
                            <td style="text-align:center;color:var(--muted);font-family:var(--mono)">${idx + 1}</td>
                            <td><strong style="color:var(--text)">${escapeHtml(it.nama)}</strong></td>
                            <td style="font-family:var(--mono);font-size:11px">${escapeHtml(it.telepon || '–')}</td>
                            <td style="font-family:var(--mono);font-size:11px;color:var(--muted)">${escapeHtml(it.email || '–')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
        } else {
            modalTableEl.innerHTML = `
                <thead>
                    <tr>
                        <th style="width:40px;text-align:center">No</th>
                        <th>Nama Rumah Sakit</th>
                        <th>Alamat</th>
                        <th style="width:130px">Kontak Telepon</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map((it, idx) => `
                        <tr>
                            <td style="text-align:center;color:var(--muted);font-family:var(--mono)">${idx + 1}</td>
                            <td><strong style="color:var(--text)">${escapeHtml(it.nama)}</strong></td>
                            <td style="font-size:11.5px;color:var(--muted)">${escapeHtml(it.alamat || '–')}</td>
                            <td style="font-family:var(--mono);font-size:11px">${escapeHtml(it.telepon || '–')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
        }
    };

    renderTable();
    modalEl.hidden = false;
    if (modalSearchEl) {
        modalSearchEl.value = '';
        modalSearchEl.oninput = (e) => renderTable(e.target.value);
    }
    if (closeBtn) closeBtn.onclick = () => { modalEl.hidden = true; };
    modalEl.onclick = (e) => { if (e.target === modalEl) modalEl.hidden = true; };
}

/* ============================================================
   TAB 9: DATA PODES
   ============================================================ */
function renderPodes() {
    const table = document.getElementById('podesTable');
    if (!table) return;

    const vars = [
        { k: 'r101', n: 'Kode Provinsi', t: 'String', len: '2' },
        { k: 'r102', n: 'Kode Kabupaten/Kota', t: 'String', len: '2' },
        { k: 'r301', n: 'Status Pemerintahan Desa/Kelurahan', t: 'Numeric', len: '1' },
        { k: 'r305a', n: 'Topografi Wilayah Desa/Kelurahan', t: 'Numeric', len: '1' },
        { k: 'r403a', n: 'Sumber Penghasilan Utama Penduduk', t: 'Numeric', len: '2' },
        { k: 'r501a1', n: 'Jumlah Keluarga Pengguna Listrik PLN', t: 'Numeric', len: '5' },
        { k: 'r508a', n: 'Sumber Air Minum Sebagian Besar Keluarga', t: 'Numeric', len: '2' },
        { k: 'r601bk2', n: 'Kejadian Bencana Alam Banjir', t: 'Numeric', len: '1' }
    ];

    const searchInput = document.getElementById('podesSearch');

    function renderRows(q = '') {
        const list = vars.filter(v => (v.k + ' ' + v.n).toLowerCase().includes(q.toLowerCase()));
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width:80px">Kode</th>
                    <th>Nama Variabel PODES 2024</th>
                    <th style="width:60px">Tipe</th>
                    <th style="width:50px">Panjang</th>
                </tr>
            </thead>
            <tbody>
                ${list.map(v => `
                    <tr>
                        <td style="font-family:var(--mono);font-weight:600;color:var(--teal)">${v.k}</td>
                        <td style="color:var(--text)">${v.n}</td>
                        <td>${v.t}</td>
                        <td style="font-family:var(--mono)">${v.len}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
    }

    renderRows();
    if (searchInput && !searchInput._bound) {
        searchInput._bound = true;
        searchInput.addEventListener('input', e => renderRows(e.target.value));
    }
}

/* ============================================================
   REGION PICKER CONTROLLER
   ============================================================ */
function setupRegionPicker(currentRegion, returnView) {
    const trigger = document.getElementById('pickerTrigger');
    const dropdown = document.getElementById('pickerDropdown');
    const searchInput = document.getElementById('pickerSearchInput');
    const resultsList = document.getElementById('pickerResultsList');
    const currentName = document.getElementById('pickerCurrentName');

    if (!trigger || !dropdown || !resultsList) return;

    if (currentName) currentName.textContent = currentRegion.kabkota || 'Pilih Daerah';

    function toggle(open) {
        const isHidden = dropdown.hidden;
        const show = open !== undefined ? open : isHidden;
        dropdown.hidden = !show;
        if (show) {
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
            renderList();
        }
    }

    trigger.addEventListener('click', e => {
        e.stopPropagation();
        toggle();
    });

    document.addEventListener('click', e => {
        if (!dropdown.hidden && !dropdown.contains(e.target) && !trigger.contains(e.target)) {
            toggle(false);
        }
    });

    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            toggle(true);
        } else if (e.key === 'Escape' && !dropdown.hidden) {
            toggle(false);
        }
    });

    if (searchInput) {
        searchInput.addEventListener('input', () => renderList());
    }

    function renderList() {
        const q = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const filtered = REGION_DATA.filter(x => !q || x.kabkota.toLowerCase().includes(q) || x.prov.toLowerCase().includes(q));

        if (filtered.length === 0) {
            resultsList.innerHTML = `<div style="padding:12px;text-align:center;color:var(--muted);font-size:12px">Tidak ada daerah yang cocok.</div>`;
            return;
        }

        resultsList.innerHTML = filtered.map(x => `
            <div class="picker-item ${x.id === currentRegion.id ? 'selected' : ''}" data-id="${x.id}" data-slug="${x.slug}">
                <span style="font-weight:600">${x.kabkota}</span>
                <span style="font-family:var(--mono);font-size:10px;color:var(--muted-2)">${x.prov}</span>
            </div>
        `).join('');

        resultsList.querySelectorAll('.picker-item').forEach(item => {
            item.addEventListener('click', () => {
                const targetId = item.dataset.id;
                const targetSlug = item.dataset.slug;
                const targetItem = REGION_DATA.find(x => String(x.id) === String(targetId));
                try {
                    localStorage.setItem('selected_region_id', String(targetId));
                    localStorage.setItem('selected_region_slug', String(targetSlug || ''));
                    if (targetItem) localStorage.setItem('selected_region_name', String(targetItem.kabkota || ''));
                    sessionStorage.setItem('selected_region_id', String(targetId));
                    sessionStorage.setItem('selected_region_slug', String(targetSlug || ''));
                    if (targetItem) sessionStorage.setItem('selected_region_name', String(targetItem.kabkota || ''));
                } catch (e) {}
                const viewParam = returnView ? `&view=${returnView}` : '';
                window.location.href = `profil.html?id=${targetId}&slug=${targetSlug}${viewParam}#id=${targetId}&slug=${targetSlug}`;
            });
        });
    }
}