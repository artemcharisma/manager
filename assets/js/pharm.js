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
    phases: [
        { id: 1, title: "Start", weeks: [1,2] },
        { id: 2, title: "Mass", weeks: [3,4,5,6,7,8,9,10] },
        { id: 3, title: "Bridge", weeks: [11,12,13,14] },
        { id: 4, title: "Peak Mass", weeks: [15,16,17,18,19,20,21,22] },
        { id: 5, title: "Prep", weeks: [23,24,25,26] },
        { id: 6, title: "Cut", weeks: [27,28,29,30] },
        { id: 7, title: "Defi", weeks: [31,32,33,34,35,36] },
        { id: 8, title: "Final", weeks: [37,38] }
    ],
    schedule: (function(){
        let s = {}; 
        for(let i=1; i<=38; i++) s[i] = [[],[],[],[],[],[],[]];
        const add = (w,d,n,v,c,m) => s[w][d].push({name:n, dose:v, color:c, meta:m});
        for(let w=1; w<=38; w++) {
            let pid = 1;
            if(w>2) pid=2; if(w>10) pid=3; if(w>14) pid=4; if(w>22) pid=5; 
            if(w>26) pid=6; if(w>30) pid=7; if(w>36) pid=8;
            
            if([1,2,4,8].includes(pid)) {
                let t = pid===4?"250mg":(pid===8?"100mg":"200mg");
                let p = pid===1?"67mg":(pid===4?"166mg":"133mg");
                add(w,0,"Test E",t,"c-blue","Base"); 
                add(w,3,"Test E",t,"c-blue","Base");
                add(w,0,"Primo",p,"c-green","Anabolic"); 
                add(w,2,"Primo",p,"c-green","Anabolic"); 
                add(w,4,"Primo",p,"c-green","Anabolic");
            }
            if([3,5].includes(pid)) { 
                add(w,0,"Test E","150mg","c-blue","Cruise");
                for(let d=0;d<7;d++) add(w,d,"HGH","2 IU","c-purple","AM Fasted"); 
            }
            if(pid===6) { 
                add(w,0,"Test E","175mg","c-blue","Base");
                add(w,3,"Test E","175mg","c-blue","Base"); 
                let clen = (20+((w-27)*20))+"mcg"; 
                for(let d=0;d<7;d++) { 
                    add(w,d,"HGH","3 IU","c-purple","AM"); 
                    add(w,d,"Clen",clen,"c-yellow","Pre-Cardio");
                }
            }
            if(pid===7) { 
                add(w,0,"Test E","150mg","c-blue","Base");
                add(w,3,"Test E","150mg","c-blue","Base"); 
                for(let d=0;d<7;d++) add(w,d,"HGH","3 IU","c-purple","AM"); 
                for(let d=0;d<7;d++) { 
                    let absDay = ((w-31)*7)+d;
                    if(absDay % 2 === 0) add(w,d,"Tren A","50mg","c-red","Deep IM"); 
                }
            }
        }
        return s;
    })(),
    vitals: {},
    bodyMap: { last: null, history: [] },
    analysis: [
        { title: "ЕТАП 1: ТОЧКА ВХОДУ", timing: "Тиждень 0", checks: ["ЗАК + Гематокрит", "Біохімія", "Ліпідограма", "Тестостерон", "Ехо-КГ (Серце)"] },
        { title: "ЕТАП 2: КОНТРОЛЬ", timing: "Тиждень 8-10", checks: ["ЗАК", "Ліпідограма", "Естрадіол + Пролактин"] },
        { title: "ЕТАП 3: ЕКВАТОР", timing: "Тиждень 18-20", checks: ["ЗАК + Реологія", "Печінкові проби", "Ліпідограма розш.", "HbA1c"] },
        { title: "ЕТАП 4: ПЕРЕД СУШКОЮ", timing: "Тиждень 28", checks: ["ЕКГ/Ехо-КГ", "ТТГ, Т3, Т4", "Електроліти", "Нирки"] },
        { title: "ЕТАП 5: ФІНАЛ", timing: "Тиждень 38+", checks: ["Повний чекап", "ЛГ, ФСГ", "Тестостерон"] }
    ],
    pharmacy: [
        { id: "heart", title: "❤️ СЕРЦЕ & ТИСК", style: "heart", items: [{n: "Nebivolol", d: "5mg", i: "Ранок."}, {n: "Telmisartan", d: "40mg", i: "Ранок."}, {n: "Omega-3", d: "4g", i: "З їжею."}, {n: "Ubiquinol", d: "100mg", i: "Ранок."}] },
        { id: "liver", title: "🧪 ПЕЧІНКА & НИРКИ", style: "liver", items: [{n: "TUDCA", d: "500mg", i: "Перед сном."}, {n: "NAC", d: "1200mg", i: "Ранок."}, {n: "Astragalus", d: "2g", i: "Ранок/Вечір."}] },
        { id: "sleep", title: "💤 ЦНС & СОН", style: "sleep", items: [{n: "Magnesium", d: "400mg", i: "Вечір."}, {n: "P-5-P (B6)", d: "50mg", i: "Вечір."}, {n: "GABA", d: "2g", i: "Перед сном."}] },
        { id: "sos", title: "⚠️ ЕКСТРЕНІ", style: "sos", items: [{n: "Cabergoline", d: "0.25mg", i: "При вис. Пролактині."}, {n: "Anastrozole", d: "0.5mg", i: "При вис. Естрадіолі."}, {n: "Captopril", d: "25mg", i: "При тиску > 160."}] }
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
        if (document.body.style.position !== 'fixed') return;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, this.state.lockedScrollY || 0);
        document.body.classList.remove('modal-active');
    },

    stateManager: new StateManager('gold_protocol', DefaultData),
    
    state: { view: 'protocol', phaseId: 1, week: 1, editing: false, tempPill: null, openMenu: null, lockedScrollY: 0 },
    
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
            bar.innerHTML = keys.map(k => 
                `<div class="p-week ${k === this.viewerState.week ? 'active' : ''}" onclick="event.stopPropagation(); App.changeViewerWeek(${k})">W${k}</div>`
            ).join('');
            
            bar.style.display = keys.length > 0 ? 'flex' : 'none';
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
            e.preventDefault(); 

            if (this.state.photoModalIsZooming && e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                
                const newScale = this.state.photoModalTouchStart.scale * (dist / this.state.photoModalTouchStart.dist);
                this.state.photoModalScale = Math.min(Math.max(1, newScale), 4);
                
                this.calculatePhotoBoundary(newImg);
                this.enforcePhotoBoundary();
                this.updatePhotoTransform();
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
                this.updatePhotoTransform();
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
            
            /* === ФІКС ДЛЯ МЕНЮ === */
            .pill { overflow: visible !important; } /* КРИТИЧНО ВАЖЛИВО! Щоб меню не зрізалося */
            
            .kebab-menu-dropdown {
                position: absolute; 
                right: 0; 
                top: calc(100% + 5px); /* З'являється чітко під іконкою */
                background: #18181b; 
                border: 1px solid #3f3f46;
                border-radius: 12px; 
                box-shadow: 0 10px 40px rgba(0,0,0,0.9); /* Посилили тінь */
                z-index: 99999 !important; /* Поставили вище за все */
                min-width: 220px; 
                display: flex; 
                flex-direction: column;
                overflow: hidden; 
                animation: fadeEffect 0.2s ease-out;
            }
            .kebab-menu-item {
                padding: 12px 15px; display: flex; align-items: center; gap: 12px;
                font-size: 0.85rem; color: #e4e4e7; cursor: pointer; transition: 0.2s;
                border-bottom: 1px solid rgba(255,255,255,0.05); /* Легкий розділювач */
            }
            .kebab-menu-item:last-child { border-bottom: none; }
            .kebab-menu-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
        `;
        document.head.appendChild(extraStyles);
        await PhotoDB.init();
        await this.load(); 
    
        this.migrateVitals();
        
        // --- ЗАПУСК МІГРАЦІЇ НА ГЛОБАЛЬНІ ПОКАЗНИКИ ---
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
                localStorage.removeItem('protocol_global_vitals'); // Очищення глобальної бази
                try { indexedDB.deleteDatabase("GoldProtocolDB"); } catch(e) {}
                location.reload();
            }
        };
        document.addEventListener('click', (e) => {
                if(this.state.openMenu && !e.target.closest('[id^="menu-"]')) {
                    const oldId = this.state.openMenu;
                    this.state.openMenu = null;
                    const oldEl = document.getElementById(`menu-${oldId}`);
                    if(oldEl) {
                        const name = oldEl.getAttribute('data-name') || '';
                        const [w, d, i] = oldId.split('-');
                        oldEl.innerHTML = this.getMenuUI(w, d, i, name, false);
                    }
                }
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

    save() { 
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
        
        // Якщо календар щойно закрився (спрацював onblur), ігноруємо паразитичний клік
        if (this.calendarLocked) return;

        const inp = document.getElementById('hiddenDateInp');
        if (inp) {
            // КРИТИЧНО: Примусово ставимо фокус, щоб при закритті гарантовано спрацьовував onblur
            inp.focus(); 
            try { 
                inp.showPicker(); 
            } catch(e) { 
                inp.click(); 
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
                const checkIcon = m.done ? `<div style="position:absolute; right:-8px; top:-8px; background:var(--green); color:#000; border-radius:50%; width:22px; height:22px; font-size:13px; font-weight:900; display:flex; align-items:center; justify-content:center; z-index:2; box-shadow:0 2px 6px rgba(0,0,0,0.8);">✓</div>` : '';
                
                const textPointer = this.state.editing ? 'auto' : 'none';
                const innerStop = this.state.editing ? 'onclick="event.stopPropagation()"' : '';
                const clickAction = this.state.editing ? '' : `onclick="App.togglePillDone(${this.state.week}, ${i}, ${idx})"`;
                const isMenuOpen = this.state.openMenu === pillId;

                // overflow:visible дозволяє меню вийти за межі картки.
                return `
                <div class="pill ${m.color}" style="position:relative; ${isDone} cursor:pointer; transition:all 0.3s cubic-bezier(0.25,0.8,0.25,1); z-index:${isMenuOpen ? 50 : 1}; overflow:visible !important;" ${clickAction}>
                    ${checkIcon}
                    <div style="flex:1; pointer-events:${textPointer}; min-width:0; margin-right:8px;">
                        <div contenteditable="${this.state.editing}" onblur="App.updatePill(${this.state.week},${i},${idx},'name',this.innerText)" ${innerStop} style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.name}</div>
                        <div class="pill-meta" contenteditable="${this.state.editing}" onblur="App.updatePill(${this.state.week},${i},${idx},'meta',this.innerText)" ${innerStop} style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.meta || ""}</div>
                    </div>
                    <span contenteditable="${this.state.editing}" onblur="App.updatePill(${this.state.week},${i},${idx},'dose',this.innerText)" style="pointer-events:${textPointer}; flex-shrink:0; white-space:nowrap; text-align:right;" ${innerStop}>${m.dose}</span>
                    
                    ${this.state.editing ? `
                        <div id="menu-${pillId}" data-name="${m.name.replace(/"/g, '&quot;')}" style="margin-left:10px; flex-shrink:0; pointer-events:auto;">
                            ${this.getMenuUI(this.state.week, i, idx, m.name, isMenuOpen)}
                        </div>
                    ` : ''}
                </div>`;
            }).join('');
                
            let headerBtns = '';
            if (this.state.editing) {
                if (this.pillBuffer) {
                    headerBtns += `<span style="font-size:0.9rem; cursor:pointer; margin-left:15px; color:#fff;" onclick="event.stopPropagation(); App.pastePill(${this.state.week}, ${i})" title="ВСТАВИТИ ПРЕПАРАТ">📥</span>`;
                }
                headerBtns += `<span style="font-size:0.9rem; cursor:pointer; opacity:0.7; margin-left:10px;" onclick="event.stopPropagation(); App.copyDay(${this.state.week}, ${i})" title="Копіювати день">${this.dayBuffer ? 'Paste' : '📋'}</span>`;
            }

            grid += `<div class="day-card" style="${isToday ? 'border-color:var(--primary); box-shadow:0 0 10px rgba(212,175,55,0.1)' : ''}">
                <div class="day-header">
                    <div style="display:flex; flex-direction:column; line-height:1.2">
                        <span>${dayNames[i]}</span>
                        <span style="font-size:0.65rem; color:#666; font-weight:400">${realDate}</span>
                    </div>
                    <div style="display:flex; align-items:center">${headerBtns}</div>
                </div>
                ${content}
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

        c.innerHTML = `
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

        const newWeekBar = document.querySelector('.week-bar');
        if (newWeekBar) newWeekBar.scrollLeft = weekScrollPos;
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
    
        for(let w=1; w<=maxW; w++) {
            labels.push(`W${w}`);
            let weekTest = 0;
            let weekOther = 0;
            let details = {}; 
    
            if(this.data.schedule[w]) {
                this.data.schedule[w].forEach(day => day.forEach(pill => {
                    const name = pill.name.trim();
                    const dose = pill.dose.trim();
                    
                    if(!details[name]) details[name] = { val: 0, unit: '' };
                    
                    const match = dose.match(/(\d+([.,]\d+)?)/);
                    if (match) {
                        const val = parseFloat(match[0].replace(',', '.'));
                        let unit = 'mg';
                        if(dose.toLowerCase().includes('iu')) unit = 'IU';
                        if(dose.toLowerCase().includes('mcg')) unit = 'mcg';
                        if(dose.toLowerCase().includes('tab')) unit = 'tab';
                        
                        details[name].val += val;
                        details[name].unit = unit;
    
                        if (unit === 'mg' && ['c-blue', 'c-green', 'c-red', 'c-pink', 'c-yellow'].includes(pill.color)) {
                            const nLow = name.toLowerCase();
                            if(nLow.includes('test') || nLow.includes('sust') || nLow.includes('enan') || nLow.includes('cyp') || nLow.includes('prop')) {
                                weekTest += val;
                            } else {
                                weekOther += val;
                            }
                        }
                    }
                }));
            }
            
            weekDetails.push(Object.entries(details).map(([n, d]) => `${n}: ${parseFloat(d.val.toFixed(1))} ${d.unit}`));
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
                    if(val < minWeight) minWeight = val;
                    if(val > maxWeight) maxWeight = val;
                }
            }
            dataWeight.push(weightCount > 0 ? (weightSum/weightCount) : null);

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
        const ctx = document.getElementById('mainChart').getContext('2d');
        
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
        const ctxMeas = document.getElementById('measChart').getContext('2d');
        
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
                    ${block.checks.map((chk, j) => `
                        <div class="check-row" style="border-bottom:none; padding: 6px 0; display: flex; align-items: center; gap: 8px;">
                            <span class="check-icon" style="color:var(--blue); font-size:1.2rem; text-shadow:none; margin: 0;">🔬</span>
                            <div style="flex: 1; display: flex; flex-direction: column;">
                                <span class="check-name" contenteditable="${this.state.editing}" 
                                    onblur="App.data.analysis[${i}].checks[${j}]=this.innerText; App.save()">${chk}</span>
                            </div>
                            ${this.state.editing ? `<span style="color:#ef4444; cursor:pointer; margin-left:10px; font-weight:bold; align-self: center;" onclick="App.pushHistory(); App.data.analysis[${i}].checks.splice(${j},1); App.save(); App.renderView()">✕</span>` : ''}
                        </div>
                    `).join('')}
                </div>
                
                ${this.state.editing ? `<button class="btn-ghost" style="margin-top:10px; border-top:1px dashed #333; border-radius:8px;" onclick="App.pushHistory(); App.data.analysis[${i}].checks.push('Новий показник'); App.save(); App.renderView()">+ Додати маркер</button>` : ''}
            </div>`;
        });

        html += `</div>`;
        
        if (this.state.editing) {
            html += `<button class="btn-new-section" style="margin-top:20px; border-color:var(--primary); color:var(--primary);" onclick="App.pushHistory(); App.data.analysis.push({title:'НОВИЙ ЕТАП', timing:'Тиждень ?', checks:['Показник']}); App.save(); App.renderView()">+ СТВОРИТИ ЕТАП КОНТРОЛЮ</button>`;
        }
        
        c.innerHTML = html;
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
        document.getElementById('addPillModal').style.display = 'none'; 
        this.unlockScroll();
    },
    
    calc(week) {
        const stats = {};
        if(!this.data.schedule[week]) return stats;
        
        this.data.schedule[week].forEach(d => d.forEach(p => {
            const match = p.dose.match(/(\d+([.,]\d+)?)/);
            
            if (match) {
                const valStr = match[0].replace(',', '.');
                const n = parseFloat(valStr);

                if(!isNaN(n)) { 
                    let k = p.name.trim(); 
                    let u = "mg"; 
                    const dLow = p.dose.toLowerCase();
                    if(dLow.includes("iu")) u = "IU"; 
                    else if(dLow.includes("mcg")) u = "mcg";
                    else if(dLow.includes("ml")) u = "ml";
                    else if(dLow.includes("tab")) u = "tab";

                    if(!stats[k]) {
                        let colorName = (p.color || 'c-yellow').replace('c-', '');
                        stats[k] = { v: 0, u: u, c: colorName }; 
                    }
                    
                    stats[k].v += n; 
                }
            }
        }));
        return stats;
    },
    
    updatePill(w,d,i,k,v) { 
        this.pushHistory(); 
        this.data.schedule[w][d][i][k]=v; 
        this.save(); 
        this.updateStatsUI();
    },

    updateStatsUI() {
         const container = document.getElementById('stats-container');
         // Передаємо false, щоб при ручному вводі дозувань анімація не перегравалась
         if(container) container.innerHTML = this.getStatsHtml(this.state.week, false);
    },

    // Додаємо параметр animate (за замовчуванням true для перемикання тижнів/вкладок)
    getStatsHtml(week, animate = true) {
        const stats = this.calc(week);
        const sortedStats = Object.entries(stats).sort((a,b) => b[1].v - a[1].v);
        
        let statsHtml = sortedStats.map(([k,v], index) => {
            let color = v.c || 'yellow'; 
            
            // Якщо анімація дозволена, додаємо клас і каскадну затримку (0.04s між кожною карткою)
            let animClass = animate ? 'animate-enter' : '';
            let delayStr = animate ? `animation-delay: ${index * 0.04}s;` : '';
            
            return `<div class="stat-card c-${color} ${animClass}" style="${delayStr}"><span class="stat-val">${parseFloat(v.v.toFixed(2))}${v.u}</span><span class="stat-label">${k}</span></div>`;
        }).join('') || '';
        
        // Кнопка MAP завжди з'являється останньою в каскаді
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
    
        async copyDay(w, d) {
        if(!this.dayBuffer) { 
            this.dayBuffer = JSON.parse(JSON.stringify(this.data.schedule[w][d])); 
            this.renderView(); 
        } else { 
            if(await Modal.confirm("Вставити скопійований день?", "ВСТАВКА", "gold")) { 
                this.pushHistory(); 
                this.data.schedule[w][d] = JSON.parse(JSON.stringify(this.dayBuffer)); 
                this.dayBuffer = null; 
                this.save(); 
                this.renderView(); 
            } 
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
        this.data.schedule[w][d].push({ ...this.pillBuffer });
        this.save();
        this.renderView();
    },

        async pastePillToWeek(w) {
        if (!this.pillBuffer) return;
        if (!(await Modal.confirm(`🗓 Вставити препарат "${this.pillBuffer.name}" на КОЖЕН ДЕНЬ цього тижня?`, "МАСОВА ВСТАВКА", "gold"))) return;
        
        this.pushHistory();
        
        for (let d = 0; d < 7; d++) {
            const targetDay = this.data.schedule[w][d];
            const isDuplicate = targetDay.some(p => 
                p.name.trim().toLowerCase() === this.pillBuffer.name.trim().toLowerCase()
            );
            if (!isDuplicate) {
                this.data.schedule[w][d].push({ ...this.pillBuffer });
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
        const sourcePill = this.data.schedule[w][d][pillIdx];
        const phase = this.data.phases.find(p => p.weeks.includes(w));
        if(!phase) return;
        phase.weeks.forEach(weekNum => {
            if (weekNum > w) {
                this.data.schedule[weekNum][d].push({ ...sourcePill });
            }
        });
        this.save();
        this.renderView(); 
    },
    getMenuUI(w, d, i, name, isOpen) {
        const safeName = name.replace(/'/g, "\\'"); 
        
        // Іконка шестірні (однакова для обох станів)
        const gearIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;

        let menuHtml = '';
        if (isOpen) {
            // Жорстко позиціонуємо меню absolute, щоб воно не ламало flex-контейнер
            menuHtml = `
            <div style="position:absolute; right:0; top:35px; background:#18181b; border:1px solid #3f3f46; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,0.9); z-index:99999; min-width:210px; display:flex; flex-direction:column; text-align:left; padding:4px 0;">
                <div onclick="event.stopPropagation(); App.copyPill(${w},${d},${i})" style="padding:12px 15px; display:flex; align-items:center; gap:12px; font-size:0.85rem; color:#e4e4e7; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.05);" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                    <span style="font-size:1.1rem;">📋</span> <span>Копіювати</span>
                </div>
                <div onclick="event.stopPropagation(); App.duplicatePillToPhase(${w},${d},${i})" style="padding:12px 15px; display:flex; align-items:center; gap:12px; font-size:0.85rem; color:#e4e4e7; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.05);" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                    <span style="font-size:1.1rem; color:var(--blue)">📑</span> <span>На всю фазу</span>
                </div>
                <div onclick="event.stopPropagation(); App.deletePillFromWeek('${safeName}', ${w})" style="padding:12px 15px; display:flex; align-items:center; gap:12px; font-size:0.85rem; color:#e4e4e7; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.05);" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                    <span style="font-size:1.1rem; color:#f59e0b">🗓️</span> <span>Видалити з тижня</span>
                </div>
                <div onclick="event.stopPropagation(); App.deletePillFutureInPhase('${safeName}', ${w}, ${d})" style="padding:12px 15px; display:flex; align-items:center; gap:12px; font-size:0.85rem; color:#e4e4e7; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.05);" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                    <span style="font-size:1.1rem; color:var(--red)">🌍</span> <span>Видалити до кінця фази</span>
                </div>
                <div onclick="event.stopPropagation(); App.delPillItem(${w},${d},${i})" style="padding:12px 15px; display:flex; align-items:center; gap:12px; font-size:0.85rem; color:var(--red); font-weight:bold; cursor:pointer;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                    <span style="font-size:1.1rem;">✕</span> <span>Видалити запис</span>
                </div>
            </div>`;
        }

        const btnColor = isOpen ? 'var(--primary)' : 'var(--text)';
        const btnBg = isOpen ? 'rgba(212,175,55,0.1)' : 'transparent';
        const btnOpacity = isOpen ? '1' : '0.5';

        // Повертаємо лише ОДИН контейнер з кнопкою (меню лежить всередині неї як absolute)
        return `
            <div style="position:relative; display:flex; align-items:center; justify-content:center;">
                ${menuHtml}
                <span onclick="event.stopPropagation(); App.toggleMenu(${w},${d},${i}, '${safeName}')" 
                      style="display:flex; align-items:center; justify-content:center; width:28px; height:28px; cursor:pointer; color:${btnColor}; background:${btnBg}; opacity:${btnOpacity}; border-radius:6px; transition:0.2s;"
                      onmouseover="this.style.opacity='1'; this.style.color='var(--primary)'" 
                      onmouseout="if(!${isOpen}){this.style.opacity='0.5'; this.style.color='var(--text)'}">
                    ${gearIcon}
                </span>
            </div>
        `;
    },
   toggleMenu(w, d, i, name) {
        const id = `${w}-${d}-${i}`;
        const lastId = this.state.openMenu;

        if (lastId && lastId !== id) {
            const oldEl = document.getElementById(`menu-${lastId}`);
            if (oldEl) {
                const oldName = oldEl.getAttribute('data-name') || 'Item';
                const parts = lastId.split('-');
                if(parts.length === 3) {
                    oldEl.innerHTML = this.getMenuUI(parts[0], parts[1], parts[2], oldName, false);
                }
            }
        }

        this.state.openMenu = (this.state.openMenu === id) ? null : id;
        const isOpen = (this.state.openMenu === id);

        const el = document.getElementById(`menu-${id}`);
        if (el) {
            el.innerHTML = this.getMenuUI(w, d, i, name, isOpen);
        }
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
                this.data.schedule[w][dayIndex] = this.data.schedule[w][dayIndex].filter(p => p.name !== name);
            }
        });
        this.save();
        this.renderView();
    },

    smartSave() {
        let report = `══════════════════════════════════════\n`;
        report += `GOLD PROTOCOL - ТИЖДЕНЬ ${this.state.week}\n`;
        report += `══════════════════════════════════════\n\n`;
        
        const stats = this.calc(this.state.week);
        const sortedStats = Object.entries(stats).sort((a,b) => b[1].v - a[1].v);

        if(sortedStats.length > 0) {
            report += `📊 ПРЕПАРАТИ:\n`;
            report += `────────────────────────────────────\n`;
            sortedStats.forEach(([k, v]) => {
                report += `${k.padEnd(15)} : ${v.v.toFixed(1)} ${v.u}\n`;
            });
            report += `\n`;
        }
        
        const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
        report += `📅 ПО ДНЯХ:\n`;
        report += `────────────────────────────────────\n`;
        
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
        const meas = this.data.measurements ? this.data.measurements[this.state.week] : null;
        if (meas && (meas.chest || meas.waist || meas.arm || meas.leg || meas.calf)) {
            report += `\n📏 ЗАМІРИ (см):\n`;
            report += `────────────────────────────────────\n`;
            let mArr = [];
            if(meas.chest) mArr.push(`Груди: ${meas.chest}`);
            if(meas.waist) mArr.push(`Талія: ${meas.waist}`);
            if(meas.arm)   mArr.push(`Біцепс: ${meas.arm}`);
            if(meas.leg)   mArr.push(`Стегно: ${meas.leg}`);
            if(meas.calf)  mArr.push(`Гомілка: ${meas.calf}`);
            report += mArr.join(' | ') + `\n`;
        }
        if(this.data.notes[this.state.week]) {
            report += `\n📝 НОТАТКИ:\n`;
            report += `────────────────────────────────────\n`;
            report += this.data.notes[this.state.week] + `\n`;
        }
        
        report += `\n══════════════════════════════════════\n`;
        
        navigator.clipboard.writeText(report).then(async () => {
            await Modal.alert("Дані успішно скопійовано в буфер обміну.", "✅ СКОПІЙОВАНО", "green");
            if(await Modal.confirm("Скачати повний JSON бекап?", "ЗАВАНТАЖЕННЯ", "gold")) {
                const filename = `gold_protocol_w${this.state.week}_${new Date().toISOString().split('T')[0]}.json`;
                // НАДІЙНИЙ ЕКСПОРТ БЕКАПУ
                const dataStr = JSON.stringify(this.data, null, 2);
                const blob = new Blob([dataStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a); // Обов'язково для iOS/Safari
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            }
        }).catch(async e => await Modal.alert("Не вдалося скопіювати текст", "ПОМИЛКА", "red"));
    },

    togglePillDone(w, d, i) {
        if (this.state.editing) return; 
        this.pushHistory();
        const pill = this.data.schedule[w][d][i];
        pill.done = !pill.done; 
        this.save();
        this.renderView();
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
        
        const copyOfLastWeek = JSON.parse(JSON.stringify(this.data.schedule[lastWeek]));
        
        // Зсуваємо розклад і нотатки ВПЕРЕД
        for(let w = maxW; w > lastWeek; w--) { 
            this.data.schedule[w+1] = this.data.schedule[w]; 
            this.data.notes[w+1] = this.data.notes[w]; 
        } 
        
        this.data.schedule[lastWeek + 1] = copyOfLastWeek;
        this.data.notes[lastWeek + 1] = ""; // Пуста нотатка для нового тижня
        
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
            await Modal.alert("Додавати минулі тижні можна тільки до першої фази.", "ПОМИЛКА", "red");
            return;
        }
        
        const phase = this.data.phases[0];
        
        const maxW = Math.max(...Object.keys(this.data.schedule).map(Number));
        // Зсуваємо розклад і нотатки ВПЕРЕД
        for(let w = maxW; w >= 1; w--) {
            this.data.schedule[w+1] = this.data.schedule[w];
            this.data.notes[w+1] = this.data.notes[w];
        }
        
        this.data.schedule[1] = [[],[],[],[],[],[],[]];
        this.data.notes[1] = "";
        
        await PhotoDB.shiftWeeks(1, 1);
        
        this.data.phases.forEach(p => {
            p.weeks = p.weeks.map(w => w + 1);
        });
        
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
        delete this.data.schedule[lastWeek]; 
        phase.weeks.pop(); 
        
        const maxW = Math.max(...Object.keys(this.data.schedule).map(Number)); 
        
        // Зсуваємо розклад і нотатки НАЗАД
        for(let w = lastWeek; w < maxW; w++) { 
            this.data.schedule[w] = this.data.schedule[w+1]; 
            this.data.notes[w] = this.data.notes[w+1]; 
        } 
        
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
        for(let i=0; i<4; i++) this.data.schedule[startW+i] = [[],[],[],[],[],[],[]]; 
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
        
        // Зсуваємо розклад і нотатки НАЗАД
        for(let w = start; w <= maxW - len; w++) { 
            this.data.schedule[w] = this.data.schedule[w+len]; 
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
        for(let f of inp.files) {
            try {
                const compressedBase64 = await compressImage(f); 
                if(PhotoDB.db) {
                    const tx = PhotoDB.db.transaction(["photos"], "readwrite");
                    tx.objectStore("photos").add({ week: this.state.week, data: compressedBase64 });
                }
            } catch(e) {
                console.error("Compression failed", e);
            }
        }
        await this.refreshPhotos(); 
        this.renderView(); 
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

        // Зсуваємо розклад і нотатки ВПЕРЕД на 4 тижні
        for (let w = maxW; w >= startWeek; w--) {
            this.data.schedule[w + duration] = this.data.schedule[w];
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

document.addEventListener('DOMContentLoaded', () => App.init());

pharm.html:
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>COURSE: GOLD PROTOCOL</title>
    
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Manager OS">
    
    <link rel="apple-touch-icon" href="icon.png">
    <link rel="manifest" href="manifest.json">
    <link rel="stylesheet" href="assets/style.css">
    
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    
    <style>
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        
        :root {
            --bg-app: #000000; --bg-panel: #121212; --bg-element: #1e1e1e;
            --border: #2a2a2a; --primary: #d4af37; --blue: #3b82f6;
            --green: #10b981; --purple: #8b5cf6; --red: #ef4444;
            --yellow: #f59e0b; --pink: #ec4899; --text-main: #f4f4f5;
            --text-muted: #a1a1aa; --radius: 12px;
        }
        
        html, body { max-width: 100vw; overflow-x: hidden; }

        body {
            background-color: var(--bg-app); color: var(--text-main);
            margin: 0; padding: 20px 10px; min-height: 100vh;
            display: flex; justify-content: center; padding-bottom: 100px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            -webkit-tap-highlight-color: transparent;
            
            /* ГЛОБАЛЬНЕ БЛОКУВАННЯ ВИДІЛЕННЯ ТА ЛУПИ IOS */
            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
        }

        /* Дозвіл ТІЛЬКИ для полів вводу (contenteditable тут видалено, щоб не було конфлікту) */
        input, textarea {
            -webkit-touch-callout: default !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
            cursor: text !important;
        }

        .app-container { width: 100%; max-width: 1400px; padding-bottom: 120px; }

        header {
            display: flex; flex-direction: column; gap: 15px; 
            margin-bottom: 20px; padding-bottom: 15px;
            border-bottom: 1px solid var(--border); position: relative; z-index: 50;
        }

        .header-top { display: flex; justify-content: space-between; align-items: center; }
        .brand { display: flex; align-items: center; gap: 12px; }

        .brand-icon {
            width: 44px; height: 44px; background: linear-gradient(135deg, #d4af37, #fcd34d);
            border-radius: 12px; display: flex; align-items: center; justify-content: center;
            font-size: 24px; box-shadow: 0 4px 20px rgba(212, 175, 55, 0.2); 
            color: #000; transition: 0.3s; cursor: pointer;
        }

        .brand-text h1 { margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--primary); letter-spacing: -0.5px; font-family: sans-serif; line-height: 1; }
        .brand-text span { font-size: 0.7rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; display: block; font-family: sans-serif; margin-top: 5px; }

        .controls { display: flex; gap: 6px; }
        .btn-icon, .edit-toggle {
            width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--border);
            background: var(--bg-panel); color: var(--text-muted); display: flex; align-items: center; justify-content: center;
            font-size: 1.1rem; cursor: pointer; transition: 0.2s; padding: 0; border: none;
        }
        
        .phase-btn { background: var(--bg-panel); border: 1px solid var(--border); min-width: 140px; padding: 15px; border-radius: var(--radius); cursor: pointer; position: relative; display: flex; flex-direction: column; overflow: hidden; }

        .edit-toggle.active { background: var(--primary); color: #000; border-color: var(--primary); }

        @keyframes stripes-move { 0% { background-position: 0 0; } 100% { background-position: 28px 0; } }

        .app-container, header, .nav-tabs, .pill, .med-card, .stat-card, 
        .chart-container, .photo-area, #mainView, .phase-scroll, .week-bar {
            transition: filter 0.8s cubic-bezier(0.2, 1, 0.3, 1), opacity 0.8s ease;
        }

        body.privacy-mode .btn-panic { color: var(--red); border-color: var(--red); background: rgba(239, 68, 68, 0.1); box-shadow: 0 0 20px rgba(239, 68, 68, 0.6); animation: panic-pulse 2s infinite; z-index: 101; position: relative; }
        @keyframes panic-pulse { 0% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); } 50% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.8); } 100% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); } }

        body.privacy-mode .brand-icon { filter: grayscale(100%) contrast(200%); background: #222; color: #fff; }
        body.privacy-mode .brand h1 { font-size: 0; }
        body.privacy-mode .brand h1::after { content: 'RESTRICTED'; font-size: 1.2rem; color: #888; letter-spacing: 4px; font-family: 'Courier New', monospace; font-weight: 900; }
        body.privacy-mode .brand span { display: none; }

        body.privacy-mode .pill div, body.privacy-mode .pill span, body.privacy-mode .stat-val, 
        body.privacy-mode .stat-label, body.privacy-mode .med-name, body.privacy-mode .med-dose,
        body.privacy-mode .med-desc, body.privacy-mode .pharm-stock, body.privacy-mode .check-name,
        body.privacy-mode .phase-btn span, body.privacy-mode .phase-btn small, body.privacy-mode .day-header span,
        body.privacy-mode .category-header span, body.privacy-mode .med-title, body.privacy-mode .med-timing,
        body.privacy-mode .note-input, body.privacy-mode .modal-title, body.privacy-mode .modal-content p,
        body.privacy-mode .vital-input, body.privacy-mode .bp-input, body.privacy-mode .bp-separator {
            color: transparent !important; background-color: transparent !important; border-color: #333 !important;
            background-image: repeating-linear-gradient(135deg, #1c1c1c, #1c1c1c 10px, #2a2a2a 10px, #2a2a2a 20px) !important;
            background-size: 28px 28px !important; animation: stripes-move 3s linear infinite !important; 
            box-shadow: inset 0 0 5px rgba(0,0,0,0.8); border-radius: 4px; display: inline-block; min-height: 14px; pointer-events: none !important;
        }
        body.privacy-mode input::placeholder, body.privacy-mode textarea::placeholder { color: transparent !important; }
        
        body.privacy-mode .pill div:first-child div:first-child { width: 80%; height: 18px; margin-bottom: 4px; } 
        body.privacy-mode .pill span { width: 50px; height: 18px; } 
        body.privacy-mode .pill { background: #080808 !important; border-color: #333 !important; border-left: 2px solid #444 !important; }
        
        body.privacy-mode .phase-scroll, body.privacy-mode .week-bar { pointer-events: auto !important; overflow-x: auto; opacity: 1; filter: grayscale(100%); }
        body.privacy-mode .phase-btn { background: #0a0a0a !important; border: 1px dashed #333 !important; min-width: 140px; }
        body.privacy-mode .phase-btn.active { border-color: #fff !important; }
        body.privacy-mode .phase-btn.active::after { background: #fff !important; }
        body.privacy-mode .week-btn { background: #111 !important; color: #333 !important; }
        body.privacy-mode .week-btn.active { background: #333 !important; color: transparent !important; }

        body.privacy-mode .nav-tab { position: relative; background: #000 !important; border-color: #222 !important; pointer-events: auto !important; color: transparent !important; }
        body.privacy-mode .nav-tab::after { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-family: 'Courier New', monospace; font-weight: 800; letter-spacing: 1px; font-size: 0.8rem; color: #555; }
        body.privacy-mode .nav-tab:nth-child(1)::after { content: 'PROTOCOL'; }
        body.privacy-mode .nav-tab:nth-child(2)::after { content: 'ANALYTICS'; }
        body.privacy-mode .nav-tab:nth-child(3)::after { content: 'LABS'; }
        body.privacy-mode .nav-tab:nth-child(4)::after { content: 'MEDKIT'; }
        body.privacy-mode .nav-tab.active { border-color: #666 !important; }
        body.privacy-mode .nav-tab.active::after { color: #fff; text-shadow: 0 0 8px rgba(255,255,255,0.5); }

        body.privacy-mode .chart-container, body.privacy-mode .photo-area, body.privacy-mode .body-map-container { filter: blur(10px) grayscale(100%) opacity(0.3); pointer-events: none; }

        body.privacy-mode .edit-ui, body.privacy-mode .edit-toggle, body.privacy-mode .btn-add-pill,
        body.privacy-mode .btn-upload, body.privacy-mode .vitals-row, body.privacy-mode .phase-ctrl,
        body.privacy-mode .new-phase-btn, body.privacy-mode [contenteditable] { display: none !important; }

        #privacyModal {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.96); z-index: 2000; justify-content: center; align-items: center;
            backdrop-filter: blur(10px); opacity: 1; transition: opacity 0.8s ease; 
        }
        #privacyModal.fade-out { opacity: 0; pointer-events: none; }
        .privacy-modal-content { background: #000; padding: 40px 30px; border-radius: 16px; border: 1px solid #333; text-align: center; width: 300px; box-shadow: 0 0 100px rgba(255,255,255,0.05); }
        .privacy-icon { font-size: 3rem; display: block; margin-bottom: 20px; transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .privacy-pwd-input { background: #111; border: 1px solid #333; color: #fff; font-family: monospace; letter-spacing: 5px; text-align: center; padding: 15px; width: 100%; margin-bottom: 20px; font-size: 1.2rem; border-radius: 4px; outline: none; transition: 0.3s; }
        .privacy-pwd-input:focus { border-color: #666; box-shadow: 0 0 15px rgba(255,255,255,0.1); }
        .btn-privacy-unlock { background: #fff; color: #000; border: none; padding: 15px; width: 100%; font-weight: 800; letter-spacing: 2px; cursor: pointer; transition: 0.3s; border-radius: 4px; }
        .privacy-modal-content.success { border-color: #fff; }
        .privacy-modal-content.success .btn-privacy-unlock { background: #000; color: #fff; border: 1px solid #fff; }

        body.privacy-locked { overflow-y: auto; }
        body.privacy-mode [onclick^="App.update"], body.privacy-mode [contenteditable] { pointer-events: none; }
        
        .nav-tabs { background: var(--bg-panel); padding: 4px; border-radius: 12px; display: flex; justify-content: space-between; gap: 4px; border: 1px solid var(--border); }
        .nav-tab { flex: 1; text-align: center; padding: 10px 0; color: var(--text-muted); border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .nav-tab.active { background: var(--bg-element); color: var(--primary); }

        .course-progress { width: 100%; height: 6px; background: #222; border-radius: 3px; margin: 0 0 25px 0; position: relative; }
        .prog-bar { height: 100%; background: linear-gradient(90deg, var(--primary), #fcd34d); transition: width 0.5s ease; }
        .prog-text { position: absolute; top: 8px; right: 0; font-size: 0.7rem; color: #666; font-family: 'JetBrains Mono'; }

        .phase-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 10px; margin-bottom: 25px; align-items: center; }
        .phase-btn { background: var(--bg-panel); border: 1px solid var(--border); min-width: 140px; padding: 15px; border-radius: var(--radius); cursor: pointer; position: relative; display: flex; flex-direction: column; }
        .phase-btn small { font-size: 0.65rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 6px; }
        .phase-btn span { font-weight: 700; font-size: 0.9rem; color: #fff; }
        .phase-btn.active { background: rgba(212, 175, 55, 0.1); border-color: var(--primary); }
        .phase-btn.active::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: var(--primary); }
        
        .week-bar { display: flex; gap: 6px; background: #000; padding: 6px; border-radius: 12px; margin-bottom: 25px; overflow-x: auto; }
        .week-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; color: #52525b; font-weight: 700; font-size: 0.85rem; transition: 0.2s; flex-shrink: 0; }
        .week-btn:hover { background: var(--bg-element); color: #fff; }
        .week-btn.active { background: var(--primary); color: #000; }
        .week-btn.has-data { color: #bbb; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 30px; }
        .stat-card { background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 15px; display: flex; flex-direction: column; }
        .stat-val { font-family: 'JetBrains Mono'; font-size: 1.2rem; font-weight: 700; color: #fff; }
        .stat-label { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; margin-top: 5px; font-weight: 600; }
        
        .c-blue .stat-val { color: var(--blue); } .c-green .stat-val { color: var(--green); } .c-purple .stat-val { color: var(--purple); }
        .c-red .stat-val { color: var(--red); } .c-pink .stat-val { color: var(--pink); } .c-yellow .stat-val { color: var(--yellow); }

        .days-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 15px; width: 100%; box-sizing: border-box; }
        .day-card { background: var(--bg-panel); border: 1px solid var(--border); border-radius: 16px; padding: 20px; min-height: 220px; display: flex; flex-direction: column; position: relative; }
        .day-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-weight: 700; color: #fff; padding-bottom: 10px; border-bottom: 1px solid #27272a; }

        .pill { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #555; background: rgba(255,255,255,0.03); font-size: 0.9rem; }
        .pill.c-blue { border-color: var(--blue); } .pill.c-green { border-color: var(--green); } .pill.c-purple { border-color: var(--purple); }
        .pill.c-red { border-color: var(--red); } .pill.c-yellow { border-color: var(--yellow); } .pill.c-pink { border-color: var(--pink); }
        .pill-meta { font-size: 0.7rem; color: #666; margin-left: 8px; }

        .vitals-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: auto; padding-top: 15px; border-top: 1px solid #27272a; }
        .vital-input { background: #000; border: 1px solid #333; color: #fff; border-radius: 6px; padding: 8px; font-size: 0.75rem; width: 100%; text-align: center; }

        .bp-wrapper { display: flex; align-items: center; background: #000; border: 1px solid #333; border-radius: 6px; overflow: hidden; transition: 0.2s; }
        .bp-wrapper:focus-within { border-color: var(--primary); }
        .bp-input { background: transparent; border: none; color: #fff; width: 100%; text-align: center; font-size: 0.75rem; padding: 8px 2px; -moz-appearance: textfield; }
        .bp-input::-webkit-outer-spin-button, .bp-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .bp-separator { color: #555; font-size: 0.8rem; font-weight: bold; user-select: none; }
        
        .med-grid, .pharma-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 20px; margin-bottom: 40px; width: 100%; box-sizing: border-box; }
        .med-card, .category-block { background: var(--bg-panel); border: 1px solid var(--border); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1); position: relative; }
        .med-card:hover, .category-block:hover { transform: translateY(-4px); border-color: #444; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5); }

        .med-header, .category-header { padding: 15px 18px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: flex-start; background: linear-gradient(to bottom, rgba(255,255,255,0.03), transparent); }
        .med-title { color: #fff; font-weight: 800; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2; }
        .med-timing { font-size: 0.7rem; color: var(--primary); font-family: 'JetBrains Mono', monospace; margin-top: 4px; display: block; opacity: 0.8; }

        .category-header { font-weight: 800; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; color: #fff; }
        .category-block { border-top: 3px solid transparent; } 
        .category-block:has(.heart) { border-top-color: var(--blue); } .category-block:has(.liver) { border-top-color: var(--green); }
        .category-block:has(.sleep) { border-top-color: var(--purple); } .category-block:has(.sos) { border-top-color: var(--red); }
        .category-header.heart { color: var(--blue); } .category-header.liver { color: var(--green); }
        .category-header.sleep { color: var(--purple); } .category-header.sos { color: var(--red); }

        /* ВІДЦЕНТРОВАНІ АНАЛІЗИ - ЦЕ ВАЖЛИВО ДЛЯ МІКРОСКОПА */
        .med-list { padding: 5px 0; flex-grow: 1; }
        .check-row { display: flex; align-items: center; gap: 10px; padding: 10px 18px; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 0.9rem; color: #ccc; line-height: 1.4; }
        .check-row:last-child { border-bottom: none; }
        .check-icon { flex-shrink: 0; color: var(--blue); font-size: 1.2rem; text-shadow: none; margin: 0; }
        .check-name { flex-grow: 1; line-height: 1.4; }

        .med-item { padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.03); display: flex; flex-direction: column; gap: 4px; }
        .med-item:last-child { border-bottom: none; }
        .med-row-top { display: flex; justify-content: space-between; align-items: center; width: 100%; }
        .med-name { font-weight: 700; color: #fff; font-size: 0.95rem; }
        .med-dose { background: #000; color: #ccc; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; font-family: 'JetBrains Mono', monospace; border: 1px solid #333; box-shadow: inset 0 0 10px rgba(0,0,0,0.5); min-width: 60px; text-align: center; }
        .med-desc { font-size: 0.8rem; color: #666; padding-right: 20px; font-style: italic; }

        .btn-ghost { width: 100%; text-align: center; font-size: 0.75rem; color: #555; padding: 12px; cursor: pointer; border-top: 1px dashed #222; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; transition: 0.2s; background: transparent; border-left: none; border-right: none; border-bottom: none; }
        .btn-ghost:hover { background: rgba(255,255,255,0.03); color: #fff; }
        .btn-new-section { width: 100%; padding: 15px; border: 1px dashed #444; background: transparent; color: #888; border-radius: 12px; cursor: pointer; margin-top: 10px; font-weight: 600; font-size: 0.9rem; transition: 0.2s; }
        .btn-new-section:hover { border-color: var(--primary); color: var(--primary); background: rgba(212, 175, 55, 0.05); }

        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; justify-content: center; align-items: center; backdrop-filter: blur(5px); }
        .modal-content { background: var(--bg-panel); padding: 25px; border-radius: 16px; border: 1px solid var(--border); width: 90%; max-width: 400px; position: relative; }
        .modal-title { margin-top: 0; color: #fff; font-size: 1.2rem; margin-bottom: 20px; }
        .input-group { margin-bottom: 15px; }
        .input-group label { display: block; color: var(--text-muted); font-size: 0.8rem; margin-bottom: 5px; font-weight: 600; }
        .modal-input { width: 100%; padding: 12px; background: #050505; border: 1px solid #333; border-radius: 8px; color: #fff; font-size: 0.9rem; }
        .btn-save { width: 100%; padding: 12px; background: linear-gradient(135deg, var(--primary), #fcd34d); color: #000; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; margin-top: 15px; }
        .modal-close { position: absolute; top: 20px; right: 20px; color: #666; cursor: pointer; font-size: 1.2rem; }
        
        .dose-presets { display: grid; grid-template-columns: repeat(auto-fit, minmax(60px, 1fr)); gap: 6px; margin-top: 5px; }
        .dose-presets span { font-size: 0.75rem; background: #222; padding: 6px 8px; border-radius: 6px; color: #bbb; cursor: pointer; border: 1px solid #333; transition: 0.2s; text-align: center; }
        .dose-presets span:hover { border-color: var(--primary); color: #fff; background: #333; }

        .tag-presets { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 5px; min-height: 25px; }
        .tag-chip { font-size: 0.7rem; background: rgba(255,255,255,0.05); color: #999; border: 1px solid #333; padding: 2px 8px; border-radius: 10px; cursor: pointer; }
        .tag-chip:hover { border-color: var(--primary); color: #fff; }

        .checkbox-wrapper { display: flex; align-items: center; gap: 10px; margin-top: 15px; }
        .checkbox-wrapper input { width: 20px; height: 20px; accent-color: var(--primary); }
        .color-options { display: flex; gap: 10px; margin-top: 5px; flex-wrap: wrap; }
        .color-opt { width: 35px; height: 35px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: 0.2s; }
        .color-opt.selected { border-color: #fff; transform: scale(1.1); box-shadow: 0 0 10px rgba(255,255,255,0.3); }

        .chart-container { background: var(--bg-panel); border: 1px solid var(--border); border-radius: 16px; padding: 15px; margin-bottom: 20px; height: 300px; }
        .photo-area { margin-top: 40px; border-top: 1px solid var(--border); padding-top: 30px; }
        .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 15px; margin-top: 20px; }
        .photo-card { position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); cursor: pointer; }
        .photo-card img { width: 100%; height: 100%; object-fit: cover; }
        .photo-del { position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.8); color: #fff; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .btn-upload { background: rgba(139, 92, 246, 0.1); color: var(--purple); border: 1px dashed var(--purple); padding: 15px; border-radius: 12px; width: 100%; text-align: center; cursor: pointer; font-weight: 600; display: block; }
        .note-input { width: 100%; background: #000; border: 1px solid #333; color: #e5e7eb; padding: 15px; border-radius: 12px; font-size: 0.95rem; resize: vertical; min-height: 100px; margin-top: 20px; }
        
        .edit-ui, .phase-ctrl, .phase-del, .new-phase-btn { display: none; }
        body.editing .edit-ui { display: inline-flex !important; }
        body.editing .phase-ctrl { display: flex; margin-top: 10px; justify-content: space-between; border-top: 1px solid #333; padding-top: 8px; }
        body.editing .phase-del { display: block; position: absolute; top: 8px; right: 8px; color: var(--red); font-size: 12px; cursor: pointer; }
        body.editing .new-phase-btn { display: flex; align-items: center; justify-content: center; background: var(--bg-panel); border: 1px dashed #444; border-radius: 12px; color: var(--green); font-size: 24px; }
        .btn-add-pill { width: 100%; text-align: center; font-size: 1.5rem; color: var(--green); cursor: pointer; margin-top: 10px; opacity: 0.4; padding: 5px; border: 1px dashed #333; border-radius: 8px; }
        .btn-add-pill:hover { opacity: 1; border-color: var(--green); }
        .ctrl-btn { font-size: 0.7rem; background: #222; padding: 2px 8px; border-radius: 4px; cursor: pointer; color: #ccc; border: none; }

        /* ==========================================================
           АБСОЛЮТНЕ БЛОКУВАННЯ ВИДІЛЕННЯ (ФІКС IOS SAFARI)
           ========================================================== */
        /* Safari ігнорує заборону виділення для contenteditable. 
           Єдиний вихід — повне відключення дотиків (pointer-events: none) */
        body:not(.editing) [contenteditable],
        body:not(.editing) [contenteditable="true"],
        body:not(.editing) .pharm-stock,
        body:not(.editing) .check-name,
        body:not(.editing) .med-name,
        body:not(.editing) .med-desc,
        body:not(.editing) .check-row {
            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            user-select: none !important;
            pointer-events: none !important; /* КРИТИЧНО: фізично блокує лупу і виділення */
            cursor: default !important;
        }

        /* ФАЗИ: Примусово повертаємо клікабельність та "палець" */
        body:not(.editing) .phase-scroll,
        body:not(.editing) .phase-btn,
        body:not(.editing) .phase-btn span,
        body:not(.editing) .phase-btn small {
            pointer-events: auto !important; /* Дозволяємо клікати */
            cursor: pointer !important; /* Повертаємо палець */
            -webkit-user-select: none !important;
            user-select: none !important;
        }
        /* ФАЗИ: Повертаємо палець */
        body:not(.editing) .phase-btn {
            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            user-select: none !important;
            cursor: pointer !important;
        }
        
        #undoFloat { position: fixed; bottom: 160px; right: 20px; width: 50px; height: 50px; border-radius: 50%; background: rgba(28,28,30,0.9); border: 2px solid var(--primary); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; z-index: 900; opacity: 0; pointer-events: none; transform: translateY(20px) scale(0.5); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer; backdrop-filter: blur(5px); }
        #undoFloat.visible { opacity: 1; pointer-events: auto; transform: translateY(0) scale(1); }
        .body-map-container { display: flex; justify-content: center; position: relative; height: 400px; }
        .body-svg { height: 100%; width: auto; }
        .muscle-group { fill: #333; stroke: #555; stroke-width: 1; cursor: pointer; }
        .muscle-group.active { fill: var(--primary); stroke: #fff; filter: drop-shadow(0 0 5px var(--primary)); }
        
        #fileInput, #photoInput { display: none; }
        @media (max-width: 360px) { .brand h1, .brand span { display: none; } }
        
        @keyframes secret-hint { 0% { transform: scale(1); filter: none; } 50% { transform: scale(1.15) rotate(5deg); background: linear-gradient(135deg, #ef4444, #991b1b); box-shadow: 0 0 15px rgba(239, 68, 68, 0.6); border-color: #ef4444; color: #fff; } 100% { transform: scale(1); filter: none; } }
        .brand-icon.hint-active { animation: secret-hint 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

        .day-card, .stat-card, .med-card { transition: transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.25s ease, border-color 0.25s ease; }
        /* =======================================
           АНІМАЦІЯ ПОЯВИ ДОЗУВАНЬ (STAGGERED POP)
           ======================================= */
        @keyframes statCardEnter {
            0% { opacity: 0; transform: translateY(15px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .stat-card.animate-enter {
            opacity: 0; /* Тримаємо прихованими до старту анімації */
            /* Використовуємо cubic-bezier для ефекту преміальної мікро-пружини (Apple-style) */
            animation: statCardEnter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @media (hover: hover) {
            .btn-icon:hover, .edit-toggle:hover { 
                background: var(--bg-element); 
                color: var(--primary); 
                box-shadow: 0 4px 10px rgba(212, 175, 55, 0.2); 
                transform: translateY(-1px);
            } /* <--- ОСЬ ЦІЄЇ ДУЖКИ НЕ ВИСТАЧАЛО! */

            /* 1. Оживляємо вкладки (Protocol, Аналітика, Аналізи, Аптечка) */
            .nav-tab { transition: all 0.2s ease; }
            .nav-tab:hover:not(.active) { 
                background: rgba(255, 255, 255, 0.05); 
                color: var(--primary); 
                box-shadow: inset 0 0 10px rgba(255,255,255,0.02);
            }

            /* 2. Оживляємо кнопку MAP (без підстрибування) */
            .btn-map:hover { 
                background: rgba(255, 255, 255, 0.05) !important; 
                border-color: var(--primary) !important; 
                box-shadow: 0 0 15px rgba(212, 175, 55, 0.2) !important; 
                transform: none !important; /* Блокуємо зміщення */
            }

            .day-card:hover, .med-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.4); border-color: #444; }
            
            .btn-save:hover { box-shadow: 0 5px 20px rgba(212, 175, 55, 0.4); transform: translateY(-2px); }
            .btn-ghost:hover { background: rgba(255,255,255,0.05); color: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
            .btn-new-section:hover { background: rgba(212, 175, 55, 0.1); border-color: var(--primary); color: var(--primary); box-shadow: 0 4px 15px rgba(212, 175, 55, 0.2); transform: translateY(-1px); }
            .btn-privacy-unlock:hover { box-shadow: 0 5px 20px rgba(255,255,255,0.3); transform: translateY(-2px); }
            .btn-upload:hover { background: rgba(139, 92, 246, 0.2); box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3); transform: translateY(-2px); }
            .phase-btn:hover:not(.active) { 
                background: rgba(255,255,255,0.05); 
                border-color: #555; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.4); 
                transform: translateY(-2px); 
            }
        }

/* Динаміка натискання на телефоні */
.phase-btn:active { transform: scale(0.96); background: rgba(0,0,0,0.5); }
        .btn-icon, .edit-toggle, .phase-btn, .week-btn, .pill { transition: transform 0.1s ease, background 0.2s ease; }
        .btn-icon:active, .edit-toggle:active, .phase-btn:active, .week-btn:active { transform: scale(0.94); }
        .nav-tab { position: relative; overflow: hidden; }
        .nav-tab::before { content: ''; position: absolute; top: 50%; left: 50%; width: 0; height: 0; background: rgba(212, 175, 55, 0.1); border-radius: 50%; transform: translate(-50%, -50%); transition: width 0.4s ease, height 0.4s ease; }
        .nav-tab:active::before { width: 200%; height: 200%; }

        .modal-content, .privacy-modal-content { background: rgba(18, 18, 18, 0.95); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; }
        .compare-col { display: flex; flex-direction: column; gap: 5px; }
        .compare-label { text-align: center; font-size: 0.75rem; color: var(--primary); font-weight: 800; letter-spacing: 1px; background: rgba(212, 175, 55, 0.1); padding: 5px; border-radius: 6px; border: 1px solid rgba(212, 175, 55, 0.2); }
        .compare-img-box { aspect-ratio: 3/4; background: #000; border-radius: 8px; border: 1px dashed #333; display: flex; align-items: center; justify-content: center; overflow: hidden; color: #555; position: relative; }
        .compare-img-box img { width: 100%; height: 100%; object-fit: cover; }
        
        .btn-compare { background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff; border: none; padding: 10px; border-radius: 8px; width: 100%; margin-top: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 8px; }
        body.privacy-mode .btn-compare { display: none !important; }

        .phase-scroll { display: flex; gap: 12px; overflow-x: auto; padding: 10px 5px 20px 5px; margin-bottom: 15px; align-items: center; }
        .insert-phase-btn { display: flex; align-items: center; justify-content: center; width: 40px; flex-shrink: 0; height: 100%; cursor: pointer; transition: 0.2s; opacity: 0.6; }
        .insert-phase-btn span { width: 32px; height: 32px; border-radius: 50%; background: #111; border: 1px dashed var(--green); color: var(--green); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
        .insert-phase-btn:hover { opacity: 1; transform: scale(1.1); }

        #customPhotoModal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 5000; overflow: hidden; align-items: center; justify-content: center; backdrop-filter: blur(10px); opacity: 0; transition: opacity 0.3s ease; }
        #customPhotoModal.active { display: flex; opacity: 1; }
        #customPhotoModal img { max-width: 100%; max-height: 100%; object-fit: contain; will-change: transform; cursor: grab; transition: transform 0.15s ease-out; }
        #customPhotoModal.is-zoom img { cursor: grabbing; transition: none; }
        #customPhotoModal.is-pan img { cursor: grabbing; transition: none; }

        .custom-close-btn { position: absolute; top: 20px; right: 20px; width: 40px; height: 40px; background: rgba(30,30,30,0.8); border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: bold; cursor: pointer; z-index: 5001; transition: 0.2s; border: 1px solid #333; }
        .custom-close-btn:hover { background: #d4af37; }
        .custom-close-btn:active { transform: scale(0.9); }
        .swap-btn { padding: 8px 25px; border-radius: 20px; font-weight: 800; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; color: #888; cursor: pointer; transition: 0.2s; user-select: none; }
        .swap-btn.active { background: var(--primary); color: #000; box-shadow: 0 0 10px rgba(212,175,55,0.4); }

        body.modal-active .nav-tabs, body.modal-active .brand, body.modal-active .controls, body.modal-active #sys-fab, body.modal-active #undoFloat { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; transform: translateY(-10px) scale(0.95) !important; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important; }

        .photo-nav-btn { position: absolute; top: 50%; transform: translateY(-50%); width: 50px; height: 50px; background: rgba(0,0,0,0.5); border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; cursor: pointer; z-index: 5002; backdrop-filter: blur(5px); transition: 0.2s; user-select: none; border: 1px solid rgba(255,255,255,0.1); }
        .photo-nav-btn:active { background: var(--primary); color: #000; }
        #photoNavLeft { left: 15px; } #photoNavRight { right: 15px; }

        .photo-week-bar { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(10,10,10,0.85); border: 1px solid #333; border-radius: 30px; padding: 6px; z-index: 5002; display: flex; gap: 5px; backdrop-filter: blur(10px); max-width: 90vw; overflow-x: auto; -ms-overflow-style: none; scrollbar-width: none; }
        .photo-week-bar::-webkit-scrollbar { display: none; }
        .p-week { padding: 8px 20px; border-radius: 20px; font-weight: 800; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: #888; cursor: pointer; transition: 0.2s; white-space: nowrap; flex-shrink: 0; }
        .p-week.active { background: var(--primary); color: #000; box-shadow: 0 0 10px rgba(212,175,55,0.4); }

        body.modal-active #sys-fab, body.editing #sys-fab { opacity: 0 !important; pointer-events: none !important; transform: translateY(80px) scale(0.5) !important; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important; }

        .pharm-card { background: var(--bg-panel); border-radius: 12px; padding: 15px; border: 1px solid var(--border); position: relative; overflow: hidden; }
        .pharm-card::before { content: ''; position: absolute; top: 0; right: 0; width: 100px; height: 100px; background: radial-gradient(circle, var(--cat-color) 0%, transparent 70%); opacity: 0.15; transform: translate(30%, -30%); border-radius: 50%; pointer-events: none; }
        .pharm-item { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 8px; box-shadow: inset 0 0 5px rgba(0,0,0,0.5); }
        .pharm-item-top { display: flex; justify-content: space-between; align-items: center; }
        .pharm-stock { background: #000; border: 1px dashed #555; border-radius: 6px; padding: 4px 8px; font-size: 0.75rem; color: #aaa; font-family: 'JetBrains Mono', monospace; cursor: default; display: inline-block; min-width: 40px; text-align: center; }
        .pharm-stock.low { border-color: var(--red); color: var(--red); background: rgba(239, 68, 68, 0.1); }
        .pharm-stock:empty::before { content: '📦 шт/мл...'; opacity: 0.4; font-size: 0.65rem; }
    </style>
</head>
<body id="appBody" ontouchstart="">

<script>
    try {
        const pd = JSON.parse(localStorage.getItem('gold_protocol') || '{}');
        const manualLock = localStorage.getItem('pharm_manual_lock') === 'true';
        if ((pd && pd.privacyEnabled) || manualLock) { 
            document.body.classList.add('privacy-mode', 'privacy-locked'); 
        }
    } catch(e) {}
</script>

<div class="app-container">
    <header>
        <div class="header-top">
            <div class="brand">
                <div class="brand-icon">🏆</div>
                <div class="brand-text"> <h1>COURSE</h1><span>GOLD PROTOCOL</span></div>
            </div>
            <div class="controls">
                <button class="btn-icon btn-panic" onclick="App.togglePrivacy()" title="Privacy Mode">👁️</button>
                <button class="btn-icon" onclick="App.safeSave()" title="Save">💾</button> <button class="btn-icon" onclick="App.safeLoad()" title="Load">📂</button> <input type="file" id="fileInput" accept=".json" onchange="App.importData(this)">
                <input type="date" id="startDateInput" style="display:none" onchange="App.setStartDate(this.value)">
                <button class="edit-toggle" id="editBtn" onclick="App.toggleEdit()" title="Edit">✎</button>
            </div>
        </div>
        <div class="nav-tabs">
            <div class="nav-tab active" onclick="App.setView('protocol', this)"><span>Protocol</span></div>
            <div class="nav-tab" onclick="App.setView('analytics', this)"><span>Аналітика</span></div>
            <div class="nav-tab" onclick="App.setView('analysis', this)"><span>Аналізи</span></div>
            <div class="nav-tab" onclick="App.setView('pharmacy', this)"><span>Аптечка</span></div>
        </div>
    </header>

    <div style="position:relative; margin-bottom:5px">
        <div class="course-progress"><div class="prog-bar" id="progBar" style="width: 0px !important; transition: none !important;"></div></div>
        <div class="prog-text" id="progText">Week 0/0</div>
    </div>

    <div class="phase-scroll" id="phaseNav"></div>
    <div id="mainView"></div>
</div>

<div id="undoFloat" onclick="App.undo()">↩</div>

<div id="privacyModal">
    <div class="privacy-modal-content" id="pwdContainer">
        <span class="privacy-icon" id="privIcon">🔒</span>
        <h2 style="margin:0 0 10px 0; color:#fff; font-size:1.2rem">ACCESS LOCKED</h2>
        <p style="color:#666; font-size:0.8rem; margin-bottom:20px">ENTER PASSCODE</p>
        <input type="password" inputmode="numeric" pattern="[0-9]*" class="privacy-pwd-input" id="privacyPassword" placeholder="••••" maxlength="4" onkeydown="if(event.key==='Enter') App.unlockPrivacy()">
        <button class="btn-privacy-unlock" id="unlockBtn" ontouchstart="event.preventDefault(); App.unlockPrivacy()" onmousedown="App.unlockPrivacy()">UNLOCK</button>
        
        <div style="margin-top: 20px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <input type="checkbox" id="privacyAutoLock" onchange="App.toggleAutoLock(this.checked)" style="width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer;">
            <label style="color: #888; font-size: 0.8rem; cursor: default;">Завжди блокувати при вході</label>
        </div>
    </div>
</div>

<div class="modal" id="addPillModal">
    <div class="modal-content">
        <span class="modal-close" onclick="App.closeModal()">✕</span>
        <h3 class="modal-title">Додати препарат</h3>
        
        <div class="input-group" id="pillNameGroup" style="position:relative;">
            <label>Назва</label>
            <div style="position: relative; display: flex; align-items: center;">
                <input class="modal-input" id="pillName" placeholder="Напр: hCG" autocomplete="off" style="padding-right: 45px; width: 100%; box-sizing: border-box;">
                <div id="pillNameArrow" style="position: absolute; right: 0; top: 0; bottom: 0; width: 45px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #666; transition: 0.2s; z-index: 2;">
                    <svg style="pointer-events:none; transition: transform 0.3s;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/></svg>
                </div>
            </div>
            <div id="custom-pill-list" style="display: none; position: absolute; top: calc(100% + 5px); left: 0; width: 100%; background: #121212; border: 1px solid #333; border-radius: 8px; max-height: 200px; overflow-y: auto; z-index: 9999; box-shadow: 0 10px 30px rgba(0,0,0,0.9);"></div>
        </div>

        <div class="input-group">
            <label>Дозування</label>
            <input class="modal-input" id="pillDose" placeholder="Напр: 1000 IU" autocomplete="off" inputmode="decimal">
            <div class="dose-presets">
                <span onclick="App.setDose('0.5 tab')">0.5 tab</span>
                <span onclick="App.setDose('1 tab')">1 tab</span>
                <span onclick="App.setDose('0.5ml')">0.5ml</span>
                <span onclick="App.setDose('1ml')">1ml</span>
                <span onclick="App.setDose('250mg')">250mg</span>
                <span onclick="App.setDose('500mg')">500mg</span>
                <span onclick="App.setDose('250 IU')">250 IU</span>
                <span onclick="App.setDose('500 IU')">500 IU</span>
                <span onclick="App.setDose('1000 IU')">1000 IU</span>
                <span onclick="App.setDose('2 IU')">2 IU</span>
                <span onclick="App.setDose('4 IU')">4 IU</span>
            </div>
        </div>
        <div class="input-group">
            <label>Тег</label>
            <input class="modal-input" id="pillMeta" placeholder="Напр: Base, AM" autocomplete="off">
            <div class="tag-presets" id="tagPresets"></div>
        </div>
        <div class="input-group"><label>Колір</label>
            <div class="color-options">
                <div class="color-opt" style="background:#3b82f6" onclick="App.selectColor('c-blue', this)"></div>
                <div class="color-opt" style="background:#10b981" onclick="App.selectColor('c-green', this)"></div>
                <div class="color-opt" style="background:#8b5cf6" onclick="App.selectColor('c-purple', this)"></div>
                <div class="color-opt" style="background:#ef4444" onclick="App.selectColor('c-red', this)"></div>
                <div class="color-opt" style="background:#f59e0b" onclick="App.selectColor('c-yellow', this)"></div>
                <div class="color-opt" style="background:#ec4899" onclick="App.selectColor('c-pink', this)"></div>
            </div>
        </div>
        <div class="input-group" style="margin-top: 15px;">
            <label>Повторення (до кінця фази)</label>
            <select class="modal-input" id="pillFreq" style="cursor:pointer; appearance: auto; background-color: #050505;">
                <option value="once">📍 Тільки в цей день</option>
                <option value="weekly">📅 Кожного тижня (у цей день)</option>
                <option value="daily">🔄 Щодня</option>
                <option value="eod">⚡ Через день</option>
                <option value="e3d">⏳ Кожні 3 дні</option>
            </select>
        </div>
        <button class="btn-save" onclick="App.confirmAddPill()">ДОДАТИ</button>
    </div>
</div>

<div class="modal" id="bodyMapModal" onclick="if(event.target === this) { this.style.display='none'; App.unlockScroll(); }">
    <div class="modal-content" style="max-width:350px">
        <span class="modal-close" onclick="document.getElementById('bodyMapModal').style.display='none'; App.unlockScroll();">✕</span>
        <h3 class="modal-title">Карта ін'єкцій</h3>
        <p style="color:#666; font-size:0.8rem; margin-bottom:15px">Натисніть на зону, щоб відмітити укол.</p>
        <div class="body-map-container" id="svgContainer"></div>
    </div>
</div>
    
<div class="modal" id="compareModal" style="z-index: 3000;">
    <div class="modal-content" style="max-width: 900px; width: 95%;">
        <span class="modal-close" onclick="document.getElementById('compareModal').style.display='none'; App.unlockScroll();">✕</span>
        <h3 class="modal-title" style="text-align:center; margin-bottom: 20px;">⚔️ PROGRESS COMPARISON</h3>
        
        <div class="compare-grid">
            <div class="compare-col">
                <select id="compSelectL" class="modal-input" style="text-align:center; font-weight:bold; margin-bottom:10px;" onchange="App.loadCompareImage('L', this.value)"></select>
                <div class="compare-img-box" id="imgBoxL">
                    <span style="opacity:0.3">Loading...</span>
                </div>
            </div>

            <div class="compare-col">
                <select id="compSelectR" class="modal-input" style="text-align:center; font-weight:bold; margin-bottom:10px;" onchange="App.loadCompareImage('R', this.value)"></select>
                <div class="compare-img-box" id="imgBoxR">
                    <span style="opacity:0.3">Loading...</span>
                </div>
            </div>
        </div>
    </div>
</div>

<script src="assets/js/utils.js"></script>
<script src="assets/js/pharm.js"></script>
<script src="assets/js/common.js"></script>
<div id="customPhotoModal">
    <span class="custom-close-btn" onclick="App.closePhotoModal()" ontouchend="App.closePhotoModal(); event.preventDefault(); event.stopPropagation();">✕</span>
    <div id="photoNavLeft" class="photo-nav-btn" onclick="event.stopPropagation(); App.navViewerPose(-1)">◀</div>
    <img id="customPhotoImg" src="" alt="Full view">
    <div id="photoNavRight" class="photo-nav-btn" onclick="event.stopPropagation(); App.navViewerPose(1)">▶</div>
    <div id="photoWeekSelector" class="photo-week-bar"></div>
</div>

</body>
</html>
