/* ============================================================
   Portal Data Kabupaten & Kota — Profil Wilayah Controller (Profil.js)
   Integrasi 9 Tab Dashboard, Kompas & Batas Wilayah Spasial (Leaflet fitBounds),
   Diagram Kursi DPRD 2024, Piramida Penduduk, & Bar PDRB 17 Sektor.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    if (typeof REGION_DATA === 'undefined' || !Array.isArray(REGION_DATA) || REGION_DATA.length === 0) {
        console.error('REGION_DATA is missing or not loaded.');
        return;
    }

    // 1. URL Parameters & Return View State
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get('id');
    const targetSlug = urlParams.get('slug');
    const returnView = urlParams.get('view') || urlParams.get('from');

    const backLink = document.getElementById('backLink');
    if (backLink) {
        if (returnView === 'table') {
            backLink.href = 'index.html?view=table';
            backLink.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 6l-6 6 6 6" />
                </svg>
                Kembali ke Tabel Peringkat
            `;
        } else {
            backLink.href = 'index.html?view=map';
            backLink.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 6l-6 6 6 6" />
                </svg>
                Kembali ke Peta &amp; Dashboard
            `;
        }
    }

    // 2. Identify Target Region
    let region = null;
    if (targetId) {
        region = REGION_DATA.find(r => String(r.id) === String(targetId));
    }
    if (!region && targetSlug) {
        region = REGION_DATA.find(r => r.slug === targetSlug);
    }
    if (!region) {
        region = REGION_DATA[0];
    }

    const isKota = (region.kabkota || '').toUpperCase().startsWith('KOTA');
    document.title = `${region.kabkota || 'Wilayah'} — Profil Data & Statistik Resmi`;

    // 3. Setup Region Switcher
    setupCustomRegionPicker(region, returnView);

    // 4. Hero Header Setup
    const heroProv = document.getElementById('heroProv');
    const heroName = document.getElementById('heroName');
    const heroTypeBadge = document.getElementById('heroTypeBadge');
    const heroBpsId = document.getElementById('heroBpsId');

    if (heroProv) heroProv.textContent = `PROVINSI ${region.prov || 'INDONESIA'}`;
    if (heroName) heroName.textContent = region.kabkota || 'Kabupaten/Kota';
    if (heroTypeBadge) heroTypeBadge.textContent = isKota ? 'KOTA OTONOM' : 'KABUPATEN';
    if (heroBpsId) heroBpsId.textContent = `#${region.id || region.no || '1'}`;

    // 5. Initialize Leaflet Map Instance
    let leafletMap = null;
    let geojsonLayer = null;

    function initMap() {
        const mapContainer = document.getElementById('map');
        if (!mapContainer || leafletMap) return;

        const lat = region.lat || -6.2;
        const lng = region.lng || 106.8;

        leafletMap = L.map('map', {
            center: [lat, lng],
            zoom: 10,
            zoomControl: true,
            scrollWheelZoom: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap, &copy; CARTO'
        }).addTo(leafletMap);

        // Load & highlight region polygon if GeoJSON available
        if (typeof INDONESIA_KAB_GEOJSON !== 'undefined' && INDONESIA_KAB_GEOJSON.features) {
            geojsonLayer = L.geoJSON(INDONESIA_KAB_GEOJSON, {
                style: (feature) => {
                    const match = isRegionMatch(feature, region);
                    return {
                        fillColor: match ? '#0d9488' : '#e2e8f0',
                        weight: match ? 2.5 : 0.8,
                        opacity: 1,
                        color: match ? '#0f766e' : '#cbd5e1',
                        fillOpacity: match ? 0.45 : 0.15
                    };
                }
            }).addTo(leafletMap);

            // Fit bounds to selected region
            const matchedFeatures = INDONESIA_KAB_GEOJSON.features.filter(f => isRegionMatch(f, region));
            if (matchedFeatures.length > 0) {
                const group = L.geoJSON(matchedFeatures);
                leafletMap.fitBounds(group.getBounds(), { padding: [30, 30] });
            }
        } else {
            L.marker([lat, lng]).addTo(leafletMap)
                .bindPopup(`<b>${region.kabkota}</b><br>${region.prov}`)
                .openPopup();
        }
    }

    // Helper: Match GeoJSON feature to region
    function isRegionMatch(feature, r) {
        if (!feature || !feature.properties) return false;
        const props = feature.properties;
        const name = (props.KABKOTA || props.NAME_2 || props.kabkota || '').toUpperCase();
        const prov = (props.PROVINSI || props.NAME_1 || props.prov || '').toUpperCase();

        const cleanRName = (r.kabkota || '').toUpperCase().replace(/^(KABUPATEN|KOTA)\s+/, '');
        const cleanFeatureName = name.replace(/^(KABUPATEN|KOTA)\s+/, '');

        return cleanFeatureName === cleanRName && (prov.includes((r.prov || '').toUpperCase()) || (r.prov || '').toUpperCase().includes(prov));
    }

    // 6. Setup 9-Tab Switching Logic
    const TABS = [
        { btn: 'tab-btn-investasi', pane: 'tab-investasi' },
        { btn: 'tab-btn-wilayah', pane: 'tab-wilayah' },
        { btn: 'tab-btn-pemerintahan', pane: 'tab-pemerintahan' },
        { btn: 'tab-btn-penduduk', pane: 'tab-penduduk' },
        { btn: 'tab-btn-ekonomi', pane: 'tab-ekonomi' },
        { btn: 'tab-btn-konsumsi', pane: 'tab-konsumsi' },
        { btn: 'tab-btn-pertanian', pane: 'tab-pertanian' },
        { btn: 'tab-btn-sosial', pane: 'tab-sosial' },
        { btn: 'tab-btn-podes', pane: 'tab-podes' }
    ];

    function switchTab(idx) {
        TABS.forEach((t, i) => {
            const on = i === idx;
            const btnEl = document.getElementById(t.btn);
            const paneEl = document.getElementById(t.pane);
            if (btnEl) btnEl.setAttribute('aria-selected', on ? 'true' : 'false');
            if (paneEl) paneEl.hidden = !on;
        });

        // Initialize map if switching to Wilayah tab
        if (idx === 1) {
            setTimeout(() => {
                initMap();
                if (leafletMap) leafletMap.invalidateSize();
            }, 100);
        }
    }

    TABS.forEach((t, i) => {
        const btn = document.getElementById(t.btn);
        if (btn) btn.addEventListener('click', () => switchTab(i));
    });

    // Keyboard Arrow navigation for tabbar
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

    // 7. Render All Tab Contents
    renderInvestasiTab(region);
    renderWilayahTab(region, () => leafletMap, geojsonLayer);
    renderPemerintahanTab(region);
    renderPendudukTab(region);
    renderEkonomiTab(region);
    renderKonsumsiTab();
    renderPertanianTab();
    renderSosialTab();
    renderPodesTab();

    // Default to Wilayah tab (index 1) or Investasi tab (index 0)
    switchTab(1);
});

/* ============================================================
   RENDER ENGINES FOR ALL 9 TABS
   ============================================================ */

// Formatter Helpers
const fmt = n => Number(n || 0).toLocaleString('id-ID');
const fmt1 = n => Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function showToastMessage(message) {
    const el = document.getElementById('mapMessage');
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    clearTimeout(window.mapMessageTimer);
    window.mapMessageTimer = setTimeout(() => {
        el.style.display = 'none';
    }, 3000);
}

/* --- TAB 1: DECK INVESTASI --- */
function renderInvestasiTab(r) {
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
                <svg width="130" height="130" viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r="56" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="10"/>
                    <circle cx="70" cy="70" r="56" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round"
                        stroke-dasharray="351" stroke-dashoffset="${351 * (1 - totalScore / 100)}" transform="rotate(-90 70 70)"/>
                </svg>
                <div class="ig-score">
                    <div class="ig-num">${fmt1(totalScore)}</div>
                    <div class="ig-grade">Grade ${totalScore >= 75 ? 'A' : 'BBB'}</div>
                </div>
            </div>
            <div>
                <div style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; opacity: 0.9;">Indeks Daya Tarik Investasi Spasial</div>
                <h2 style="font-size: 22px; font-weight: 800; margin: 4px 0 6px;">${r.kabkota} — ${totalScore >= 75 ? 'Sangat Layak Investasi' : 'Layak & Potensial'}</h2>
                <p style="font-size: 12.5px; opacity: 0.9; margin: 0; max-width: 580px;">Sintesis 6 pilar daya tarik investasi daerah yang dihitung secara algoritmik dari data BPS resmi.</p>
            </div>
        `;
    }

    const pillars = document.getElementById('invPillars');
    if (pillars) {
        const items = [
            { n: 'Perizinan & Tata Kelola', v: p1, c: '#0d9488' },
            { n: 'Infrastruktur Spasial', v: p2, c: '#2563eb' },
            { n: 'Kinerja Ekonomi', v: p3, c: '#d97706' },
            { n: 'Kualitas SDM', v: p4, c: '#7c3aed' },
            { n: 'Struktur Biaya', v: p5, c: '#e11d48' },
            { n: 'Stabilitas Sosial', v: p6, c: '#16a34a' }
        ];
        pillars.innerHTML = items.map(it => `
            <div class="inv-pill">
                <div style="font-size: 12px; font-weight: 700; color: var(--text-hi);">${it.n}</div>
                <div class="ip-score" style="color:${it.c}">${fmt1(it.v)}</div>
                <div style="height: 4px; background: var(--cream-300); border-radius: 2px; margin-top: 6px; overflow: hidden;">
                    <div style="height: 100%; width: ${it.v}%; background: ${it.c}; border-radius: 2px;"></div>
                </div>
            </div>
        `).join('');
    }

    const metrics = document.getElementById('invMetrics');
    if (metrics) {
        metrics.innerHTML = `
            <div style="background: var(--cream-50); padding: 12px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 11px; color: var(--text-low);">Penduduk (Pasar)</div>
                <div style="font-family: var(--font-mono); font-size: 18px; font-weight: 800;">${fmt(r.penduduk)}</div>
            </div>
            <div style="background: var(--cream-50); padding: 12px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 11px; color: var(--text-low);">Pertumbuhan Ekonomi</div>
                <div style="font-family: var(--font-mono); font-size: 18px; font-weight: 800; color: #0d9488;">${fmt1(lpe)}%</div>
            </div>
            <div style="background: var(--cream-50); padding: 12px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 11px; color: var(--text-low);">PDRB per Kapita</div>
                <div style="font-family: var(--font-mono); font-size: 18px; font-weight: 800;">Rp${fmt1(pdrbPerKapita)} jt</div>
            </div>
            <div style="background: var(--cream-50); padding: 12px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 11px; color: var(--text-low);">Skor IPM</div>
                <div style="font-family: var(--font-mono); font-size: 18px; font-weight: 800;">${fmt1(ipm)}</div>
            </div>
        `;
    }

    const sectors = document.getElementById('invSectors');
    if (sectors) {
        sectors.innerHTML = `
            <div style="padding: 10px 12px; background: var(--cream-50); border-radius: 8px; border-left: 3px solid #0d9488;">
                <div style="font-weight: 700; font-size: 13px;">Perdagangan &amp; Ritel Modern</div>
                <div style="font-size: 11.5px; color: var(--text-mid);">Dukungan basis penduduk ${fmt(r.penduduk)} jiwa.</div>
            </div>
            <div style="padding: 10px 12px; background: var(--cream-50); border-radius: 8px; border-left: 3px solid #2563eb;">
                <div style="font-weight: 700; font-size: 13px;">Properti &amp; Konstruksi</div>
                <div style="font-size: 11.5px; color: var(--text-mid);">Kepadatan ${fmt(Math.round(r.kepadatan || 0))} jiwa/km².</div>
            </div>
        `;
    }
}

/* --- TAB 2: PROFIL WILAYAH & BATAS --- */
function renderWilayahTab(r, getMapFn, geojsonLayer) {
    // Pimpinan
    const pimpinan = document.getElementById('pimpinan');
    if (pimpinan) {
        pimpinan.innerHTML = `
            <div class="lead">
                <div class="avatar" style="background: var(--merah-bg); color: var(--merah); border: 1px solid var(--merah-light);">
                    ${(r.kepala || 'B').slice(0, 2).toUpperCase()}
                </div>
                <div>
                    <div class="lead-role">BUPATI / WALIKOTA</div>
                    <div class="lead-name">${r.kepala || 'Belum terdata'}</div>
                    <div class="lead-meta">Kepala Daerah Otonom</div>
                </div>
            </div>
            <div class="lead">
                <div class="avatar" style="background: var(--cream-200); color: var(--text-mid); border: 1px solid var(--line);">
                    ${(r.wakil || 'W').slice(0, 2).toUpperCase()}
                </div>
                <div>
                    <div class="lead-role">WAKIL BUPATI / WAKIL WALIKOTA</div>
                    <div class="lead-name">${r.wakil || 'Belum terdata'}</div>
                    <div class="lead-meta">Wakil Kepala Daerah</div>
                </div>
            </div>
        `;
    }

    // KPIs
    const kpis = document.getElementById('kpis');
    if (kpis) {
        kpis.innerHTML = `
            <div style="background: var(--cream-50); padding: 14px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 10.5px; font-weight: 700; color: var(--text-low); text-transform: uppercase;">JUMLAH PENDUDUK</div>
                <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 800; color: var(--merah); margin-top: 2px;">${fmt(r.penduduk)}</div>
                <div style="font-size: 11px; color: var(--text-low);">jiwa</div>
            </div>
            <div style="background: var(--cream-50); padding: 14px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 10.5px; font-weight: 700; color: var(--text-low); text-transform: uppercase;">JUMLAH KELUARGA</div>
                <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 800; margin-top: 2px;">${fmt(r.keluarga)}</div>
                <div style="font-size: 11px; color: var(--text-low);">KK</div>
            </div>
            <div style="background: var(--cream-50); padding: 14px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 10.5px; font-weight: 700; color: var(--text-low); text-transform: uppercase;">KEPADATAN PENDUDUK</div>
                <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 800; margin-top: 2px;">${fmt(Math.round(r.kepadatan || 0))}</div>
                <div style="font-size: 11px; color: var(--text-low);">jiwa/km²</div>
            </div>
            <div style="background: var(--cream-50); padding: 14px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 10.5px; font-weight: 700; color: var(--text-low); text-transform: uppercase;">LUAS WILAYAH</div>
                <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 800; margin-top: 2px;">${fmt1(r.luas)}</div>
                <div style="font-size: 11px; color: var(--text-low);">km²</div>
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
            <div class="topo-seg" style="width:${(dataran / totalTopo) * 100}%; background:#0d9488;" title="Dataran"></div>
            <div class="topo-seg" style="width:${(lembah / totalTopo) * 100}%; background:#2563eb;" title="Lembah"></div>
            <div class="topo-seg" style="width:${(lereng / totalTopo) * 100}%; background:#d97706;" title="Lereng"></div>
            <div class="topo-seg" style="width:${(puncak / totalTopo) * 100}%; background:#e11d48;" title="Puncak"></div>
        `;
    }

    const topoList = document.getElementById('topoList');
    if (topoList) {
        topoList.innerHTML = `
            <div class="topo-item"><span class="swatch" style="background:#0d9488"></span><span class="topo-name">Dataran</span><span class="topo-val">${dataran} Desa</span></div>
            <div class="topo-item"><span class="swatch" style="background:#2563eb"></span><span class="topo-name">Lembah</span><span class="topo-val">${lembah} Desa</span></div>
            <div class="topo-item"><span class="swatch" style="background:#d97706"></span><span class="topo-name">Lereng</span><span class="topo-val">${lereng} Desa</span></div>
            <div class="topo-item"><span class="swatch" style="background:#e11d48"></span><span class="topo-name">Puncak</span><span class="topo-val">${puncak} Desa</span></div>
        `;
    }

    // Setup Interactive Compass & Boundary Cards
    setupCompassAndBoundaries(r, getMapFn);
}

/* --- SETUP COMPASS & BOUNDARY GRID (LEAFLET FITBOUNDS) --- */
function setupCompassAndBoundaries(r, getMapFn) {
    const northVal = r.batas_utara || 'Tidak terdata';
    const southVal = r.batas_selatan || 'Tidak terdata';
    const eastVal = r.batas_timur || 'Tidak terdata';
    const westVal = r.batas_barat || 'Tidak terdata';

    const northEl = document.getElementById('north');
    const southEl = document.getElementById('south');
    const eastEl = document.getElementById('east');
    const westEl = document.getElementById('west');

    if (northEl) northEl.textContent = northVal;
    if (southEl) southEl.textContent = southVal;
    if (eastEl) eastEl.textContent = eastVal;
    if (westEl) westEl.textContent = westVal;

    // Render SVG Compass
    const compassSvg = document.getElementById('compass');
    if (compassSvg) {
        const cx = 98, cy = 98, rOut = 84, rIn = 28;
        const rad = d => d * Math.PI / 180;
        const arc = (a0, a1) => {
            const p = (radius, angle) => [cx + Math.cos(rad(angle)) * radius, cy + Math.sin(rad(angle)) * radius];
            const [x0, y0] = p(rOut, a0), [x1, y1] = p(rOut, a1), [x2, y2] = p(rIn, a1), [x3, y3] = p(rIn, a0);
            return `M${x0},${y0} A${rOut},${rOut} 0 0 1 ${x1},${y1} L${x2},${y2} A${rIn},${rIn} 0 0 0 ${x3},${y3} Z`;
        };

        const ARAH = [
            { k: 'north', lbl: 'U', role: 'Sebelah Utara', text: northVal, a: -90 },
            { k: 'east', lbl: 'T', role: 'Sebelah Timur', text: eastVal, a: 0 },
            { k: 'south', lbl: 'S', role: 'Sebelah Selatan', text: southVal, a: 90 },
            { k: 'west', lbl: 'B', role: 'Sebelah Barat', text: westVal, a: 180 }
        ];

        function renderCompassShapes(activeKey) {
            let s = `<circle cx="${cx}" cy="${cy}" r="${rOut + 4}" fill="none" stroke="var(--line-strong)"/>`;
            ARAH.forEach(a => {
                const active = a.k === activeKey;
                s += `<path class="wedge" data-dir="${a.k}" d="${arc(a.a - 42, a.a + 42)}"
                        fill="${active ? 'var(--merah)' : 'var(--cream-200)'}" stroke="#ffffff" stroke-width="2"/>`;
                const lx = cx + Math.cos(rad(a.a)) * ((rOut + rIn) / 2);
                const ly = cy + Math.sin(rad(a.a)) * ((rOut + rIn) / 2);
                s += `<text class="wedge-lbl" x="${lx}" y="${ly + 4}" text-anchor="middle"
                        fill="${active ? '#ffffff' : 'var(--text-mid)'}">${a.lbl}</text>`;
            });
            s += `<circle cx="${cx}" cy="${cy}" r="${rIn - 2}" fill="var(--cream-50)" stroke="var(--line)"/>`;
            s += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" style="font-family:var(--font-mono);font-size:10px;font-weight:700;fill:var(--merah)">PETA</text>`;
            compassSvg.innerHTML = s;

            // Bind click to compass wedges
            compassSvg.querySelectorAll('.wedge').forEach(w => {
                w.addEventListener('click', () => triggerBoundaryFocus(w.dataset.dir));
            });
        }

        renderCompassShapes('north');

        // Bind click to 4 Boundary Grid cards
        const boundaryCards = document.querySelectorAll('.boundary-grid .b');
        boundaryCards.forEach(card => {
            card.addEventListener('click', () => triggerBoundaryFocus(card.dataset.direction));
        });

        function triggerBoundaryFocus(direction) {
            boundaryCards.forEach(c => c.classList.toggle('active', c.dataset.direction === direction));
            renderCompassShapes(direction);

            const item = ARAH.find(x => x.k === direction);
            if (!item) return;

            const roleEl = document.getElementById('batasRole');
            const textEl = document.getElementById('batasText');
            if (roleEl) roleEl.textContent = item.role;
            if (textEl) textEl.textContent = item.text;

            // Perform Map Zoom & FitBounds if Leaflet Map is available
            const map = getMapFn();
            if (map && typeof INDONESIA_KAB_GEOJSON !== 'undefined' && INDONESIA_KAB_GEOJSON.features) {
                const targetText = item.text.toUpperCase();
                const matchedFeatures = INDONESIA_KAB_GEOJSON.features.filter(f => {
                    const fname = (f.properties.KABKOTA || f.properties.NAME_2 || f.properties.kabkota || '').toUpperCase().replace(/^(KABUPATEN|KOTA)\s+/, '');
                    return targetText.includes(fname);
                });

                if (matchedFeatures.length > 0) {
                    const group = L.geoJSON(matchedFeatures);
                    map.fitBounds(group.getBounds(), { padding: [35, 35] });
                    showToastMessage(`${item.text} (${item.role}) ditampilkan pada peta.`);
                } else {
                    showToastMessage(`${item.role}: ${item.text}`);
                }
            } else {
                showToastMessage(`${item.role}: ${item.text}`);
            }
        }
    }
}

/* --- TAB 3: PROFIL PEMERINTAHAN --- */
function renderPemerintahanTab(r) {
    const adminStrip = document.getElementById('adminStrip');
    if (adminStrip) {
        adminStrip.innerHTML = `
            <div style="background: var(--cream-50); padding: 12px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 10px; font-weight: 700; color: var(--text-low);">KECAMATAN</div>
                <div style="font-family: var(--font-mono); font-size: 22px; font-weight: 800; color: var(--merah);">${fmt(r.kecamatan)}</div>
            </div>
            <div style="background: var(--cream-50); padding: 12px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 10px; font-weight: 700; color: var(--text-low);">DESA / KELURAHAN</div>
                <div style="font-family: var(--font-mono); font-size: 22px; font-weight: 800;">${fmt(r.desa_kel || r.total_desa)}</div>
            </div>
            <div style="background: var(--cream-50); padding: 12px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 10px; font-weight: 700; color: var(--text-low);">RW / SETINGKAT</div>
                <div style="font-family: var(--font-mono); font-size: 22px; font-weight: 800;">${r.rw ? fmt(r.rw) : '—'}</div>
            </div>
            <div style="background: var(--cream-50); padding: 12px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 10px; font-weight: 700; color: var(--text-low);">RT / SETINGKAT</div>
                <div style="font-family: var(--font-mono); font-size: 22px; font-weight: 800;">${r.rt ? fmt(r.rt) : '—'}</div>
            </div>
        `;
    }

    // 2024 DPRD Semicircle Parliament Diagram
    const P = [
        { nama: 'PKS', kursi: r.p_pks || 0, c: '#f97316' },
        { nama: 'Gerindra', kursi: r.p_gerindra || 0, c: '#dc2626' },
        { nama: 'Golkar', kursi: r.p_golkar || 0, c: '#eab308' },
        { nama: 'PDIP', kursi: r.p_pdip || 0, c: '#b91c1c' },
        { nama: 'PKB', kursi: r.p_pkb || 0, c: '#16a34a' },
        { nama: 'Demokrat', kursi: r.p_demokrat || 0, c: '#2563eb' },
        { nama: 'PPP & PAN', kursi: r.p_ppp_pan || 0, c: '#0284c7' },
        { nama: 'NasDem', kursi: r.p_nasdem || 0, c: '#0d9488' },
        { nama: 'Hanura', kursi: r.p_hanura || 0, c: '#7c3aed' },
        { nama: 'PBB', kursi: r.p_pbb || 0, c: '#475569' }
    ].filter(p => p.kursi > 0);

    const totalSeats = P.reduce((s, p) => s + p.kursi, 0) || 50;

    const parlemenSvg = document.getElementById('parlemen');
    const kursiTotalBadge = document.getElementById('kursiTotal');
    if (kursiTotalBadge) kursiTotalBadge.textContent = `${totalSeats} Kursi DPRD`;

    if (parlemenSvg) {
        const seats = [];
        P.forEach((p, pi) => {
            for (let k = 0; k < p.kursi; k++) seats.push({ party: pi, c: p.c });
        });

        const cx = 220, cy = 180, rows = 3, rInner = 80, rStep = 28;
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
                s += `<circle class="seat" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="${seat.c}" stroke="#ffffff" stroke-width="1"/>`;
            }
        }
        s += `<text x="${cx}" y="${cy - 10}" text-anchor="middle" style="font-family:var(--font-mono);font-size:32px;font-weight:800;fill:var(--text-hi)">${totalSeats}</text>`;
        s += `<text x="${cx}" y="${cy + 8}" text-anchor="middle" style="font-family:var(--font-mono);font-size:10px;fill:var(--text-low);text-transform:uppercase">KURSI DPRD 2024</text>`;
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
                <div class="t-name"><b>1.</b> Total PDRB ADHB Daerah</div>
                <div class="t-amt">Rp${fmt(Math.round(pdrbTotal / 1000))} Miliar</div>
            </div>
            <div class="tree-row lvl2">
                <div class="t-name">Sektor Pertanian &amp; Komoditas</div>
                <div class="t-amt">Rp${fmt(Math.round((r.sek_a_pertanian || 0) / 1000))} Miliar</div>
            </div>
            <div class="tree-row lvl2">
                <div class="t-name">Sektor Perdagangan</div>
                <div class="t-amt">Rp${fmt(Math.round((r.sek_g_dagang || 0) / 1000))} Miliar</div>
            </div>
            <div class="tree-row lvl2">
                <div class="t-name">Sektor Konstruksi</div>
                <div class="t-amt">Rp${fmt(Math.round((r.sek_f_konstruksi || 0) / 1000))} Miliar</div>
            </div>
        `;
    }
}

/* --- TAB 4: PENDUDUK & SDM --- */
function renderPendudukTab(r) {
    const sdmKpis = document.getElementById('sdmKpis');
    if (sdmKpis) {
        const ak = r.angkatan_kerja || 0;
        const bek = r.bekerja || 0;
        const tpak = ak > 0 && r.penduduk > 0 ? (ak / (r.penduduk * 0.65)) * 100 : 62.5;
        const tpt = ak > 0 ? ((ak - bek) / ak) * 100 : 5.8;

        sdmKpis.innerHTML = `
            <div style="background: var(--cream-50); padding: 14px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 10.5px; font-weight: 700; color: var(--text-low); text-transform: uppercase;">IPM TOTAL</div>
                <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 800; color: var(--merah); margin-top: 2px;">${fmt1(r.ipm_total)}</div>
                <div style="font-size: 11px; color: var(--text-low);">Indeks Pembangunan Manusia</div>
            </div>
            <div style="background: var(--cream-50); padding: 14px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 10.5px; font-weight: 700; color: var(--text-low); text-transform: uppercase;">ANGKATAN KERJA</div>
                <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 800; margin-top: 2px;">${fmt(ak)}</div>
                <div style="font-size: 11px; color: var(--text-low);">jiwa</div>
            </div>
            <div style="background: var(--cream-50); padding: 14px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 10.5px; font-weight: 700; color: var(--text-low); text-transform: uppercase;">TPAK</div>
                <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 800; margin-top: 2px;">${fmt1(tpak)}%</div>
                <div style="font-size: 11px; color: var(--text-low);">Tingkat Partisipasi</div>
            </div>
            <div style="background: var(--cream-50); padding: 14px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 10.5px; font-weight: 700; color: var(--text-low); text-transform: uppercase;">TPT</div>
                <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 800; margin-top: 2px; color: #dc2626;">${fmt1(tpt)}%</div>
                <div style="font-size: 11px; color: var(--text-low);">Pengangguran Terbuka</div>
            </div>
        `;
    }

    const sexWrap = document.getElementById('sexWrap');
    if (sexWrap) {
        const laki = r.pddk_laki || Math.round(r.penduduk * 0.51);
        const wanita = r.pddk_wanita || (r.penduduk - laki);
        const total = laki + wanita;
        const pl = (laki / total) * 100;
        const pw = (wanita / total) * 100;

        sexWrap.innerHTML = `
            <div style="display: flex; height: 28px; border-radius: 6px; overflow: hidden; margin-bottom: 12px;">
                <div style="width:${pl}%; background:#2563eb; color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; padding-left:10px;">${pl.toFixed(1)}% Laki</div>
                <div style="width:${pw}%; background:#db2777; color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:flex-end; padding-right:10px;">${pw.toFixed(1)}% Wanita</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="background: var(--cream-50); padding: 10px; border-radius: 6px; border: 1px solid var(--line);">
                    <div style="font-size: 11px; color: #2563eb; font-weight: 700;">♂ Laki-laki</div>
                    <div style="font-family: var(--font-mono); font-size: 18px; font-weight: 800;">${fmt(laki)}</div>
                </div>
                <div style="background: var(--cream-50); padding: 10px; border-radius: 6px; border: 1px solid var(--line);">
                    <div style="font-size: 11px; color: #db2777; font-weight: 700;">♀ Perempuan</div>
                    <div style="font-family: var(--font-mono); font-size: 18px; font-weight: 800;">${fmt(wanita)}</div>
                </div>
            </div>
        `;
    }

    // Population Pyramid SVG
    const pyramidSvg = document.getElementById('pyramid');
    if (pyramidSvg) {
        const U = [
            { g: '0-4', v: r.u04 || 35000 },
            { g: '5-9', v: r.u59 || 38000 },
            { g: '10-14', v: r.u1014 || 37000 },
            { g: '15-19', v: r.u1519 || 34000 },
            { g: '20-24', v: r.u2024 || 35000 },
            { g: '25-29', v: r.u2529 || 36000 },
            { g: '30-34', v: r.u3034 || 35000 },
            { g: '35-39', v: r.u3539 || 33000 },
            { g: '40-44', v: r.u4044 || 30000 },
            { g: '45-49', v: r.u4549 || 26000 },
            { g: '50-54', v: r.u5054 || 22000 },
            { g: '55-59', v: r.u5559 || 18000 },
            { g: '60-64', v: r.u6064 || 14000 },
            { g: '65-69', v: r.u6569 || 10000 },
            { g: '70-74', v: r.u7074 || 7000 },
            { g: '75+', v: r.u75p || 5000 }
        ];

        const W = 460, H = 380, P = { l: 10, r: 10, t: 10, b: 20, mid: 50 };
        const half = (W - P.l - P.r - P.mid) / 2;
        const rowH = (H - P.t - P.b) / U.length;
        const maxV = Math.max(...U.map(u => u.v)) || 1;
        const cxL = P.l + half, cxR = P.l + half + P.mid;
        let s = '';

        U.forEach((u, i) => {
            const y = P.t + i * rowH + 2, h = rowH - 3;
            const wL = (u.v / maxV) * half;
            const wR = (u.v * 0.96 / maxV) * half;
            s += `<rect x="${cxL - wL}" y="${y}" width="${wL}" height="${h}" rx="2" fill="#2563eb" fill-opacity="0.85"/>`;
            s += `<rect x="${cxR}" y="${y}" width="${wR}" height="${h}" rx="2" fill="#db2777" fill-opacity="0.85"/>`;
            s += `<text x="${cxL + P.mid / 2}" y="${y + h / 2 + 3.5}" text-anchor="middle" style="font-family:var(--font-mono);font-size:9.5px;fill:var(--text-mid)">${u.g}</text>`;
        });
        pyramidSvg.innerHTML = s;
    }
}

/* --- TAB 5: EKONOMI --- */
function renderEkonomiTab(r) {
    const ekoKpis = document.getElementById('ekoKpis');
    if (ekoKpis) {
        ekoKpis.innerHTML = `
            <div style="background: var(--cream-50); padding: 14px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 10.5px; font-weight: 700; color: var(--text-low); text-transform: uppercase;">PDRB PER KAPITA</div>
                <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 800; color: var(--merah); margin-top: 2px;">Rp${fmt1(r.pdrb_perkapita)} jt</div>
            </div>
            <div style="background: var(--cream-50); padding: 14px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 10.5px; font-weight: 700; color: var(--text-low); text-transform: uppercase;">PERTUMBUHAN EKONOMI</div>
                <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 800; margin-top: 2px; color: #0d9488;">${fmt1(r.pertumbuhan_ekonomi)}%</div>
            </div>
            <div style="background: var(--cream-50); padding: 14px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 10.5px; font-weight: 700; color: var(--text-low); text-transform: uppercase;">PERSENTASE MISKIN</div>
                <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 800; margin-top: 2px; color: #d97706;">${fmt1(r.persentase_miskin)}%</div>
            </div>
            <div style="background: var(--cream-50); padding: 14px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 10.5px; font-weight: 700; color: var(--text-low); text-transform: uppercase;">GARIS KEMISKINAN</div>
                <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 800; margin-top: 2px;">Rp${fmt(r.garis_kemiskinan)}</div>
            </div>
        `;
    }

    // 17-Sector PDRB Bar Chart
    const pdrbBarSvg = document.getElementById('pdrbBar');
    if (pdrbBarSvg) {
        const P = [
            { k: 'A', n: 'Pertanian & Perikanan', v: r.sek_a_pertanian || 0 },
            { k: 'B', n: 'Pertambangan', v: r.sek_b_tambang || 0 },
            { k: 'C', n: 'Industri Pengolahan', v: r.sek_c_industri || 0 },
            { k: 'D', n: 'Listrik & Gas', v: r.sek_d_listrik || 0 },
            { k: 'E', n: 'Pengadaan Air & Sampah', v: r.sek_e_air || 0 },
            { k: 'F', n: 'Konstruksi', v: r.sek_f_konstruksi || 0 },
            { k: 'G', n: 'Perdagangan Besar/Eceran', v: r.sek_g_dagang || 0 },
            { k: 'H', n: 'Transportasi & Gudang', v: r.sek_h_transport || 0 },
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

        const W = 480, rowH = 28, top = 6, labelW = 180, barMax = W - labelW - 50;
        const maxV = Math.max(...P.map(p => p.v)) || 1;
        let s = '';

        P.forEach((p, i) => {
            const y = top + i * rowH;
            const w = (p.v / maxV) * barMax;
            s += `<text x="0" y="${y + rowH / 2 + 3}" style="font-family:var(--font-mono);font-size:10px;font-weight:700;fill:var(--merah)">${p.k}</text>`;
            s += `<text x="24" y="${y + rowH / 2 + 3}" style="font-size:11px;fill:var(--text-hi)">${p.n.length > 24 ? p.n.slice(0, 23) + '…' : p.n}</text>`;
            s += `<rect x="${labelW}" y="${y + 4}" width="${Math.max(2, w)}" height="${rowH - 10}" rx="2" fill="#0d9488"/>`;
            s += `<text x="${labelW + w + 6}" y="${y + rowH / 2 + 3}" style="font-family:var(--font-mono);font-size:9.5px;fill:var(--text-mid)">Rp${fmt(Math.round(p.v / 1000))}M</text>`;
        });
        pdrbBarSvg.innerHTML = s;
    }

    const miskinWrap = document.getElementById('miskinWrap');
    if (miskinWrap) {
        miskinWrap.innerHTML = `
            <div style="background: var(--cream-50); padding: 14px; border-radius: 8px; border: 1px solid var(--line); margin-bottom: 12px;">
                <div style="font-size: 11px; color: var(--text-low);">Jumlah Penduduk Miskin</div>
                <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 800; color: #d97706;">${fmt1(r.penduduk_miskin_ribu)} Ribu Jiwa</div>
            </div>
            <div style="background: var(--cream-50); padding: 14px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 11px; color: var(--text-low);">Rasio Gini Daerah</div>
                <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 800;">${((r.gini || 300) / 1000).toFixed(3)}</div>
                <div style="font-size: 11px; color: var(--text-low);">Kategori Pemerataan Sedang</div>
            </div>
        `;
    }
}

/* --- TAB 6: KONSUMSI --- */
function renderKonsumsiTab() {
    const grid = document.getElementById('konGrpGrid');
    if (!grid) return;
    const items = [
        'Bahan Makanan', 'Bahan Minuman', 'Buah-Buahan', 'Bumbu-Bumbuan',
        'Daging', 'Ikan-Ikanan', 'Kacang-Kacangan', 'Makanan Jadi',
        'Minyak & Kelapa', 'Padi-Padian', 'Rokok & Tembakau', 'Sayur-Sayuran',
        'Telur & Susu', 'Umbi-Umbian'
    ];
    grid.innerHTML = items.map(it => `
        <div style="padding: 12px; background: var(--cream-50); border: 1px solid var(--line); border-radius: 8px; font-weight: 700; font-size: 12.5px; text-align: center;">
            ${it}
        </div>
    `).join('');
}

/* --- TAB 7: PERTANIAN --- */
function renderPertanianTab() {
    const grid = document.getElementById('taniSektorGrid');
    if (!grid) return;
    const sectors = [
        { n: 'Hortikultura', c: '#16a34a' },
        { n: 'Perkebunan', c: '#d97706' },
        { n: 'Peternakan', c: '#e11d48' },
        { n: 'Tanaman Pangan', c: '#0d9488' }
    ];
    grid.innerHTML = sectors.map(s => `
        <div style="padding: 16px; background: var(--cream-50); border: 1px solid var(--line); border-radius: 8px; border-top: 4px solid ${s.c}; text-align: center;">
            <div style="font-weight: 800; font-size: 14px;">${s.n}</div>
            <div style="font-size: 11px; color: var(--text-low); margin-top: 4px;">Komoditas Terdata BPS</div>
        </div>
    `).join('');
}

/* --- TAB 8: SOSIAL --- */
function renderSosialTab() {
    const eduSvg = document.getElementById('eduBar');
    if (eduSvg) {
        const E = [
            { n: 'SD/MI', v: 450, c: '#0d9488' },
            { n: 'SMP/MTs', v: 180, c: '#2563eb' },
            { n: 'SMA/MA', v: 95, c: '#d97706' },
            { n: 'SMK', v: 80, c: '#7c3aed' },
            { n: 'Perguruan Tinggi', v: 24, c: '#16a34a' }
        ];
        const W = 460, rowH = 36, labelW = 140, barMax = W - labelW - 40;
        const maxV = Math.max(...E.map(e => e.v)) || 1;
        let s = '';
        E.forEach((e, i) => {
            const y = i * rowH + 6;
            const w = (e.v / maxV) * barMax;
            s += `<text x="0" y="${y + rowH / 2}" style="font-size:12px;font-weight:700;fill:var(--text-hi)">${e.n}</text>`;
            s += `<rect x="${labelW}" y="${y + 4}" width="${Math.max(2, w)}" height="${rowH - 12}" rx="3" fill="${e.c}"/>`;
            s += `<text x="${labelW + w + 8}" y="${y + rowH / 2}" style="font-family:var(--font-mono);font-size:11px;fill:var(--text-mid)">${e.v}</text>`;
        });
        eduSvg.innerHTML = s;
    }

    const healthGrid = document.getElementById('healthGrid');
    if (healthGrid) {
        healthGrid.innerHTML = `
            <div style="background: var(--cream-50); padding: 12px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 11px; color: var(--text-low);">Rumah Sakit</div>
                <div style="font-family: var(--font-mono); font-size: 20px; font-weight: 800;">18 Unit</div>
            </div>
            <div style="background: var(--cream-50); padding: 12px; border-radius: 8px; border: 1px solid var(--line);">
                <div style="font-size: 11px; color: var(--text-low);">Puskesmas</div>
                <div style="font-family: var(--font-mono); font-size: 20px; font-weight: 800;">34 Unit</div>
            </div>
        `;
    }
}

/* --- TAB 9: DATA PODES --- */
function renderPodesTab() {
    const table = document.getElementById('podesTable');
    if (!table) return;

    const sampleVars = [
        { k: 'r101', n: 'Kode Provinsi Administratif', t: 'String', len: '2' },
        { k: 'r102', n: 'Kode Kabupaten/Kota Administratif', t: 'String', len: '2' },
        { k: 'r301', n: 'Status Pemerintahan Desa/Kelurahan', t: 'Numeric', len: '1' },
        { k: 'r305a', n: 'Topografi Sebagian Besar Wilayah', t: 'Numeric', len: '1' },
        { k: 'r403a', n: 'Sumber Penghasilan Utama Penduduk', t: 'Numeric', len: '2' },
        { k: 'r501a1', n: 'Jumlah Keluarga Pengguna Listrik PLN', t: 'Numeric', len: '5' },
        { k: 'r508a', n: 'Sumber Air Minum Sebagian Besar Keluarga', t: 'Numeric', len: '2' },
        { k: 'r601bk2', n: 'Kejadian Bencana Alam Banjir', t: 'Numeric', len: '1' }
    ];

    const searchInput = document.getElementById('podesSearch');

    function renderTableRows(filterQuery = '') {
        const filtered = sampleVars.filter(v => (v.k + ' ' + v.n).toLowerCase().includes(filterQuery.toLowerCase()));
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width:90px;">Kode</th>
                    <th>Nama Variabel PODES 2024</th>
                    <th style="width:70px;">Tipe</th>
                    <th style="width:60px;">Panjang</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(v => `
                    <tr>
                        <td style="font-family:var(--font-mono);font-weight:700;color:var(--merah);">${v.k}</td>
                        <td style="font-weight:600;">${v.n}</td>
                        <td><span style="font-size:10px;padding:2px 6px;border-radius:4px;background:var(--cream-200);">${v.t}</span></td>
                        <td style="font-family:var(--font-mono);">${v.len}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
    }

    renderTableRows();
    if (searchInput && !searchInput._bound) {
        searchInput._bound = true;
        searchInput.addEventListener('input', e => renderTableRows(e.target.value));
    }
}

/* ============================================================
   CUSTOM SEARCHABLE REGION PICKER CONTROLLER
   ============================================================ */
function setupCustomRegionPicker(currentRegion, returnView) {
    const trigger = document.getElementById('pickerTrigger');
    const dropdown = document.getElementById('pickerDropdown');
    const searchInput = document.getElementById('pickerSearchInput');
    const clearBtn = document.getElementById('pickerSearchClear');
    const resultsList = document.getElementById('pickerResultsList');
    const resultsCount = document.getElementById('pickerResultsCount');
    const currentNameEl = document.getElementById('pickerCurrentName');

    if (!trigger || !dropdown || !resultsList) return;

    if (currentNameEl) {
        currentNameEl.textContent = currentRegion.kabkota || 'Pilih Daerah';
    }

    let activeIsland = 'all';

    function toggleDropdown(open) {
        const isHidden = dropdown.hidden;
        const shouldOpen = open !== undefined ? open : isHidden;
        dropdown.hidden = !shouldOpen;
        if (shouldOpen) {
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
            renderList();
        }
    }

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.hidden && !dropdown.contains(e.target) && !trigger.contains(e.target)) {
            toggleDropdown(false);
        }
    });

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            toggleDropdown(true);
        } else if (e.key === 'Escape' && !dropdown.hidden) {
            toggleDropdown(false);
        }
    });

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (clearBtn) clearBtn.hidden = !searchInput.value;
            renderList();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.hidden = true;
            searchInput.focus();
            renderList();
        });
    }

    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeIsland = pill.dataset.island;
            renderList();
        });
    });

    function getIsland(prov) {
        const p = (prov || '').toUpperCase();
        if (p.includes('ACEH') || p.includes('SUMATERA') || p.includes('RIAU') || p.includes('JAMBI') || p.includes('BENGKULU') || p.includes('LAMPUNG') || p.includes('BANGKA')) return 'sumatera';
        if (p.includes('JAKARTA') || p.includes('JAWA') || p.includes('BANTEN') || p.includes('YOGYAKARTA')) return 'jawa';
        if (p.includes('KALIMANTAN')) return 'kalimantan';
        if (p.includes('SULAWESI') || p.includes('GORONTALO')) return 'sulawesi';
        if (p.includes('BALI') || p.includes('NUSA')) return 'balinusa';
        if (p.includes('MALUKU') || p.includes('PAPUA')) return 'malukupapua';
        return 'other';
    }

    function renderList() {
        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const filtered = REGION_DATA.filter(r => {
            const matchQuery = !query || r.kabkota.toLowerCase().includes(query) || r.prov.toLowerCase().includes(query);
            const matchIsland = activeIsland === 'all' || getIsland(r.prov) === activeIsland;
            return matchQuery && matchIsland;
        });

        if (resultsCount) {
            resultsCount.textContent = `Menampilkan ${filtered.length} Daerah`;
        }

        if (filtered.length === 0) {
            resultsList.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-low); font-size: 13px;">Tidak ada daerah yang cocok.</div>`;
            return;
        }

        resultsList.innerHTML = filtered.map(r => {
            const isSel = r.id === currentRegion.id;
            return `
                <div class="picker-item ${isSel ? 'selected' : ''}" data-id="${r.id}" data-slug="${r.slug}">
                    <div>
                        <span class="item-name">${r.kabkota}</span>
                        <span class="item-prov">PROV. ${r.prov}</span>
                    </div>
                    <span class="item-badge">#${r.id}</span>
                </div>
            `;
        }).join('');

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