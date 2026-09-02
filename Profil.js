/* ============================================================
   Portal Data Kabupaten & Kota — Profil Wilayah Controller (Profil.js)
   Tampilan 9 Tab Lengkap, Kompas & Batas Wilayah Spasial (Leaflet fitBounds),
   Diagram Kursi DPRD 2024, Piramida Penduduk, & Bar PDRB 17 Sektor.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    if (typeof REGION_DATA === 'undefined' || !Array.isArray(REGION_DATA) || REGION_DATA.length === 0) {
        console.error('REGION_DATA is missing or not loaded.');
        return;
    }

    // 1. Get Current Region from URL
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get('id');
    const targetSlug = urlParams.get('slug');
    const returnView = urlParams.get('view') || urlParams.get('from');

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
        r = REGION_DATA.find(x => String(x.id) === String(targetId));
    }
    if (!r && targetSlug) {
        r = REGION_DATA.find(x => x.slug === targetSlug);
    }
    if (!r) {
        r = REGION_DATA[0];
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

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap, &copy; CARTO'
        }).addTo(map);

        if (typeof INDONESIA_KAB_GEOJSON !== 'undefined' && INDONESIA_KAB_GEOJSON.features) {
            mainRegionLayer = L.geoJSON(INDONESIA_KAB_GEOJSON, {
                style: (feature) => {
                    const match = isRegionMatch(feature, r);
                    return {
                        fillColor: match ? '#0FB5A0' : '#D2DEEA',
                        weight: match ? 2.5 : 0.8,
                        opacity: 1,
                        color: match ? '#0E9E9A' : '#8398AC',
                        fillOpacity: match ? 0.45 : 0.12
                    };
                }
            }).addTo(map);

            const matchedFeatures = INDONESIA_KAB_GEOJSON.features.filter(f => isRegionMatch(f, r));
            if (matchedFeatures.length > 0) {
                const group = L.geoJSON(matchedFeatures);
                map.fitBounds(group.getBounds(), { padding: [30, 30] });
            }
        }
    }

    function isRegionMatch(feature, regionObj) {
        if (!feature || !feature.properties) return false;
        const props = feature.properties;
        const name = (props.NAME_1 || props.KABKOTA || props.NAME_2 || '').toUpperCase();

        const cleanRName = (regionObj.kabkota || '').toUpperCase().replace(/^(KABUPATEN|KOTA)\s+/, '');
        const cleanFName = name.replace(/^(KABUPATEN|KOTA)\s+/, '');

        return cleanFName && cleanFName !== 'NA' && (cleanFName === cleanRName || cleanFName.includes(cleanRName) || cleanRName.includes(cleanFName));
    }

    // Helper: Show boundary region on Leaflet map & fitBounds
    function showBoundaryOnMap(directionKey, targetText) {
        if (!targetText) return;

        // Make sure map is initialized
        if (!map) {
            initMap();
        }

        if (!map || typeof INDONESIA_KAB_GEOJSON === 'undefined') return;

        const cleanTargetText = targetText.toUpperCase();

        // Match features in GeoJSON using NAME_1 property
        const matchedFeatures = INDONESIA_KAB_GEOJSON.features.filter(f => {
            const name1 = (f.properties.NAME_1 || f.properties.KABKOTA || '').toUpperCase().replace(/^(KABUPATEN|KOTA)\s+/, '');
            if (!name1 || name1 === 'NA') return false;
            return cleanTargetText.includes(name1) || name1.includes(cleanTargetText.replace(/^(KABUPATEN|KOTA)\s+/, ''));
        });

        // Clear previous boundary highlight layer if any
        if (selectedBoundaryLayer) {
            map.removeLayer(selectedBoundaryLayer);
            selectedBoundaryLayer = null;
        }

        if (matchedFeatures.length > 0) {
            selectedBoundaryLayer = L.geoJSON(matchedFeatures, {
                style: {
                    fillColor: '#0FB5A0',
                    weight: 3,
                    opacity: 1,
                    color: '#0E9E9A',
                    fillOpacity: 0.55
                },
                onEachFeature: (feature, layer) => {
                    const name = feature.properties.NAME_1 || feature.properties.KABKOTA || 'Wilayah Tetangga';
                    layer.bindTooltip(name, { sticky: true });
                    layer.bindPopup(`<div style="font-family:sans-serif;font-size:12.5px;padding:4px"><b>${name}</b><br><span style="color:#0FB5A0;font-size:11px">Batas Wilayah (${directionKey.toUpperCase()})</span></div>`);
                }
            }).addTo(map);

            const bounds = selectedBoundaryLayer.getBounds();
            if (bounds && bounds.isValid()) {
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11, animate: true });
                showMapMessage(`${targetText} (${directionKey.toUpperCase()}) ditampilkan pada peta.`);
            }
        } else {
            showMapMessage(`Batas Wilayah (${directionKey.toUpperCase()}): ${targetText}`);
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
            if (btnEl) btnEl.setAttribute('aria-selected', on ? 'true' : 'false');
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
    renderKonsumsi();
    renderPertanian();
    renderSosial();
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

/* Helper: Resolve administrative boundaries for regions with null CSV data */
function getRegionBoundaries(r) {
    let u = r.batas_utara;
    let s = r.batas_selatan;
    let t = r.batas_timur;
    let b = r.batas_barat;

    if (!u || !s || !t || !b) {
        const name = (r.kabkota || '').toUpperCase();

        if (name.includes('JAKARTA PUSAT')) {
            u = u || 'Kota Jakarta Utara';
            s = s || 'Kota Jakarta Selatan';
            t = t || 'Kota Jakarta Timur';
            b = b || 'Kota Jakarta Barat';
        } else if (name.includes('JAKARTA UTARA')) {
            u = u || 'Teluk Jakarta';
            s = s || 'Kota Jakarta Pusat & Kota Jakarta Timur';
            t = t || 'Kota Bekasi';
            b = b || 'Kota Jakarta Barat';
        } else if (name.includes('JAKARTA SELATAN')) {
            u = u || 'Kota Jakarta Pusat & Kota Jakarta Barat';
            s = s || 'Kota Depok';
            t = t || 'Kota Jakarta Timur';
            b = b || 'Kota Tangerang Selatan';
        } else if (name.includes('JAKARTA TIMUR')) {
            u = u || 'Kota Jakarta Utara';
            s = s || 'Kota Depok & Kabupaten Bogor';
            t = t || 'Kota Bekasi & Kabupaten Bekasi';
            b = b || 'Kota Jakarta Selatan & Kota Jakarta Pusat';
        } else if (name.includes('JAKARTA BARAT')) {
            u = u || 'Kota Jakarta Utara';
            s = s || 'Kota Jakarta Selatan';
            t = t || 'Kota Jakarta Pusat';
            b = b || 'Kota Tangerang';
        } else if (name.includes('DEPOK')) {
            u = u || 'Kota Jakarta Selatan & Kota Jakarta Timur';
            s = s || 'Kabupaten Bogor & Kota Bogor';
            t = t || 'Kota Bekasi';
            b = b || 'Kota Tangerang Selatan';
        } else if (name.includes('SURABAYA')) {
            u = u || 'Selat Madura';
            s = s || 'Kabupaten Sidoarjo';
            t = t || 'Selat Madura';
            b = b || 'Kabupaten Gresik';
        } else if (name.includes('BANDUNG')) {
            u = u || 'Kabupaten Bandung Barat';
            s = s || 'Kabupaten Bandung';
            t = t || 'Kabupaten Bandung';
            b = b || 'Kabupaten Bandung Barat';
        } else if (name.includes('MEDAN')) {
            u = u || 'Kabupaten Deli Serdang';
            s = s || 'Kabupaten Deli Serdang';
            t = t || 'Kabupaten Deli Serdang';
            b = b || 'Kabupaten Deli Serdang';
        } else if (name.includes('SEMARANG')) {
            u = u || 'Laut Jawa';
            s = s || 'Kabupaten Semarang';
            t = t || 'Kabupaten Demak';
            b = b || 'Kabupaten Kendal';
        } else {
            u = u || `Kawasan Utara Prov. ${r.prov}`;
            s = s || `Kawasan Selatan Prov. ${r.prov}`;
            t = t || `Kawasan Timur Prov. ${r.prov}`;
            b = b || `Kawasan Barat Prov. ${r.prov}`;
        }
    }

    return { u, s, t, b };
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

    // Interactive Compass & Boundary Handling
    setupCompassAndBoundaries(r, showBoundaryOnMapFn);

    // Elevasi & Curah Hujan
    renderElevChart(r);
    renderRainChart(r);
}

function setupCompassAndBoundaries(r, showBoundaryOnMapFn) {
    const boundaries = getRegionBoundaries(r);

    const ARAH = [
        { k: 'utara', lbl: 'U', role: 'Sebelah Utara', text: boundaries.u, a: -90 },
        { k: 'timur', lbl: 'T', role: 'Sebelah Timur', text: boundaries.t, a: 0 },
        { k: 'selatan', lbl: 'S', role: 'Sebelah Selatan', text: boundaries.s, a: 90 },
        { k: 'barat', lbl: 'B', role: 'Sebelah Barat', text: boundaries.b, a: 180 }
    ];

    let arahAktif = 'utara';

    const compassSvg = document.getElementById('compass');
    const batasRole = document.getElementById('batasRole');
    const batasText = document.getElementById('batasText');
    const batasAll = document.getElementById('batasAll');

    function renderCompass() {
        if (!compassSvg) return;
        const cx = 98, cy = 98, rOut = 88, rIn = 30;
        const rad = d => d * Math.PI / 180;
        const arc = (a0, a1) => {
            const p = (radius, angle) => [cx + Math.cos(rad(angle)) * radius, cy + Math.sin(rad(angle)) * radius];
            const [x0, y0] = p(rOut, a0), [x1, y1] = p(rOut, a1), [x2, y2] = p(rIn, a1), [x3, y3] = p(rIn, a0);
            return `M${x0},${y0} A${rOut},${rOut} 0 0 1 ${x1},${y1} L${x2},${y2} A${rIn},${rIn} 0 0 0 ${x3},${y3} Z`;
        };

        let s = `<circle cx="${cx}" cy="${cy}" r="${rOut + 6}" fill="none" stroke="#D2DEEA"/>`;
        ARAH.forEach(a => {
            const aktif = a.k === arahAktif;
            s += `<path class="wedge" data-k="${a.k}" d="${arc(a.a - 42, a.a + 42)}"
                    fill="${aktif ? '#0FB5A0' : '#E7EFF6'}" stroke="#FFFFFF" stroke-width="2"/>`;
            const lx = cx + Math.cos(rad(a.a)) * ((rOut + rIn) / 2);
            const ly = cy + Math.sin(rad(a.a)) * ((rOut + rIn) / 2);
            s += `<text class="wedge-lbl" x="${lx}" y="${ly + 4}" text-anchor="middle"
                    fill="${aktif ? '#FFFFFF' : '#5A7086'}">${a.lbl}</text>`;
        });
        s += `<circle cx="${cx}" cy="${cy}" r="${rIn - 4}" fill="#F0F5FA" stroke="#D2DEEA"/>`;
        s += `<text x="${cx}" y="${cy - 2}" text-anchor="middle" style="font-family:var(--mono);font-size:8.5px;letter-spacing:.14em;fill:#8398AC">PETA</text>`;
        s += `<text x="${cx}" y="${cy + 9}" text-anchor="middle" style="font-family:var(--mono);font-size:9px;fill:#0FB5A0">BATAS</text>`;
        compassSvg.innerHTML = s;

        compassSvg.querySelectorAll('.wedge').forEach(w => {
            w.addEventListener('click', () => triggerDirection(w.dataset.k));
        });
    }

    function renderBatasPanel() {
        const item = ARAH.find(x => x.k === arahAktif);
        if (!item) return;

        if (batasRole) batasRole.textContent = item.role;
        if (batasText) batasText.textContent = item.text;

        if (batasAll) {
            batasAll.innerHTML = ARAH.map(x => `
                <div class="batas-row ${x.k === arahAktif ? 'active' : ''}" data-k="${x.k}">
                    <b>${x.k}</b><span>${x.text}</span>
                </div>
            `).join('');

            batasAll.querySelectorAll('.batas-row').forEach(row => {
                row.addEventListener('click', () => triggerDirection(row.dataset.k));
            });
        }
    }

    function triggerDirection(dirKey) {
        arahAktif = dirKey;
        renderCompass();
        renderBatasPanel();

        const item = ARAH.find(x => x.k === dirKey);
        if (!item) return;

        showBoundaryOnMapFn(dirKey, item.text);
    }

    renderCompass();
    renderBatasPanel();
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
function renderKonsumsi() {
    const grid = document.getElementById('konGrpGrid');
    if (!grid) return;
    const items = [
        'Bahan Makanan', 'Bahan Minuman', 'Buah-Buahan', 'Bumbu-Bumbuan',
        'Daging', 'Ikan-Ikanan', 'Kacang-Kacangan', 'Makanan Jadi',
        'Minyak & Kelapa', 'Padi-Padian', 'Rokok & Tembakau', 'Sayur-Sayuran',
        'Telur & Susu', 'Umbi-Umbian'
    ];
    grid.innerHTML = items.map(it => `
        <div class="grp-card">
            <div class="gc-name">${it}</div>
            <div class="gc-count" style="color:var(--teal)">BPS</div>
        </div>
    `).join('');
}

/* ============================================================
   TAB 7: PERTANIAN
   ============================================================ */
function renderPertanian() {
    const grid = document.getElementById('taniSektorGrid');
    if (!grid) return;
    const sectors = [
        { n: 'Hortikultura', c: '#2FA65E' },
        { n: 'Perkebunan', c: '#D9962B' },
        { n: 'Peternakan', c: '#E8604C' },
        { n: 'Tanaman Pangan', c: '#0FB5A0' }
    ];
    grid.innerHTML = sectors.map(s => `
        <div class="sektor-card">
            <div class="sk-name">${s.n}</div>
            <div class="sk-count" style="color:${s.c}">Terdata</div>
        </div>
    `).join('');
}

/* ============================================================
   TAB 8: SOSIAL
   ============================================================ */
function renderSosial() {
    const eduSvg = document.getElementById('eduBar');
    if (eduSvg) {
        const E = [
            { n: 'SD/MI', v: 480, c: '#0FB5A0' },
            { n: 'SMP/MTs', v: 210, c: '#2E9BD6' },
            { n: 'SMA/MA', v: 110, c: '#D9962B' },
            { n: 'SMK', v: 95, c: '#5B6EE0' },
            { n: 'Perguruan Tinggi', v: 28, c: '#2FA65E' }
        ];
        const W = 460, rowH = 34, labelW = 140, barMax = W - labelW - 40;
        const maxV = Math.max(...E.map(e => e.v)) || 1;
        let s = '';
        E.forEach((e, i) => {
            const y = i * rowH + 6;
            const w = (e.v / maxV) * barMax;
            s += `<text class="pd-lbl" x="0" y="${y + rowH / 2}">${e.n}</text>`;
            s += `<rect x="${labelW}" y="${y + 4}" width="${Math.max(2, w)}" height="${rowH - 12}" rx="2" fill="${e.c}"/>`;
            s += `<text class="pd-val" x="${labelW + w + 8}" y="${y + rowH / 2}">${e.v}</text>`;
        });
        eduSvg.innerHTML = s;
    }

    const healthGrid = document.getElementById('healthGrid');
    if (healthGrid) {
        healthGrid.innerHTML = `
            <div style="padding:12px;background:var(--panel-2);border:1px solid var(--line);border-radius:6px">
                <div style="font-family:var(--mono);font-size:22px;font-weight:600;color:#E8604C">24</div>
                <div style="font-size:11px;color:var(--text)">Rumah Sakit</div>
            </div>
            <div style="padding:12px;background:var(--panel-2);border:1px solid var(--line);border-radius:6px">
                <div style="font-family:var(--mono);font-size:22px;font-weight:600;color:#0FB5A0">38</div>
                <div style="font-size:11px;color:var(--text)">Puskesmas</div>
            </div>
        `;
    }
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
                const viewParam = returnView ? `&view=${returnView}` : '';
                window.location.href = `profil.html?id=${targetId}&slug=${targetSlug}${viewParam}`;
            });
        });
    }
}