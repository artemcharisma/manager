    const PhotoDB = {
        db: null,
        init() {
    return new Promise((r) => {
        // Додано перевірку на наявність indexedDB
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
        
        // Важливо: закривати з'єднання при оновленні версії в іншій вкладці
        req.onblocked = () => {
            alert("Будь ласка, закрийте інші вкладки з цією програмою для оновлення бази даних.");
        };
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
    // --- HELPER: IMAGE COMPRESSOR ---
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
            document.body.classList.add('modal-active'); // СИГНАЛ: Сховати Зірку/Меню
        },
        unlockScroll() {
            if (document.body.style.position !== 'fixed') return;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, this.state.lockedScrollY || 0);
            document.body.classList.remove('modal-active'); // СИГНАЛ: Повернути Зірку/Меню
        },

        // Підключаємо StateManager
        stateManager: new StateManager('gold_protocol', DefaultData),
        
        state: { view: 'protocol', phaseId: 1, week: 1, editing: false, tempPill: null, openMenu: null, lockedScrollY: 0 },
        
        chartInstance: null,
        measChartInstance: null,
        
        // --- НОВІ, ІДЕАЛЬНІ ЗМІННІ СТАНУ ФОТО (from scratch) ---
        photoModalScale: 1,
        photoModalTranslate: { x: 0, y: 0 },
        photoModalIsZooming: false,
        photoModalIsPanning: false,
        photoModalTouchStart: { x: 0, y: 0, scale: 1, dist: 0 },
        photoModalBoundary: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
        photoModalSize: { iw: 0, ih: 0, sw: 0, sh: 0 },

        dayBuffer: null,
        pillBuffer: null,

        safeSave() {
            if(document.body.classList.contains('privacy-mode')) {
                alert("⛔ ACCESS DENIED: SYSTEM LOCKED");
                return;
            }
            this.smartSave();
        },

        openPhotoModal(imgUrl, altUrl = null, labelMain = '', labelAlt = '') {
            this.lockScroll();
            
            let modal = document.getElementById('customPhotoModal');
            let img = document.getElementById('customPhotoImg');

            if(!modal || !img) return;

            this.state.photoModalScale = 1;
            this.state.photoModalTranslate = { x: 0, y: 0 };
            this.state.photoModalIsZooming = false;
            this.state.photoModalIsPanning = false;

            img.src = imgUrl;
            img.style.touchAction = 'none';
            modal.classList.add('active');

            // 1. Клонуємо модалку і вішаємо жести ПЕРЕД кнопками (щоб не вбити кліки)
            this.initPhotoGestures(modal, img);

            // 2. ОНОВЛЮЄМО ПОСИЛАННЯ НА ЕЛЕМЕНТИ (бо старі вмерли при клонуванні)
            modal = document.getElementById('customPhotoModal');
            img = document.getElementById('customPhotoImg');
            const swapWrapper = document.getElementById('photoSwapWrapper');
            const btnMain = document.getElementById('btnSwapMain');
            const btnAlt = document.getElementById('btnSwapAlt');

            // Оновлюємо розміри для НОВОЇ картинки
            img.onload = () => {
                this.calculatePhotoBoundary(img);
                this.updatePhotoTransform();
            };

            // 3. Вішаємо залізобетонні події на нові кнопки
            if (altUrl && swapWrapper && btnMain && btnAlt) {
                img.setAttribute('data-main-src', imgUrl);
                img.setAttribute('data-alt-src', altUrl);
                
                btnMain.innerText = labelMain;
                btnAlt.innerText = labelAlt;
                
                btnMain.classList.add('active');
                btnAlt.classList.remove('active');
                swapWrapper.style.display = 'flex';
                
                // Функції миттєвого перемикання
                const swapToMain = (e) => {
                    e.preventDefault(); e.stopPropagation();
                    img.src = img.getAttribute('data-main-src');
                    btnMain.classList.add('active'); btnAlt.classList.remove('active');
                };
                const swapToAlt = (e) => {
                    e.preventDefault(); e.stopPropagation();
                    img.src = img.getAttribute('data-alt-src');
                    btnAlt.classList.add('active'); btnMain.classList.remove('active');
                };

                // Дублюємо для ідеальної роботи на iOS та Android
                btnMain.onclick = swapToMain; btnMain.ontouchend = swapToMain;
                btnAlt.onclick = swapToAlt; btnAlt.ontouchend = swapToAlt;
                
            } else if (swapWrapper) {
                swapWrapper.style.display = 'none';
            }
        },
        closePhotoModal() {
            const modal = document.getElementById('customPhotoModal');
            if(!modal) return;
            
            modal.classList.remove('active');
            this.unlockScroll();
        },

        // 1. ГОЛОВНИЙ ОБРОБНИК ЖЕСТІВ
        initPhotoGestures(modal, img) {
            // Щоб уникнути дублікатів обробників, ми їх очистимо (через заміну на клони)
            const newModal = modal.cloneNode(true);
            modal.parentNode.replaceChild(newModal, modal);
            const newImg = newModal.querySelector('img');

            // --- Touch START ---
            newModal.addEventListener('touchstart', (e) => {
                // event.preventDefault(); // Нам не потрібно, бо touch-action: none на img
                
                // Якщо 1 палець - початок перетягування (pan)
                if (e.touches.length === 1) {
                    this.state.photoModalIsPanning = true;
                    this.state.photoModalTouchStart.x = e.touches[0].clientX - this.state.photoModalTranslate.x;
                    this.state.photoModalTouchStart.y = e.touches[0].clientY - this.state.photoModalTranslate.y;
                    newModal.classList.add('is-pan');
                }
                // Якщо 2 пальці - початок щипка (zoom)
                else if (e.touches.length === 2) {
                    this.state.photoModalIsZooming = true;
                    this.state.photoModalIsPanning = false; // Zoom пріоритетніший
                    this.state.photoModalTouchStart.dist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    this.state.photoModalTouchStart.scale = this.state.photoModalScale;
                    newModal.classList.add('is-zoom');
                    newModal.classList.remove('is-pan');
                }
            }, { passive: false });

            // --- Touch MOVE (Найкапризніша частина) ---
            newModal.addEventListener('touchmove', (e) => {
                e.preventDefault(); // Жорстко забороняємо скрол фону

                // --- ЛОГІКА ЗУМУ (2 пальці) ---
                if (this.state.photoModalIsZooming && e.touches.length === 2) {
                    const dist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    
                    const newScale = this.state.photoModalTouchStart.scale * (dist / this.state.photoModalTouchStart.dist);
                    
                    // Обмежуємо зум (min х1, max x4)
                    this.state.photoModalScale = Math.min(Math.max(1, newScale), 4);
                    
                    // Після зміни зуму треба перерахувати межі для pan
                    this.calculatePhotoBoundary(newImg);
                    
                    // Жорстко enforce межі під час зуму (щоб не "вилітало")
                    this.enforcePhotoBoundary();
                    
                    this.updatePhotoTransform();
                }
                // --- ЛОГІКА ПАНУВАННЯ (1 палець) ---
                else if (this.state.photoModalIsPanning && e.touches.length === 1 && !this.state.photoModalIsZooming) {
                    let newX = e.touches[0].clientX - this.state.photoModalTouchStart.x;
                    let newY = e.touches[0].clientY - this.state.photoModalTouchStart.y;
                    
                    // ЛОГІКА SNAP-BACK (головна фішка): 
                    // Якщо фото НЕ зближене, ми дозволяємо йому рухатись, але з "опором" (х0.3), 
                    // щоб на END воно відскочило назад.
                    if (this.state.photoModalScale <= 1.05) {
                        newX *= 0.3; // Опір
                        newY *= 0.3;
                    } 
                    // Якщо фото зближене, ми дозволяємо йому вільно рухатись в межах!
                    else {
                        // Потрібно enforce межі в реальному часі (з легким rubber-banding)
                        newX = Math.min(Math.max(newX, this.state.photoModalBoundary.minX - 30), this.state.photoModalBoundary.maxX + 30);
                        newY = Math.min(Math.max(newY, this.state.photoModalBoundary.minY - 30), this.state.photoModalBoundary.maxY + 30);
                    }

                    this.state.photoModalTranslate.x = newX;
                    this.state.photoModalTranslate.y = newY;
                    this.updatePhotoTransform();
                }
            }, { passive: false });

            // --- Touch END ---
            newModal.addEventListener('touchend', (e) => {
                this.state.photoModalIsZooming = false;
                this.state.photoModalIsPanning = false;
                newModal.classList.remove('is-zoom', 'is-pan');
                
                // ГОЛОВНЕ: SNAP-BACK
                // Якщо фото не зближене (або майже не зближене), при END жорстко вертаємо в 0,0
                if (this.state.photoModalScale <= 1.05) {
                    this.state.photoModalScale = 1;
                    this.state.photoModalTranslate = { x: 0, y: 0 };
                    // Жорстко enforce межі після END (щоб прибрати гумові 30px)
                    this.calculatePhotoBoundary(newImg); 
                    this.enforcePhotoBoundary();
                } 
                // Якщо зближене, при END жорстко вертаємо до меж (з пружинистих 30px)
                else {
                    this.calculatePhotoBoundary(newImg);
                    this.enforcePhotoBoundary();
                }
                
                this.updatePhotoTransform();
            });

            // --- ДОДАТКОВІ ФІШКИ ---
            // 2. Подвійний тап для швидкого зуму
            let lastTap = 0;
            newImg.addEventListener('touchend', (e) => {
                const now = new Date().getTime();
                if (now - lastTap < 300) {
                    // event.preventDefault();
                    if (this.state.photoModalScale > 1) {
                        // Віддалити в 1
                        this.state.photoModalScale = 1;
                        this.state.photoModalTranslate = { x: 0, y: 0 };
                    } else {
                        // Наблизити в х2.5 (оптимально для Full HD)
                        this.state.photoModalScale = 2.5;
                        this.state.photoModalTranslate = { x: 0, y: 0 }; // Для простоти центровано
                    }
                    this.calculatePhotoBoundary(newImg);
                    this.updatePhotoTransform();
                }
                lastTap = now;
            });

            // 3. Тап по фону для закриття (native experience)
            newModal.addEventListener('click', (e) => {
                if (e.target === newModal) {
                    this.closePhotoModal();
                }
            });
        },

        // 2. ДОПОМІЖНІ МАТЕМАТИЧНІ ФУНКЦІЇ
        
        // Перераховує межі в залежності від поточного масштабу
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

            // Логіка CSS: max-width: 100%; max-height: 100%. Viewer.js рахує складніше. 
            // Ми порахуємо так: 
            const ratio = iw / ih;
            let finalW, finalH;
            
            // Визначаємо, як фото вписалося в екран (по ширині чи по висоті)
            if (sw / sh > ratio) {
                // Фото вписалося по висоті, ширина менша екрану
                finalH = sh; finalW = sh * ratio;
            } else {
                // Фото вписалося по ширині, висота менша екрану
                finalW = sw; finalH = sw / ratio;
            }

            // Поточний розмір фото з урахуванням зуму
            const curW = finalW * scale;
            const curH = finalH * scale;

            // МАТЕМАТИКА меж (відносного центру 0,0):
            // Якщо поточний розмір більше екрану, ми дозволяємо рухати в діапазоні [(curW - sw)/2]
            this.state.photoModalBoundary.maxX = curW > sw ? (curW - sw) / 2 : 0;
            this.state.photoModalBoundary.minX = -this.state.photoModalBoundary.maxX;
            
            this.state.photoModalBoundary.maxY = curH > sh ? (curH - sh) / 2 : 0;
            this.state.photoModalBoundary.minY = -this.state.photoModalBoundary.maxY;
        },

        // Жорстко притискає фото до меж (enforce)
        enforcePhotoBoundary() {
            let x = this.state.photoModalTranslate.x;
            let y = this.state.photoModalTranslate.y;
            
            x = Math.min(Math.max(x, this.state.photoModalBoundary.minX), this.state.photoModalBoundary.maxX);
            y = Math.min(Math.max(y, this.state.photoModalBoundary.minY), this.state.photoModalBoundary.maxY);
            
            this.state.photoModalTranslate.x = x;
            this.state.photoModalTranslate.y = y;
        },

        // Застосовує трансформацію до елементу
        updatePhotoTransform() {
            const img = document.getElementById('customPhotoImg');
            if(!img) return;
            
            const x = this.state.photoModalTranslate.x;
            const y = this.state.photoModalTranslate.y;
            const s = this.state.photoModalScale;
            
            // translate3d для апаратного прискорення
            img.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
        },
        // ------------------------------------
        safeLoad() {
            if(document.body.classList.contains('privacy-mode')) {
                alert("⛔ ACCESS DENIED: SYSTEM LOCKED");
                return;
            }
            document.getElementById('fileInput').click();
        },
        // -------------------------

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

            // 1. КЛІК НА СТРІЛКУ: Тільки вона відкриває/закриває список.
            // e.preventDefault() гарантує, що айфон не проігнорує клік!
            arrow.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if(list.style.display === 'block') {
                    this.closeCustomDropdown();
                } else {
                    renderList(''); // Показуємо всі варіанти
                    list.style.display = 'block';
                    arrow.querySelector('svg').style.transform = 'rotate(180deg)';
                    arrow.style.color = 'var(--primary)';
                }
            });

            // 2. ВВІД ТЕКСТУ В ПОЛЕ: Відкриває список і фільтрує його.
            // Клік по полю нічого не робить, тільки ввід тексту!
            input.addEventListener('input', () => {
                renderList(input.value);
                list.style.display = 'block';
                arrow.querySelector('svg').style.transform = 'rotate(180deg)';
                arrow.style.color = 'var(--primary)';
            });

            // 3. ЗАКРИТТЯ ПРИ КЛІКУ ПОВЗ
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
            this.lockScroll(); // Блокуємо фон
            if(document.activeElement) document.activeElement.blur();
            this.state.lastScroll = window.scrollY; // ЗАПАМ'ЯТОВУЄМО СКРОЛ ДО КЛАВІАТУРИ

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
                
                /* Ховаємо стрілку ТІЛЬКИ в інпуті назви препарату, щоб не зламати календар! */
                #pillName::-webkit-calendar-picker-indicator { display: none !important; }
                
                /* --- ІДЕАЛЬНИЙ КАЛЕНДАР (PC + iOS) --- */
                .date-picker-wrapper { 
                    position: relative; display: inline-flex; align-items: center; 
                    justify-content: center; margin-left: 6px; vertical-align: middle; 
                    width: 28px; height: 28px; cursor: pointer; 
                }
                /* Залізобетонне блокування кліків у Privacy Mode */
                body.privacy-mode .date-picker-wrapper { 
                    pointer-events: none !important; 
                }
                .date-hidden-input { 
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
                    opacity: 0; cursor: pointer; z-index: 10; border: none; background: transparent; color: transparent; 
                }
                /* Секрет для ПК: розтягуємо тригер календаря на весь невидимий інпут */
                .date-hidden-input::-webkit-calendar-picker-indicator { 
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
                    opacity: 0; cursor: pointer; padding: 0; margin: 0; display: block !important;
                }
            `;
            document.head.appendChild(extraStyles);

            await PhotoDB.init();
            this.load();
            await this.refreshPhotos();
            
            this.initCustomDropdown();
            
            // --- АВТОМАТИЧНИЙ ПЕРЕХІД НА ПОТОЧНИЙ ТИЖДЕНЬ ---
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
            
            document.body.classList.add('privacy-mode', 'privacy-locked');
            
            const brandBlock = document.querySelector('.brand');
            const brandIcon = document.querySelector('.brand-icon');

            brandBlock.onclick = () => {
                if (document.body.classList.contains('privacy-mode')) return;
                brandIcon.classList.remove('hint-active');
                void brandIcon.offsetWidth; 
                brandIcon.classList.add('hint-active');
            };
            
            brandBlock.ondblclick = () => {
                if (document.body.classList.contains('privacy-mode')) return;
                if(confirm("⚠ HARD RESET? Це знищить усі дані.")) {
                    localStorage.removeItem('gold_protocol');
                    try { indexedDB.deleteDatabase("GoldProtocolDB"); } catch(e) {}
                    location.reload();
                }
            };
        },
        load() {
            // 2. ЗАВАНТАЖУЄМО ЧЕРЕЗ МЕНЕДЖЕР
            this.data = this.stateManager.init();
            
            // Перевірки цілісності (залишаємо, бо це важливо для старих даних)
            if(!this.data.vitals) this.data.vitals = {};
            if(!this.data.startDate) this.data.startDate = new Date().toISOString().split('T')[0];
            if(!this.data.bodyMap) this.data.bodyMap = { last: null, history: [] };
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
        
        togglePrivacy() {
            if(document.body.classList.contains('privacy-mode')) {
                document.getElementById('privacyModal').style.display = 'flex';
                document.getElementById('privacyPassword').value = '';
                setTimeout(() => document.getElementById('privacyPassword').focus(), 100);
            } else {
                document.body.classList.add('privacy-mode', 'privacy-locked');
                if(this.state.editing) this.toggleEdit();
            }
        },
        
        unlockPrivacy() {
            const pwdInput = document.getElementById('privacyPassword');
            const pwd = pwdInput.value;
            const truePass = this.data.privacyPassword || '2255';
            const fakePass = '1111'; // 4. ПАРОЛЬ-ОБМАНКА

            const container = document.getElementById('pwdContainer');
            const icon = document.getElementById('privIcon');
            const btn = document.getElementById('unlockBtn');
            const title = container.querySelector('h2'); 
            const sub = container.querySelector('p');    

            // Функція успішного входу (спільна)
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
                    
                    // ЯКЩО ФЕЙК: Підміняємо дані на льоту
                    if (isFake) {
                        this.enableFakeMode();
                    }

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
                grantAccess(false); // Реальний вхід
            } else if (pwd === fakePass) {
                grantAccess(true);  // 4. Фейковий вхід
            } else {
                // ... код помилки (той самий, що був) ...
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

        // 4. ФУНКЦІЯ ДЛЯ РЕЖИМУ ОБМАНКИ
        enableFakeMode() {
            // Очищаємо екран і малюємо "невинні" вітамінки
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
            // Ховаємо елементи керування, щоб не спалитись
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
        
changeStartDate() {
            if(document.body.classList.contains('privacy-mode')) return; // Блокуємо в Privacy Mode
            
            const inp = document.getElementById('startDateInput');
            if (inp) {
                inp.value = this.data.startDate;
                try { 
                    inp.showPicker(); 
                } catch(e) { 
                    inp.focus(); 
                    inp.click(); 
                }
            } else {
                const newDate = prompt("Введи дату початку курсу (YYYY-MM-DD):", this.data.startDate);
                if(newDate && newDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    this.setStartDate(newDate);
                }
            }
        },
    setStartDate(newDate) {
            if (!newDate) return;
            this.pushHistory();
            this.data.startDate = newDate;
            this.save();
            
            // Заново вираховуємо, який зараз тиждень відносно нової дати
            const now = new Date();
            const start = this.getMondayOfStartWeek();
            const diffTime = now.getTime() - start.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            let currentWeek = Math.floor(diffDays / 7) + 1; 
            
            const maxW = Math.max(...Object.keys(this.data.schedule).map(Number));
            if (currentWeek < 1) currentWeek = 1;
            if (currentWeek > maxW) currentWeek = maxW;
            
            // Встановлюємо правильний тиждень і фазу
            this.state.week = currentWeek; 
            const currentPhase = this.data.phases.find(p => p.weeks.includes(currentWeek));
            if (currentPhase) this.state.phaseId = currentPhase.id;
            
            // Оновлюємо екран
            this.renderNav();
            this.renderView();
        },

        pushHistory() {
        this.stateManager.push(this.data);
        // Відображення кнопки Undo
        if (this.state.editing) {
            const btn = document.getElementById('undoFloat');
            if(btn) btn.classList.add('visible');
        }
    },

        undo() {
        const prev = this.stateManager.undo(this.data); // Передаємо поточні дані, якщо менеджер це підтримує, але для StateManager з utils.js аргумент не обов'язковий, якщо він просто бере з масиву
        
        // ВАЖЛИВО: StateManager у нас повертає дані, а не сам робить save.
        // Тому ми маємо отримати prev і присвоїти його this.data
        if (prev) {
            this.data = prev;
            
            // Ховаємо кнопку, якщо історія пуста
            if (this.stateManager.history.length === 0) {
                const btn = document.getElementById('undoFloat');
                if(btn) btn.classList.remove('visible');
            }
            
            this.save(); // Зберігаємо відновлений стан
            this.refreshPhotos(); 
            this.renderNav(); 
            this.renderView();
        }
    },

       async renderView() {
            
            const c = document.getElementById('mainView'); 
            // ВАЖЛИВО: Ми НЕ очищаємо c.innerHTML тут, щоб уникнути "миготіння" і стрибка вгору
            
            this.renderTimeline();
            
            if(this.state.view === 'protocol') {
                await this.renderProtocol(c); // renderProtocol сам оновить HTML
            }
            else {
                // Для інших вкладок очищення потрібне
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

            progBar.style.transition = 'width 1s cubic-bezier(0.25, 1, 0.5, 1)';

            if (!progBar.style.width) {
                progBar.style.width = '0%';
            }

            setTimeout(() => {
                progBar.style.width = pct + '%';
            }, 50);

            if (progText) {
                // Перевіряємо, чи ми на вкладці Protocol
                const activeTab = document.querySelector('.nav-tab.active');
                const isProtocol = activeTab ? activeTab.innerText.toLowerCase().includes('protocol') : true;

                // Додаємо іконку з умовою display
                progText.innerHTML = `Week ${curW}/${maxW} 
                <span class="date-picker-wrapper" title="Змінити дату старту курсу" style="display: ${isProtocol ? 'inline-flex' : 'none'};">
                    <span style="font-size:1.2rem; pointer-events:none;">📅</span>
                    <input type="date" class="date-hidden-input" value="${this.data.startDate}" onchange="if(!document.body.classList.contains('privacy-mode')) { App.setStartDate(this.value); }">
                </span>`;
            }
        },

async renderProtocol(c) {
            // 1. ЗАПАМ'ЯТОВУЄМО СКРОЛ ТИЖНІВ ДО ПЕРЕМАЛЬОВКИ
            let weekScrollPos = 0;
            const oldWeekBar = document.querySelector('.week-bar');
            if (oldWeekBar) weekScrollPos = oldWeekBar.scrollLeft;

            const ph = this.data.phases.find(x => x.id === this.state.phaseId);
            const wHtml = ph ? ph.weeks.map(w => `<div class="week-btn ${w === this.state.week ? 'active' : ''} ${this.photoKeys.has(w) ? 'has-data' : ''}" onclick="App.setWeek(${w})">${w}</div>`).join('') : '';

            let grid = '<div class="days-grid">';
            const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

            for (let i = 0; i < 7; i++) {
                const realDate = this.getRealDate(this.state.week, i);
                const isToday = this.isToday(this.state.week, i);
                const pills = this.data.schedule[this.state.week]?.[i] || [];
                const v = this.data.vitals[`${this.state.week}-${i}`] || { bp: "", hr: "", w: "" };

                // ГОТУЄМО ДАНІ ТИСКУ (тепер правильно, ПЕРЕД генерацією HTML)
                let sys = "", dia = "";
                if (v.bp && v.bp.includes('/')) {
                    const parts = v.bp.split('/');
                    sys = parts[0]; dia = parts[1];
                } else if (v.bp) {
                    sys = v.bp; 
                }

                let content = pills.map((m, idx) => {
                    const pillId = `${this.state.week}-${i}-${idx}`;
                    return `
                    <div class="pill ${m.color}">
                        <div style="flex:1">
                            <div contenteditable="${this.state.editing}" onblur="App.updatePill(${this.state.week},${i},${idx},'name',this.innerText)" style="font-weight:600">${m.name}</div>
                            <div class="pill-meta" contenteditable="${this.state.editing}" onblur="App.updatePill(${this.state.week},${i},${idx},'meta',this.innerText)">${m.meta || ""}</div>
                        </div>
                        <span contenteditable="${this.state.editing}" onblur="App.updatePill(${this.state.week},${i},${idx},'dose',this.innerText)">${m.dose}</span>
                        
                        ${this.state.editing ? `
                            <div id="menu-${pillId}" data-name="${m.name.replace(/"/g, '&quot;')}" style="margin-left:10px; position:relative;">
                                ${this.getMenuUI(this.state.week, i, idx, m.name, this.state.openMenu === pillId)}
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

                // А ось тепер формуємо HTML
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
            const pHtml = photos.map(p => `<div class="photo-card"><img src="${p.data}" onclick="App.openPhotoModal(this.src)"><div class="photo-del" onclick="event.stopPropagation(); App.deletePhoto(${p.id})">✕</div></div>`).join('');

            // ГОТУЄМО ДАНІ ЗАМІРІВ ТУТ (в JS, ПЕРЕД генерацією HTML)
            const meas = (this.data.measurements && this.data.measurements[this.state.week]) || { chest: '', waist: '', arm: '', leg: '', calf: '' };

            // ТЕПЕР ФОРМУЄМО ВЕСЬ БЛОК РАЗОМ
            c.innerHTML = `
                <div class="stats-grid" id="stats-container"></div>
                <div class="week-bar">${wHtml}</div>
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
                    <button class="btn-compare" onclick="App.openCompareModal()">⚔️ ПОРІВНЯТИ (W1 vs W${this.state.week})</button>
                    <div class="photo-grid">${pHtml}</div>
                    <label class="btn-upload edit-ui" style="margin-top:10px;display:block">+ Завантажити фото<input type="file" id="photoInput" accept="image/*" multiple onchange="App.uploadPhoto(this)"></label>
                </div>`;

            // 2. ПОВЕРТАЄМО СКРОЛ НА МІСЦЕ
            const newWeekBar = document.querySelector('.week-bar');
            if (newWeekBar) newWeekBar.scrollLeft = weekScrollPos;

            this.renderStatsPanel();
        },

renderAnalytics(c) {
            // 1. СТРУКТУРА (ДВА ГРАФІКИ)
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
            
            // 2. ПІДГОТОВКА ДАНИХ
            const labels = []; 
            const dataTest = [];    
            const dataStack = []; 
            const dataWeight = [];
            const weekDetails = []; 

            // Масиви для замірів
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
        
                // Вага
                let weightSum = 0; let weightCount = 0;
                for(let d=0; d<7; d++) {
                    const v = this.data.vitals[`${w}-${d}`];
                    if(v && v.w) { 
                        const val = parseFloat(v.w.toString().replace(',','.'));
                        weightSum += val; 
                        weightCount++; 
                        if(val < minWeight) minWeight = val;
                        if(val > maxWeight) maxWeight = val;
                    }
                }
                dataWeight.push(weightCount > 0 ? (weightSum/weightCount) : null);

                // ЗАМІРИ
                const meas = (this.data.measurements && this.data.measurements[w]) || {};
                dataChest.push(meas.chest ? parseFloat(meas.chest) : null);
                dataWaist.push(meas.waist ? parseFloat(meas.waist) : null);
                dataArm.push(meas.arm ? parseFloat(meas.arm) : null);
                dataLeg.push(meas.leg ? parseFloat(meas.leg) : null);
                dataCalf.push(meas.calf ? parseFloat(meas.calf) : null);
            }
            
            if(minWeight === 200) minWeight = 0;
            const y1Min = Math.max(0, Math.floor(minWeight - 2));
            const y1Max = Math.ceil(maxWeight + 2);
        
            // 3. МАЛЮЄМО ПЕРШИЙ ГРАФІК (ВАГА ТА ФАРМА)
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
                        x: { stacked: true, grid: { display: false }, ticks: { color: '#666', font: {size: 11} }, offset: true }, // ДОДАНО offset: true
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

            // 4. МАЛЮЄМО ДРУГИЙ ГРАФІК (ЗАМІРИ)
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
                        x: { grid: { display: false }, ticks: { color: '#666', font: {size: 11} }, offset: true }, // ДОДАНО offset: true
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

        // Додаткова функція для кліку по кастомній легенді
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
            let html = '<div class="med-grid">';
            
            this.data.analysis.forEach((block, i) => {
                html += `
                <div class="med-card">
                    <div class="med-header">
                        <div style="flex-grow:1">
                            <div class="med-title" contenteditable="${this.state.editing}" 
                                onblur="App.data.analysis[${i}].title=this.innerText; App.save()">${block.title}</div>
                            <div class="med-timing" contenteditable="${this.state.editing}" 
                                onblur="App.data.analysis[${i}].timing=this.innerText; App.save()">${block.timing}</div>
                        </div>
                        ${this.state.editing ? `<div style="cursor:pointer; color:#ef4444; padding:0 0 10px 10px;" onclick="App.pushHistory(); App.data.analysis.splice(${i},1); App.save(); App.renderView()">✕</div>` : ''}
                    </div>
                    
                    <div class="med-list">
                        ${block.checks.map((chk, j) => `
                            <div class="check-row">
                                <span class="check-icon">●</span>
                                <span class="check-name" contenteditable="${this.state.editing}" 
                                    onblur="App.data.analysis[${i}].checks[${j}]=this.innerText; App.save()">${chk}</span>
                                ${this.state.editing ? `<span style="color:#ef4444;cursor:pointer;margin-left:10px; font-size:0.8rem" onclick="App.pushHistory(); App.data.analysis[${i}].checks.splice(${j},1); App.save(); App.renderView()">✕</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    
                    ${this.state.editing ? `<button class="btn-ghost" onclick="App.pushHistory(); App.data.analysis[${i}].checks.push('Новий показник'); App.save(); App.renderView()">+ Add Check</button>` : ''}
                </div>`;
            });

            html += `</div>`;
            
            if (this.state.editing) {
                html += `<button class="btn-new-section" onclick="App.pushHistory(); App.data.analysis.push({title:'НОВИЙ ЕТАП', timing:'Тиждень ?', checks:['Показник']}); App.save(); App.renderView()">+ СТВОРИТИ ЕТАП КОНТРОЛЮ</button>`;
            }
            
            c.innerHTML = html;
        },
        
       renderPharm(c) {
            let html = '<div class="med-grid">'; // Та сама сітка
            
            this.data.pharmacy.forEach((cat, i) => {
                html += `
                <div class="category-block">
                    <div class="category-header ${cat.style}">
                        <span>${cat.title}</span>
                        ${this.state.editing ? `<span style="cursor:pointer;opacity:0.5" onclick="alert('Видалення категорій поки недоступне, видаліть вміст')">⚙️</span>` : ''}
                    </div>
                    
                    <div class="med-list">
                        ${cat.items.map((item, j) => `
                            <div class="med-item">
                                <div class="med-row-top">
                                    <span class="med-name" contenteditable="${this.state.editing}" 
                                        onblur="App.data.pharmacy[${i}].items[${j}].n=this.innerText; App.save()">${item.n}</span>
                                    
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <span class="med-dose" contenteditable="${this.state.editing}" 
                                            onblur="App.data.pharmacy[${i}].items[${j}].d=this.innerText; App.save()">${item.d}</span>
                                        ${this.state.editing ? `<span style="color:#ef4444;cursor:pointer;font-size:0.8rem" onclick="App.delMed(${i},${j})">✕</span>` : ''}
                                    </div>
                                </div>
                                <div class="med-desc" contenteditable="${this.state.editing}" 
                                    onblur="App.data.pharmacy[${i}].items[${j}].i=this.innerText; App.save()">${item.i}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    ${this.state.editing ? `<button class="btn-ghost" onclick="App.addMed(${i})">+ Add Item</button>` : ''}
                </div>`;
            });
            
            html += '</div>';
            c.innerHTML = html;
        },

        openBodyMap() { 
            this.lockScroll(); // Блокуємо фон
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
            
            // Автоматична підтримка старих даних, щоб нічого не зникло
            if (this.data.bodyMap && this.data.bodyMap.last && !this.data.bodyMap.active) {
                this.data.bodyMap.active = [this.data.bodyMap.last];
            }
            const activeSites = this.data.bodyMap?.active || [];

            let svg = `<svg viewBox="0 0 300 500" class="body-svg"><path d="M150,20 Q110,20 110,50 L100,60 L100,180 L80,250 L80,450 L140,450 L140,280 L160,280 L160,450 L220,450 L220,250 L200,180 L200,60 L190,50 Q190,20 150,20" fill="#1a1a1a" stroke="none"/>`;
            
            muscles.forEach(m => {
                const isActive = activeSites.includes(m.id);
                svg += `<path d="${m.d}" class="muscle-group ${isActive?'active':''}" onclick="App.setInjectionSite('${m.id}')" />`;
                
                if(isActive) {
                    // Повертаємо шприц! 
                    // Додали font-size="16" і тінь (drop-shadow), щоб на айфоні він виглядав чітко.
                    // pointer-events:none дозволяє клікати прямо по шприцу для відміни.
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
                // Якщо зона ВЖЕ вибрана — знімаємо відмітку
                this.data.bodyMap.active.splice(idx, 1);
            } else {
                // Якщо зона НЕ вибрана — ставимо шприц
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

            // Заповнюємо масив для нашого нового списку
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
            
            if(document.activeElement) document.activeElement.blur(); // ХОВАЄМО КЛАВІАТУРУ
            this.save(); 
            this.renderView();
            this.closeModal(); 
            
            if (this.state.lastScroll !== undefined) {
                window.scrollTo({ top: this.state.lastScroll, behavior: 'smooth' }); // ПЛАВНО ОПУСКАЄМО
            }
        },

        closeModal() { 
            document.getElementById('addPillModal').style.display = 'none'; 
            this.unlockScroll(); // Відпускаємо фон
        },
        
        // --- CALC FIX (REGEX) ---
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
                            // БЕРЕМО КОЛІР САМЕ З ПРЕПАРАТУ (наприклад 'c-green' -> 'green')
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

        // Нова функція для точкового оновлення статистики без мерехтіння
        updateStatsUI() {
             this.renderStatsPanel();
        },

renderStatsPanel() {
            const container = document.getElementById('stats-container');
            if(!container) return;
            
            // 1. Рахуємо статистику (тепер calc повертає і правильний колір)
            const stats = this.calc(this.state.week);
            
            // 2. Сортуємо: від найбільшої дози до найменшої
            const sortedStats = Object.entries(stats).sort((a,b) => b[1].v - a[1].v);
            
            // 3. Генеруємо HTML для дозувань
            let statsHtml = sortedStats.map(([k,v]) => {
                // Використовуємо колір, який ми зберегли у функції calc (v.c)
                let color = v.c || 'yellow'; 
                
                return `<div class="stat-card c-${color}"><span class="stat-val">${parseFloat(v.v.toFixed(2))}${v.u}</span><span class="stat-label">${k}</span></div>`;
            }).join('') || '';
            
            // 4. Додаємо кнопку карти (MAP) в кінці
            statsHtml += `<div class="stat-card" style="border-color:#444; cursor:pointer; align-items:center; justify-content:center" onclick="App.openBodyMap()"><span style="font-size:1.5rem">🧍</span><span class="stat-label">MAP</span></div>`;
            
            container.innerHTML = statsHtml;
        },
        
        saveNote(w,t) { 
            this.pushHistory(); 
            this.data.notes[w]=t; 
            this.save(); 
        },
        
// Нова функція спеціально для тиску (збирає 2 поля в одне значення)
        saveBP(w, d, type, val) {
            this.pushHistory();
            const key = `${w}-${d}`;
            if(!this.data.vitals[key]) this.data.vitals[key] = {bp:"", hr:"", w:""};

            let currentBP = this.data.vitals[key].bp || "/";
            let parts = currentBP.split('/');
            if (parts.length !== 2) parts = ["", ""];

            if (type === 'sys') parts[0] = val;
            if (type === 'dia') parts[1] = val;

            // Зберігаємо лише якщо хоча б одне поле заповнене
            if (parts[0] === "" && parts[1] === "") {
                this.data.vitals[key].bp = "";
            } else {
                this.data.vitals[key].bp = `${parts[0]}/${parts[1]}`;
            }

            this.save();
        },
        
        // Оновлена, чиста функція для пульсу та ваги
        saveVital(w,d,k,v) { 
            this.pushHistory();
            const key = `${w}-${d}`; 
            if(!this.data.vitals[key]) this.data.vitals[key] = {bp:"", hr:"", w:""}; 
            
            // Якщо це вага, переконуємось перед збереженням, що там крапка
            if (k === 'w' && v) v = v.replace(',', '.'); 

            this.data.vitals[key][k] = v; 
            this.save(); 
        },

        saveMeas(w, k, v) {
            this.pushHistory();
            if(!this.data.measurements) this.data.measurements = {};
            if(!this.data.measurements[w]) this.data.measurements[w] = { chest: '', waist: '', arm: '', leg: '', calf: '' };
            
            // Якщо є кома, міняємо на крапку
            if (v) v = v.replace(',', '.');
            
            this.data.measurements[w][k] = v;
            this.save();
        },
        
        copyDay(w, d) {
            if(!this.dayBuffer) { 
                this.dayBuffer = JSON.parse(JSON.stringify(this.data.schedule[w][d])); 
                this.renderView(); 
            } else { 
                if(confirm("Вставити день?")) { 
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
            this.state.openMenu = null; // Закриваємо меню
            this.renderView(); // Оновлюємо, щоб з'явились кнопки 📥
            
            // Показуємо спливаюче повідомлення
            const toast = document.createElement('div');
            toast.innerText = "💊 Скопійовано! Натисніть 📥 біля потрібного дня";
            toast.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#222; color:#fff; padding:10px 20px; border-radius:20px; z-index:9999; border:1px solid #d4af37; font-family:sans-serif; font-size:0.9rem;";
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2500);
        },

        // Вставити 1 препарат (з перевіркою на дублікати)
        pastePill(w, d) {
            if (!this.pillBuffer) return;

            // 1. Перевіряємо, чи вже є такий препарат у цьому дні
            const targetDay = this.data.schedule[w][d];
            const isDuplicate = targetDay.some(p => 
                p.name.trim().toLowerCase() === this.pillBuffer.name.trim().toLowerCase()
            );

            // 2. Якщо є — показуємо помилку і виходимо
            if (isDuplicate) {
                alert(`⛔ Помилка: Препарат "${this.pillBuffer.name}" вже є в цьому дні!`);
                return;
            }

            // 3. Якщо немає — вставляємо
            this.pushHistory();
            this.data.schedule[w][d].push({ ...this.pillBuffer });
            this.save();
            this.renderView();
        },

                // --- ПОЧАТОК НОВОГО КОДУ (КРОК 4) ---
        duplicatePillToPhase(w, d, pillIdx) {
            if(!confirm("Дублювати цей препарат до кінця фази?")) return;
            this.pushHistory();
            const sourcePill = this.data.schedule[w][d][pillIdx];
            
            // Знаходимо фазу
            const phase = this.data.phases.find(p => p.weeks.includes(w));
            if(!phase) return;

            // Копіюємо на всі майбутні тижні цієї фази
            phase.weeks.forEach(weekNum => {
                if (weekNum > w) {
                    this.data.schedule[weekNum][d].push({ ...sourcePill });
                }
            });
            
            this.save();
            this.renderView(); 
        },
// Генерує вигляд меню
        getMenuUI(w, d, i, name, isOpen) {
            const safeName = name.replace(/'/g, "\\'"); 
            
            if (isOpen) {
                return `
                <div style="display:flex; gap:12px; align-items:center; background:#222; padding:4px 8px; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.5); position:absolute; right:0; top:-5px; z-index:10; border:1px solid #444;">
                    <span onclick="App.copyPill(${w},${d},${i})" title="Копіювати" style="cursor:pointer;">📋</span>
                    <span onclick="App.duplicatePillToPhase(${w},${d},${i})" title="На всю фазу" style="cursor:pointer; color:var(--blue)">📑</span>
                    
                    <span onclick="App.deletePillFutureInPhase('${safeName}', ${w}, ${d})" title="Видалити до кінця фази" style="cursor:pointer; color:#ef4444">🌍</span>
                    
                    <span onclick="App.delPillItem(${w},${d},${i})" title="Видалити" style="cursor:pointer; color:#ef4444; font-weight:bold">✕</span>
                    <span onclick="App.toggleMenu(${w},${d},${i}, '${safeName}')" style="cursor:pointer; opacity:0.5; font-size:0.8rem">◀</span>
                </div>`;
            } else {
                return `<span onclick="App.toggleMenu(${w},${d},${i}, '${safeName}')" style="font-size:1.4rem; cursor:pointer; line-height:1; color:var(--text); opacity:0.7">⋮</span>`;
            }
        },
       toggleMenu(w, d, i, name) {
            const id = `${w}-${d}-${i}`;
            const lastId = this.state.openMenu;

            // 1. Якщо було відкрите інше меню — закриваємо його "тихо"
            if (lastId && lastId !== id) {
                const oldEl = document.getElementById(`menu-${lastId}`);
                if (oldEl) {
                    const oldName = oldEl.getAttribute('data-name') || 'Item';
                    // Розбираємо ID старого меню
                    const parts = lastId.split('-');
                    if(parts.length === 3) {
                        oldEl.innerHTML = this.getMenuUI(parts[0], parts[1], parts[2], oldName, false);
                    }
                }
            }

            // 2. Перемикаємо стан поточного
            this.state.openMenu = (this.state.openMenu === id) ? null : id;
            const isOpen = (this.state.openMenu === id);

            // 3. Оновлюємо ТІЛЬКИ цей елемент (без перезавантаження сторінки)
            const el = document.getElementById(`menu-${id}`);
            if (el) {
                el.innerHTML = this.getMenuUI(w, d, i, name, isOpen);
            }
        },
// Видалити препарат починаючи з цього тижня і до кінця фази
        deletePillFutureInPhase(name, startWeek, dayIndex) {
            const dayNames = ["Понеділків", "Вівторків", "Серед", "Четвергів", "П'ятниць", "Субот", "Неділь"];
            const dayName = dayNames[dayIndex] || "днів";

            if(!confirm(`⚠️ ВИДАЛИТИ "${name}" з усіх "${dayName}" починаючи з тижня ${startWeek} і до кінця цієї фази?`)) return;
            
            this.pushHistory();
            
            // Знаходимо фазу, до якої належить поточний тиждень
            const phase = this.data.phases.find(p => p.weeks.includes(startWeek));
            if (!phase) return;
            
            // Проходимось по тижнях знайденої фази
            phase.weeks.forEach(w => {
                // Видаляємо ТІЛЬКИ якщо тиждень більший або дорівнює тому, де ми натиснули (startWeek)
                if (w >= startWeek && this.data.schedule[w] && this.data.schedule[w][dayIndex]) {
                    this.data.schedule[w][dayIndex] = this.data.schedule[w][dayIndex].filter(p => p.name !== name);
                }
            });
            
            this.save();
            this.renderView();
        },

                // --- ЦЕ ВСТАВИТИ ПРАВИЛЬНО ---
        smartSave() {
            let report = `══════════════════════════════════════\n`;
            report += `GOLD PROTOCOL - ТИЖДЕНЬ ${this.state.week}\n`;
            report += `══════════════════════════════════════\n\n`;
            
            // 1. СТАТИСТИКА (З СОРТУВАННЯМ)
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
            
            // 2. ПО ДНЯХ
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
            // ЗАМІРИ
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
            // 3. НОТАТКИ
            if(this.data.notes[this.state.week]) {
                report += `\n📝 НОТАТКИ:\n`;
                report += `────────────────────────────────────\n`;
                report += this.data.notes[this.state.week] + `\n`;
            }
            
            report += `\n══════════════════════════════════════\n`;
            
            // 4. КОПІЮВАННЯ ТА ЕКСПОРТ
            navigator.clipboard.writeText(report).then(() => {
                alert('✅ Скопійовано!');
                if(confirm("Скачати JSON бекап?")) {
                    const filename = `gold_protocol_w${this.state.week}_${new Date().toISOString().split('T')[0]}.json`;
                    this.stateManager.export(this.data, filename);
                }
            }).catch(e => alert('❌ Помилка'));
        },


        setView(v, btn) { 
            this.state.view = v; 
            document.querySelectorAll('.nav-tab').forEach(e=>e.classList.remove('active')); 
            btn.classList.add('active'); 
            document.getElementById('phaseNav').style.display = v==='protocol'?'flex':'none'; 
            
            // НОВИЙ РЯДОК: Ховаємо або показуємо календар залежно від вкладки
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
        
        addMed(catIdx) { 
            let n=prompt("Назва:"); 
            if(n) { 
                this.pushHistory(); 
                this.data.pharmacy[catIdx].items.push({n:n,d:"-",i:"-"}); 
                this.save(); 
                this.renderView(); 
            } 
        },

        delMed(c,i) { 
            if(confirm("Видалити?")) { 
                this.pushHistory(); 
                this.data.pharmacy[c].items.splice(i,1); 
                this.save(); 
                this.renderView(); 
            } 
        },
        
        importData(inp) { 
            const r=new FileReader(); 
            r.onload=e=>{ 
                try { 
                    const json = JSON.parse(e.target.result); 
                    if(!json.phases) throw new Error("Invalid"); 
                    this.pushHistory(); 
                    this.data=json; 
                    this.save(); 
                    location.reload(); 
                } catch(err) { 
                    alert("❌ Невірний файл!"); 
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
            
            for(let w = maxW; w > lastWeek; w--) { 
                this.data.schedule[w+1] = this.data.schedule[w]; 
                this.data.notes[w+1] = this.data.notes[w]; 
                for(let d=0; d<7; d++) { 
                    if(this.data.vitals[`${w}-${d}`]) {
                        this.data.vitals[`${w+1}-${d}`] = this.data.vitals[`${w}-${d}`];
                        delete this.data.vitals[`${w}-${d}`];
                    }
                } 
            } 
            
            this.data.schedule[lastWeek + 1] = copyOfLastWeek;
            await PhotoDB.shiftWeeks(1); 
            phase.weeks.push(lastWeek + 1); 
            for(let i = pIdx + 1; i < this.data.phases.length; i++) {
                this.data.phases[i].weeks = this.data.phases[i].weeks.map(w => w + 1);
            }
            this.save(); 
            this.refreshPhotos(); 
            this.renderNav(); 
            this.renderView(); 
        },
        
        // NEW: PREPEND WEEK
        async prependPhaseWeek(pId) {
            this.pushHistory();
            const pIdx = this.data.phases.findIndex(p => p.id === pId);
            if (pIdx !== 0) {
                alert("Додавати минулі тижні можна тільки до першої фази.");
                return;
            }
            
            const phase = this.data.phases[0];
            
            // Shift ALL data +1
            const maxW = Math.max(...Object.keys(this.data.schedule).map(Number));
            for(let w = maxW; w >= 1; w--) {
                this.data.schedule[w+1] = this.data.schedule[w];
                this.data.notes[w+1] = this.data.notes[w];
                for(let d=0; d<7; d++) {
                    if(this.data.vitals[`${w}-${d}`]) this.data.vitals[`${w+1}-${d}`] = this.data.vitals[`${w}-${d}`];
                }
            }
            
            // Clear Week 1
            this.data.schedule[1] = [[],[],[],[],[],[],[]];
            this.data.notes[1] = "";
            
            // Shift Photos
            await PhotoDB.shiftWeeks(1);
            
            // Shift All Phase Weeks
            this.data.phases.forEach(p => {
                p.weeks = p.weeks.map(w => w + 1);
            });
            
            // Add Week 1 to current phase
            phase.weeks.unshift(1);
            
            // Update Start Date (Shift back 7 days)
            const d = new Date(this.data.startDate);
            d.setDate(d.getDate() - 7);
            this.data.startDate = d.toISOString().split('T')[0];
            
            this.save(); this.refreshPhotos(); this.renderNav(); this.renderView();
        },

        async removePhaseWeek(pId) { 
            const pIdx = this.data.phases.findIndex(p => p.id === pId); 
            const phase = this.data.phases[pIdx]; 
            if(phase.weeks.length <= 1) return alert("Мін 1 тиждень!"); 
            this.pushHistory(); 
            const lastWeek = phase.weeks[phase.weeks.length - 1]; 
            
            // Shift photos back? (Not fully implemented for simplicity, just removing ref)
            // But let's try to be clean: 
            // We are removing the LAST week of phase.
            
            delete this.data.schedule[lastWeek]; 
            phase.weeks.pop(); 
            
            // If there are subsequent phases, shift them back? 
            // Standard logic: removing from end of phase just shortens it. 
            // If phases are consecutive, next phase weeks need shifting down.
            
            const maxW = Math.max(...Object.keys(this.data.schedule).map(Number)); 
            
            // If this wasn't the last phase, we have a gap now. 
            // We need to shift everything after `lastWeek` down by 1.
            
            for(let w = lastWeek; w < maxW; w++) { 
                this.data.schedule[w] = this.data.schedule[w+1]; 
                this.data.notes[w] = this.data.notes[w+1]; 
                for(let d=0; d<7; d++) { 
                    if(this.data.vitals[`${w+1}-${d}`]) this.data.vitals[`${w}-${d}`] = this.data.vitals[`${w+1}-${d}`]; 
                } 
            } 
            delete this.data.schedule[maxW]; 
            
            // Update weeks in subsequent phases
            for(let i = pIdx + 1; i < this.data.phases.length; i++) {
                 this.data.phases[i].weeks = this.data.phases[i].weeks.map(w => w - 1); 
            }
            
            // Note: Photos are bound to week number. If we shift schedule, we should shift photos too.
            // But removing a week is tricky. Let's assume user deletes empty week or accepts photo mismatch for now, 
            // or we implement shiftWeeks(-1) starting from lastWeek + 1.
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
        
        deletePhase(pId) { 
            if(!confirm("Видалити фазу?")) return; 
            this.pushHistory(); 
            const pIdx = this.data.phases.findIndex(p => p.id === pId); 
            const p = this.data.phases[pIdx]; 
            const len = p.weeks.length; 
            const start = p.weeks[0]; 
            const maxW = Math.max(...Object.keys(this.data.schedule).map(Number)); 
            for(let w = start; w <= maxW - len; w++) { 
                this.data.schedule[w] = this.data.schedule[w+len]; 
                this.data.notes[w] = this.data.notes[w+len]; 
            } 
            for(let i=0; i<len; i++) delete this.data.schedule[maxW-i]; 
            this.data.phases.splice(pIdx, 1); 
            for(let i = pIdx; i < this.data.phases.length; i++) this.data.phases[i].weeks = this.data.phases[i].weeks.map(w => w - len); 
            this.save(); 
            this.renderNav(); 
            this.setPhase(this.data.phases[0]?.id || 1); 
        },
        
        async refreshPhotos() { 
            this.photoKeys = await PhotoDB.keys(); 
        },

                async uploadPhoto(inp) { 
            this.pushHistory(); 
            // 1. Проходимось по файлах і стискаємо їх
            for(let f of inp.files) {
                try {
                    const compressedBase64 = await compressImage(f); // Стискаємо
                    // Перетворюємо Base64 назад у Blob для старої логіки (або модифікуємо PhotoDB.add)
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
            if(confirm("Видалити фото?")) { 
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
        async openCompareModal() {
            this.lockScroll(); // Блокуємо фон
            const keys = Array.from(this.photoKeys).sort((a,b) => a - b);
            
            if (keys.length === 0) {
                alert("Немає завантажених фото для порівняння.");
                return;
            }
            
            const selL = document.getElementById('compSelectL');
            const selR = document.getElementById('compSelectR');
            
            // Створюємо список опцій (Тільки ті тижні, де є фото)
            let options = keys.map(k => `<option value="${k}">Week ${k}</option>`).join('');
            selL.innerHTML = options;
            selR.innerHTML = options;
            
            // За замовчуванням: зліва найперший тиждень (Week 1), справа - поточний (або останній наявний)
            selL.value = keys[0];
            selR.value = keys.includes(this.state.week) ? this.state.week : keys[keys.length - 1];
            
            document.getElementById('compareModal').style.display = 'flex';
            
            // Завантажуємо фотографії для вибраних тижнів
            await this.loadCompareImage('L', selL.value);
            await this.loadCompareImage('R', selR.value);
        },

        async loadCompareImage(side, week) {
            const box = document.getElementById('imgBox' + side);
            box.innerHTML = '<span style="opacity:0.3">Loading...</span>';
            
            const photos = await PhotoDB.get(Number(week));
            
            // Зберігаємо завантажені фото для швидкого перемикання
            if (!this.compareData) this.compareData = { L: [], R: [], wL: '', wR: '' };
            this.compareData[side] = photos || [];
            this.compareData['w' + side] = week;
            
            if (photos && photos.length > 0) {
                box.style.aspectRatio = 'auto';
                box.style.display = 'flex';
                box.style.flexDirection = 'column';
                box.style.gap = '10px';
                box.style.maxHeight = '65vh'; 
                box.style.overflowY = 'auto'; 
                box.style.padding = '0 5px 0 0';
                box.style.background = 'transparent';
                box.style.border = 'none';

                // ЗАМІНЕНО: тепер викликаємо спеціальну функцію openCompareFullscreen
                box.innerHTML = photos.map((p, idx) => 
                    `<img src="${p.data}" style="width:100%; border-radius:8px; object-fit:cover; border:1px solid #333; cursor:pointer;" onclick="App.openCompareFullscreen('${side}', ${idx})">`
                ).join('');
            } else {
                box.style.aspectRatio = '3/4';
                box.style.display = 'flex';
                box.style.maxHeight = 'none';
                box.style.overflowY = 'hidden';
                box.style.background = '#000';
                box.style.border = '1px dashed #333';
                box.innerHTML = '<span style="opacity:0.3">Немає фото</span>';
            }
        },
        // НОВА ФУНКЦІЯ: Підготовка двох фото для швидкого перемикання
        openCompareFullscreen(side, idx) {
            const otherSide = side === 'L' ? 'R' : 'L';
            const photoMain = this.compareData[side][idx];
            const photoAlt = this.compareData[otherSide][idx]; // Шукаємо фото з таким же індексом по той бік

            if (!photoMain) return;

            const urlMain = photoMain.data;
            const urlAlt = photoAlt ? photoAlt.data : null;
            const labelMain = `W${this.compareData['w' + side]}`;
            const labelAlt = photoAlt ? `W${this.compareData['w' + otherSide]}` : null;

            // Передаємо обидва фото у наш переглядач
            this.openPhotoModal(urlMain, urlAlt, labelMain, labelAlt);
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
            
            // 1. Визначаємо, з якого тижня починаємо вставку
            let startWeek = 1;
            if (index > 0) {
                const prevPhase = this.data.phases[index - 1];
                startWeek = prevPhase.weeks[prevPhase.weeks.length - 1] + 1;
            }
    
            const duration = 4; // Довжина нової фази (стандартно 4 тижні)
            const maxW = Math.max(...Object.keys(this.data.schedule).map(Number), 0);
    
            // 2. Зсуваємо дані (розклад, нотатки, показники) ВПЕРЕД
            // Йдемо з кінця, щоб не перезаписати дані
            for (let w = maxW; w >= startWeek; w--) {
                this.data.schedule[w + duration] = this.data.schedule[w];
                this.data.notes[w + duration] = this.data.notes[w];
                for(let d=0; d<7; d++) {
                    if(this.data.vitals[`${w}-${d}`]) {
                        this.data.vitals[`${w+duration}-${d}`] = this.data.vitals[`${w}-${d}`];
                        delete this.data.vitals[`${w}-${d}`];
                    }
                }
                delete this.data.schedule[w];
                delete this.data.notes[w];
            }
    
            // 3. Очищаємо нові тижні (створюємо пусті слоти)
            for (let i = 0; i < duration; i++) {
                this.data.schedule[startWeek + i] = [[],[],[],[],[],[],[]];
            }
    
            // 4. Зсуваємо фото
            await PhotoDB.shiftWeeks(startWeek, duration);
    
            // 5. Оновлюємо тижні у всіх наступних фазах
            for (let i = index; i < this.data.phases.length; i++) {
                this.data.phases[i].weeks = this.data.phases[i].weeks.map(w => w + duration);
            }
    
            // 6. Створюємо нову фазу
            const maxId = this.data.phases.reduce((max, p) => Math.max(max, p.id), 0);
            const newPhase = {
                id: maxId + 1,
                title: "New Phase",
                weeks: Array.from({length: duration}, (_, i) => startWeek + i)
            };
    
            // 7. Вставляємо фазу в масив у потрібне місце
            this.data.phases.splice(index, 0, newPhase);
    
            // Якщо вставили на початок, оновлюємо дату старту (зсуваємо назад на 4 тижні, щоб "сьогодні" лишилось правильним, або просто лишаємо як є, тоді все зсунеться в майбутнє)
            // Логічніше просто зсунути всі події в майбутнє, дату старту не чіпаємо.
    
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
                // Кнопка вставки ПЕРЕД фазою (тільки в режимі редагування)
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
            
            // Кнопка вставки в самому кінці
            if (isEd) {
                html += `<div class="insert-phase-btn" onclick="App.insertPhase(${this.data.phases.length})"><span>+</span></div>`;
            } else {
                // Стара кнопка додавання в кінець (для звичайного режиму, якщо треба, або можна прибрати)
                // html += `<div class="new-phase-btn phase-btn" onclick="App.addNewPhase()">+</div>`; 
            }
            
            nav.innerHTML = html; 
        }
    };

    document.addEventListener('DOMContentLoaded', () => App.init());
