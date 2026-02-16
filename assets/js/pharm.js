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
    const compressImage = (file, maxWidth = 1024, quality = 0.7) => {
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
        // Підключаємо StateManager
        stateManager: new StateManager('gold_protocol', DefaultData),
        
        state: { view: 'protocol', phaseId: 1, week: 1, editing: false, tempPill: null, openMenu: null },
        chartInstance: null,
        dayBuffer: null,
        pillBuffer: null,
        safeSave() {
            if(document.body.classList.contains('privacy-mode')) {
                alert("⛔ ACCESS DENIED: SYSTEM LOCKED");
                return;
            }
            this.smartSave();
        },
        
// 1. ОНОВЛЕНА ФУНКЦІЯ ВІДКРИТТЯ
        async openCompareModal() {
            document.getElementById('compareModal').style.display = 'flex';
            
            // Отримуємо всі тижні, де є записи або фото
            const weeks = Object.keys(this.data.schedule).map(Number).sort((a,b)=>a-b);
            const maxW = Math.max(...weeks);
            
            // Заповнюємо селекти
            const selL = document.getElementById('compSelectL');
            const selR = document.getElementById('compSelectR');
            
            const createOpts = () => weeks.map(w => `<option value="${w}">WEEK ${w}</option>`).join('');
            
            selL.innerHTML = createOpts();
            selR.innerHTML = createOpts();
            
            // Встановлюємо дефолтні значення (W1 vs Current)
            selL.value = 1; 
            selR.value = this.state.week;

            // Завантажуємо картинки
            await this.loadCompareImage('L', 1);
            await this.loadCompareImage('R', this.state.week);
        },

        // 2. НОВА ФУНКЦІЯ ЗАВАНТАЖЕННЯ ФОТО
        async loadCompareImage(side, week) {
            const box = document.getElementById(`imgBox${side}`);
            box.innerHTML = '<span style="opacity:0.5; font-size:0.8rem">Searching...</span>';
            
            const photos = await PhotoDB.get(parseInt(week));
            
            if(photos && photos.length > 0) {
                // Показуємо перше фото (можна додати карусель, але поки так)
                box.innerHTML = `<img src="${photos[0].data}" style="width:100%; height:100%; object-fit:contain;">`;
            } else {
                box.innerHTML = `<div style="text-align:center; opacity:0.3"><div style="font-size:2rem">🚫</div><small>No Photo</small></div>`;
            }
        },


        safeLoad() {
            if(document.body.classList.contains('privacy-mode')) {
                alert("⛔ ACCESS DENIED: SYSTEM LOCKED");
                return;
            }
            document.getElementById('fileInput').click();
        },

                async init() {
            await PhotoDB.init();
            this.load();
            await this.refreshPhotos();
            this.renderNav(); 
            this.renderView();
            
            // Вмикаємо Privacy Mode на старті
            document.body.classList.add('privacy-mode', 'privacy-locked');
            
            const brandBlock = document.querySelector('.brand');
            const brandIcon = document.querySelector('.brand-icon');

            // 1. ОДИНОЧНИЙ КЛІК: Анімація "Натяк" (Червоний спалах)
            brandBlock.onclick = () => {
                // В приватному режимі не працює
                if (document.body.classList.contains('privacy-mode')) return;
                
                // Перезапуск анімації CSS
                brandIcon.classList.remove('hint-active');
                void brandIcon.offsetWidth; // Магія для перезапуску анімації (reflow)
                brandIcon.classList.add('hint-active');
            };
            
            // 2. ПОДВІЙНИЙ КЛІК: Reset (Без змін логіки)
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
            
            // save() тут можна не викликати
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
            const newDate = prompt("Введи дату початку курсу (YYYY-MM-DD):", this.data.startDate);
            if(newDate && newDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                this.pushHistory();
                this.data.startDate = newDate;
                this.save();
                this.renderView();
            }
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
            // 1. Запам'ятовуємо, де ми були (скільки прокрутили вниз)
            const scrollPos = window.scrollY;
            
            const c = document.getElementById('mainView'); 
            c.innerHTML = '';
            
            this.renderTimeline();
            if(this.state.view === 'protocol') await this.renderProtocol(c);
            else if(this.state.view === 'analysis') this.renderAnalysis(c);
            else if(this.state.view === 'pharmacy') this.renderPharm(c);
            else if(this.state.view === 'analytics') this.renderAnalytics(c);

            // 2. Відновлюємо позицію. setTimeout(..., 0) гарантує, що це станеться після малювання
            if (scrollPos > 0) {
                setTimeout(() => window.scrollTo(0, scrollPos), 0);
            }
        },

        renderTimeline() {
            const weekNumbers = Object.keys(this.data.schedule).map(Number);
            const maxW = weekNumbers.length > 0 ? Math.max(...weekNumbers) : 1;
            const curW = this.state.week;
            const pct = Math.min(100, (curW / maxW) * 100);
            document.getElementById('progBar').style.width = pct + '%';
            document.getElementById('progText').innerText = `Week ${curW}/${maxW}`;
        },

        async renderProtocol(c) {
                    // 1. ПРИБРАЛИ СТАРИЙ РОЗРАХУНОК СТАТИСТИКИ ТУТ
                    const ph = this.data.phases.find(x=>x.id===this.state.phaseId);
                    const wHtml = ph ? ph.weeks.map(w=>`<div class="week-btn ${w===this.state.week?'active':''} ${this.photoKeys.has(w)?'has-data':''}" onclick="App.setWeek(${w})">${w}</div>`).join('') : '';
        
                    let grid = '<div class="days-grid">';
                    const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
        
                    for(let i=0; i<7; i++) {
                        const realDate = this.getRealDate(this.state.week, i);
                        const isToday = this.isToday(this.state.week, i);
                        const pills = this.data.schedule[this.state.week]?.[i] || [];
                        const v = this.data.vitals[`${this.state.week}-${i}`] || {bp:"", hr:"", w:""};
                        
                        // Малюємо таблетки з новими кнопками
           // Малюємо таблетки з новими кнопками
            // Малюємо таблетки
            let content = pills.map((m,idx) => {
                const pillId = `${this.state.week}-${i}-${idx}`;
                
                return `
                <div class="pill ${m.color}">
                    <div style="flex:1">
                        <div contenteditable="${this.state.editing}" onblur="App.updatePill(${this.state.week},${i},${idx},'name',this.innerText)" style="font-weight:600">${m.name}</div>
                        <div class="pill-meta" contenteditable="${this.state.editing}" onblur="App.updatePill(${this.state.week},${i},${idx},'meta',this.innerText)">${m.meta||""}</div>
                    </div>
                    <span contenteditable="${this.state.editing}" onblur="App.updatePill(${this.state.week},${i},${idx},'dose',this.innerText)">${m.dose}</span>
                    
                    ${this.state.editing ? `
                        <div id="menu-${pillId}" data-name="${m.name.replace(/"/g, '&quot;')}" style="margin-left:10px; position:relative;">
                            ${this.getMenuUI(this.state.week, i, idx, m.name, this.state.openMenu === pillId)}
                        </div>
                    ` : ''}
                </div>`;
            }).join('');
            
            // Логіка кнопок заголовка дня (Вставка)
            let headerBtns = '';
            if (this.state.editing) {
                // Якщо є щось у буфері таблеток, показуємо кнопку вставки
                if (this.pillBuffer) {
                    headerBtns += `<span style="font-size:0.9rem; cursor:pointer; margin-left:10px;" onclick="App.pastePill(${this.state.week}, ${i})" title="Вставити таблетку">📥</span>`;
                }
                headerBtns += `<span style="font-size:0.9rem; cursor:pointer; opacity:0.7; margin-left:10px;" onclick="App.copyDay(${this.state.week}, ${i})" title="Копіювати день">${this.dayBuffer ? 'Paste Day' : '📋Day'}</span>`;
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
                                <input class="vital-input" type="text" inputmode="decimal" placeholder="120/80" value="${v.bp||''}" onblur="App.saveVital(${this.state.week},${i},'bp',this.value)">
                                <input class="vital-input" type="number" inputmode="decimal" placeholder="Пульс" value="${v.hr||''}" onblur="App.saveVital(${this.state.week},${i},'hr',this.value)">
                                <input class="vital-input" type="number" inputmode="decimal" placeholder="Вага" value="${v.w||''}" onblur="App.saveVital(${this.state.week},${i},'w',this.value)">
                            </div></div>`;
                    }
                    grid += '</div>';
        
                    const photos = await PhotoDB.get(this.state.week);
                    const pHtml = photos.map(p=>`<div class="photo-card"><img src="${p.data}" onclick="document.getElementById('modalImg').src=this.src;document.getElementById('imgModal').style.display='flex'"><div class="photo-del" onclick="event.stopPropagation(); App.deletePhoto(${p.id})">✕</div></div>`).join('');
                    
                    c.innerHTML = `
                        <div class="stats-grid" id="stats-container"></div> <div class="week-bar">${wHtml}</div>
                        ${grid}
                        <div style="margin-top:20px">
                            <textarea class="note-input" placeholder="Звіт за тиждень..." onblur="App.saveNote(${this.state.week}, this.value)">${this.data.notes[this.state.week]||""}</textarea>
                        </div>
                        <div class="photo-area">
                            <h3 style="color:#fff;font-size:1rem;margin:0 0 10px 0">📸 ФОТО W${this.state.week}</h3>
                            <button class="btn-compare" onclick="App.openCompareModal()">⚔️ ПОРІВНЯТИ (W1 vs W${this.state.week})</button>
                            <div class="photo-grid">${pHtml}</div>
                            <label class="btn-upload edit-ui" style="margin-top:10px;display:block">+ Завантажити фото<input type="file" id="photoInput" accept="image/*" multiple onchange="App.uploadPhoto(this)"></label>
                        </div>`;
                        
                     this.renderStatsPanel(); // Запускаємо малювання статистики
                },


            renderAnalytics(c) {
                // 1. СТРУКТУРА
                c.innerHTML = `
                    <div class="chart-container" style="position:relative; height:350px;">
                        <canvas id="mainChart"></canvas>
                    </div>
                    <div class="chart-caption" style="text-align:center; font-size:0.7rem; color:#666; margin-top:10px; font-family:'JetBrains Mono'">
                        * GOLD (Test Base) vs PURPLE (Anabolics). Вага — біла лінія.
                    </div>`;
                
                // 2. ПІДГОТОВКА ДАНИХ
                const labels = []; 
                const dataTest = [];    
                const dataStack = []; 
                const dataWeight = [];
                
                // Масив для зберігання детального складу курсу на кожен тиждень (для тултипа)
                const weekDetails = []; 
            
                const weekKeys = Object.keys(this.data.schedule).map(Number);
                const maxW = weekKeys.length > 0 ? Math.max(...weekKeys) : 1;
                
                // Змінні для авто-масштабування ваги
                let minWeight = 200, maxWeight = 0;
            
                for(let w=1; w<=maxW; w++) {
                    labels.push(`W${w}`);
                    let weekTest = 0;
                    let weekOther = 0;
                    let details = {}; // Сюди збираємо назви: { "Test E": "500mg", "HGH": "14 IU" }
            
                    if(this.data.schedule[w]) {
                        this.data.schedule[w].forEach(day => day.forEach(pill => {
                            const name = pill.name.trim();
                            const dose = pill.dose.trim();
                            
                            // 1. Збираємо деталі для тултипа (сумуємо однакові препарати)
                            if(!details[name]) details[name] = { val: 0, unit: '' };
                            
                            const match = dose.match(/(\d+([.,]\d+)?)/);
                            if (match) {
                                const val = parseFloat(match[0].replace(',', '.'));
                                // Визначаємо одиниці виміру
                                let unit = 'mg';
                                if(dose.toLowerCase().includes('iu')) unit = 'IU';
                                if(dose.toLowerCase().includes('mcg')) unit = 'mcg';
                                if(dose.toLowerCase().includes('tab')) unit = 'tab';
                                
                                details[name].val += val;
                                details[name].unit = unit;
            
                                // 2. Рахуємо навантаження на графік (ТІЛЬКИ mg)
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
                    
                    // Форматуємо деталі в строку для тултипа
                    weekDetails.push(
                        Object.entries(details)
                        .map(([n, d]) => `${n}: ${parseFloat(d.val.toFixed(1))} ${d.unit}`)
                    );
            
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
                }
                
                // Відступи для графіку ваги (+- 2кг від реальних значень)
                if(minWeight === 200) minWeight = 0; // Якщо ваги не було
                const y1Min = Math.max(0, Math.floor(minWeight - 2));
                const y1Max = Math.ceil(maxWeight + 2);
            
                if (this.chartInstance) { this.chartInstance.destroy(); this.chartInstance = null; }
                
                const ctx = document.getElementById('mainChart').getContext('2d');
                
                const gradTest = ctx.createLinearGradient(0, 400, 0, 0);
                gradTest.addColorStop(0, 'rgba(212, 175, 55, 0.1)'); 
                gradTest.addColorStop(1, 'rgba(212, 175, 55, 0.9)'); 
                
                const gradStack = ctx.createLinearGradient(0, 400, 0, 0);
                gradStack.addColorStop(0, 'rgba(139, 92, 246, 0.1)'); 
                gradStack.addColorStop(1, 'rgba(139, 92, 246, 0.9)'); 
            
                Chart.defaults.font.family = "'JetBrains Mono', monospace";
                Chart.defaults.color = "#666";
            
                this.chartInstance = new Chart(ctx, {
                    type: 'bar',
                    plugins: [{
                        id: 'backgroundClick',
                        beforeEvent: (chart, args, options) => {
                            if (args.event.type === 'click' || args.event.type === 'touchstart') {
                                const points = chart.getElementsAtEventForMode(args.event, 'nearest', { intersect: true }, true);
                                if (!points.length) {
                                    chart.setActiveElements([], { x: 0, y: 0 });
                                    chart.tooltip.setActiveElements([], { x: 0, y: 0 });
                                    chart.update();
                                }
                            }
                        }
                    }],
                    data: {
                        labels: labels,
                        datasets: [
                            { 
                                label: 'Вага (kg)', 
                                data: dataWeight, 
                                type: 'line', 
                                borderColor: '#ffffff', 
                                backgroundColor: '#ffffff', 
                                borderWidth: 2, 
                                yAxisID: 'y1', 
                                pointRadius: 3,
                                pointBackgroundColor: '#000',
                                pointBorderColor: '#ffffff',
                                tension: 0.4,
                                order: 0
                            },
                            { 
                                label: 'Stack (mg)', 
                                data: dataStack, 
                                backgroundColor: gradStack, 
                                yAxisID: 'y', 
                                stack: 'total', 
                                order: 1, 
                                borderRadius: 4
                            },
                            { 
                                label: 'Test Base (mg)', 
                                data: dataTest, 
                                backgroundColor: gradTest, 
                                yAxisID: 'y', 
                                stack: 'total', 
                                order: 2, 
                                borderRadius: 4
                            }
                        ]
                    },
                    options: {
                        responsive: true, 
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        scales: {
                            x: { stacked: true, grid: { display: false }, ticks: { color: '#555', font: {size: 10} } },
                            y: { 
                                stacked: true, position: 'left', 
                                grid: { color: '#222', borderDash: [5, 5] }, 
                                title: { display: true, text: 'LOAD (mg)', color: '#444', font: {size: 9} },
                                border: { display: false }
                            },
                            y1: { 
                                display: true, position: 'right', grid: { display: false }, 
                                title: { display: true, text: 'KG', color: '#fff', font: {size: 9} },
                                border: { display: false },
                                // ДИНАМІЧНИЙ МАСШТАБ ВАГИ
                                min: y1Min,
                                max: y1Max
                            }
                        },
                        plugins: { 
                            legend: { labels: { color: '#999', boxWidth: 10, font: { size: 10 } }, position: 'bottom' },
                            tooltip: {
                                backgroundColor: 'rgba(18,18,18,0.95)',
                                titleColor: '#d4af37',
                                bodyColor: '#fff',
                                borderColor: '#333',
                                borderWidth: 1,
                                padding: 10,
                                titleFont: { family: 'JetBrains Mono' },
                                bodyFont: { family: 'JetBrains Mono', size: 11 },
                                callbacks: {
                                    // ГОЛОВНЕ ПОКРАЩЕННЯ: Показуємо склад тижня
                                    afterBody: (items) => {
                                        const idx = items[0].dataIndex;
                                        if (weekDetails[idx] && weekDetails[idx].length > 0) {
                                            return '\n📦 СКЛАД:\n' + weekDetails[idx].join('\n');
                                        }
                                        return '';
                                    },
                                    footer: (items) => {
                                        let total = 0; items.forEach(i => { if(i.dataset.yAxisID==='y') total += i.raw; });
                                        return total > 0 ? `\n💉 TOTAL MG: ${total}` : '';
                                    }
                                }
                            }
                        }
                    }
                });
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
            let svg = `<svg viewBox="0 0 300 500" class="body-svg"><path d="M150,20 Q110,20 110,50 L100,60 L100,180 L80,250 L80,450 L140,450 L140,280 L160,280 L160,450 L220,450 L220,250 L200,180 L200,60 L190,50 Q190,20 150,20" fill="#1a1a1a" stroke="none"/>`;
            muscles.forEach(m => {
                const isActive = this.data.bodyMap?.last === m.id;
                svg += `<path d="${m.d}" class="muscle-group ${isActive?'active':''}" onclick="App.setInjectionSite('${m.id}')" />`;
                if(isActive) svg += `<text x="${m.cx}" y="${m.cy}" fill="#000" font-size="10" text-anchor="middle" dominant-baseline="middle">💉</text>`;
            });
            svg += `</svg>`;
            document.getElementById('svgContainer').innerHTML = svg;
        },

        setInjectionSite(id) {
            if(!this.data.bodyMap) this.data.bodyMap = { history: [] };
            this.data.bodyMap.last = id;
            this.data.bodyMap.history.push({ date: new Date().toISOString(), id: id });
            this.save(); 
            this.renderBodyMap();
        },

        openAddPillModal(week, dayIndex) {
            this.state.tempPill = { w: week, d: dayIndex, color: 'c-blue' };
            document.getElementById('pillName').value = ''; 
            document.getElementById('pillDose').value = ''; 
            document.getElementById('pillMeta').value = '';
            document.getElementById('fillPhase').checked = false; 
            document.querySelectorAll('.color-opt').forEach(el => el.classList.remove('selected'));
            document.querySelector('.color-opt').classList.add('selected'); 
            
            this.updateSuggestions();
            document.getElementById('addPillModal').style.display = 'flex';
            setTimeout(() => document.getElementById('pillName').focus(), 100);
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

            const dl = document.getElementById('med-suggestions'); 
            dl.innerHTML = '';
            Array.from(medSet).sort().forEach(m => { 
                const opt = document.createElement('option'); 
                opt.value = m; 
                dl.appendChild(opt); 
            });

            const tagContainer = document.getElementById('tagPresets');
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
            const fillPhase = document.getElementById('fillPhase').checked;
            this.pushHistory();
            
            if(fillPhase) {
                const phase = this.data.phases.find(p => p.weeks.includes(this.state.tempPill.w));
                if(phase) {
                    const futureWeeks = phase.weeks.filter(w => w >= this.state.tempPill.w);
                    futureWeeks.forEach(w => {
                        this.data.schedule[w][this.state.tempPill.d].push({ name, dose, meta, color: this.state.tempPill.color });
                    });
                } else {
                    this.data.schedule[this.state.tempPill.w][this.state.tempPill.d].push({ name, dose, meta, color: this.state.tempPill.color });
                }
            } else {
                this.data.schedule[this.state.tempPill.w][this.state.tempPill.d].push({ name, dose, meta, color: this.state.tempPill.color });
            }
            this.save(); 
            this.closeModal(); 
            this.renderView();
        },

        closeModal() { 
            document.getElementById('addPillModal').style.display = 'none'; 
        },
        
        // --- CALC FIX (REGEX) ---
        calc(week) {
            const stats = {};
            if(!this.data.schedule[week]) return stats;
            this.data.schedule[week].forEach(d => d.forEach(p => {
                // ШУКАЄМО ЧИСЛО ЗА ДОПОМОГОЮ REGEX
                const match = p.dose.match(/(\d+([.,]\d+)?)/);
                
                if (match) {
                    const valStr = match[0].replace(',', '.');
                    const n = parseFloat(valStr);

                    if(!isNaN(n)) { 
                        let k = p.name.trim(); 
                        let u = p.dose.toLowerCase().includes("iu") ? "IU" : "mg"; 
                        if(k.toLowerCase().includes("clen")) u = "mcg";

                        if(!stats[k]) stats[k] = {v:0, u:u}; 
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

        // Функція перемальовки верхньої панелі (із сортуванням доз)
        renderStatsPanel() {
            const container = document.getElementById('stats-container');
            if(!container) return;
            this.renderStatsPanel(); // Запускаємо оновлення статистики окремо
            },
        
        saveNote(w,t) { 
            this.pushHistory(); 
            this.data.notes[w]=t; 
            this.save(); 
        },
        
        saveVital(w,d,k,v) { 
            this.pushHistory();
            const key = `${w}-${d}`; 
            if(!this.data.vitals[key]) this.data.vitals[key] = {bp:"", hr:"", w:""}; 
            this.data.vitals[key][k] = v; 
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
        // Генерує вигляд меню (щоб не дублювати код)
        getMenuUI(w, d, i, name, isOpen) {
            // Екрануємо лапки в назві, щоб не ламався код
            const safeName = name.replace(/'/g, "\\'"); 
            
            if (isOpen) {
                return `
                <div style="display:flex; gap:12px; align-items:center; background:#222; padding:4px 8px; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.5); position:absolute; right:0; top:-5px; z-index:10; border:1px solid #444;">
                    <span onclick="App.copyPill(${w},${d},${i})" title="Копіювати" style="cursor:pointer;">📋</span>
                    <span onclick="App.duplicatePillToPhase(${w},${d},${i})" title="На всю фазу" style="cursor:pointer; color:var(--blue)">📑</span>
                    <span onclick="App.deletePillEverywhere('${safeName}')" title="Видалити всюди" style="cursor:pointer; color:#ef4444">🌍</span>
                    <span onclick="App.delPillItem(${w},${d},${i})" title="Видалити" style="cursor:pointer; color:#ef4444; font-weight:bold">✕</span>
                    <span onclick="App.toggleMenu(${w},${d},${i}, '${safeName}')" style="cursor:pointer; opacity:0.5; font-size:0.8rem">◀</span>
                </div>`;
            } else {
                return `<span onclick="App.toggleMenu(${w},${d},${i}, '${safeName}')" style="font-size:1.4rem; cursor:pointer; line-height:1; color:var(--text); opacity:0.7">⋮</span>`;
            }
        },
        // --- КІНЕЦЬ НОВОГО КОДУ ---
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
        // Видалити з усіх тижнів
        deletePillEverywhere(name) {
            if(!confirm(`⚠️ ВИДАЛИТИ "${name}" З УСІХ ТИЖНІВ?\nЦе неможливо скасувати.`)) return;
            this.pushHistory();
            const weeks = Object.keys(this.data.schedule);
            weeks.forEach(w => {
                for(let d=0; d<7; d++) {
                    // Залишаємо тільки ті, що НЕ мають такої назви
                    this.data.schedule[w][d] = this.data.schedule[w][d].filter(p => p.name !== name);
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

    window.onload = () => App.init();
