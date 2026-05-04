const PhotoDB = {
    db: null,
    init() {
        return new Promise((r) => {
            if (!window.indexedDB) {
                console.warn("IndexedDB not supported");
                this.db = null;
                r();
                return;
            }
            
            const req = indexedDB.open("GoldProtocolDB", 1);
            
            req.onupgradeneeded = (e) => { 
                const db = e.target.result;
                if(!db.objectStoreNames.contains("photos")) 
                    db.createObjectStore("photos", { keyPath: "id", autoIncrement: true }); 
            };
            
            req.onsuccess = (e) => { this.db = e.target.result; r(); };
            
            req.onerror = (e) => { 
                console.error("IndexedDB error:", e.target.error); 
                r(); 
            };
            
            req.onblocked = () => {
                alert("Будь ласка, закрийте інші вкладки з цією програмою для оновлення бази даних.");
            }
        });
    },
    add(week, file) {
        return new Promise((r) => {
            if(!this.db) { r(); return; }
            const reader = new FileReader();
            reader.onload = () => { 
                this.db.transaction(["photos"], "readwrite").objectStore("photos").add({ week: week, data: reader.result });
                r(); 
            };
            reader.readAsDataURL(file);
        });
    },
    get(week) {
        return new Promise((r) => {
            if(!this.db) { r([]); return; }
            const res = [];
            this.db.transaction(["photos"], "readonly").objectStore("photos").openCursor().onsuccess = (e) => {
                const c = e.target.result;
                if(c) { 
                    if(c.value.week === week) res.push({...c.value, id:c.key}); 
                    c.continue(); 
                } else r(res);
            };
        });
    },
    del(id) {
        return new Promise((r) => { 
            if(!this.db) { r(); return; }
            this.db.transaction(["photos"], "readwrite").objectStore("photos").delete(id).onsuccess = () => r(); 
        });
    },
    shiftWeeks(fromWeek, offset) {
        return new Promise(async (resolve) => {
            if(!this.db) { resolve(); return; }
            const tx = this.db.transaction(["photos"], "readwrite");
            const store = tx.objectStore("photos");
            const req = store.openCursor();
            const updates = [];
            req.onsuccess = (e) => {
                const c = e.target.result;
                if(c) { 
                    if(c.value.week >= fromWeek) updates.push({ oldKey: c.key, val: c.value }); 
                    c.continue(); 
                } else {
                    updates.forEach(u => { 
                        store.delete(u.oldKey); 
                        if(u.val.week + offset > 0) store.add({ week: u.val.week + offset, data: u.val.data }); 
                    });
                    resolve();
                }
            };
        });
    },
    keys() {
        return new Promise((r) => {
            if(!this.db) { r(new Set()); return; }
            const k = new Set();
            this.db.transaction(["photos"], "readonly").objectStore("photos").openCursor().onsuccess = (e) => {
                const c = e.target.result;
                if(c) { k.add(c.value.week); c.continue(); } else r(k);
            };
        });
    }
};

const DefaultData = {
    startDate: new Date().toISOString().split('T')[0],
    privacyEnabled: false,
    privacyPassword: '2255',
    
    // Чистий старт: 1 фаза, 1 тиждень
    phases: [
        { id: 1, title: "PHASE 1", weeks: [1] }
    ],
    
    // Повністю пуста матриця на 7 днів для першого тижня
    schedule: {
        "1": [[],[],[],[],[],[],[]]
    },
    
    vitals: {},
    bodyMap: { last: null, history: [] },
    
    // Залишаємо базовий каркас для чекапу (як нагадування), але без зайвої води
    analysis: [
        { title: "ЕТАП 1: ТОЧКА ВХОДУ", timing: "Перед курсом", checks: ["ЗАК + Гематокрит", "Біохімія розширена", "Ліпідограма", "Естрадіол + Пролактин", "Тестостерон заг/вільн", "Ехо-КГ"] },
        { title: "ЕТАП 2: КОНТРОЛЬ", timing: "Тиждень 4-6", checks: ["ЗАК", "Ліпідограма", "Печінкові проби", "Естрадіол + Пролактин"] }
    ],
    
    // Зберігаємо розумне сортування аптечки, але очищаємо самі препарати
    pharmacy: [
        { id: "heart", title: "❤️ СЕРЦЕ & ТИСК", style: "heart", items: [] },
        { id: "liver", title: "🧪 ПЕЧІНКА & НИРКИ", style: "liver", items: [] },
        { id: "sleep", title: "💤 ЦНС & СОН", style: "sleep", items: [] },
        { id: "sos", title: "⚠️ ЕКСТРЕНІ", style: "sos", items: [] }
    ],
    
    notes: {}
};

const compressImage = (file, maxWidth = 1920, quality = 0.85) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        };
    });
};

const App = {
    data: null,
    photoKeys: new Set(),
    
    lockScroll() {
        if (document.body.style.position === 'fixed') return; 
        this.state.lockedScrollY = window.scrollY; 
        document.body.style.position = 'fixed';
        document.body.style.top = `-${this.state.lockedScrollY}px`;
        document.body.style.width = '100%';
        document.body.classList.add('modal-active');
    },
    unlockScroll() {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.classList.remove('modal-active'); // Знімаємо завжди, без умов!
        if (this.state.lockedScrollY !== undefined) {
            window.scrollTo(0, this.state.lockedScrollY);
        }
    },

    stateManager: new StateManager('gold_protocol', DefaultData),
    
    state: { view: 'protocol', phaseId: 1, week: 1, editing: false, tempPill: null, openMenu: null, lockedScrollY: 0, photoModalTicking: false },

    _pharmSortables: [],
    chartInstance: null,
    measChartInstance: null,
    
    photoModalScale: 1,
    photoModalTranslate: { x: 0, y: 0 },
    photoModalIsZooming: false,
    photoModalIsPanning: false,
    photoModalTouchStart: { x: 0, y: 0, scale: 1, dist: 0 },
    photoModalBoundary: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    photoModalSize: { iw: 0, ih: 0, sw: 0, sh: 0 },

    dayBuffer: null,
    pillBuffer: null,

    clearPharmSortables() {
        if (this._pharmSortables && this._pharmSortables.length > 0) {
            this._pharmSortables.forEach(s => { if(s && typeof s.destroy === 'function') s.destroy(); });
        }
        this._pharmSortables = [];
    },

    async safeSave() {
        if(document.body.classList.contains('privacy-mode')) {
            await Modal.alert("⛔ ACCESS DENIED: SYSTEM LOCKED", "ПОМИЛКА", "red");
            return;
        }
        this.smartSave();
    },
    
    async safeLoad() {
        if(document.body.classList.contains('privacy-mode')) {
            await Modal.alert("⛔ ACCESS DENIED: SYSTEM LOCKED", "ПОМИЛКА", "red");
            return;
        }
        document.getElementById('fileInput').click();
    },

    // =========================================================================
    // --- УНІВЕРСАЛЬНИЙ ФОТО-ХАБ ---
    // =========================================================================
    
    viewerState: { week: null, idx: 0, photos: [] },

    async openPhotoModal(week, idx) {
        this.lockScroll();
        
        let modal = document.getElementById('customPhotoModal');
        let img = document.getElementById('customPhotoImg');
        if(!modal || !img) return;

        this.state.photoModalScale = 1;
        this.state.photoModalTranslate = { x: 0, y: 0 };
        this.state.photoModalIsZooming = false;
        this.state.photoModalIsPanning = false;

        img.style.touchAction = 'none';
        modal.classList.add('active');

        this.initPhotoGestures(modal, img);
        
        this.viewerState.week = Number(week);
        this.viewerState.idx = Number(idx);
        
        await this.loadViewerData();
    },

    async loadViewerData() {
        const img = document.getElementById('customPhotoImg');
        this.viewerState.photos = await PhotoDB.get(this.viewerState.week);
        
        if (this.viewerState.idx >= this.viewerState.photos.length) {
            this.viewerState.idx = Math.max(0, this.viewerState.photos.length - 1);
        }
        
        if (this.viewerState.photos.length > 0) {
            img.src = this.viewerState.photos[this.viewerState.idx].data;
        } else {
            img.src = '';
        }
        
        img.onload = () => {
            this.calculatePhotoBoundary(img);
            this.updatePhotoTransform();
        };

        this.updateViewerUI();
    },

    updateViewerUI() {
        const leftBtn = document.getElementById('photoNavLeft');
        const rightBtn = document.getElementById('photoNavRight');
        const bar = document.getElementById('photoWeekSelector');

        if (leftBtn) leftBtn.style.display = this.viewerState.idx > 0 ? 'flex' : 'none';
        if (rightBtn) rightBtn.style.display = this.viewerState.idx < this.viewerState.photos.length - 1 ? 'flex' : 'none';

        if (bar) {
            const keys = Array.from(this.photoKeys).sort((a,b) => a - b);
            
            if (keys.length > 0) {
                // Замінюємо горизонтальний скрол на зручний селект
                bar.innerHTML = `
                    <div style="position: relative; display: flex; align-items: center;">
                        <select style="background: transparent; color: var(--primary); border: none; font-size: 1rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; outline: none; appearance: none; -webkit-appearance: none; padding: 4px 30px 4px 20px; cursor: pointer; width: 100%; text-align: center;" onchange="App.changeViewerWeek(parseInt(this.value))" ontouchstart="event.stopPropagation()">
                            ${keys.map(k => `<option value="${k}" style="color: #000; background: #fff;" ${k === this.viewerState.week ? 'selected' : ''}>W${k}</option>`).join('')}
                        </select>
                        <div style="position: absolute; right: 12px; pointer-events: none; font-size: 0.7rem; color: var(--primary);">▼</div>
                    </div>
                `;
                bar.style.display = 'block';
            } else {
                bar.style.display = 'none';
            }
        }
    },
    navViewerPose(dir) {
        this.viewerState.idx += dir;
        this.state.photoModalScale = 1;
        this.state.photoModalTranslate = { x: 0, y: 0 };
        this.updatePhotoTransform();
        this.loadViewerData();
    },

    changeViewerWeek(newWeek) {
        if (this.viewerState.week === newWeek) return;
        this.viewerState.week = newWeek;
        this.state.photoModalScale = 1;
        this.state.photoModalTranslate = { x: 0, y: 0 };
        this.updatePhotoTransform();
        this.loadViewerData();
    },

    closePhotoModal() {
        const modal = document.getElementById('customPhotoModal');
        if(!modal) return;
        
        modal.classList.remove('active');
        this.unlockScroll();
    },

    initPhotoGestures(modal, img) {
        const newModal = modal.cloneNode(true);
        modal.parentNode.replaceChild(newModal, modal);
        const newImg = newModal.querySelector('img');

        newModal.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.state.photoModalIsPanning = true;
                this.state.photoModalTouchStart.x = e.touches[0].clientX - this.state.photoModalTranslate.x;
                this.state.photoModalTouchStart.y = e.touches[0].clientY - this.state.photoModalTranslate.y;
                newModal.classList.add('is-pan');
            }
            else if (e.touches.length === 2) {
                this.state.photoModalIsZooming = true;
                this.state.photoModalIsPanning = false; 
                this.state.photoModalTouchStart.dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                this.state.photoModalTouchStart.scale = this.state.photoModalScale;
                newModal.classList.add('is-zoom');
                newModal.classList.remove('is-pan');
            }
        }, { passive: false });

        newModal.addEventListener('touchmove', (e) => {
            // ФІКС СТРОЛУ: Дозволяємо нативний скрол, якщо торкаємось панелі тижнів
            if (e.target.closest('.photo-week-bar')) return;
            
            e.preventDefault(); // Блокуємо скрол самого вікна для панорамування/зуму

            if (this.state.photoModalIsZooming && e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                
                const newScale = this.state.photoModalTouchStart.scale * (dist / this.state.photoModalTouchStart.dist);
                this.state.photoModalScale = Math.min(Math.max(1, newScale), 4);
                
                this.calculatePhotoBoundary(newImg);
                this.enforcePhotoBoundary();
                
                // Рендер через rAF (знімає лаги)
                if (!this.state.photoModalTicking) {
                    window.requestAnimationFrame(() => {
                        this.updatePhotoTransform();
                        this.state.photoModalTicking = false;
                    });
                    this.state.photoModalTicking = true;
                }
            }
            else if (this.state.photoModalIsPanning && e.touches.length === 1 && !this.state.photoModalIsZooming) {
                let newX = e.touches[0].clientX - this.state.photoModalTouchStart.x;
                let newY = e.touches[0].clientY - this.state.photoModalTouchStart.y;
                
                if (this.state.photoModalScale <= 1.05) {
                    newX *= 0.3; 
                    newY *= 0.3;
                } 
                else {
                    newX = Math.min(Math.max(newX, this.state.photoModalBoundary.minX - 30), this.state.photoModalBoundary.maxX + 30);
                    newY = Math.min(Math.max(newY, this.state.photoModalBoundary.minY - 30), this.state.photoModalBoundary.maxY + 30);
                }

                this.state.photoModalTranslate.x = newX;
                this.state.photoModalTranslate.y = newY;
                
                // Рендер через rAF
                if (!this.state.photoModalTicking) {
                    window.requestAnimationFrame(() => {
                        this.updatePhotoTransform();
                        this.state.photoModalTicking = false;
                    });
                    this.state.photoModalTicking = true;
                }
            }
        }, { passive: false });

        newModal.addEventListener('touchend', (e) => {
            this.state.photoModalIsZooming = false;
            this.state.photoModalIsPanning = false;
            newModal.classList.remove('is-zoom', 'is-pan');
            
            if (this.state.photoModalScale <= 1.05) {
                this.state.photoModalScale = 1;
                this.state.photoModalTranslate = { x: 0, y: 0 };
                this.calculatePhotoBoundary(newImg); 
                this.enforcePhotoBoundary();
            } 
            else {
                this.calculatePhotoBoundary(newImg);
                this.enforcePhotoBoundary();
            }
            
            this.updatePhotoTransform();
        });

        let lastTap = 0;
        newImg.addEventListener('touchend', (e) => {
            const now = new Date().getTime();
            if (now - lastTap < 300) {
                if (this.state.photoModalScale > 1) {
                    this.state.photoModalScale = 1;
                    this.state.photoModalTranslate = { x: 0, y: 0 };
                } else {
                    this.state.photoModalScale = 2.5;
                    this.state.photoModalTranslate = { x: 0, y: 0 }; 
                }
                this.calculatePhotoBoundary(newImg);
                this.updatePhotoTransform();
            }
            lastTap = now;
        });

        newModal.addEventListener('click', (e) => {
            if (e.target === newModal) {
                this.closePhotoModal();
            }
        });
    },

    calculatePhotoBoundary(img) {
        this.state.photoModalSize.iw = img.naturalWidth;
        this.state.photoModalSize.ih = img.naturalHeight;
        this.state.photoModalSize.sw = window.innerWidth;
        this.state.photoModalSize.sh = window.innerHeight;

        const scale = this.state.photoModalScale;
        const iw = this.state.photoModalSize.iw;
        const ih = this.state.photoModalSize.ih;
        const sw = this.state.photoModalSize.sw;
        const sh = this.state.photoModalSize.sh;

        const ratio = iw / ih;
        let finalW, finalH;
        
        if (sw / sh > ratio) {
            finalH = sh; finalW = sh * ratio;
        } else {
            finalW = sw; finalH = sw / ratio;
        }

        const curW = finalW * scale;
        const curH = finalH * scale;

        this.state.photoModalBoundary.maxX = curW > sw ? (curW - sw) / 2 : 0;
        this.state.photoModalBoundary.minX = -this.state.photoModalBoundary.maxX;
        
        this.state.photoModalBoundary.maxY = curH > sh ? (curH - sh) / 2 : 0;
        this.state.photoModalBoundary.minY = -this.state.photoModalBoundary.maxY;
    },

    enforcePhotoBoundary() {
        let x = this.state.photoModalTranslate.x;
        let y = this.state.photoModalTranslate.y;
        
        x = Math.min(Math.max(x, this.state.photoModalBoundary.minX), this.state.photoModalBoundary.maxX);
        y = Math.min(Math.max(y, this.state.photoModalBoundary.minY), this.state.photoModalBoundary.maxY);
        
        this.state.photoModalTranslate.x = x;
        this.state.photoModalTranslate.y = y;
    },

    updatePhotoTransform() {
        const img = document.getElementById('customPhotoImg');
        if(!img) return;
        
        const x = this.state.photoModalTranslate.x;
        const y = this.state.photoModalTranslate.y;
        const s = this.state.photoModalScale;
        
        img.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
    },

    availablePills: [],

    initCustomDropdown() {
        const input = document.getElementById('pillName');
        const arrow = document.getElementById('pillNameArrow');
        const list = document.getElementById('custom-pill-list');
        const group = document.getElementById('pillNameGroup');
        
        if(!input || !arrow || !list) return;

        const renderList = (filterText = '') => {
            const matches = this.availablePills.filter(p => p.toLowerCase().includes(filterText.toLowerCase()));
            if(matches.length === 0) {
                list.innerHTML = `<div style="padding:12px 15px; color:#666; font-size:0.85rem; text-align:center;">Немає збігів</div>`;
            } else {
                list.innerHTML = matches.map(m => `
                    <div class="custom-pill-option" style="padding: 12px 15px; border-bottom: 1px solid #222; color: #fff; font-size: 0.95rem; cursor: pointer; transition: 0.2s;" 
                         onclick="App.selectCustomPill('${m.replace(/'/g, "\\'")}')">
                        ${m}
                    </div>
                `).join('');
            }
        };

        arrow.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if(list.style.display === 'block') {
                this.closeCustomDropdown();
            } else {
                renderList(''); 
                list.style.display = 'block';
                arrow.querySelector('svg').style.transform = 'rotate(180deg)';
                arrow.style.color = 'var(--primary)';
            }
        });

        input.addEventListener('input', () => {
            renderList(input.value);
            list.style.display = 'block';
            arrow.querySelector('svg').style.transform = 'rotate(180deg)';
            arrow.style.color = 'var(--primary)';
        });

        document.addEventListener('click', (e) => {
            if(group && !group.contains(e.target)) {
                this.closeCustomDropdown();
            }
        });
    },

    closeCustomDropdown() {
        const list = document.getElementById('custom-pill-list');
        const arrow = document.getElementById('pillNameArrow');
        if(list && arrow) {
            list.style.display = 'none';
            const svg = arrow.querySelector('svg');
            if(svg) svg.style.transform = 'rotate(0deg)';
            arrow.style.color = '#666';
        }
    },

    selectCustomPill(val) {
        document.getElementById('pillName').value = val;
        this.closeCustomDropdown();
        document.getElementById('pillDose').focus(); 
    },

    openAddPillModal(week, dayIndex) {
        this.lockScroll(); 
        if(document.activeElement) document.activeElement.blur();
        this.state.lastScroll = window.scrollY; 

        this.state.tempPill = { w: week, d: dayIndex, color: 'c-blue' };
        
        const doseInput = document.getElementById('pillDose');
        if(doseInput) {
            doseInput.type = 'text'; 
            doseInput.removeAttribute('inputmode');
        }

        document.getElementById('pillName').value = ''; 
        document.getElementById('pillDose').value = ''; 
        document.getElementById('pillMeta').value = '';
        
        const freqSelect = document.getElementById('pillFreq');
        if (freqSelect) freqSelect.value = 'once';
        
        document.querySelectorAll('.color-opt').forEach(el => el.classList.remove('selected'));
        document.querySelector('.color-opt').classList.add('selected'); 
        
        this.closeCustomDropdown(); 
        this.updateSuggestions();
        document.getElementById('addPillModal').style.display = 'flex';
        setTimeout(() => document.getElementById('pillName').focus(), 100);
    },

    async init() {
        const extraStyles = document.createElement('style');
        extraStyles.innerHTML = `
            @keyframes goldShimmer {
                0% { background-position: 200% center; }
                100% { background-position: -200% center; }
            }
            #progBar {
                background: linear-gradient(90deg, var(--primary) 25%, #fff2a8 50%, var(--primary) 75%) !important;
                background-size: 200% auto !important;
                animation: goldShimmer 2.5s linear infinite !important;
                border-radius: 20px !important; /* ФІКС КУТІВ */
            }
            @media (hover: hover) {
                .custom-pill-option:hover { background: #333 !important; }
            }
            
            #pillName::-webkit-calendar-picker-indicator { display: none !important; }
            
            .date-picker-wrapper { 
                position: relative; display: inline-flex; align-items: center; 
                justify-content: center; margin-left: 6px; vertical-align: middle; 
                width: 28px; height: 28px; cursor: pointer; 
            }
            body.privacy-mode .date-picker-wrapper { 
                pointer-events: none !important; 
            }
            .date-hidden-input { 
                position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
                opacity: 0; cursor: pointer; z-index: 10; border: none; background: transparent; color: transparent; 
            }
            .date-hidden-input::-webkit-calendar-picker-indicator { 
                position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
                opacity: 0; cursor: pointer; padding: 0; margin: 0; display: block !important;
            }
            
            .pill { overflow: visible !important; }
            
            .kebab-menu-dropdown {
                position: absolute; right: 0; top: calc(100% + 5px); 
                background: #18181b; border: 1px solid #3f3f46;
                border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.9); 
                z-index: 99999 !important; min-width: 220px; display: flex; flex-direction: column;
                overflow: hidden; animation: fadeEffect 0.2s ease-out; text-align: left;
                transform: translateZ(0);
            }
            .kebab-menu-item:first-child { border-radius: 16px 16px 0 0; }
            .kebab-menu-item:last-child { border-radius: 0 0 16px 16px; border-bottom: none; }
            
            .kebab-menu-item {
                padding: 12px 15px; display: flex; align-items: center; gap: 12px;
                font-size: 0.85rem; color: #e4e4e7; cursor: pointer; transition: background 0.2s;
                border-bottom: 1px solid rgba(255,255,255,0.05); background: transparent;
            }
            .kebab-menu-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
        `;
        document.head.appendChild(extraStyles);
        await PhotoDB.init();
        await this.load(); 
    
        this.migrateVitals();
        await this.refreshPhotos();
        this.initCustomDropdown();
        
        const now = new Date();
        const start = this.getMondayOfStartWeek();
        const diffTime = now.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        let currentWeek = Math.floor(diffDays / 7) + 1; 
        
        const maxW = Math.max(...Object.keys(this.data.schedule).map(Number));
        if (currentWeek < 1) currentWeek = 1;
        if (currentWeek > maxW) currentWeek = maxW;
        
        this.state.week = currentWeek; 
        
        const currentPhase = this.data.phases.find(p => p.weeks.includes(currentWeek));
        if (currentPhase) this.state.phaseId = currentPhase.id;

        this.renderNav(); 
        this.renderView();
        
        if (this.data.privacyEnabled) {
            document.body.classList.add('privacy-mode', 'privacy-locked');
        }
        
        setTimeout(() => {
            const cb = document.getElementById('privacyAutoLock');
            if (cb) cb.checked = this.data.privacyEnabled || false;
        }, 100);
        
        const brandBlock = document.querySelector('.brand');
        const brandIcon = document.querySelector('.brand-icon');

        brandBlock.onclick = () => {
            if (document.body.classList.contains('privacy-mode')) return;
            brandIcon.classList.remove('hint-active');
            void brandIcon.offsetWidth; 
            brandIcon.classList.add('hint-active');
        };
        
        brandBlock.ondblclick = async () => {
            if (document.body.classList.contains('privacy-mode')) return;
            if(await Modal.confirm("⚠ HARD RESET? Це знищить усі дані.", "КРИТИЧНО", "red")) {
                localStorage.removeItem('gold_protocol');
                localStorage.removeItem('pharm_manual_lock');
                localStorage.removeItem('protocol_global_vitals'); 
                try { indexedDB.deleteDatabase("GoldProtocolDB"); } catch(e) {}
                location.reload();
            }
        };

        document.addEventListener('click', (e) => {
            if (this.state.openMenu) {
                const menuEl = document.getElementById('global-kebab-menu');
                // Якщо клік не по меню і не по самій кнопці шестерні - закриваємо
                if (menuEl && !menuEl.contains(e.target) && !e.target.closest('[id^="btn-kebab-"]')) {
                    this.closeGlobalMenu();
                }
            }
        });

        // ПІДКЛЮЧАЄМО СКРОЛ ДЛЯ ФАЗ ПРИ СТАРТІ ДОДАТКУ
        this.attachDragScroll('.phase-scroll');
    },

    // --- ПЛАВНИЙ ПК-СКРОЛ ТА СВАЙП ---
    attachDragScroll(selector) {
        const sliders = document.querySelectorAll(selector);
        sliders.forEach(slider => {
            // Запобіжник від дублювання подій при рендері
            if (slider.dataset.scrollAttached === 'true') return; 
            slider.dataset.scrollAttached = 'true';
            
            // Прокрутка звичайним коліщатком миші
            slider.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    slider.scrollLeft += e.deltaY;
                }
            });

            // Імітація свайпу на ПК (Drag-to-scroll)
            let isDown = false;
            let startX;
            let scrollLeft;

            slider.addEventListener('mousedown', (e) => {
                isDown = true;
                slider.style.cursor = 'grabbing';
                startX = e.pageX - slider.offsetLeft;
                scrollLeft = slider.scrollLeft;
            });
            slider.addEventListener('mouseleave', () => {
                isDown = false;
                slider.style.cursor = 'pointer'; 
            });
            slider.addEventListener('mouseup', () => {
                isDown = false;
                slider.style.cursor = 'pointer';
            });
            slider.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - slider.offsetLeft;
                const walk = (x - startX) * 1.5; // Швидкість свайпу
                slider.scrollLeft = scrollLeft - walk;
            });
        });
    },
    
    // НОВА ФУНКЦІЯ: Міграція старих даних у GlobalVitals
    migrateVitals() {
        let migrated = false;

        // 1. Міграція тиску, пульсу та ваги
        if (this.data.vitals && Object.keys(this.data.vitals).length > 0) {
            for (let key in this.data.vitals) {
                const [w, d] = key.split('-');
                const realDateObj = this.getRealDateObj(parseInt(w), parseInt(d));
                const dateStr = GlobalVitals.formatDate(realDateObj);
                const v = this.data.vitals[key];
                
                if (v.w) GlobalVitals.save(dateStr, 'w', v.w);
                if (v.bp) GlobalVitals.save(dateStr, 'bp', v.bp);
                if (v.hr) GlobalVitals.save(dateStr, 'hr', v.hr);
            }
            this.data.vitals = {}; // Очищаємо старі дані
            migrated = true;
        }

        // 2. Міграція замірів (прив'язуємо до понеділка відповідного тижня)
        if (this.data.measurements && Object.keys(this.data.measurements).length > 0) {
            for (let w in this.data.measurements) {
                const realDateObj = this.getRealDateObj(parseInt(w), 0); // Понеділок
                const dateStr = GlobalVitals.formatDate(realDateObj);
                const m = this.data.measurements[w];
                
                if (m.chest) GlobalVitals.save(dateStr, 'chest', m.chest);
                if (m.waist) GlobalVitals.save(dateStr, 'waist', m.waist);
                if (m.arm) GlobalVitals.save(dateStr, 'arm', m.arm);
                if (m.leg) GlobalVitals.save(dateStr, 'leg', m.leg);
                if (m.calf) GlobalVitals.save(dateStr, 'calf', m.calf);
            }
            this.data.measurements = {}; // Очищаємо старі дані
            migrated = true;
        }

        if (migrated) this.save();
    },

    async load() {
        this.data = await this.stateManager.init();
        
        if(!this.data.vitals) this.data.vitals = {};
        if(!this.data.startDate) this.data.startDate = new Date().toISOString().split('T')[0];
        if(!this.data.bodyMap) this.data.bodyMap = { last: null, history: [] };
        if(this.data.privacyEnabled === undefined) this.data.privacyEnabled = false; // За замовчуванням вимкнено
        if(!this.data.privacyPassword) this.data.privacyPassword = '2255';
        if(!this.data.analysis) this.data.analysis = JSON.parse(JSON.stringify(DefaultData.analysis));
        if(!this.data.pharmacy) this.data.pharmacy = JSON.parse(JSON.stringify(DefaultData.pharmacy));
        if(!this.data.phases) this.data.phases = JSON.parse(JSON.stringify(DefaultData.phases));
        if(!this.data.schedule) this.data.schedule = JSON.parse(JSON.stringify(DefaultData.schedule));
        if(!this.data.measurements) this.data.measurements = {};
    },

    // ДОДАНО
    saveTimer: null,

    save() { 
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => {
            this.stateManager.save(this.data); 
            this.saveTimer = null;
        }, 800);
    },

    // ДОДАНО: Екстрений запис
    forceSave() {
        this.stateManager.save(this.data); 
    },

    // Збереження стану галочки
    toggleAutoLock(val) {
        this.data.privacyEnabled = val;
        this.save();
    },
    
    togglePrivacy() {
        if(document.body.classList.contains('privacy-mode')) {
            document.getElementById('privacyModal').style.display = 'flex';
            document.getElementById('privacyPassword').value = '';
            setTimeout(() => document.getElementById('privacyPassword').focus(), 100);
        } else {
            document.body.classList.add('privacy-mode', 'privacy-locked');
            localStorage.setItem('pharm_manual_lock', 'true'); // <--- ЗАПАМ'ЯТОВУЄМО РУЧНЕ БЛОКУВАННЯ
            if(this.state.editing) this.toggleEdit();
        }
    },
    
    unlockPrivacy() {
        const pwdInput = document.getElementById('privacyPassword');
        pwdInput.blur();
        const pwd = pwdInput.value;
        const truePass = this.data.privacyPassword || '2255';
        const fakePass = '1111';

        const container = document.getElementById('pwdContainer');
        const icon = document.getElementById('privIcon');
        const btn = document.getElementById('unlockBtn');
        const title = container.querySelector('h2'); 
        const sub = container.querySelector('p');    

        const grantAccess = (isFake) => {
            container.classList.add('success');
            pwdInput.style.borderColor = 'var(--green)';
            pwdInput.style.color = 'var(--green)';
            title.innerText = "IDENTITY VERIFIED";
            title.style.color = "var(--green)";
            sub.innerText = "DECRYPTING DATA...";
            sub.style.color = "var(--green)";
            icon.style.transform = 'rotateY(360deg) scale(1.2)';
            setTimeout(() => icon.innerText = '🔓', 200);
            btn.innerText = 'ACCESS GRANTED';

            setTimeout(() => {
                document.getElementById('privacyModal').classList.add('fade-out');
                document.body.classList.remove('privacy-locked', 'privacy-mode');
                localStorage.setItem('pharm_manual_lock', 'false'); // <--- ЗНІМАЄМО РУЧНЕ БЛОКУВАННЯ
                
                if (isFake) {
                    this.enableFakeMode();
                }

                // Запускаємо красиву анімацію жовтої смужки тільки ПІСЛЯ розблокування
                setTimeout(() => this.renderTimeline(), 50);

                setTimeout(() => {
                    document.getElementById('privacyModal').style.display = 'none';
                    document.getElementById('privacyModal').classList.remove('fade-out');
                    container.classList.remove('success');
                    icon.innerText = '🔒'; icon.style.transform = 'none';
                    title.innerText = "ACCESS LOCKED"; title.style.color = "#fff";
                    sub.innerText = "ENTER PASSCODE"; sub.style.color = "#666";
                    btn.innerText = 'UNLOCK';
                    pwdInput.value = ''; pwdInput.style.borderColor = ''; pwdInput.style.color = '';
                }, 800);
            }, 800);
        };

        if (pwd === truePass) {
            grantAccess(false); 
        } else if (pwd === fakePass) {
            grantAccess(true);  
        } else {
            pwdInput.style.borderColor = 'var(--red)';
            pwdInput.style.color = 'var(--red)';
            sub.innerText = "INVALID PASSCODE";
            sub.style.color = "var(--red)";
            container.style.transform = "translateX(10px)";
            setTimeout(() => container.style.transform = "translateX(-10px)", 50);
            setTimeout(() => container.style.transform = "translateX(5px)", 100);
            setTimeout(() => container.style.transform = "translateX(0)", 150);
            pwdInput.value = ''; pwdInput.focus();
            setTimeout(() => {
                pwdInput.style.borderColor = ''; pwdInput.style.color = '';
                sub.innerText = "ENTER PASSCODE"; sub.style.color = "#666";
            }, 1000);
        }
    },

    enableFakeMode() {
        const c = document.getElementById('mainView');
        c.innerHTML = `
            <div style="padding:20px; text-align:center; color:#888;">
                <h2>VITAMIN TRACKER</h2>
                <p>Daily Wellness Plan</p>
            </div>
            <div class="days-grid">
                ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => `
                    <div class="day-card" style="min-height:100px; border-color:#333">
                        <div class="day-header">${d}</div>
                        <div class="pill c-yellow"><div style="flex:1">Omega-3</div><span>1000mg</span></div>
                        <div class="pill c-green"><div style="flex:1">Multivitamin</div><span>1 tab</span></div>
                    </div>
                `).join('')}
            </div>
        `;
        document.querySelector('.nav-tabs').style.display = 'none';
        document.querySelector('.phase-scroll').style.display = 'none';
        document.querySelector('.controls').innerHTML = '<div style="color:#444">User: Guest</div>';
        document.querySelector('.brand h1').innerText = "HEALTH";
        document.querySelector('.brand span').innerText = "DAILY";
    },

    getMondayOfStartWeek() {
        const d = new Date(this.data.startDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    },

    getRealDateObj(week, dayIndex) {
        const monday = this.getMondayOfStartWeek();
        monday.setDate(monday.getDate() + ((week - 1) * 7) + dayIndex);
        return monday;
    },

    getRealDate(week, dayIndex) {
        return this.getRealDateObj(week, dayIndex).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
    },
    
    isToday(week, dayIndex) {
        const d = this.getRealDateObj(week, dayIndex);
        d.setHours(0,0,0,0);
        const now = new Date();
        now.setHours(0,0,0,0);
        return d.getTime() === now.getTime();
    },
    
        // 1. АНАЛІТИЧНИЙ ФІКС: Блокуємо подвійний клік для ПК
    lockCalendar() {
        this.calendarLocked = true;
        setTimeout(() => { this.calendarLocked = false; }, 300); // Блокування на 300мс при закритті
    },

    async changeStartDate() {
        if(document.body.classList.contains('privacy-mode')) return; 
        if (this.calendarLocked) return;

        const inp = document.getElementById('hiddenDateInp');
        if (inp) {
            try { 
                // ФІКС: Спочатку викликаємо пікер, а потім м'яко ставимо фокус
                inp.showPicker(); 
                setTimeout(() => inp.focus(), 10);
            } catch(e) { 
                inp.click(); 
                inp.focus();
            }
        }
    },


    setStartDate(newDate) {
        if (!newDate) return;
        this.pushHistory();
        this.data.startDate = newDate;
        this.save();
        
        const now = new Date();
        const start = this.getMondayOfStartWeek();
        const diffTime = now.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        let currentWeek = Math.floor(diffDays / 7) + 1; 
        
        const maxW = Math.max(...Object.keys(this.data.schedule).map(Number));
        if (currentWeek < 1) currentWeek = 1;
        if (currentWeek > maxW) currentWeek = maxW;
        
        this.state.week = currentWeek; 
        const currentPhase = this.data.phases.find(p => p.weeks.includes(currentWeek));
        if (currentPhase) this.state.phaseId = currentPhase.id;
        
        this.renderNav();
        this.renderView();
    },

    pushHistory() {
        this.stateManager.push(this.data);
        if (this.state.editing) {
            const btn = document.getElementById('undoFloat');
            if(btn) btn.classList.add('visible');
        }
    },

    undo() {
        const prev = this.stateManager.undo(this.data); 
        if (prev) {
            this.data = prev;
            
            if (this.stateManager.history.length === 0) {
                const btn = document.getElementById('undoFloat');
                if(btn) btn.classList.remove('visible');
            }
            
            this.save(); 
            this.refreshPhotos(); 
            this.renderNav(); 
            this.renderView();
        }
    },

    async renderView() {
        const c = document.getElementById('mainView'); 
        this.renderTimeline();
        
        if(this.state.view === 'protocol') {
            await this.renderProtocol(c); 
        }
        else {
            c.innerHTML = ''; 
            if(this.state.view === 'analysis') this.renderAnalysis(c);
            else if(this.state.view === 'pharmacy') this.renderPharm(c);
            else if(this.state.view === 'analytics') this.renderAnalytics(c);
        }
    },

    renderTimeline() {
        const weekNumbers = Object.keys(this.data.schedule).map(Number);
        const maxW = weekNumbers.length > 0 ? Math.max(...weekNumbers) : 1;
        const curW = this.state.week;
        const pct = Math.min(100, (curW / maxW) * 100);
        
        const progBar = document.getElementById('progBar');
        const progText = document.getElementById('progText');

        if (!progBar) return;

        if (document.body.classList.contains('privacy-locked')) {
            progBar.style.cssText = `width: 0px !important; transition: none !important;`;
        } else {
            if (!progBar.style.width || progBar.style.width === '0px' || progBar.style.width === '0%') {
                progBar.style.cssText = `width: 0%; transition: none !important;`;
                setTimeout(() => {
                    progBar.style.transition = 'width 1.2s cubic-bezier(0.25, 1, 0.5, 1)';
                    progBar.style.width = pct + '%';
                }, 50);
            } else {
                progBar.style.transition = 'width 0.4s ease-out';
                progBar.style.width = pct + '%';
            }
        }

        if (progText) {
            const activeTab = document.querySelector('.nav-tab.active');
            const isProtocol = activeTab ? activeTab.innerText.toLowerCase().includes('protocol') : true;

            // ФІКС КАЛЕНДАРЯ: Додано id="hiddenDateInp", фокус та onblur для відстеження закриття
            progText.innerHTML = `Week ${curW}/${maxW} 
            <span class="date-picker-wrapper" title="Змінити дату старту курсу" style="display: ${isProtocol ? 'inline-flex' : 'none'}; cursor: pointer;" onclick="App.changeStartDate()">
                <span style="font-size:1.2rem; pointer-events:none;">📅</span>
                <input type="date" id="hiddenDateInp" value="${this.data.startDate}" 
                    style="position:absolute; opacity:0; width:1px; height:1px; border:none; padding:0; z-index:-1;"
                    onchange="if(!document.body.classList.contains('privacy-mode')) { App.setStartDate(this.value); }"
                    onblur="App.lockCalendar()">
            </span>`;
        }
    },
            async renderProtocol(c) {
        let weekScrollPos = 0;
        const oldWeekBar = document.querySelector('.week-bar');
        if (oldWeekBar) weekScrollPos = oldWeekBar.scrollLeft;

        const ph = this.data.phases.find(x => x.id === this.state.phaseId);
        const wHtml = ph ? ph.weeks.map(w => `<div class="week-btn ${w === this.state.week ? 'active' : ''} ${this.photoKeys.has(w) ? 'has-data' : ''}" onclick="App.setWeek(${w})">${w}</div>`).join('') : '';
        const pasteToWeekHtml = (this.state.editing && this.pillBuffer) ? `
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px dashed var(--green); color: var(--green); padding: 12px; border-radius: 12px; text-align: center; margin-bottom: 15px; cursor: pointer; font-weight: 800; font-size: 0.9rem;" onclick="App.pastePillToWeek(${this.state.week})">
                🗓 ВСТАВИТИ [${this.pillBuffer.name.toUpperCase()}] НА ВЕСЬ ТИЖДЕНЬ
            </div>
        ` : '';
        let grid = '<div class="days-grid">';
        const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

        for (let i = 0; i < 7; i++) {
            const realDate = this.getRealDate(this.state.week, i);
            const isToday = this.isToday(this.state.week, i);
            const pills = this.data.schedule[this.state.week]?.[i] || [];
            const dateStr = GlobalVitals.formatDate(this.getRealDateObj(this.state.week, i));
            const v = GlobalVitals.get(dateStr);
            let sys = "", dia = "";
            if (v.bp && v.bp.includes('/')) {
                const parts = v.bp.split('/');
                sys = parts[0]; dia = parts[1];
            } else if (v.bp) {
                sys = v.bp; 
            }

            let content = pills.map((m, idx) => {
                const pillId = `${this.state.week}-${i}-${idx}`;
                
                const isDone = m.done ? 'opacity: 0.35; filter: grayscale(1); transform: scale(0.98); border-color: transparent;' : '';
const checkIcon = m.done ? `<div class="done-check-icon" style="position:absolute; right:-8px; top:-8px; background:var(--green); color:#000; border-radius:50%; width:22px; height:22px; font-size:13px; font-weight:900; display:flex; align-items:center; justify-content:center; z-index:2; box-shadow:0 2px 6px rgba(0,0,0,0.8);">✓</div>` : '';

const textPointer = this.state.editing ? 'auto' : 'none';
const innerStop = this.state.editing ? 'onclick="event.stopPropagation()"' : '';
const clickAction = this.state.editing ? '' : `onclick="App.togglePillDone(${this.state.week}, ${i}, ${idx})"`;

const isMenuOpen = this.state.openMenu === pillId;

return `
<div id="pill-node-${this.state.week}-${i}-${idx}" class="pill ${m.color}" style="position:relative; display:flex; align-items:center; width:100%; ${isDone} cursor:pointer; transition:all 0.3s cubic-bezier(0.25,0.8,0.25,1); z-index:${isMenuOpen ? '9999' : '1'};" ${clickAction}>
                    ${checkIcon}
                    <div style="flex:1; pointer-events:${textPointer}; display:flex; flex-direction:column; justify-content:center; padding-right:10px;">
                        <div contenteditable="${this.state.editing}" onblur="App.updatePill(${this.state.week},${i},${idx},'name',this.innerText)" ${innerStop} style="font-weight:600; line-height:1.2;">${m.name}</div>
                        <div class="pill-meta" contenteditable="${this.state.editing}" onblur="App.updatePill(${this.state.week},${i},${idx},'meta',this.innerText)" ${innerStop} style="margin-top:2px;">${m.meta || ""}</div>
                    </div>
                    
                    <div style="display:flex; align-items:center; margin-left:auto; gap:12px;">
                        <span contenteditable="${this.state.editing}" onblur="App.updatePill(${this.state.week},${i},${idx},'dose',this.innerText)" style="pointer-events:${textPointer}; text-align:right; font-weight:800; font-family:'JetBrains Mono', monospace;" ${innerStop}>${m.dose}</span>
                        
                        ${this.state.editing ? `
                            <div style="position:relative; pointer-events:auto;">
                                ${this.getMenuUI(this.state.week, i, idx, m.name, false)}
                            </div>
                        ` : ''}
                    </div>
                </div>`;
            }).join('');
                
            let headerBtns = '';
            if (this.state.editing) {
                // Кнопка вставки окремого препарату
                if (this.pillBuffer) {
                    headerBtns += `<div style="flex-shrink:0; font-size:1.1rem; cursor:pointer; color:#fff; display:flex; align-items:center; justify-content:center; width:34px; height:34px; background:rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius:12px; margin-right:4px; transition:0.2s;" onclick="event.stopPropagation(); App.pastePill(${this.state.week}, ${i})" title="ВСТАВИТИ ПРЕПАРАТ">📥</div>`;
                }
                // НОВА КНОПКА: Вставка цілого дня (якщо день скопійовано)
                if (this.dayBuffer) {
                    headerBtns += `<div style="flex-shrink:0; font-size:1.1rem; cursor:pointer; color:#fff; display:flex; align-items:center; justify-content:center; width:34px; height:34px; background:rgba(212, 175, 55, 0.15); border: 1px solid rgba(212, 175, 55, 0.3); border-radius:12px; margin-right:4px; transition:0.2s;" onclick="event.stopPropagation(); App.pasteDay(${this.state.week}, ${i})" title="ВСТАВИТИ ДЕНЬ">📝</div>`;
                }
                // Кнопка копіювання дня (завжди тільки копіює)
                headerBtns += `<div style="flex-shrink:0; font-size:1rem; cursor:pointer; color:#fff; display:flex; align-items:center; justify-content:center; width:34px; height:34px; background:rgba(255,255,255,0.05); border-radius:12px; border: 1px solid rgba(255,255,255,0.1); transition:0.2s;" onclick="event.stopPropagation(); App.copyDay(${this.state.week}, ${i})" title="Копіювати день">📋</div>`;
            }

            grid += `<div class="day-card" style="${isToday ? 'border-color:var(--primary); box-shadow:0 0 15px rgba(212,175,55,0.15)' : ''}">
                <div class="day-header" style="display:flex; justify-content:space-between; align-items:center; padding: 12px 15px; border-bottom:1px solid rgba(255,255,255,0.05); background:linear-gradient(to right, rgba(255,255,255,0.02), transparent); border-top-left-radius: 16px; border-top-right-radius: 16px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:1.05rem; font-weight:800; color:#fff; text-transform:uppercase;">${dayNames[i]}</span>
                        <span style="font-size:0.75rem; color:var(--primary); font-weight:700; letter-spacing:1px; background:rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.2); padding:3px 6px; border-radius:4px; font-family:'JetBrains Mono', monospace;">${realDate}</span>
                    </div>
                    <div style="display:flex; align-items:center; margin-left:auto;">${headerBtns}</div>
                </div>
                <div class="day-pills-container" id="day-pills-${this.state.week}-${i}">
                    ${content}
                </div>
                <div class="btn-add-pill edit-ui" onclick="App.openAddPillModal(${this.state.week},${i})">+</div>
                
                <div class="vitals-row">
                    <div class="bp-wrapper" title="Тиск (Систолічний / Діастолічний)">
                        <input class="bp-input" type="number" inputmode="numeric" placeholder="120" value="${sys}" 
                            id="sys-${this.state.week}-${i}"
                            oninput="if(this.value.length >= 3) document.getElementById('dia-${this.state.week}-${i}').focus()" 
                            onblur="App.saveBP(${this.state.week},${i},'sys',this.value)">
                        <span class="bp-separator">/</span>
                        <input class="bp-input" type="number" inputmode="numeric" placeholder="80" value="${dia}" 
                            id="dia-${this.state.week}-${i}"
                            onkeydown="if(event.key === 'Backspace' && this.value === '') document.getElementById('sys-${this.state.week}-${i}').focus()"
                            onblur="App.saveBP(${this.state.week},${i},'dia',this.value)">
                    </div>
                    <input class="vital-input" type="number" inputmode="numeric" placeholder="Пульс" value="${v.hr || ''}" onblur="App.saveVital(${this.state.week},${i},'hr',this.value)">
                    <input class="vital-input" type="text" inputmode="decimal" placeholder="Вага" value="${v.w || ''}" 
                        oninput="this.value = this.value.replace(',', '.').replace(/[^0-9.]/g, '')" 
                        onblur="App.saveVital(${this.state.week},${i},'w',this.value)">
                </div>
            </div>`;
        }
        grid += '</div>';

        const photos = await PhotoDB.get(this.state.week);
        const pHtml = photos.map((p, idx) => `<div class="photo-card"><img src="${p.data}" onclick="App.openPhotoModal(${this.state.week}, ${idx})"><div class="photo-del" onclick="event.stopPropagation(); App.deletePhoto(${p.id})">✕</div></div>`).join('');

        const mondayDateStr = GlobalVitals.formatDate(this.getRealDateObj(this.state.week, 0));
        const meas = GlobalVitals.get(mondayDateStr);
        const statsHtml = this.getStatsHtml(this.state.week);

        const finalHtml = `
            <div class="stats-grid" id="stats-container">${statsHtml}</div>
            <div class="week-bar">${wHtml}</div>
            ${pasteToWeekHtml}
            ${grid}
            
            <div style="background: var(--bg-panel); border: 1px solid var(--border); border-radius: 16px; padding: 15px; margin-top: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px dashed #333;">
                    <span style="color:#fff; font-size:0.9rem; font-weight:800; letter-spacing:1px;">📏 ЗАМІРИ ТІЛА (см)</span>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 15px;">
                    <div style="text-align:center"><div style="font-size:0.55rem; color:#888; font-weight:700; margin-bottom:4px;">ГРУДИ</div><input class="vital-input" type="text" inputmode="decimal" placeholder="-" value="${meas.chest}" oninput="this.value = this.value.replace(/[^0-9.,]/g, '')" onblur="App.saveMeas(${this.state.week}, 'chest', this.value)" style="padding:6px 2px;"></div>
                    <div style="text-align:center"><div style="font-size:0.55rem; color:#888; font-weight:700; margin-bottom:4px;">ТАЛІЯ</div><input class="vital-input" type="text" inputmode="decimal" placeholder="-" value="${meas.waist}" oninput="this.value = this.value.replace(/[^0-9.,]/g, '')" onblur="App.saveMeas(${this.state.week}, 'waist', this.value)" style="padding:6px 2px;"></div>
                    <div style="text-align:center"><div style="font-size:0.55rem; color:#888; font-weight:700; margin-bottom:4px;">БІЦЕПС</div><input class="vital-input" type="text" inputmode="decimal" placeholder="-" value="${meas.arm}" oninput="this.value = this.value.replace(/[^0-9.,]/g, '')" onblur="App.saveMeas(${this.state.week}, 'arm', this.value)" style="padding:6px 2px;"></div>
                    <div style="text-align:center"><div style="font-size:0.55rem; color:#888; font-weight:700; margin-bottom:4px;">СТЕГНО</div><input class="vital-input" type="text" inputmode="decimal" placeholder="-" value="${meas.leg}" oninput="this.value = this.value.replace(/[^0-9.,]/g, '')" onblur="App.saveMeas(${this.state.week}, 'leg', this.value)" style="padding:6px 2px;"></div>
                    <div style="text-align:center"><div style="font-size:0.55rem; color:#888; font-weight:700; margin-bottom:4px;">ГОМІЛКА</div><input class="vital-input" type="text" inputmode="decimal" placeholder="-" value="${meas.calf}" oninput="this.value = this.value.replace(/[^0-9.,]/g, '')" onblur="App.saveMeas(${this.state.week}, 'calf', this.value)" style="padding:6px 2px;"></div>
                </div>

                <textarea class="note-input" style="margin-top:0; border-color:#222; background:#0a0a0a;" placeholder="Звіт за тиждень, самопочуття, нотатки..." onblur="App.saveNote(${this.state.week}, this.value)">${this.data.notes[this.state.week] || ""}</textarea>
            </div>

            <div class="photo-area">
                <h3 style="color:#fff;font-size:1rem;margin:0 0 10px 0">📸 ФОТО W${this.state.week}</h3>
                <div class="photo-grid">${pHtml}</div>
                <label class="btn-upload edit-ui" style="margin-top:10px;display:block">+ Завантажити фото<input type="file" id="photoInput" accept="image/*" multiple onchange="App.uploadPhoto(this)"></label>
            </div>`;

       // Відкладаємо важку операцію зміни DOM на наступний доступний кадр
        window.requestAnimationFrame(() => {
            c.innerHTML = finalHtml;
            const newWeekBar = document.querySelector('.week-bar');
            if (newWeekBar) {
                newWeekBar.scrollLeft = weekScrollPos;
                this.attachDragScroll('.week-bar'); 
            }

            // 1. ОЧИЩАЄМО КЕШ СОРТУВАННЯ (запобіжник від витоку пам'яті)
            if (typeof this.clearPharmSortables === 'function') {
                this.clearPharmSortables();
            }

            // 2. Ініціалізація Drag & Drop для препаратів ТІЛЬКИ в режимі редагування
            if (this.state.editing && typeof Sortable !== 'undefined') {
                for(let i=0; i<7; i++) {
                    const container = document.getElementById(`day-pills-${this.state.week}-${i}`);
                    if (container && container.children.length > 1) {
                        
                        // КРИТИЧНИЙ ФІКС: додано "const s =" 
                        const s = Sortable.create(container, {
                            animation: 200,
                            delay: 150, // Затримка для мобільних пристроїв, щоб не конфліктувало зі скролом
                            delayOnTouchOnly: true,
                            ghostClass: 'sortable-ghost',
                            onEnd: (evt) => {
                                if (evt.oldIndex !== evt.newIndex) {
                                    this.pushHistory();
                                    // Вирізаємо препарат і вставляємо на нове місце
                                    const movedPill = this.data.schedule[this.state.week][i].splice(evt.oldIndex, 1)[0];
                                    this.data.schedule[this.state.week][i].splice(evt.newIndex, 0, movedPill);
                                    
                                    this.save();
                                    if(window.Haptics) window.Haptics.light();
                                }
                            }
                        });
                        this._pharmSortables.push(s); // Тепер помилки не буде
                    }
                }
            }
        });
      },


    renderAnalytics(c) {
        c.innerHTML = `
            <div style="animation: fadeEffect 0.6s ease-out; padding-bottom: 30px;">
                <div class="chart-container" style="position:relative; height:350px; margin: 10px 0;">
                    <canvas id="mainChart" style="touch-action: pan-y;"></canvas>
                </div>
                <div style="display:flex; justify-content:center; flex-wrap:wrap; gap:15px; margin-top:15px; font-family:'JetBrains Mono'; font-size:0.75rem; color:#888;">
                    <div style="display:flex; align-items:center; gap:8px; cursor:pointer; transition:0.2s" onclick="App.toggleDataset('main', 0, this)"><div style="width:12px; height:12px; background:#ffffff; border-radius:50%;"></div><span style="color:#aaa; font-weight:500;">ВАГА</span></div>
                    <div style="display:flex; align-items:center; gap:8px; cursor:pointer; transition:0.2s" onclick="App.toggleDataset('main', 1, this)"><div style="width:12px; height:12px; background:#8b5cf6; border-radius:50%;"></div><span style="color:#aaa; font-weight:500;">STACK</span></div>
                    <div style="display:flex; align-items:center; gap:8px; cursor:pointer; transition:0.2s" onclick="App.toggleDataset('main', 2, this)"><div style="width:12px; height:12px; background:#ffd700; border-radius:50%;"></div><span style="color:#aaa; font-weight:500;">TEST BASE</span></div>
                </div>

                <h3 style="color:#fff; font-size:1rem; margin: 40px 0 10px 0; text-align:center; letter-spacing:1px; font-weight:800;">📏 ДИНАМІКА ЗАМІРІВ (см)</h3>
                <div class="chart-container" style="position:relative; height:300px; margin: 10px 0;">
                    <canvas id="measChart" style="touch-action: pan-y;"></canvas>
                </div>
                <div style="display:flex; justify-content:center; flex-wrap:wrap; gap:15px; margin-top:15px; font-family:'JetBrains Mono'; font-size:0.75rem; color:#888;">
                    <div style="display:flex; align-items:center; gap:8px; cursor:pointer; transition:0.2s" onclick="App.toggleDataset('meas', 0, this)"><div style="width:12px; height:12px; background:#3b82f6; border-radius:50%;"></div><span style="color:#aaa;">ГРУДИ</span></div>
                    <div style="display:flex; align-items:center; gap:8px; cursor:pointer; transition:0.2s" onclick="App.toggleDataset('meas', 1, this)"><div style="width:12px; height:12px; background:#10b981; border-radius:50%;"></div><span style="color:#aaa;">ТАЛІЯ</span></div>
                    <div style="display:flex; align-items:center; gap:8px; cursor:pointer; transition:0.2s" onclick="App.toggleDataset('meas', 2, this)"><div style="width:12px; height:12px; background:#ef4444; border-radius:50%;"></div><span style="color:#aaa;">БІЦЕПС</span></div>
                    <div style="display:flex; align-items:center; gap:8px; cursor:pointer; transition:0.2s" onclick="App.toggleDataset('meas', 3, this)"><div style="width:12px; height:12px; background:#f59e0b; border-radius:50%;"></div><span style="color:#aaa;">СТЕГНО</span></div>
                    <div style="display:flex; align-items:center; gap:8px; cursor:pointer; transition:0.2s" onclick="App.toggleDataset('meas', 4, this)"><div style="width:12px; height:12px; background:#ec4899; border-radius:50%;"></div><span style="color:#aaa;">ГОМІЛКА</span></div>
                </div>
                <style>
                    @keyframes fadeEffect { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                </style>
            </div>`;
        
        const labels = []; 
        const dataTest = [];    
        const dataStack = []; 
        const dataWeight = [];
        const weekDetails = []; 

        const dataChest = [], dataWaist = [], dataArm = [], dataLeg = [], dataCalf = [];
    
        const weekKeys = Object.keys(this.data.schedule).map(Number);
        const maxW = weekKeys.length > 0 ? Math.max(...weekKeys) : 1;
        let minWeight = 200, maxWeight = 0;
        let lastKnownWeight = null;
    
        for(let w=1; w<=maxW; w++) {
            labels.push(`W${w}`);
            let weekTest = 0;
            let weekOther = 0;
            let details = {}; 
    
            if(this.data.schedule[w]) {
                this.data.schedule[w].forEach(day => day.forEach(pill => {
                    if(!pill.name || !pill.dose) return;
                    
                    const name = pill.name.trim().toUpperCase(); 
                    const parsed = this.parseDose(pill.dose);
                    
                    if (parsed) {
                        const detKey = `${name}_${parsed.unit}`;
                        if(!details[detKey]) details[detKey] = { name: name, val: 0, unit: parsed.unit };
                        details[detKey].val += parsed.val;

                        if (parsed.unit === 'mg') {
                            const nLow = name.toLowerCase();
                            // ФІКС: Тільки чиста база
                            const isTest = nLow.includes('test') || nLow.includes('sust') || nLow.includes('omna');
                            
                            if(isTest) {
                                weekTest += parsed.val;
                            } else {
                                weekOther += parsed.val;
                            }
                        }
                    }
                }));
            }
            
            weekDetails.push(Object.values(details).map(d => `${d.name}: ${parseFloat(d.val.toFixed(1))} ${d.unit}`));
            dataTest.push(weekTest);
            dataStack.push(weekOther);
    
            let weightSum = 0; let weightCount = 0;
            for(let d=0; d<7; d++) {
                const dateStr = GlobalVitals.formatDate(this.getRealDateObj(w, d));
                const v = GlobalVitals.get(dateStr);
                if(v && v.w) { 
                    const val = parseFloat(v.w.toString().replace(',','.'));
                    weightSum += val; 
                    weightCount++; 
                    lastKnownWeight = val; // Оновлюємо останню відому вагу
                    if(val < minWeight) minWeight = val;
                    if(val > maxWeight) maxWeight = val;
                }
            }
            // Якщо вагу вводили цього тижня - беремо середню, інакше тягнемо попередню
            dataWeight.push(weightCount > 0 ? (weightSum/weightCount) : lastKnownWeight);

            const mondayDateStr = GlobalVitals.formatDate(this.getRealDateObj(w, 0));
            const meas = GlobalVitals.get(mondayDateStr);
            dataChest.push(meas.chest ? parseFloat(meas.chest) : null);
            dataWaist.push(meas.waist ? parseFloat(meas.waist) : null);
            dataArm.push(meas.arm ? parseFloat(meas.arm) : null);
            dataLeg.push(meas.leg ? parseFloat(meas.leg) : null);
            dataCalf.push(meas.calf ? parseFloat(meas.calf) : null);
        }
        
        if(minWeight === 200) minWeight = 0;
        const y1Min = Math.max(0, Math.floor(minWeight - 2));
        const y1Max = Math.ceil(maxWeight + 2);
    
        if (this.chartInstance) { this.chartInstance.destroy(); this.chartInstance = null; }
        const chartContainer = document.getElementById('mainChart').parentNode;
        document.getElementById('mainChart').remove();
        const newMainCanvas = document.createElement('canvas');
        newMainCanvas.id = 'mainChart';
        newMainCanvas.style.touchAction = 'pan-y';
        chartContainer.appendChild(newMainCanvas);
        const ctx = newMainCanvas.getContext('2d');
        
        const gradTest = ctx.createLinearGradient(0, 400, 0, 0);
        gradTest.addColorStop(0, 'rgba(212, 175, 55, 0.2)'); 
        gradTest.addColorStop(1, 'rgba(255, 215, 0, 0.8)');
        
        const gradStack = ctx.createLinearGradient(0, 400, 0, 0);
        gradStack.addColorStop(0, 'rgba(139, 92, 246, 0.2)'); 
        gradStack.addColorStop(1, 'rgba(167, 139, 250, 0.8)');
    
        Chart.defaults.font.family = "'JetBrains Mono', monospace";
        Chart.defaults.color = "#888";
    
        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'ВАГА (kg)', data: dataWeight, type: 'line', borderColor: '#ffffff', backgroundColor: '#ffffff', borderWidth: 3, yAxisID: 'y1', pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: '#ffffff', pointBorderColor: '#ffffff', pointBorderWidth: 0, tension: 0.4, order: 0, spanGaps: true },
                    { label: 'STACK (mg)', data: dataStack, backgroundColor: gradStack, hoverBackgroundColor: '#a78bfa', yAxisID: 'y', stack: 'total', order: 1, borderRadius: 4, borderSkipped: false },
                    { label: 'TEST BASE (mg)', data: dataTest, backgroundColor: gradTest, hoverBackgroundColor: '#ffd700', yAxisID: 'y', stack: 'total', order: 2, borderRadius: 4, borderSkipped: false }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 1500, easing: 'easeOutExpo' },
                interaction: { mode: 'index', intersect: false },
                layout: { padding: { top: 10, left: 5, right: 5, bottom: 5 } },
                scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { color: '#666', font: {size: 11} }, offset: true }, 
                    y: { stacked: true, position: 'left', grid: { color: 'rgba(255,255,255,0.05)', borderDash: [4, 4] }, display: false },
                    y1: { display: true, position: 'right', grid: { display: false }, border: { display: false }, ticks: { color: '#fff', font: {size: 10, weight:'bold'} }, min: y1Min, max: y1Max }
                },
                plugins: { 
                    legend: { display: false }, 
                    zoom: {
                        pan: { enabled: true, mode: 'x' },
                        zoom: { 
                            wheel: { enabled: true, speed: 0.1 }, 
                            pinch: { enabled: true }, 
                            mode: 'x' 
                        },
                        limits: { x: { min: 'original', max: 'original' } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(20,20,20,0.95)', titleColor: '#d4af37', bodyColor: '#e5e5e5', borderColor: 'rgba(212,175,55,0.3)', borderWidth: 1, padding: 12, cornerRadius: 8,
                        callbacks: {
                            afterBody: (items) => {
                                const idx = items[0].dataIndex;
                                return (weekDetails[idx] && weekDetails[idx].length > 0) ? '\n📦 СКЛАД:\n' + weekDetails[idx].join('\n') : '';
                            },
                            footer: (items) => {
                                let total = 0; items.forEach(i => { if(i.dataset.yAxisID==='y') total += i.raw; });
                                return total > 0 ? `\n💉 TOTAL: ${total} mg` : '';
                            }
                        }
                    }
                }
            }
        });

        if (this.measChartInstance) { this.measChartInstance.destroy(); this.measChartInstance = null; }
        const measContainer = document.getElementById('measChart').parentNode;
        document.getElementById('measChart').remove();
        const newMeasCanvas = document.createElement('canvas');
        newMeasCanvas.id = 'measChart';
        newMeasCanvas.style.touchAction = 'pan-y';
        measContainer.appendChild(newMeasCanvas);
        const ctxMeas = newMeasCanvas.getContext('2d');
        
        this.measChartInstance = new Chart(ctxMeas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'ГРУДИ', data: dataChest, borderColor: '#3b82f6', backgroundColor: '#3b82f6', tension: 0.3, spanGaps: true, borderWidth: 3, pointRadius: 4 },
                    { label: 'ТАЛІЯ', data: dataWaist, borderColor: '#10b981', backgroundColor: '#10b981', tension: 0.3, spanGaps: true, borderWidth: 3, pointRadius: 4 },
                    { label: 'БІЦЕПС', data: dataArm, borderColor: '#ef4444', backgroundColor: '#ef4444', tension: 0.3, spanGaps: true, borderWidth: 3, pointRadius: 4 },
                    { label: 'СТЕГНО', data: dataLeg, borderColor: '#f59e0b', backgroundColor: '#f59e0b', tension: 0.3, spanGaps: true, borderWidth: 3, pointRadius: 4 },
                    { label: 'ГОМІЛКА', data: dataCalf, borderColor: '#ec4899', backgroundColor: '#ec4899', tension: 0.3, spanGaps: true, borderWidth: 3, pointRadius: 4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 1500, easing: 'easeOutExpo', delay: 200 }, 
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#666', font: {size: 11} }, offset: true }, 
                    y: { grid: { color: 'rgba(255,255,255,0.05)', borderDash: [4, 4] }, ticks: { color: '#fff', font: {size: 10, weight: 'bold'} } }
                },
                plugins: { 
                    legend: { display: false },
                    zoom: {
                        pan: { enabled: true, mode: 'x' },
                        zoom: { 
                            wheel: { enabled: true, speed: 0.1 }, 
                            pinch: { enabled: true }, 
                            mode: 'x' 
                        },
                        limits: { x: { min: 'original', max: 'original' } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(20,20,20,0.95)', titleColor: '#fff', bodyColor: '#e5e5e5', borderColor: '#333', borderWidth: 1, padding: 12, cornerRadius: 8
                    }
                }
            }
        });
    },
    toggleDataset(chartType, index, el) {
        const chart = chartType === 'main' ? this.chartInstance : this.measChartInstance;
        if (!chart) return;
        const meta = chart.getDatasetMeta(index);
        meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;
        
        if (meta.hidden) {
            el.style.opacity = '0.3';
            el.style.textDecoration = 'line-through';
        } else {
            el.style.opacity = '1';
            el.style.textDecoration = 'none';
        }
        
        chart.update();
    },
    
    renderAnalysis(c) {
        let html = '<div style="display:flex; flex-direction:column; gap:20px; position:relative; padding-left:20px;">';
        html += `<div style="position:absolute; left: 6px; top: 15px; bottom: 15px; width: 2px; background: linear-gradient(to bottom, var(--primary), #222);"></div>`;
        
        this.data.analysis.forEach((block, i) => {
            html += `
            <div class="med-card" style="overflow:visible; padding: 15px;">
                <div style="position:absolute; left: -20px; top: 22px; width: 12px; height: 12px; background: #000; border: 3px solid var(--primary); border-radius: 50%; box-shadow: 0 0 10px rgba(212,175,55,0.6);"></div>
                
                <div class="med-header" style="border-bottom: 1px dashed #333; padding: 0 0 10px 0; background: transparent;">
                    <div style="flex-grow:1">
                        <div class="med-title" contenteditable="${this.state.editing}" 
                            onblur="App.data.analysis[${i}].title=this.innerText; App.save()" style="color:var(--primary); font-size:1rem;">${block.title}</div>
                        <div class="med-timing" contenteditable="${this.state.editing}" 
                            onblur="App.data.analysis[${i}].timing=this.innerText; App.save()" style="color:#aaa; margin-top:2px;">${block.timing}</div>
                    </div>
                    ${this.state.editing ? `<div style="cursor:pointer; color:#ef4444; padding:5px; background:rgba(239,68,68,0.1); border-radius:6px; font-weight:bold;" onclick="App.pushHistory(); App.data.analysis.splice(${i},1); App.save(); App.renderView()">✕</div>` : ''}
                </div>
                
                <div class="med-list" style="padding-top:10px;">
                    ${block.checks.map((chk, j) => {
                        // ФІКС МІГРАЦІЇ: підтримка і старих рядків, і нових об'єктів результатів
                        const chkName = typeof chk === 'string' ? chk : (chk.n || '');
                        const chkVal = typeof chk === 'string' ? '' : (chk.v || '');
                        
                        return `
                        <div class="check-row" style="border-bottom: 1px solid rgba(255,255,255,0.02); padding: 8px 0; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                            <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
                                <span class="check-icon" style="color:var(--blue); font-size:1.2rem; text-shadow:none; margin:0; flex-shrink:0;">🔬</span>
                                <span class="check-name" contenteditable="${this.state.editing}" 
                                      onblur="App.updateAnalysisName(${i}, ${j}, this.innerText)"
                                      style="font-weight:600; color:#ccc; outline:none; white-space:normal; line-height:1.2; display:block;">
                                      ${chkName}
                                </span>
                            </div>
                            
                            <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                                <input type="text" value="${chkVal}" placeholder="Результат..." 
                                       onblur="App.updateAnalysisVal(${i}, ${j}, this.value)"
                                       style="background: #000; border: 1px dashed #444; color: var(--green); font-weight: 800; padding: 6px 8px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; width: 100px; text-align: right; outline: none; transition: 0.2s;"
                                       onfocus="this.style.borderColor='var(--primary)'; this.style.color='#fff';" 
                                       onblur="this.style.borderColor='#444'; this.style.color='var(--green)'; App.updateAnalysisVal(${i}, ${j}, this.value)">
                                ${this.state.editing ? `<span style="color:var(--red); cursor:pointer; font-weight:bold; padding:5px;" onclick="App.delAnalysisCheck(${i}, ${j})">✕</span>` : ''}
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
                
                ${this.state.editing ? `<button class="btn-ghost" style="margin-top:10px; border-top:1px dashed #333; border-radius:8px;" onclick="App.addAnalysisCheck(${i})">+ Додати маркер</button>` : ''}
            </div>`;
        });

        html += `</div>`;
        
        if (this.state.editing) {
            html += `<button class="btn-new-section" style="margin-top:20px; border-color:var(--primary); color:var(--primary);" onclick="App.pushHistory(); App.data.analysis.push({title:'НОВИЙ ЕТАП', timing:'Тиждень ?', checks:[{n:'Показник', v:''}]}); App.save(); App.renderView()">+ СТВОРИТИ ЕТАП КОНТРОЛЮ</button>`;
        }
        
        c.innerHTML = html;
    },
    updateAnalysisName(phaseIdx, checkIdx, newName) {
        this.pushHistory();
        let chk = this.data.analysis[phaseIdx].checks[checkIdx];
        if (typeof chk === 'string') {
            this.data.analysis[phaseIdx].checks[checkIdx] = { n: newName, v: "" };
        } else {
            chk.n = newName;
        }
        this.save();
    },

    updateAnalysisVal(phaseIdx, checkIdx, newVal) {
        // Ми не пушимо історію на кожне введення результату, щоб не забивати Undo-буфер дрібницями
        let chk = this.data.analysis[phaseIdx].checks[checkIdx];
        if (typeof chk === 'string') {
            this.data.analysis[phaseIdx].checks[checkIdx] = { n: chk, v: newVal };
        } else {
            chk.v = newVal;
        }
        this.save();
    },

    addAnalysisCheck(phaseIdx) {
        this.pushHistory();
        this.data.analysis[phaseIdx].checks.push({ n: 'Новий показник', v: '' });
        this.save();
        this.renderView();
    },

    delAnalysisCheck(phaseIdx, checkIdx) {
        this.pushHistory();
        this.data.analysis[phaseIdx].checks.splice(checkIdx, 1);
        this.save();
        this.renderView();
    },
    
   renderPharm(c) {
        let html = '<div class="med-grid">'; 
        
        this.data.pharmacy.forEach((cat, i) => {
            let catColor = '#555';
            if(cat.style === 'heart') catColor = '#3b82f6';
            if(cat.style === 'liver') catColor = '#10b981';
            if(cat.style === 'sleep') catColor = '#8b5cf6';
            if(cat.style === 'sos') catColor = '#ef4444';

            html += `
            <div class="pharm-card" style="--cat-color: ${catColor}">
                <div class="category-header ${cat.style}" style="border:none; padding:0 0 15px 0; background:transparent;">
                    <span style="font-size:1.1rem; text-shadow: 0 2px 10px ${catColor}40;">${cat.title}</span>
                    ${this.state.editing ? `<span style="cursor:pointer;opacity:0.5" onclick="alert('Видалення категорій поки недоступне, видаліть вміст')">⚙️</span>` : ''}
                </div>
                
                <div class="med-list">
                    ${cat.items.map((item, j) => {
                        let stockNum = parseInt(item.stock);
                        let isLow = (!isNaN(stockNum) && stockNum <= 10) ? 'low' : '';
                        let stockHtml = '';
                        
                        if (this.state.editing || (item.stock && item.stock.trim() !== '')) {
                            stockHtml = `
                            <div style="display:flex; align-items:center; gap:5px;">
                                ${(!this.state.editing && stockNum > 0) ? `<button style="background:#222; border:1px solid #444; color:#aaa; border-radius:4px; padding:2px 8px; font-size:0.75rem; cursor:pointer;" onclick="App.quickDeductStock(${i}, ${j})">-1</button>` : ''}
                                <span class="pharm-stock ${isLow}" contenteditable="${this.state.editing}" 
                                    onblur="this.innerHTML=this.innerText.trim(); App.data.pharmacy[${i}].items[${j}].stock=this.innerText; App.save()">${item.stock || ''}</span>
                            </div>`;
                        }
                        return `
                        <div class="pharm-item">
                            <div class="pharm-item-top">
                                <span class="med-name" contenteditable="${this.state.editing}" 
                                    onblur="App.data.pharmacy[${i}].items[${j}].n=this.innerText; App.save()" style="font-size:1.05rem;">${item.n}</span>
                                
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span class="med-dose" contenteditable="${this.state.editing}" 
                                        onblur="App.data.pharmacy[${i}].items[${j}].d=this.innerText; App.save()">${item.d}</span>
                                    ${this.state.editing ? `<span style="color:#ef4444;cursor:pointer;font-size:1rem; font-weight:bold; margin-left:5px;" onclick="App.delMed(${i},${j})">✕</span>` : ''}
                                </div>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                                <div class="med-desc" contenteditable="${this.state.editing}" 
                                    onblur="App.data.pharmacy[${i}].items[${j}].i=this.innerText; App.save()" style="font-size:0.75rem;">${item.i}</div>
                                ${stockHtml}
                            </div>
                        </div>
                    `}).join('')}
                </div>
                
                ${this.state.editing ? `<button class="btn-ghost" style="margin-top:10px; border-radius:8px; border:1px dashed #444;" onclick="App.addMed(${i})">+ Додати препарат</button>` : ''}
            </div>`;
        });
        
        html += '</div>';
        c.innerHTML = html;
    },
        
    openBodyMap() { 
        this.lockScroll(); 
        document.getElementById('bodyMapModal').style.display='flex'; 
        this.renderBodyMap(); 
    },

    renderBodyMap() {
        const muscles = [
            {id:'delt_l', d:'M85,60 Q70,60 65,80 L70,110 Q85,100 85,60', cx:75, cy:85},
            {id:'delt_r', d:'M215,60 Q230,60 235,80 L230,110 Q215,100 215,60', cx:225, cy:85},
            {id:'glute_l', d:'M110,200 Q90,200 85,240 Q110,270 150,270 L150,200 Z', cx:115, cy:230},
            {id:'glute_r', d:'M190,200 Q210,200 215,240 Q190,270 150,270 L150,200 Z', cx:185, cy:230},
            {id:'quad_l', d:'M100,280 Q85,350 90,400 L140,400 Q145,350 150,280 Z', cx:120, cy:340},
            {id:'quad_r', d:'M200,280 Q215,350 210,400 L160,400 Q155,350 150,280 Z', cx:180, cy:340}
        ];
        
        if (this.data.bodyMap && this.data.bodyMap.last && !this.data.bodyMap.active) {
            this.data.bodyMap.active = [this.data.bodyMap.last];
        }
        const activeSites = this.data.bodyMap?.active || [];

        let svg = `<svg viewBox="0 0 300 500" class="body-svg"><path d="M150,20 Q110,20 110,50 L100,60 L100,180 L80,250 L80,450 L140,450 L140,280 L160,280 L160,450 L220,450 L220,250 L200,180 L200,60 L190,50 Q190,20 150,20" fill="#1a1a1a" stroke="none"/>`;
        
        muscles.forEach(m => {
            const isActive = activeSites.includes(m.id);
            svg += `<path d="${m.d}" class="muscle-group ${isActive?'active':''}" onclick="App.setInjectionSite('${m.id}')" />`;
            
            if(isActive) {
                svg += `<text x="${m.cx}" y="${m.cy}" font-size="16" text-anchor="middle" dominant-baseline="middle" style="pointer-events:none; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8));">💉</text>`;
            }
        });
        svg += `</svg>`;
        document.getElementById('svgContainer').innerHTML = svg;
    },

    setInjectionSite(id) {
        this.pushHistory();
        
        if(!this.data.bodyMap) this.data.bodyMap = { active: [], history: [] };
        if(!this.data.bodyMap.active) {
            this.data.bodyMap.active = this.data.bodyMap.last ? [this.data.bodyMap.last] : [];
        }
        
        const idx = this.data.bodyMap.active.indexOf(id);
        
        if (idx > -1) {
            this.data.bodyMap.active.splice(idx, 1);
        } else {
            this.data.bodyMap.active.push(id);
            if(!this.data.bodyMap.history) this.data.bodyMap.history = [];
            this.data.bodyMap.history.push({ date: new Date().toISOString(), id: id });
        }
        
        this.save(); 
        this.renderBodyMap();
    },


    setDose(val) { 
        document.getElementById('pillDose').value = val; 
    },
    
    updateSuggestions() {
        const medSet = new Set();
        const tagSet = new Set();
        
        const defaults = [
            'Test Enanthate', 'Test Cypionate', 'Test Propionate', 'Tren Acetate', 
            'Tren Enanthate', 'Masteron', 'Primobolan', 'Anavar', 'Winstrol', 
            'HGH', 'hCG', 'Clenbuterol', 'T3', 'Anastrozole', 'Cabergoline' 
        ];

        defaults.forEach(d => medSet.add(d));
        
        this.data.pharmacy.forEach(c => c.items.forEach(i => medSet.add(i.n)));
        Object.values(this.data.schedule).forEach(w => w.forEach(d => d.forEach(p => {
            if(p.name) medSet.add(p.name);
            if(p.meta) tagSet.add(p.meta);
        })));

        this.availablePills = Array.from(medSet).sort();

        const tagContainer = document.getElementById('tagPresets');
        if(tagContainer) {
            tagContainer.innerHTML = '';
            Array.from(tagSet).sort().forEach(t => {
                if(t.length > 0) {
                    const chip = document.createElement('div');
                    chip.className = 'tag-chip';
                    chip.innerText = t;
                    chip.onclick = () => document.getElementById('pillMeta').value = t;
                    tagContainer.appendChild(chip);
                }
            });
        }
    },

    selectColor(colorClass, el) { 
        this.state.tempPill.color = colorClass; 
        document.querySelectorAll('.color-opt').forEach(e => e.classList.remove('selected')); 
        el.classList.add('selected'); 
    },
    
    confirmAddPill() {
        const name = document.getElementById('pillName').value || "New"; 
        const dose = document.getElementById('pillDose').value || "-"; 
        const meta = document.getElementById('pillMeta').value || "";
        const freq = document.getElementById('pillFreq') ? document.getElementById('pillFreq').value : 'once';
        
        this.pushHistory();
        
        const startW = this.state.tempPill.w;
        const startD = this.state.tempPill.d;
        const pillData = { name, dose, meta, color: this.state.tempPill.color };
        
        const phase = this.data.phases.find(p => p.weeks.includes(startW));
        
        if (!phase || freq === 'once') {
            this.data.schedule[startW][startD].push({ ...pillData });
        } 
        else if (freq === 'weekly') {
            phase.weeks.filter(w => w >= startW).forEach(w => {
                this.data.schedule[w][startD].push({ ...pillData });
            });
        } 
        else {
            let step = 1; 
            if (freq === 'eod') step = 2; 
            if (freq === 'e3d') step = 3; 
            
            const lastW = Math.max(...phase.weeks);
            let curW = startW;
            let curD = startD;
            
            while (curW <= lastW) {
                if (this.data.schedule[curW] && phase.weeks.includes(curW)) {
                    this.data.schedule[curW][curD].push({ ...pillData });
                }
                curD += step;
                while (curD > 6) {
                    curD -= 7;
                    curW += 1;
                }
            }
        }
        
        if(document.activeElement) document.activeElement.blur();
        this.save(); 
        this.renderView();
        this.closeModal(); 
        
        if (this.state.lastScroll !== undefined) {
            window.scrollTo({ top: this.state.lastScroll, behavior: 'smooth' });
        }
    },

    closeModal() { 
        // Ховаємо всі можливі модалки
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        const customPhoto = document.getElementById('customPhotoModal');
        if(customPhoto) customPhoto.classList.remove('active');
        
        // Гарантовано знімаємо блокування кліків
        this.unlockScroll();
        // ВАЖЛИВО: Видалено зняття privacy-locked, щоб не ламати безпеку!
    },
    _doseCache: {},
    parseDose(doseStr) {
        if (!doseStr) return null;
        const normalized = doseStr.trim().toLowerCase();
        
        if (this._doseCache[normalized]) return this._doseCache[normalized];

        let val = 0;
        let unit = "mg"; 
        
        // 1. Шукаємо пріоритетно 'mg' або 'мг'
        const mgMatch = normalized.match(/(\d+([.,]\d+)?)\s*(mg|мг)/);
        if (mgMatch) {
            val = parseFloat(mgMatch[1].replace(',', '.'));
            unit = "mg";
        } 
        // 2. Якщо немає мг, шукаємо IU
        else if (normalized.includes("iu") || normalized.includes("од")) {
            const iuMatch = normalized.match(/(\d+([.,]\d+)?)/);
            if (iuMatch) val = parseFloat(iuMatch[1].replace(',', '.'));
            unit = "IU";
        }
        // 3. Якщо нічого немає, беремо просто першу цифру
        else {
            const match = normalized.match(/(\d+([.,]\d+)?)/);
            if (!match) return null;
            val = parseFloat(match[1].replace(',', '.'));
            if(normalized.includes("mcg") || normalized.includes("мкг")) unit = "mcg";
            else if(normalized.includes("ml") || normalized.includes("мл")) unit = "ml";
            else if(normalized.includes("tab") || normalized.includes("таб")) unit = "tab";
        }

        if (isNaN(val)) return null;

        const result = { val, unit };
        this._doseCache[normalized] = result;
        return result;
    },
    calc(week) {
        const stats = {};
        if(!this.data.schedule[week]) return stats;
        
        this.data.schedule[week].forEach(d => d.forEach(p => {
            if(!p.name || !p.dose) return;
            
            const parsed = this.parseDose(p.dose);
            if (parsed) { 
                const name = p.name.trim().toUpperCase(); 
                const key = `${name}_${parsed.unit}`; 

                if(!stats[key]) {
                    let colorName = (p.color || 'c-yellow').replace('c-', '');
                    stats[key] = { rawName: name, v: 0, u: parsed.unit, c: colorName }; 
                }
                stats[key].v += parsed.val; 
            }
        }));
        return stats;
    },
    
    updatePill(w,d,i,k,v) { 
        this.pushHistory(); 
        // ФІКС: Жорстко вирізаємо всі переноси рядків і зайві пробіли
        this.data.schedule[w][d][i][k] = v.replace(/\n/g, '').trim(); 
        this.save(); 
        this.updateStatsUI();
    },
    updateStatsUI() {
         const container = document.getElementById('stats-container');
         if(container) container.innerHTML = this.getStatsHtml(this.state.week, false);
    },

    getStatsHtml(week, animate = true) {
        const stats = this.calc(week);
        const sortedStats = Object.entries(stats).sort((a,b) => b[1].v - a[1].v);
        
        let statsHtml = sortedStats.map(([k,v], index) => {
            let color = v.c || 'yellow'; 
            let animClass = animate ? 'animate-enter' : '';
            let delayStr = animate ? `animation-delay: ${index * 0.04}s;` : '';
            
            return `<div class="stat-card c-${color} ${animClass}" style="${delayStr}"><span class="stat-val">${parseFloat(v.v.toFixed(2))}${v.u}</span><span class="stat-label">${v.rawName}</span></div>`;
        }).join('') || '';
        
        let mapAnimClass = animate ? 'animate-enter' : '';
        let mapDelayStr = animate ? `animation-delay: ${sortedStats.length * 0.04}s;` : '';
        
        statsHtml += `<div class="stat-card btn-map ${mapAnimClass}" style="border-color:#444; cursor:pointer; align-items:center; justify-content:center; transition: all 0.2s ease; ${mapDelayStr}" onclick="App.openBodyMap()"><span style="font-size:1.5rem">🧍</span><span class="stat-label">MAP</span></div>`;
        
        return statsHtml;
    },
    
    saveNote(w,t) { 
        this.pushHistory(); 
        this.data.notes[w]=t; 
        this.save(); 
    },
    
    saveBP(w, d, type, val) {
        const dateStr = GlobalVitals.formatDate(this.getRealDateObj(w, d));
        const v = GlobalVitals.get(dateStr);

        let currentBP = v.bp || "/";
        let parts = currentBP.split('/');
        if (parts.length !== 2) parts = ["", ""];

        if (type === 'sys') parts[0] = val;
        if (type === 'dia') parts[1] = val;

        let finalBP = (parts[0] === "" && parts[1] === "") ? "" : `${parts[0]}/${parts[1]}`;
        GlobalVitals.save(dateStr, 'bp', finalBP);
    },
    
    saveVital(w, d, k, v) { 
        if (typeof GlobalVitals === 'undefined') {
            console.error("GlobalVitals не знайдено!");
            return;
        }
        const dateStr = GlobalVitals.formatDate(this.getRealDateObj(w, d));
        if (k === 'w' && v) v = v.replace(',', '.'); 
        GlobalVitals.save(dateStr, k, v); 
    },
    saveMeas(w, k, v) {
        // Заміри тіла прив'язуємо до понеділка поточного тижня
        const dateStr = GlobalVitals.formatDate(this.getRealDateObj(w, 0)); 
        if (v) v = v.replace(',', '.');
        GlobalVitals.save(dateStr, k, v);
    },
    
        copyDay(w, d) {
        this.dayBuffer = JSON.parse(JSON.stringify(this.data.schedule[w][d])); 
        this.renderView(); // Оновлюємо UI, щоб з'явилися кнопки вставки 📝
        
        const toast = document.createElement('div');
        toast.innerText = "🗓 День скопійовано! Натисніть 📝 біля потрібного дня";
        toast.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#222; color:#fff; padding:10px 20px; border-radius:20px; z-index:9999; border:1px solid #d4af37; font-family:sans-serif; font-size:0.9rem;";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    },

    async pasteDay(w, d) {
        if (!this.dayBuffer) return;
        if(await Modal.confirm("Вставити скопійований день сюди?<br><br><small style='color:#ef4444;'>Увага: це перезапише поточні препарати в цьому дні!</small>", "ВСТАВКА ДНЯ", "gold")) { 
            this.pushHistory(); 
            // ФІКС: Очищаємо статус виконання для всіх препаратів у скопійованому дні
            const clonedDay = JSON.parse(JSON.stringify(this.dayBuffer));
            clonedDay.forEach(pill => delete pill.done);
            
            this.data.schedule[w][d] = clonedDay; 
            this.save(); 
            this.renderView(); 
        } 
    },

    copyPill(w, d, i) {
        this.pillBuffer = { ...this.data.schedule[w][d][i] };
        this.state.openMenu = null;
        this.renderView(); 
        
        const toast = document.createElement('div');
        toast.innerText = "💊 Скопійовано! Натисніть 📥 біля потрібного дня";
        toast.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#222; color:#fff; padding:10px 20px; border-radius:20px; z-index:9999; border:1px solid #d4af37; font-family:sans-serif; font-size:0.9rem;";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    },

    pastePill(w, d) {
        if (!this.pillBuffer) return;

        const targetDay = this.data.schedule[w][d];
        const isDuplicate = targetDay.some(p => 
            p.name.trim().toLowerCase() === this.pillBuffer.name.trim().toLowerCase()
        );

        if (isDuplicate) {
            alert(`⛔ Помилка: Препарат "${this.pillBuffer.name}" вже є в цьому дні!`);
            return;
        }

        this.pushHistory();
        // ФІКС: Знімаємо відмітку "зроблено"
        const newPill = { ...this.pillBuffer };
        delete newPill.done;
        
        this.data.schedule[w][d].push(newPill);
        this.save();
        this.renderView();
    },

    async pastePillToWeek(w) {
        if (!this.pillBuffer) return;
        if (!(await Modal.confirm(`🗓 Вставити препарат "${this.pillBuffer.name}" на КОЖЕН ДЕНЬ цього тижня?`, "МАСОВА ВСТАВКА", "gold"))) return;
        
        this.pushHistory();
        
        // ФІКС: Знімаємо відмітку
        const newPill = { ...this.pillBuffer };
        delete newPill.done;
        
        for (let d = 0; d < 7; d++) {
            const targetDay = this.data.schedule[w][d];
            const isDuplicate = targetDay.some(p => 
                p.name.trim().toLowerCase() === this.pillBuffer.name.trim().toLowerCase()
            );
            if (!isDuplicate) {
                this.data.schedule[w][d].push({ ...newPill }); // Використовуємо очищений об'єкт
            }
        }
        
        this.save();
        this.renderView();
        
        const toast = document.createElement('div');
        toast.innerText = "✅ Вставлено на весь тиждень!";
        toast.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:var(--green); color:#000; padding:10px 20px; border-radius:20px; z-index:9999; font-weight:bold;";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    },

    async duplicatePillToPhase(w, d, pillIdx) {
        if(!(await Modal.confirm("Дублювати цей препарат до кінця фази?", "КОПІЮВАННЯ", "gold"))) return;
        this.pushHistory();
        
        // ФІКС: Знімаємо відмітку з джерела
        const sourcePill = { ...this.data.schedule[w][d][pillIdx] };
        delete sourcePill.done;
        
        const phase = this.data.phases.find(p => p.weeks.includes(w));
        if(!phase) return;
        
        let addedCount = 0;
        phase.weeks.forEach(weekNum => {
            if (weekNum > w) {
                const isDuplicate = this.data.schedule[weekNum][d].some(p => 
                    p.name.trim().toLowerCase() === sourcePill.name.trim().toLowerCase()
                );
                
                if (!isDuplicate) {
                    this.data.schedule[weekNum][d].push({ ...sourcePill });
                    addedCount++;
                }
            }
        });
        
        this.save();
        this.renderView(); 
        
        if (addedCount > 0) {
            const toast = document.createElement('div');
            toast.innerText = `✅ Скопійовано на ${addedCount} тижнів`;
            toast.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:var(--green); color:#000; padding:10px 20px; border-radius:20px; z-index:9999; font-weight:bold;";
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2500);
        }
    },
    getMenuUI(w, d, i, name, isOpen) {
        const safeName = name.replace(/'/g, "\\'"); 
        const gearIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;

        // Кнопка тепер завжди однакова, без вкладеного меню
        return `<div id="btn-kebab-${w}-${d}-${i}" onclick="event.stopPropagation(); App.toggleMenu(${w},${d},${i}, '${safeName}')" style="box-sizing: border-box; flex-shrink:0; display:flex; align-items:center; justify-content:center; width:30px; height:30px; cursor:pointer; color:#888; background:transparent; border-radius:50%; overflow:hidden; transition:0.2s;" onmouseenter="this.style.color='var(--primary)'" onmouseleave="if(App.state.openMenu !== '${w}-${d}-${i}'){this.style.color='#888'}">${gearIcon}</div>`;
    },

    toggleMenu(w, d, i, name) {
        const id = `${w}-${d}-${i}`;

        // Якщо клік по тій же кнопці - закриваємо
        if (this.state.openMenu === id) {
            this.closeGlobalMenu();
            return;
        }

        this.closeGlobalMenu();
        this.state.openMenu = id;

        const btn = document.getElementById(`btn-kebab-${id}`);
        if (btn) {
            btn.style.color = 'var(--primary)';
            btn.style.background = 'rgba(212,175,55,0.15)';
        }

        // Створюємо глобальний контейнер, якщо його ще немає
        let menuEl = document.getElementById('global-kebab-menu');
        if (!menuEl) {
            menuEl = document.createElement('div');
            menuEl.id = 'global-kebab-menu';
            menuEl.className = 'kebab-menu-dropdown';
            menuEl.style.position = 'fixed';
            menuEl.style.zIndex = '999999';
            document.body.appendChild(menuEl);
        }

        const safeName = name.replace(/'/g, "\\'");
        
        // Генеруємо опції
        menuEl.innerHTML = `
            <div class="kebab-menu-item" onclick="event.stopPropagation(); App.closeGlobalMenu(); App.copyPill(${w},${d},${i})">
                <span style="width:20px; text-align:center; font-size:1.1rem;">📋</span> <span>Копіювати</span>
            </div>
            <div class="kebab-menu-item" onclick="event.stopPropagation(); App.closeGlobalMenu(); App.duplicatePillToPhase(${w},${d},${i})">
                <span style="width:20px; text-align:center; font-size:1.1rem; color:var(--blue);">📑</span> <span>На усю фазу</span>
            </div>
            <div class="kebab-menu-item" onclick="event.stopPropagation(); App.closeGlobalMenu(); App.deletePillFromWeek('${safeName}', ${w})">
                <span style="width:20px; text-align:center; font-size:1.1rem; color:#f59e0b;">🗓️</span> <span>Видалити з тижня</span>
            </div>
            <div class="kebab-menu-item" onclick="event.stopPropagation(); App.closeGlobalMenu(); App.deletePillFutureInPhase('${safeName}', ${w}, ${d})">
                <span style="width:20px; text-align:center; font-size:1.1rem; color:var(--red);">🌍</span> <span>Видалити до кінця фази</span>
            </div>
            <div class="kebab-menu-item" onclick="event.stopPropagation(); App.closeGlobalMenu(); App.delPillItem(${w},${d},${i})">
                <span style="width:20px; text-align:center; font-size:1.1rem; color:var(--red);">✕</span> <span style="color:var(--red); font-weight:bold;">Видалити запис</span>
            </div>
        `;

        // Динамічне позиціонування відносно екрану
        if (btn) {
            const rect = btn.getBoundingClientRect();
            menuEl.style.display = 'flex';
            
            let top = rect.bottom + 5;
            let right = window.innerWidth - rect.right;
            
            // Запобіжник: якщо меню не влазить знизу екрану — малюємо його над кнопкою
            if (top + menuEl.offsetHeight > window.innerHeight) {
                top = rect.top - menuEl.offsetHeight - 5;
            }

            menuEl.style.top = `${top}px`;
            menuEl.style.right = `${right}px`;
            menuEl.style.bottom = 'auto';
            menuEl.style.left = 'auto';
        }
    },

    closeGlobalMenu() {
        if (!this.state.openMenu) return;
        
        const oldBtn = document.getElementById(`btn-kebab-${this.state.openMenu}`);
        if (oldBtn) {
            oldBtn.style.color = '#888';
            oldBtn.style.background = 'transparent';
        }
        
        this.state.openMenu = null;
        const menuEl = document.getElementById('global-kebab-menu');
        if (menuEl) menuEl.style.display = 'none';
    },
    async deletePillFromWeek(name, w) {
        if(!(await Modal.confirm(`⚠️ ВИДАЛИТИ "${name}" з УСЬОГО тижня ${w}?`, "ОЧИЩЕННЯ ТИЖНЯ", "red"))) return;
        this.pushHistory();
        for (let d = 0; d < 7; d++) {
            if (this.data.schedule[w] && this.data.schedule[w][d]) {
                this.data.schedule[w][d] = this.data.schedule[w][d].filter(p => p.name.trim().toLowerCase() !== name.trim().toLowerCase());
            }
        }
        this.state.openMenu = null;
        this.save();
        this.renderView();
        const toast = document.createElement('div');
        toast.innerText = "🗑 Видалено з усього тижня!";
        toast.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:var(--red); color:#fff; padding:10px 20px; border-radius:20px; z-index:9999; font-weight:bold;";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    },
    
    async deletePillFutureInPhase(name, startWeek, dayIndex) {
        const dayNames = ["Понеділків", "Вівторків", "Серед", "Четвергів", "П'ятниць", "Субот", "Неділь"];
        const dayName = dayNames[dayIndex] || "днів";

        if(!(await Modal.confirm(`⚠️ ВИДАЛИТИ "${name}" з усіх "${dayName}" починаючи з тижня ${startWeek} і до кінця цієї фази?`, "МАСОВЕ ВИДАЛЕННЯ", "red"))) return;
        
        this.pushHistory();
        
        const phase = this.data.phases.find(p => p.weeks.includes(startWeek));
        if (!phase) return;
        
        phase.weeks.forEach(w => {
            if (w >= startWeek && this.data.schedule[w] && this.data.schedule[w][dayIndex]) {
                // ФІКС: Порівняння з ігноруванням регістру та пробілів
                this.data.schedule[w][dayIndex] = this.data.schedule[w][dayIndex].filter(p => 
                    p.name.trim().toLowerCase() !== name.trim().toLowerCase()
                );
            }
        });
        this.save();
        this.renderView();
    },

        smartSave() {
        let report = `════════════════════════════════════════\n`;
        report += `GOLD PROTOCOL - ТИЖДЕНЬ ${this.state.week}\n`;
        report += `════════════════════════════════════════\n\n`;
        
        const stats = this.calc(this.state.week);
        const sortedStats = Object.entries(stats).sort((a,b) => b[1].v - a[1].v);

        // ВАЖЛИВО: Замінити тільки блок формувння ПРЕПАРАТІВ всередині smartSave()
        // Знайди цей шматок у своїй функції smartSave і заміни:
        
        if(sortedStats.length > 0) {
            report += `📊 ПРЕПАРАТИ:\n`;
            report += `──────────────────────────────────────\n`;
            sortedStats.forEach(([k, v]) => {
                report += `${v.rawName.padEnd(15)} : ${v.v.toFixed(1)} ${v.u}\n`;
            });
            report += `\n`;
        }
        
        const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
        report += `📅 ПО ДНЯХ:\n`;
        report += `──────────────────────────────────────\n`;
        
        for(let i=0; i<7; i++) {
            const pills = this.data.schedule[this.state.week]?.[i] || [];
            const realDate = this.getRealDate(this.state.week, i);
            report += `\n${dayNames[i]} (${realDate}):\n`;
            if(pills.length === 0) {
                report += `  (немає)\n`;
            } else {
                pills.forEach(p => {
                    report += `  • ${p.name} - ${p.dose}`;
                    if(p.meta) report += ` [${p.meta}]`;
                    report += `\n`;
                });
            }
        }
        // Витягуємо заміри з нової глобальної бази (прив'язка до понеділка поточного тижня)
        const mondayDateStr = GlobalVitals.formatDate(this.getRealDateObj(this.state.week, 0));
        const meas = typeof GlobalVitals !== 'undefined' ? GlobalVitals.get(mondayDateStr) : {};
        
        if (meas && (meas.chest || meas.waist || meas.arm || meas.leg || meas.calf)) {
            report += `\n📏 ЗАМІРИ (см):\n`;
            report += `──────────────────────────────────────\n`;
            let mArr = [];
            if(meas.chest) mArr.push(`Груди: ${meas.chest}`);
            if(meas.waist) mArr.push(`Талія: ${meas.waist}`);
            if(meas.arm)   mArr.push(`Біцепс: ${meas.arm}`);
            if(meas.leg)   mArr.push(`Стегно: ${meas.leg}`);
            if(meas.calf)  mArr.push(`Гомілка: ${meas.calf}`);
            report += mArr.join(' | ') + `\n`;
        }
        
        // БОНУС: Виведення динаміки ваги, тиску та пульсу по днях тижня
        let vitalsReport = "";
        for(let i=0; i<7; i++) {
            const dateStr = GlobalVitals.formatDate(this.getRealDateObj(this.state.week, i));
            const v = GlobalVitals.get(dateStr);
            if (v && (v.w || v.bp || v.hr)) {
                let parts = [];
                if (v.w) parts.push(`Вага: ${v.w}кг`);
                if (v.bp) parts.push(`АТ: ${v.bp}`);
                if (v.hr) parts.push(`ЧСС: ${v.hr}`);
                vitalsReport += `  ${dayNames[i]}: ${parts.join(' | ')}\n`;
            }
        }
        
        if (vitalsReport !== "") {
            report += `\n⚖️ АНТРОПОМЕТРІЯ ТА ЖИТТЄВІ ПОКАЗНИКИ:\n`;
            report += `──────────────────────────────────────\n`;
            report += vitalsReport;
        }
        if(this.data.notes[this.state.week]) {
            report += `\n📝 НОТАТКИ:\n`;
            report += `──────────────────────────────────────\n`;
            report += this.data.notes[this.state.week] + `\n`;
        }
        
        report += `\n════════════════════════════════════════\n`;
        
        // 1. Спроба скопіювати текст у фоні (якщо браузер заборонить, це не зламає скачування)
        try {
            navigator.clipboard.writeText(report).catch(() => {});
        } catch(e) {}

        // 2. Гарантоване вікно збереження бекапу
        setTimeout(async () => {
            if(await Modal.confirm("Дані збережено. Скачати JSON бекап?", "ЗАВАНТАЖЕННЯ", "gold")) {
                try {
                    const filename = `gold_protocol_w${this.state.week}_${new Date().toISOString().split('T')[0]}.json`;
                    // ДОДАЄМО: упаковуємо GlobalVitals прямо в бекап
                    const exportData = { 
                        ...this.data, 
                        _global_vitals_backup: typeof GlobalVitals !== 'undefined' ? GlobalVitals.exportAll() : {} 
                    };
                    const dataStr = JSON.stringify(exportData, null, 2);
                    const blob = new Blob([dataStr], { type: "application/json" });
                    const url = window.URL.createObjectURL(blob);
                    
                    const a = document.createElement("a");
                    a.style.display = "none";
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a); // Обов'язково для iOS
                    
                    a.click();
                    
                    setTimeout(() => {
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                    }, 150);
                } catch(err) {
                    await Modal.alert("Помилка при створенні файлу.", "ПОМИЛКА", "red");
                }
            }
        }, 100);
    },


    togglePillDone(w, d, i) {
        if (this.state.editing) return;
        
        const pill = this.data.schedule[w][d][i];
        pill.done = !pill.done;
        
        // === АВТО-СПИСАННЯ З АПТЕЧКИ ===
        const pillNameLower = pill.name.trim().toLowerCase();
        this.data.pharmacy.forEach(cat => {
            cat.items.forEach(item => {
                if (item.n.trim().toLowerCase() === pillNameLower) {
                    let stock = parseInt(item.stock);
                    if (!isNaN(stock)) {
                        // Якщо відмітили як випите - мінус 1. Якщо зняли відмітку (випадково) - повертаємо 1 назад
                        item.stock = pill.done ? Math.max(0, stock - 1).toString() : (stock + 1).toString();
                    }
                }
            });
        });
        // =================================

        this.save(); // Асинхронне збереження стану

        // Точкова мутація DOM замість повного this.renderView()
        const pillNode = document.getElementById(`pill-node-${w}-${d}-${i}`);
        if (pillNode) {
            if (pill.done) {
                pillNode.style.opacity = '0.35';
                pillNode.style.filter = 'grayscale(1)';
                pillNode.style.transform = 'scale(0.98)';
                pillNode.style.borderColor = 'transparent';
                
                if (!pillNode.querySelector('.done-check-icon')) {
                    pillNode.insertAdjacentHTML('afterbegin', `<div class="done-check-icon" style="position:absolute; right:-8px; top:-8px; background:var(--green); color:#000; border-radius:50%; width:22px; height:22px; font-size:13px; font-weight:900; display:flex; align-items:center; justify-content:center; z-index:2; box-shadow:0 2px 6px rgba(0,0,0,0.8);">✓</div>`);
                }
            } else {
                pillNode.style.opacity = '';
                pillNode.style.filter = '';
                pillNode.style.transform = '';
                pillNode.style.borderColor = '';
                const icon = pillNode.querySelector('.done-check-icon');
                if (icon) icon.remove();
            }
        }

        if (pill.done && window.Haptics) window.Haptics.success();
        else if (window.Haptics) window.Haptics.light();
    },

    setView(v, btn) { 
        this.state.view = v; 
        document.querySelectorAll('.nav-tab').forEach(e=>e.classList.remove('active')); 
        btn.classList.add('active'); 
        document.getElementById('phaseNav').style.display = v==='protocol'?'flex':'none'; 
        
        const picker = document.querySelector('.date-picker-wrapper');
        if (picker) picker.style.display = (v === 'protocol') ? 'inline-flex' : 'none';

        this.renderView(); 
    },

    setPhase(id) { 
        this.state.phaseId = id; 
        const ph = this.data.phases.find(p=>p.id===id); 
        if(ph) { 
            this.state.week = ph.weeks[0]; 
            this.renderNav(); 
            this.renderView(); 
        } 
    },

    setWeek(w) { 
        this.state.week = w; 
        this.renderView(); 
    },
    
    delPillItem(w,d,i) {
        this.pushHistory();
        this.data.schedule[w][d].splice(i,1);
        this.state.openMenu = null;
        this.save(); 
        this.renderView();
    },
    
    async addMed(catIdx) { 
        let n = await Modal.prompt("Введіть назву препарату:", "ДОДАТИ ПРЕПАРАТ", ""); 
        if(n) { 
            this.pushHistory(); 
            this.data.pharmacy[catIdx].items.push({n:n,d:"-",i:"-"}); 
            this.save(); 
            this.renderView(); 
        } 
    },

    quickDeductStock(catIdx, itemIdx) {
        this.pushHistory();
        const item = this.data.pharmacy[catIdx].items[itemIdx];
        let currentStock = parseInt(item.stock);
        
        if (!isNaN(currentStock) && currentStock > 0) {
            item.stock = (currentStock - 1).toString();
            this.save();
            this.renderView();
            if (window.Haptics) window.Haptics.light();
        }
    },
        
    async delMed(c,i) { 
        if(await Modal.confirm("Видалити цей препарат?", "ВИДАЛЕННЯ", "red")) { 
            this.pushHistory(); 
            this.data.pharmacy[c].items.splice(i,1); 
            this.save(); 
            this.renderView(); 
        } 
    },
    
    async importData(inp) { 
        const r=new FileReader(); 
        r.onload = async e => { 
            try { 
                const json = JSON.parse(e.target.result); 
                if(!json.phases) throw new Error("Invalid"); 
                this.pushHistory(); 
                
                // ВІДНОВЛЕННЯ: Якщо в бекапі є глобальні вітали - відновлюємо їх
                if (json._global_vitals_backup && typeof GlobalVitals !== 'undefined') {
                    GlobalVitals.importAll(json._global_vitals_backup);
                    delete json._global_vitals_backup; // Видаляємо з основного стейту, щоб не смітити
                }

                this.data=json; 
                this.save(); 
                location.reload();
            } catch(err) { 
                await Modal.alert("Невірний або пошкоджений файл!", "ПОМИЛКА ІМПОРТУ", "red"); 
            } 
        }; 
        r.readAsText(inp.files[0]); 
    },
    
    async addPhaseWeek(pId) { 
        this.pushHistory(); 
        const pIdx = this.data.phases.findIndex(p => p.id === pId); 
        const phase = this.data.phases[pIdx]; 
        const lastWeek = phase.weeks[phase.weeks.length - 1]; 
        const maxW = Math.max(...Object.keys(this.data.schedule).map(Number)); 
        
        // ФІКС: Глибоке копіювання останнього тижня
        const copyOfLastWeek = JSON.parse(JSON.stringify(this.data.schedule[lastWeek]));
        
        // ФІКС: Очищаємо всі галочки "done" для нового тижня, щоб не було привидів минулих ін'єкцій!
        copyOfLastWeek.forEach(day => day.forEach(p => delete p.done));
        
        // Зсуваємо розклад і нотатки ВПЕРЕД з розривом посилань
        for(let w = maxW; w > lastWeek; w--) { 
            this.data.schedule[w+1] = JSON.parse(JSON.stringify(this.data.schedule[w])); 
            this.data.notes[w+1] = this.data.notes[w]; 
        } 
        
        this.data.schedule[lastWeek + 1] = copyOfLastWeek;
        this.data.notes[lastWeek + 1] = ""; 
        
        await PhotoDB.shiftWeeks(lastWeek + 1, 1); 
        phase.weeks.push(lastWeek + 1); 
        
        for(let i = pIdx + 1; i < this.data.phases.length; i++) {
            this.data.phases[i].weeks = this.data.phases[i].weeks.map(w => w + 1);
        }
        
        this.save(); 
        this.refreshPhotos(); 
        this.renderNav(); 
        this.renderView(); 
    },

    async prependPhaseWeek(pId) {
        this.pushHistory();
        const pIdx = this.data.phases.findIndex(p => p.id === pId);
        if (pIdx !== 0) {
            return await Modal.alert("Додавати минулі тижні можна тільки до першої фази.", "ПОМИЛКА", "red");
        }
        const phase = this.data.phases[0];
        const maxW = Math.max(...Object.keys(this.data.schedule).map(Number));
        
        // ФІКС: Глибоке копіювання при зсуві ВПЕРЕД
        for(let w = maxW; w >= 1; w--) {
            this.data.schedule[w+1] = JSON.parse(JSON.stringify(this.data.schedule[w]));
            this.data.notes[w+1] = this.data.notes[w];
        }
        
        this.data.schedule[1] = [[],[],[],[],[],[],[]];
        this.data.notes[1] = "";
        
        await PhotoDB.shiftWeeks(1, 1);
        
        this.data.phases.forEach(p => p.weeks = p.weeks.map(w => w + 1));
        phase.weeks.unshift(1);
        
        const d = new Date(this.data.startDate);
        d.setDate(d.getDate() - 7);
        this.data.startDate = d.toISOString().split('T')[0];
        
        this.save(); 
        this.refreshPhotos(); 
        this.renderNav(); 
        this.renderView();
    },
    async removePhaseWeek(pId) { 
        const pIdx = this.data.phases.findIndex(p => p.id === pId); 
        const phase = this.data.phases[pIdx]; 
        if(phase.weeks.length <= 1) return await Modal.alert("Фаза повинна мати мінімум 1 тиждень!", "ПОМИЛКА", "red"); 
        
        this.pushHistory(); 
        
        const lastWeek = phase.weeks[phase.weeks.length - 1]; 
        
        // ФІКС: Рахуємо максимальний тиждень ДО видалення даних!
        const maxW = Math.max(...Object.keys(this.data.schedule).map(Number)); 
        
        delete this.data.schedule[lastWeek]; 
        phase.weeks.pop(); 
        
        // Зсуваємо розклад і нотатки НАЗАД
        for(let w = lastWeek; w < maxW; w++) { 
            this.data.schedule[w] = this.data.schedule[w+1]; 
            this.data.notes[w] = this.data.notes[w+1]; 
        } 
        
        // Тепер безпечно видаляємо хвіст
        delete this.data.schedule[maxW]; 
        delete this.data.notes[maxW];
        
        for(let i = pIdx + 1; i < this.data.phases.length; i++) {
             this.data.phases[i].weeks = this.data.phases[i].weeks.map(w => w - 1); 
        }
        
        await PhotoDB.shiftWeeks(lastWeek + 1, -1);
        
        this.save(); 
        this.refreshPhotos(); 
        this.renderNav(); 
        this.renderView(); 
    },
    
    addNewPhase() { 
        this.pushHistory(); 
        const lastP = this.data.phases[this.data.phases.length - 1]; 
        const startW = lastP ? lastP.weeks[lastP.weeks.length-1] + 1 : 1; 
        const newId = (lastP ? lastP.id : 0) + 1; 
        this.data.phases.push({ id: newId, title: "New", weeks: [startW, startW+1, startW+2, startW+3] }); 
        
        for(let i=0; i<4; i++) {
            this.data.schedule[startW+i] = [[],[],[],[],[],[],[]]; 
            this.data.notes[startW+i] = ""; // ФІКС: Ініціалізуємо нотатку
        }
        
        this.save(); 
        this.renderNav(); 
    },
    
    async deletePhase(pId) { 
        if(!(await Modal.confirm("Видалити цю фазу повністю?", "ВИДАЛЕННЯ ФАЗИ", "red"))) return; 
        this.pushHistory(); 
        const pIdx = this.data.phases.findIndex(p => p.id === pId); 
        const p = this.data.phases[pIdx]; 
        const len = p.weeks.length; 
        const start = p.weeks[0]; 
        const maxW = Math.max(...Object.keys(this.data.schedule).map(Number)); 
        
        // ФІКС: Глибоке копіювання при зсуві НАЗАД
        for(let w = start; w <= maxW - len; w++) { 
            this.data.schedule[w] = JSON.parse(JSON.stringify(this.data.schedule[w+len])); 
            this.data.notes[w] = this.data.notes[w+len]; 
        } 
        for(let i=0; i<len; i++) {
            delete this.data.schedule[maxW-i];
            delete this.data.notes[maxW-i];
        }
        
        this.data.phases.splice(pIdx, 1); 
        for(let i = pIdx; i < this.data.phases.length; i++) {
            this.data.phases[i].weeks = this.data.phases[i].weeks.map(w => w - len); 
        }
        
        this.save(); 
        this.renderNav(); 
        this.setPhase(this.data.phases[0]?.id || 1); 
    },
    
    async refreshPhotos() { 
        this.photoKeys = await PhotoDB.keys(); 
    },

    async uploadPhoto(inp) { 
        this.pushHistory(); 
        
        // Змінюємо текст кнопки, щоб показати процес (UI зворотній зв'язок)
        const btn = document.querySelector('.btn-upload');
        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳ Обробка...';
        btn.style.pointerEvents = 'none';

        try {
            for(let f of inp.files) {
                // Компресія зменшена до 1200px (для мобілок ідеально, економить 60% пам'яті)
                const compressedBase64 = await compressImage(f, 1200, 0.8); 
                if(PhotoDB.db) {
                    await new Promise((resolve, reject) => {
                        const tx = PhotoDB.db.transaction(["photos"], "readwrite");
                        const store = tx.objectStore("photos");
                        const req = store.add({ week: this.state.week, data: compressedBase64 });
                        req.onsuccess = () => resolve();
                        req.onerror = () => reject();
                    });
                }
            }
        } catch(e) {
            console.error("Помилка завантаження фото", e);
            if(window.Modal) Modal.alert("Помилка при збереженні фото.", "УВАГА", "red");
        } finally {
            // Відновлюємо UI
            btn.innerHTML = originalText;
            btn.style.pointerEvents = 'auto';
            inp.value = ''; // ОЧИЩЕННЯ ІНПУТУ: дозволяє завантажити те саме фото двічі (інакше onchange не спрацює)
            await this.refreshPhotos(); 
            this.renderView(); 
        }
    },


    async deletePhoto(id) { 
        if(await Modal.confirm("Видалити це фото?", "ВИДАЛЕННЯ", "red")) { 
            this.pushHistory(); 
            await PhotoDB.del(id); 
            await this.refreshPhotos(); 
            this.renderView(); 
        } 
    },
    
    toggleEdit() { 
        this.state.editing = !this.state.editing;
        document.body.classList.toggle('editing', this.state.editing); 
        document.getElementById('editBtn').classList.toggle('active', this.state.editing); 
        this.dayBuffer = null;
        this.pillBuffer = null;
        if (!this.state.editing) document.getElementById('undoFloat').classList.remove('visible'); 
        else if(this.stateManager.history.length > 0) document.getElementById('undoFloat').classList.add('visible');
        this.renderNav(); 
        this.renderView();
    },

    updatePhaseTitle(id, newTitle) {
        this.pushHistory();
        const p = this.data.phases.find(x => x.id === id);
        if(p) {
            p.title = newTitle;
            this.save();
        }
    },

    async insertPhase(index) {
        this.pushHistory();
        let startWeek = 1;
        if (index > 0) {
            const prevPhase = this.data.phases[index - 1];
            startWeek = prevPhase.weeks[prevPhase.weeks.length - 1] + 1;
        }

        const duration = 4; 
        const maxW = Math.max(...Object.keys(this.data.schedule).map(Number), 0);

        // ФІКС: Глибоке копіювання при зсуві
        for (let w = maxW; w >= startWeek; w--) {
            this.data.schedule[w + duration] = JSON.parse(JSON.stringify(this.data.schedule[w]));
            this.data.notes[w + duration] = this.data.notes[w];
            delete this.data.schedule[w];
            delete this.data.notes[w];
        }

        for (let i = 0; i < duration; i++) {
            this.data.schedule[startWeek + i] = [[],[],[],[],[],[],[]];
            this.data.notes[startWeek + i] = "";
        }

        await PhotoDB.shiftWeeks(startWeek, duration);

        for (let i = index; i < this.data.phases.length; i++) {
            this.data.phases[i].weeks = this.data.phases[i].weeks.map(w => w + duration);
        }

        const maxId = this.data.phases.reduce((max, p) => Math.max(max, p.id), 0);
        const newPhase = {
            id: maxId + 1,
            title: "New Phase",
            weeks: Array.from({length: duration}, (_, i) => startWeek + i)
        };

        this.data.phases.splice(index, 0, newPhase);

        this.save();
        this.refreshPhotos();
        this.renderNav();
        this.setPhase(newPhase.id);
    },
    
    renderNav() { 
        const nav = document.getElementById('phaseNav');
        const isEd = this.state.editing;
        let html = '';

        this.data.phases.forEach((p, idx) => {
            if (isEd) {
                html += `<div class="insert-phase-btn" onclick="App.insertPhase(${idx})"><span>+</span></div>`;
            }

            html += `
            <div class="phase-btn ${p.id===this.state.phaseId?'active':''}" onclick="App.setPhase(${p.id})">
                <small>PHASE ${idx + 1}</small>
                
                <span contenteditable="${isEd}" 
                  onblur="App.updatePhaseTitle(${p.id}, this.innerText)"
                  onclick="${isEd ? 'event.stopPropagation()' : ''}" 
                  style="${isEd ? 'border-bottom:1px dashed #666; cursor:text' : 'pointer-events:none'}"
                >${p.title}</span>

                <div class="phase-ctrl">
                    <div class="ctrl-btn" onclick="event.stopPropagation(); App.removePhaseWeek(${p.id})">- W</div>
                    <div style="font-size:0.7rem; color:#666">${p.weeks.length}</div>
                    <div class="ctrl-btn" onclick="event.stopPropagation(); App.addPhaseWeek(${p.id})">+ W</div>
                </div>
                
                <div class="phase-del" onclick="event.stopPropagation(); App.deletePhase(${p.id})">✕</div>
            </div>`;
        });
        
        if (isEd) {
            html += `<div class="insert-phase-btn" onclick="App.insertPhase(${this.data.phases.length})"><span>+</span></div>`;
        }
        
        nav.innerHTML = html; 
    }
};
// ЗАПОБІЖНИК: Гарантований запис при згортанні/закритті додатку
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && App.saveTimer) {
        clearTimeout(App.saveTimer);
        App.saveTimer = null;
        App.forceSave();
    }
});

window.addEventListener('beforeunload', () => {
    if (App.saveTimer) {
        clearTimeout(App.saveTimer);
        App.saveTimer = null;
        App.forceSave();
    }
});
document.addEventListener('DOMContentLoaded', () => App.init());
