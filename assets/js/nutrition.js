const DB_KEY = 'protocol_sys_plus_days';

const DefaultBank = {
    "Вівсянка": {p:13, f:6, c:68, k:380},
    "Рис": {p:2.7, f:0.3, c:28, k:130},
    "Гречка": {p:4, f:1, c:21, k:110},
    "Макарони": {p:5, f:1, c:30, k:150},
    "Картопля": {p:2, f:0, c:17, k:77},
    "Куряче філе": {p:23, f:1, c:0, k:110},
    "Яловичина": {p:20, f:10, c:0, k:180},
    "Яйце (1шт)": {p:6, f:5, c:0.5, k:70, unit:true},
    "Білок яєчний": {p:3, f:0, c:0, k:15, unit:true},
    "Сир кисломолочний": {p:18, f:5, c:2, k:120},
    "Олія оливкова": {p:0, f:100, c:0, k:884},
    "Горіхи": {p:15, f:60, c:10, k:650},
    "Авокадо": {p:2, f:15, c:9, k:160},
    "Банан": {p:1, f:0, c:21, k:90},
    "Протеїн (1 порція)": {p:24, f:1, c:2, k:110, unit:true}
};

const App = {
    data: { 
        bank: DefaultBank, 
        targets: {p:200, f:80, c:300, k:2700}, 
        days: [] 
    },
    state: { mid: null, fidx: null, editName: null, currentDayId: null, tempFood: null, mealBuffer: null },
    history: [],

    init() {
        const loadedData = Utils.load(DB_KEY, null);

        if(loadedData) {
            if(!loadedData.days) {
                this.data.bank = loadedData.bank || DefaultBank;
                this.data.targets = loadedData.targets;
                this.data.days = [{id: Utils.id(), name: "Мій день", targets: {...loadedData.targets}, meals: loadedData.meals || []}];
            } else {
                this.data = loadedData;
                // АВТОМІГРАЦІЯ: Якщо в старих днях немає targets, копіюємо з глобальних
                this.data.days.forEach(d => {
                    if (!d.targets) d.targets = { ...this.data.targets };
                });
            }
            this.data.bank = {...DefaultBank, ...this.data.bank};
        } else {
            this.addDay("Мій день", true);
        }
        
        if(!this.state.currentDayId && this.data.days.length > 0) {
            this.state.currentDayId = this.data.days[0].id;
        }
        
        this.setupHardReset();
        this.render();
    },
    setupHardReset() {
        const brandBlock = document.getElementById('brandBlock');
        if(!brandBlock) return;
        
        const brandIcon = brandBlock.querySelector('.brand-icon');
        brandBlock.onclick = () => {
            brandIcon.classList.remove('hint-active');
            void brandIcon.offsetWidth; 
            brandIcon.classList.add('hint-active');
        };
        brandBlock.ondblclick = async () => {
            if(await Modal.confirm("⚠ HARD RESET?<br><br><span style='color:var(--text-dim)'>Видалити абсолютно всі дані харчування?</span>", "КРИТИЧНО", "red")) {
                localStorage.removeItem(DB_KEY);
                location.reload();
            }
        };
    },

    toggleFab(show) {
        const fab = document.getElementById('sys-fab');
        if(fab) fab.style.display = show ? 'flex' : 'none';
    },

    lockScroll() {
        if (document.body.classList.contains('modal-active')) return; 
        this.state.lockedScrollY = window.scrollY; 
        document.body.classList.add('modal-active'); // Тепер фіксер бачить модалку!
        document.body.style.position = 'fixed';
        document.body.style.top = `-${this.state.lockedScrollY}px`;
        document.body.style.width = '100%';
    },

    unlockScroll() {
        if (!document.body.classList.contains('modal-active')) return;
        const scrollY = this.state.lockedScrollY || 0;
        
        document.body.classList.remove('modal-active');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        
        // ФІКС 1: Змушуємо браузер перерахувати макет перед скролом!
        void document.body.offsetHeight; 
        
        window.scrollTo({ left: 0, top: scrollY, behavior: 'instant' });
    },
    
    save() {
        Utils.save(DB_KEY, this.data);
        this.updateStats();
    },
    
    pushHistory() {
        if(this.history.length > 10) this.history.shift();
        this.history.push(JSON.stringify(this.data));
        const undoFloat = document.getElementById('undoFloat');
        if(undoFloat) undoFloat.classList.add('visible'); // Показуємо плаваючу кнопку
    },
    
    undo() {
        if(!this.history.length) return;
        this.data = JSON.parse(this.history.pop());
        
        // Ховаємо кнопку, якщо історія пуста
        if(!this.history.length) {
            const undoFloat = document.getElementById('undoFloat');
            if(undoFloat) undoFloat.classList.remove('visible');
        }
        
        if(!this.data.days.find(d => d.id === this.state.currentDayId)) {
            this.state.currentDayId = this.data.days[0]?.id || null;
        }
        this.save(); this.render();
        if(window.Haptics) window.Haptics.light();
    },

    getCurrentDay() {
        return this.data.days.find(d => d.id === this.state.currentDayId);
    },

    addDay(name = null, silent=false) {
       if(!silent) this.pushHistory();
        if(!name) {
            name = Utils.date();
        }
        const id = Utils.id();
        
        // РОЗУМНЕ УСПАДКУВАННЯ: Беремо цілі з попереднього дня (або глобальні)
        const prevDay = this.data.days[this.data.days.length - 1];
        const newTargets = prevDay && prevDay.targets ? { ...prevDay.targets } : { ...this.data.targets };

        const newDay = {
            id: id, name: name, 
            targets: newTargets, // Тепер день має власні цілі
            meals: [
                {id: id+1, name:"Сніданок", foods:[]},
                {id: id+2, name:"Обід", foods:[]},
                {id: id+3, name:"Вечеря", foods:[]}
            ]
        };
        this.data.days.push(newDay);
        this.state.currentDayId = id;
        if(!silent) { 
            this.save(); 
            this.render(); 
            
            // ПРО-ФІКС: Плавний автоскрол до новоствореного дня
            setTimeout(() => {
                const bar = document.getElementById('dayBar');
                if(bar) bar.scrollTo({ left: bar.scrollWidth, behavior: 'smooth' });
            }, 50); // Мікрозатримка, щоб DOM встиг намалювати нову кнопку
        }
    },
    duplicateDay() {
        const day = this.getCurrentDay();
        if(!day) return;
        this.pushHistory();
        const id = Utils.id();
        const newDay = JSON.parse(JSON.stringify(day));
        newDay.id = id;
        newDay.name = day.name + " (Копія)";
        newDay.meals.forEach((m, index) => m.id = id + index + 1);
        this.data.days.push(newDay);
        this.state.currentDayId = id;
        this.save(); 
        this.render();
        
        // Автоскрол і для дублювання теж
        setTimeout(() => {
            const bar = document.getElementById('dayBar');
            if(bar) bar.scrollTo({ left: bar.scrollWidth, behavior: 'smooth' });
        }, 50);
    },

    switchDay(id) {
        this.state.currentDayId = id;
        this.render();
    },

    promptRenameDay() {
        const day = this.getCurrentDay();
        if(!day) return;
        this.lockScroll();
        this.toggleFab(false);
        
        let title = day.name;
        let sub = "";
        
        // Читаємо новий формат "Назва|Підпис" або парсимо старий "Назва Підпис"
        if (day.name.includes('|')) {
            const parts = day.name.split('|');
            title = parts[0];
            sub = parts[1] || "";
        } else {
             const parts = day.name.split(' ');
             title = parts[0];
             sub = parts.slice(1).join(' ');
        }
        
        document.getElementById('inpDayTitle').value = title;
        document.getElementById('inpDaySub').value = sub;
        document.getElementById('dayEditModal').style.display = 'flex';
    },

    saveDayName() {
        const day = this.getCurrentDay();
        const t = document.getElementById('inpDayTitle').value.trim();
        const s = document.getElementById('inpDaySub').value.trim();
        
        if(!t) return; // Головна назва обов'язкова
        
        this.pushHistory();
        // Зберігаємо в базу жорстко через розділювач
        day.name = s ? `${t}|${s}` : t;
        
        this.save();
        this.renderDaysBar();
        this.render(false);
        this.closeModal();
    },

    async deleteDay() {
        if(this.data.days.length <= 1) {
            await Modal.alert("Останній день видалити неможливо.", "ПОМИЛКА", "red");
            return;
        }
        if(!(await Modal.confirm("Видалити цей день назавжди?", "ВИДАЛЕННЯ ДНЯ", "red"))) return;
        
        this.pushHistory();
        this.data.days = this.data.days.filter(d => d.id !== this.state.currentDayId);
        this.state.currentDayId = this.data.days[0].id;
        this.save(); this.render();
    },

    getWaterFromInputs() {
        const l = document.getElementById('inpWaterL').value || '0';
        const ml = document.getElementById('inpWaterMl').value || '0';
        return parseFloat(l + '.' + ml);
    },

    editWater() {
        if(document.activeElement) document.activeElement.blur();
        this.lockScroll();
        this.toggleFab(false);
        
        const day = this.getCurrentDay();
        const w = day.water || 0;
        const parts = w.toFixed(2).split('.');
        
        document.getElementById('inpWaterL').value = parts[0] === '0' ? '' : parts[0];
        document.getElementById('inpWaterMl').value = parts[1] === '00' ? '' : parts[1];
        
        document.getElementById('waterModal').style.display = 'flex';
    },
    
    adjustWater(amount) {
        let current = this.getWaterFromInputs();
        current += amount;
        if (current < 0) current = 0;
        
        const parts = current.toFixed(2).split('.');
        document.getElementById('inpWaterL').value = parts[0] === '0' ? '' : parts[0];
        document.getElementById('inpWaterMl').value = parts[1] === '00' ? '' : parts[1];
        
        if(window.Haptics) window.Haptics.light();
    },
    
    saveWater() {
        const day = this.getCurrentDay();
        const val = this.getWaterFromInputs();
        this.pushHistory();
        day.water = val;
        
        this.save();
        this.updateStats();
        this.closeModal();
        if(window.Haptics) window.Haptics.success();
    },
    moveMeal(id, dir) {
        const day = this.getCurrentDay();
        const idx = day.meals.findIndex(m => m.id === id);
        if (idx < 0) return;
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= day.meals.length) return;
        
        this.pushHistory();
        const temp = day.meals[idx];
        day.meals[idx] = day.meals[newIdx];
        day.meals[newIdx] = temp;
        
        this.save();
        this.render(false);
    },
    render(animate = true) {
        this.renderDaysBar();
        const day = this.getCurrentDay();
        if(!day) return;

        const titleEl = document.getElementById('currentDayTitleMain');
        const subEl = document.getElementById('currentDaySubtitle');
        if(titleEl && subEl) {
            let titleText = day.name;
            let subText = "";
            
            if (day.name.includes('|')) {
                const parts = day.name.split('|');
                titleText = parts[0];
                subText = parts[1] || "";
            } else {
                 const parts = day.name.split(' ');
                 titleText = parts[0];
                 subText = parts.slice(1).join(' ');
            }

            titleEl.innerText = titleText;
            if (subText) {
                subEl.innerText = subText;
                subEl.style.display = 'inline-block';
            } else {
                subEl.style.display = 'none';
            }
        }
        
        const list = document.getElementById('mealList');
        let mealsHtml = ''; 
        
        day.meals.forEach((m, index) => {
            let mCal = 0, mP = 0, mF = 0, mC = 0;

            const foodsHtml = m.foods.map((f, i) => {
                const ref = this.data.bank[f.n] || {p:f.p, f:f.f, c:f.c, k:f.k, unit:f.unit}; 
                let k, p, fat, c;
                
                if(this.data.bank[f.n]) {
                    const r = ref.unit ? f.w : f.w/100;
                    k = Math.round((ref.k || 0) * r);
                    p = Math.round((ref.p || 0) * r);
                    fat = Math.round((ref.f || 0) * r);
                    c = Math.round((ref.c || 0) * r);
                } else {
                     k = f.k; p = f.p; fat = f.f; c = f.c;
                }
                mCal += k; mP += p; mF += fat; mC += c;

                return `
                <div class="food-row" onclick="App.editFood(${m.id}, ${i})">
                    <div class="fr-info">
                        <h4>${f.n}</h4>
                        <p>Б${p} Ж${fat} В${c}</p>
                    </div>
                    <div class="fr-vals">
                        <div class="fr-w">${f.w}${ref.unit?'':'г'}</div>
                        <div class="fr-k">${k}</div>
                    </div>
                </div>`;
            }).join('');

        const animClass = animate ? 'animate-pop' : '';
        const delayStr = animate ? `animation-delay: ${index * 0.05}s;` : '';

        mealsHtml += `
        <div class="meal-block ${animClass}" style="${delayStr}">
            <div class="meal-header">
                <div style="flex:1;">
                    <div class="mh-title-wrapper" style="display:flex; align-items:center; gap:8px;">
                        <h4 class="mh-title" style="margin:0; font-weight:800; font-size:0.95rem; color:#fff; text-transform:uppercase;">${m.name}</h4>
                        <div class="edit-icon-btn" onclick="App.promptRenameMeal(${m.id})">✎</div>
                    </div>
                    <div class="mh-meta" style="display:flex; align-items:center; gap:12px; margin-top:2px;">
                        <div class="mh-kcal" style="font-family:var(--font-mono); font-weight:700; font-size:0.9rem; color:var(--theme);">${mCal} ккал</div>
                        <span style="font-size:0.65rem; color:#666">Б${mP} Ж${mF} В${mC}</span>
                    </div>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <div style="color:#666; cursor:pointer; font-size:1.2rem; padding:5px;" onclick="App.moveMeal(${m.id}, -1)">↑</div>
                    <div style="color:#666; cursor:pointer; font-size:1.2rem; padding:5px;" onclick="App.moveMeal(${m.id}, 1)">↓</div>
                    <div style="color:var(--theme); cursor:pointer; font-size:1.1rem; opacity:0.8; margin-left:5px;" onclick="App.copyMeal(${m.id})" title="Копіювати">📋</div>
                    <div class="mh-del" onclick="App.deleteMealBlock(${m.id})">✕</div>
                </div>
            </div>
            <div>${foodsHtml}</div>
            <button class="btn-action" onclick="App.addFood(${m.id})">+ ПРОДУКТ</button>
        </div>`;
        });

        let pasteBtnHtml = '';
        if (this.state.mealBuffer) {
            const animClass = animate ? 'animate-pop' : '';
            const delayStr = animate ? `animation-delay: ${day.meals.length * 0.05}s;` : '';
            pasteBtnHtml = `<button class="btn-main-add ${animClass}" style="margin-top:10px; border-color:var(--theme); color:var(--theme); background:rgba(212, 175, 55, 0.05); ${delayStr}" onclick="App.pasteMeal()">📥 ВСТАВИТИ: ${this.state.mealBuffer.name.toUpperCase()}</button>`;
        }

        list.innerHTML = mealsHtml + pasteBtnHtml;
        this.updateStats();
    },

    renderDaysBar() {
        const bar = document.getElementById('dayBar');
        if(!bar) return;
        bar.innerHTML = '';
        this.data.days.forEach(d => {
            const el = document.createElement('div');
            el.className = `day-tab ${d.id === this.state.currentDayId ? 'active' : ''}`;
            el.style.cursor = 'pointer'; // ГАРАНТІЯ клікабельності
            
            let t = d.name;
            let s = '•';
            if (d.name.includes('|')) {
                const parts = d.name.split('|');
                t = parts[0];
                s = parts[1] || '•';
            } else {
                const parts = d.name.split(' ');
                t = parts[0];
                s = parts.slice(1).join(' ') || '•';
            }
            
            // Запобігаємо клікам по внутрішніх елементах (span/small), щоб спрацьовував клік по всьому табу
            el.innerHTML = `<span style="pointer-events:none;">${t}</span><small style="pointer-events:none;">${s}</small>`;
            
            el.onclick = () => {
                if(this.state.currentDayId !== d.id) {
                    if(window.Haptics) window.Haptics.light();
                    App.switchDay(d.id);
                }
            };
            bar.appendChild(el);
        });
        
        const addBtn = document.createElement('div');
        addBtn.className = 'day-add-btn';
        addBtn.innerText = '+';
        addBtn.style.cursor = 'pointer';
        addBtn.onclick = () => App.addDay();
        bar.appendChild(addBtn);
    },
    updateStats() {
        const day = this.getCurrentDay();
        if(!day) return;
        let t = {p:0, f:0, c:0, k:0};
        day.meals.forEach(m => m.foods.forEach(f => {
            const ref = this.data.bank[f.n];
            if(ref) {
                const r = ref.unit ? f.w : f.w/100;
                t.p += (ref.p||0)*r; t.f += (ref.f||0)*r; t.c += (ref.c||0)*r; t.k += (ref.k||0)*r;
            } else {
                t.p += f.p||0; t.f += f.f||0; t.c += f.c||0; t.k += f.k||0;
            }
        }));
        const tg = day.targets || this.data.targets;
        
        const dispK = document.getElementById('disp-k');
        if(dispK) {
            dispK.innerText = Math.round(t.k);
            if(t.k > tg.k) dispK.style.color = 'var(--danger)'; else dispK.style.color = '#fff';
        }
        
        const dispT = document.getElementById('disp-target');
        if(dispT) dispT.innerText = tg.k;

        // ОНОВЛЕННЯ ВОДИ
        const dispW = document.getElementById('disp-w');
        if(dispW) dispW.innerText = (day.water || 0).toFixed(1);

        // ОНОВЛЕННЯ ВІДСОТКІВ МАКРОСІВ
        const totalMacroKcal = (t.p * 4) + (t.f * 9) + (t.c * 4);
        let pPct = 0, fPct = 0, cPct = 0;
        if (totalMacroKcal > 0) {
            pPct = Math.round(((t.p * 4) / totalMacroKcal) * 100);
            fPct = Math.round(((t.f * 9) / totalMacroKcal) * 100);
            cPct = Math.round(((t.c * 4) / totalMacroKcal) * 100);
        }
        const ratioEl = document.getElementById('macro-ratio');
        if(ratioEl) {
            ratioEl.innerHTML = `<span class="color-p">${pPct}%</span> : <span class="color-f">${fPct}%</span> : <span class="color-c">${cPct}%</span>`;
        }
        
        const updateBar = (id, val, max) => {
            const el = document.getElementById('bar-'+id);
            const txt = document.getElementById('disp-'+id);
            if(el && txt) {
                const pct = Math.min(100, (val/max)*100);
                el.style.width = pct + '%';
                txt.innerText = Math.round(val) + 'г (' + Math.round(pct) + '%)';
            }
        };
        updateBar('p', t.p, tg.p); updateBar('f', t.f, tg.f); updateBar('c', t.c, tg.c);
    },
    searchFood(q) {
        const list = document.getElementById('sugg-list');
        list.innerHTML = '';
        if(q.length < 1) { list.style.display='none'; return; }
        const matches = Object.keys(this.data.bank).filter(k => k.toLowerCase().includes(q.toLowerCase()));
        if(matches.length) {
            list.style.display = 'block';
            matches.slice(0, 5).forEach(n => {
                const b = this.data.bank[n];
                const el = document.createElement('div');
                el.className = 'sugg-item';
                el.innerHTML = `${n} <span>${b.k} ккал</span>`;
                el.onclick = () => App.selectSuggestion(n);
                list.appendChild(el);
            });
        } else { list.style.display='none'; }
    },

    recalcModal() {
        if (!this.state.tempFood) return; 

        const val = document.getElementById('inpWeight').value;
        if(val === '') return; 
        
        const w = parseFloat(val) || 0;
        const ref = this.state.tempFood;

        const ratio = ref.unit ? w : w / 100;

        document.getElementById('inpP').value = Math.round((ref.p || 0) * ratio);
        document.getElementById('inpF').value = Math.round((ref.f || 0) * ratio);
        document.getElementById('inpC').value = Math.round((ref.c || 0) * ratio);
        document.getElementById('inpK').value = Math.round((ref.k || 0) * ratio);
    },

    selectSuggestion(name) {
        const f = this.data.bank[name];
        
        this.state.tempFood = { ...f };

        document.getElementById('inpName').value = name;
        document.getElementById('inpP').value = f.p;
        document.getElementById('inpF').value = f.f;
        document.getElementById('inpC').value = f.c;
        document.getElementById('inpK').value = f.k;
        document.getElementById('sugg-list').style.display='none';
        document.getElementById('inpWeight').placeholder = f.unit ? "Кількість (шт)" : "Вага (г)";
        
        const defW = f.unit ? 1 : 100;
        document.getElementById('inpWeight').value = defW;
        this.recalcModal();

        document.getElementById('inpWeight').focus();
    },

    addFood(mid) {
        this.state.mid = mid; this.state.fidx = -1;
        this.state.tempFood = null; 
        this.openModal('ДОДАТИ ПРОДУКТ', {}, false);
        setTimeout(() => document.getElementById('inpName').focus(), 100);
    },
    
    editFood(mid, idx) {
        this.state.mid = mid; this.state.fidx = idx;
        const f = this.getCurrentDay().meals.find(m=>m.id===mid).foods[idx];
        
        const ref = this.data.bank[f.n];
        let editItem = { ...f }; 
        
        if (ref) {
            this.state.tempFood = ref;
            const ratio = ref.unit ? f.w : f.w / 100;
            editItem.p = Math.round(ref.p * ratio);
            editItem.f = Math.round(ref.f * ratio);
            editItem.c = Math.round(ref.c * ratio);
            editItem.k = Math.round(ref.k * ratio);
        } else {
            const wRatio = (f.unit ? f.w : f.w / 100) || 1;
            this.state.tempFood = {
                p: f.p / wRatio,
                f: f.f / wRatio,
                c: f.c / wRatio,
                k: f.k / wRatio,
                unit: f.unit || true
            };
        }
        
        this.openModal('РЕДАГУВАТИ', editItem, true);
    },

    openModal(title, f, del) {
        if(document.activeElement) document.activeElement.blur(); 
        this.lockScroll(); 
        
        this.toggleFab(false); 
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('inpName').value = f.n||'';
        document.getElementById('inpWeight').value = f.w||'';
        document.getElementById('inpP').value = f.p||0;
        document.getElementById('inpF').value = f.f||0;
        document.getElementById('inpC').value = f.c||0;
        document.getElementById('inpK').value = f.k||0;
        document.getElementById('btnDeleteFood').style.display = del ? 'block':'none';
        document.getElementById('foodModal').style.display = 'flex';
        document.getElementById('sugg-list').style.display = 'none';
    },
    
    closeModal() { 
        // ФІКС 2: Блокуємо iOS-фіксер довше, щоб клавіатура точно встигла сховатись
        window.blockKeyboardScrollFix = true;
        setTimeout(() => { window.blockKeyboardScrollFix = false; }, 400);

        if(document.activeElement) document.activeElement.blur(); 
        
        const modalIds = ['foodModal', 'bankModal', 'bankEditModal', 'targetsModal', 'waterModal', 'dayEditModal'];
        modalIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        document.querySelectorAll('.modal-overlay, .modal').forEach(el => el.style.display='none');
        this.toggleFab(true); 
        
        // ФІКС 3: Відпускаємо екран із мікрозатримкою (щоб iOS завершив анімацію клавіатури)
        setTimeout(() => {
            this.unlockScroll(); 
        }, 20);
    },

    saveFood() {
        const n = document.getElementById('inpName').value;
        const w = parseFloat(document.getElementById('inpWeight').value);
        if(!n || isNaN(w)) return;
        const meal = this.getCurrentDay().meals.find(m=>m.id===this.state.mid);
        let item;
        if(this.data.bank[n]) { item = {n, w}; } 
        else {
            const p = parseFloat(document.getElementById('inpP').value)||0;
            const f = parseFloat(document.getElementById('inpF').value)||0;
            const c = parseFloat(document.getElementById('inpC').value)||0;
            let k = parseFloat(document.getElementById('inpK').value);
            if(!k && (p||f||c)) k = Math.round(p*4 + f*9 + c*4);
            item = {n, w, p, f, c, k, unit: true}; 
        }
        this.pushHistory();
        if(this.state.fidx === -1) meal.foods.push(item);
        else meal.foods[this.state.fidx] = item;
        
        // ФІКС СКРОЛУ: Змінено порядок!
        this.save(); 
        this.render(false); // Рендеримо без анімації (щоб не мигало)
        this.closeModal();  // Закриваємо модалку останнім кроком
    },

    deleteFood() {
        this.pushHistory();
        this.getCurrentDay().meals.find(m=>m.id===this.state.mid).foods.splice(this.state.fidx, 1);
        
        // ФІКС СКРОЛУ: Змінено порядок!
        this.save(); 
        this.render(false); 
        this.closeModal(); 
    },

    copyMeal(mid) {
        const day = this.getCurrentDay();
        const meal = day.meals.find(m => m.id === mid);
        if (meal) {
            this.state.mealBuffer = JSON.parse(JSON.stringify(meal));
            this.render(); 
            
            const toast = document.createElement('div');
            toast.innerText = "🍽 Скопійовано! Тепер можна вставити.";
            toast.style.cssText = "position:fixed; bottom:90px; left:50%; transform:translateX(-50%); background:#222; color:var(--theme); padding:10px 20px; border-radius:20px; z-index:9999; border:1px solid var(--theme); font-family:sans-serif; font-size:0.9rem; box-shadow: 0 4px 15px rgba(0,0,0,0.5);";
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2500);
        }
    },

    async pasteMeal() {
        if (!this.state.mealBuffer) return;
        
        const day = this.getCurrentDay();
        const copiedMeal = this.state.mealBuffer;
        
        const existingMealIndex = day.meals.findIndex(
            m => m.name.trim().toLowerCase() === copiedMeal.name.trim().toLowerCase()
        );
        
        if (existingMealIndex !== -1) {
            const existingMeal = day.meals[existingMealIndex];
            
            if (existingMeal.foods && existingMeal.foods.length > 0) {
                if (!(await Modal.confirm(`⚠️ Прийом "${existingMeal.name}" вже містить продукти. Перезаписати його скопійованим?`, "УВАГА", "gold"))) {
                    return; 
                }
            }
            
            this.pushHistory();
            existingMeal.foods = JSON.parse(JSON.stringify(copiedMeal.foods));
            
        } else {
            this.pushHistory();
            const newMeal = JSON.parse(JSON.stringify(copiedMeal));
            newMeal.id = Date.now() + Math.floor(Math.random() * 1000);
            day.meals.push(newMeal);
        }

        this.save();
        this.render();
        if (window.Haptics) window.Haptics.success();
    },
    
    addMealBlock() {
        this.pushHistory();
        const id = Utils.id();
        this.getCurrentDay().meals.push({id, name:"Прийом їжі", foods:[]});
        this.save(); this.render();
    },
    
    async deleteMealBlock(id) {
        if(!(await Modal.confirm("Видалити цей прийом їжі повністю?", "ВИДАЛЕННЯ", "red"))) return;
        this.pushHistory();
        const day = this.getCurrentDay();
        day.meals = day.meals.filter(m=>m.id!==id);
        this.save(); this.render();
    },
    
    async promptRenameMeal(id) {
        const day = this.getCurrentDay();
        const meal = day.meals.find(m => m.id === id);
        if(!meal) return;
        const newName = await Modal.prompt(`Введіть нову назву для: ${meal.name.toUpperCase()}`, "РЕДАКТУВАННЯ ПРИЙОМУ", meal.name);
        if (newName && newName.trim() !== "") {
            this.pushHistory();
            meal.name = newName.trim();
            this.save();
            this.render(false);
        }
    },

    renderBank(filter = "") {
        const l = document.getElementById('bankList');
        l.innerHTML = Object.entries(this.data.bank)
            .filter(([n]) => n.toLowerCase().includes(filter.toLowerCase()))
            .sort()
            .map(([n,v]) => `
            <div class="bank-row" onclick="App.openBankEdit('${n.replace(/'/g, "\\'")}')">
                <div class="bank-info">
                    <b>${n}</b>
                    <span>${v.unit ? 'ШТ/ПОРЦ' : '100г'} | Б${v.p} Ж${v.f} В${v.c} | ${v.k} ккал</span>
                </div>
                <div class="edit-icon" style="color:var(--text-muted)">✎</div>
            </div>`).join('');
    },
    
    openBank() {
        if(document.activeElement) document.activeElement.blur();
        this.lockScroll(); 
        this.toggleFab(false); 
        this.renderBank();
        document.getElementById('bankModal').style.display='flex';
    },
    
    openBankEdit(name) {
        if(document.activeElement) document.activeElement.blur();
        this.lockScroll(); 
        this.toggleFab(false); 
        this.state.editName = name;
        if(name) {
            const d = this.data.bank[name];
            document.getElementById('bankInpName').value = name;
            document.getElementById('bankInpP').value = d.p;
            document.getElementById('bankInpF').value = d.f;
            document.getElementById('bankInpC').value = d.c;
            document.getElementById('bankInpK').value = d.k;
            document.getElementById('bankInpUnit').checked = d.unit || false;
            document.getElementById('btnDelBank').style.display = 'block';
        } else {
            document.getElementById('bankInpName').value = '';
            document.getElementById('bankInpP').value = '';
            document.getElementById('bankInpF').value = '';
            document.getElementById('bankInpC').value = '';
            document.getElementById('bankInpK').value = '';
            document.getElementById('bankInpUnit').checked = false;
            document.getElementById('btnDelBank').style.display = 'none';
        }
        document.getElementById('bankEditModal').style.display='flex';
    },
    
    saveBankItem() {
        const n = document.getElementById('bankInpName').value.trim();
        if(!n) return;
        const p = parseFloat(document.getElementById('bankInpP').value)||0;
        const f = parseFloat(document.getElementById('bankInpF').value)||0;
        const c = parseFloat(document.getElementById('bankInpC').value)||0;
        let k = parseFloat(document.getElementById('bankInpK').value);
        if(!k) k = Math.round(p*4 + f*9 + c*4);
        const unit = document.getElementById('bankInpUnit').checked;

        if(this.state.editName && this.state.editName !== n) delete this.data.bank[this.state.editName];
        this.data.bank[n] = {p,f,c,k,unit};
        
        // ФІКС СКРОЛУ
        this.save(); 
        this.renderBank();
        this.render(false);
        this.closeModal(); 
    },
    
    async delFromBank() {
        if(await Modal.confirm(`Видалити "${this.state.editName}" з бази назавжди?`, "ВИДАЛЕННЯ", "red")) {
            delete this.data.bank[this.state.editName];
            
            // ФІКС СКРОЛУ
            this.save(); 
            this.renderBank();
            this.render(false);
            this.closeModal();
        }
    },

    openTargets() {
        if(document.activeElement) document.activeElement.blur();
        this.lockScroll(); 
        this.toggleFab(false); 
        
        // Читаємо цілі поточного дня
        const day = this.getCurrentDay();
        const t = day.targets || this.data.targets;
        
        document.getElementById('tgP').value = t.p;
        document.getElementById('tgF').value = t.f;
        document.getElementById('tgC').value = t.c;
        document.getElementById('tgK').value = t.k;
        document.getElementById('targetsModal').style.display='flex';
    },

    calcTargetKcal() {
        const p = parseFloat(document.getElementById('tgP').value)||0;
        const f = parseFloat(document.getElementById('tgF').value)||0;
        const c = parseFloat(document.getElementById('tgC').value)||0;
        document.getElementById('tgK').value = Math.round(p*4 + f*9 + c*4);
    },
    
    saveTargets() {
        const day = this.getCurrentDay();
        this.pushHistory();
        
        const newT = {
            p: parseFloat(document.getElementById('tgP').value)||0,
            f: parseFloat(document.getElementById('tgF').value)||0,
            c: parseFloat(document.getElementById('tgC').value)||0,
            k: parseFloat(document.getElementById('tgK').value)||0
        };
        
        day.targets = newT;
        this.data.targets = { ...newT }; // Оновлюємо глобальні як резерв
        
        this.save(); 
        this.updateStats();
        this.closeModal();
    },

    async applyTargetsToAll() {
        if(!(await Modal.confirm("Застосувати ці макроси до ВСІХ створених днів?", "СИНХРОНІЗАЦІЯ", "gold"))) return;
        
        this.pushHistory();
        const newT = {
            p: parseFloat(document.getElementById('tgP').value)||0,
            f: parseFloat(document.getElementById('tgF').value)||0,
            c: parseFloat(document.getElementById('tgC').value)||0,
            k: parseFloat(document.getElementById('tgK').value)||0
        };

        this.data.targets = { ...newT };
        this.data.days.forEach(d => { d.targets = { ...newT }; });
        
        this.save();
        this.updateStats();
        this.closeModal();
        if(window.Haptics) window.Haptics.success();
    },
    exportData() {
        const a = document.createElement('a');
        a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.data));
        a.download = "protocol_nutrition.json"; a.click();
    },
    
    importData(inp) {
        const r = new FileReader();
        r.onload = e => { 
            this.pushHistory(); 
            this.data = JSON.parse(e.target.result); 
            this.save(); 
            location.reload(); 
        };
        r.readAsText(inp.files[0]);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
