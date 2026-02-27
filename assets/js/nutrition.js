// assets/js/nutrition.js

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
    // Додано tempFood для зберігання базового продукту (на 100г/1шт) під час редагування
    state: { mid: null, fidx: null, editName: null, currentDayId: null, tempFood: null },
    history: [],

    init() {
        const loadedData = Utils.load(DB_KEY, null);

        if(loadedData) {
            if(!loadedData.days) {
                this.data.bank = loadedData.bank || DefaultBank;
                this.data.targets = loadedData.targets;
                this.data.days = [{id: Utils.id(), name: "Мій день", meals: loadedData.meals || []}];
            } else {
                this.data = loadedData;
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
        brandBlock.ondblclick = () => {
            if(confirm("⚠ HARD RESET?")) {
                localStorage.removeItem(DB_KEY);
                location.reload();
            }
        };
    },

    // --- ЛОГІКА ЗНИКНЕННЯ ЗІРКИ (FAB) ---
    toggleFab(show) {
        const fab = document.getElementById('sys-fab');
        if(fab) fab.style.display = show ? 'flex' : 'none';
    },

    save() {
        Utils.save(DB_KEY, this.data);
        this.updateStats();
    },
    
    pushHistory() {
        if(this.history.length > 10) this.history.shift();
        this.history.push(JSON.stringify(this.data));
        const undoBtn = document.getElementById('undoBtn');
        if(undoBtn) undoBtn.style.display='flex';
    },
    
    undo() {
        if(!this.history.length) return;
        this.data = JSON.parse(this.history.pop());
        if(!this.history.length) document.getElementById('undoBtn').style.display='none';
        
        if(!this.data.days.find(d => d.id === this.state.currentDayId)) {
            this.state.currentDayId = this.data.days[0]?.id || null;
        }
        this.save(); this.render();
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
        const newDay = {
            id: id, name: name, 
            meals: [
                {id: id+1, name:"Сніданок", foods:[]},
                {id: id+2, name:"Обід", foods:[]},
                {id: id+3, name:"Вечеря", foods:[]}
            ]
        };
        this.data.days.push(newDay);
        this.state.currentDayId = id;
        if(!silent) { this.save(); this.render(); }
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
        this.save(); this.render();
    },

    switchDay(id) {
        this.state.currentDayId = id;
        this.render();
    },

    renameDay(newName) {
        const d = this.getCurrentDay();
        if(d) {
            d.name = newName;
            this.save();
            this.renderDaysBar();
        }
    },

    deleteDay() {
        if(this.data.days.length <= 1) return;
        if(!confirm("Видалити цей день?")) return;
        this.pushHistory();
        this.data.days = this.data.days.filter(d => d.id !== this.state.currentDayId);
        this.state.currentDayId = this.data.days[0].id;
        this.save(); this.render();
    },

render() {
        // ПОВНІСТЮ ПРИБРАЛИ РЯДКИ З window.scrollY!
        this.renderDaysBar();
        const day = this.getCurrentDay();
        if(!day) return;

        const titleEl = document.getElementById('currentDayTitle');
        if(titleEl) titleEl.innerText = day.name;
        
        const list = document.getElementById('mealList');
        let mealsHtml = ''; 
        
        day.meals.forEach(m => {
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

            mealsHtml += `
            <div class="meal-block">
                <div class="meal-header">
                    <div>
                        <div class="mh-title" contenteditable="true" onblur="App.renameMeal(${m.id}, this.innerText)">${m.name}</div>
                        <div class="mh-meta">
                            <div class="mh-kcal">${mCal} ккал</div>
                            <span style="font-size:0.65rem; color:#666">Б${mP} Ж${mF} В${mC}</span>
                        </div>
                    </div>
                    <div class="mh-del" onclick="App.deleteMealBlock(${m.id})">✕</div>
                </div>
                <div>${foodsHtml}</div>
                <button class="btn-action" onclick="App.addFood(${m.id})">+ ПРОДУКТ</button>
            </div>`;
        });

        list.innerHTML = mealsHtml;
        this.updateStats();
    },

    renderDaysBar() {
        const bar = document.getElementById('dayBar');
        if(!bar) return;
        bar.innerHTML = '';
        this.data.days.forEach(d => {
            const el = document.createElement('div');
            el.className = `day-tab ${d.id === this.state.currentDayId ? 'active' : ''}`;
            const nameParts = d.name.split(' ');
            el.innerHTML = `<span>${nameParts[0]}</span><small>${nameParts.slice(1).join(' ') || '•'}</small>`;
            el.onclick = () => App.switchDay(d.id);
            bar.appendChild(el);
        });
        const addBtn = document.createElement('div');
        addBtn.className = 'day-add-btn';
        addBtn.innerText = '+';
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
        const tg = this.data.targets;
        
        const dispK = document.getElementById('disp-k');
        if(dispK) {
            dispK.innerText = Math.round(t.k);
            if(t.k > tg.k) dispK.style.color = 'var(--danger)'; else dispK.style.color = '#fff';
        }
        
        const dispT = document.getElementById('disp-target');
        if(dispT) dispT.innerText = tg.k;
        
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

    // --- НОВА ФУНКЦІЯ: ДИНАМІЧНИЙ ПЕРЕРАХУНОК ---
    recalcModal() {
        if (!this.state.tempFood) return; // Якщо немає бази, не рахуємо

        const val = document.getElementById('inpWeight').value;
        if(val === '') return; // Даємо користувачу стерти все
        
        const w = parseFloat(val) || 0;
        const ref = this.state.tempFood;

        // Коефіцієнт: для штук = w, для грам = w/100
        const ratio = ref.unit ? w : w / 100;

        document.getElementById('inpP').value = Math.round((ref.p || 0) * ratio);
        document.getElementById('inpF').value = Math.round((ref.f || 0) * ratio);
        document.getElementById('inpC').value = Math.round((ref.c || 0) * ratio);
        document.getElementById('inpK').value = Math.round((ref.k || 0) * ratio);
    },

    selectSuggestion(name) {
        const f = this.data.bank[name];
        
        // ЗБЕРІГАЄМО БАЗУ для перерахунку
        this.state.tempFood = { ...f };

        document.getElementById('inpName').value = name;
        document.getElementById('inpP').value = f.p;
        document.getElementById('inpF').value = f.f;
        document.getElementById('inpC').value = f.c;
        document.getElementById('inpK').value = f.k;
        document.getElementById('sugg-list').style.display='none';
        document.getElementById('inpWeight').placeholder = f.unit ? "Кількість (шт)" : "Вага (г)";
        
        // Ставимо дефолтну вагу (100г або 1шт) і відразу рахуємо
        const defW = f.unit ? 1 : 100;
        document.getElementById('inpWeight').value = defW;
        this.recalcModal();

        document.getElementById('inpWeight').focus();
    },

    addFood(mid) {
        this.state.mid = mid; this.state.fidx = -1;
        this.state.tempFood = null; // Очищаємо, бо новий продукт
        this.openModal('ДОДАТИ', {}, false);
        setTimeout(() => document.getElementById('inpName').focus(), 100);
    },
    
    editFood(mid, idx) {
        this.state.mid = mid; this.state.fidx = idx;
        const f = this.getCurrentDay().meals.find(m=>m.id===mid).foods[idx];
        
        // Логіка для редагування:
        // 1. Дивимось, чи є такий продукт в базі.
        const ref = this.data.bank[f.n];
        let editItem = { ...f }; // копія поточного запису
        
        if (ref) {
            this.state.tempFood = ref;
            const ratio = ref.unit ? f.w : f.w / 100;
            editItem.p = Math.round(ref.p * ratio);
            editItem.f = Math.round(ref.f * ratio);
            editItem.c = Math.round(ref.c * ratio);
            editItem.k = Math.round(ref.k * ratio);
        } else {
            // ФІКС: Якщо продукту немає в базі, вираховуємо його базові БЖВ 
            // Додано || 1 для захисту від ділення на нуль
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
        if(document.activeElement) document.activeElement.blur(); // Скидаємо фокус перед відкриттям
        this.toggleFab(false); 
        // Прибрали document.body.style.overflow = 'hidden' - воно ламало скрол на iOS!
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
        if(document.activeElement) document.activeElement.blur(); // Це змусить клавіатуру ПЛАВНО опуститися разом зі сторінкою!
        document.querySelectorAll('.modal-overlay').forEach(el => el.style.display='none');
        document.querySelectorAll('.modal').forEach(el => el.style.display='none');
        this.toggleFab(true); 
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
        
        this.save(); 
        this.closeModal(); // Закриваємо модалку і знімаємо фокус (клавіатура їде вниз)
        
        // Даємо iOS 300мс, щоб плавно опустити екран, і тільки потім оновлюємо дані
        setTimeout(() => { this.render(); }, 300);
    },

    deleteFood() {
        this.pushHistory();
        this.getCurrentDay().meals.find(m=>m.id===this.state.mid).foods.splice(this.state.fidx, 1);
        
        this.save(); 
        this.closeModal(); 
        
        setTimeout(() => { this.render(); }, 300);
    },

    addMealBlock() {
        this.pushHistory();
        const id = Utils.id();
        this.getCurrentDay().meals.push({id, name:"Прийом їжі", foods:[]});
        this.save(); this.render();
    },
    deleteMealBlock(id) {
        if(!confirm("Видалити цей блок?")) return;
        this.pushHistory();
        const day = this.getCurrentDay();
        day.meals = day.meals.filter(m=>m.id!==id);
        this.save(); this.render();
    },
    renameMeal(id, val) {
        this.getCurrentDay().meals.find(m=>m.id===id).name = val;
        this.save();
    },

    renderBank(filter = "") {
        const l = document.getElementById('bankList');
        l.innerHTML = Object.entries(this.data.bank)
            .filter(([n]) => n.toLowerCase().includes(filter.toLowerCase()))
            .sort()
            .map(([n,v]) => `
            <div class="bank-row" onclick="App.openBankEdit('${n}')">
                <div class="bank-info">
                    <b>${n}</b>
                    <span>${v.unit ? 'ШТ/ПОРЦ' : '100г'} | Б${v.p} Ж${v.f} В${v.c} | ${v.k} ккал</span>
                </div>
                <div class="edit-icon">✎</div>
            </div>`).join('');
    },
    openBank() {
        this.toggleFab(false); // ХОВАЄМО ЗІРКУ
        this.renderBank();
        document.getElementById('bankModal').style.display='flex';
    },
    openBankEdit(name) {
        this.toggleFab(false); // ХОВАЄМО ЗІРКУ
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
        const n = document.getElementById('bankInpName').value;
        const p = parseFloat(document.getElementById('bankInpP').value)||0;
        const f = parseFloat(document.getElementById('bankInpF').value)||0;
        const c = parseFloat(document.getElementById('bankInpC').value)||0;
        let k = parseFloat(document.getElementById('bankInpK').value);
        if(!k) k = Math.round(p*4 + f*9 + c*4);
        const unit = document.getElementById('bankInpUnit').checked;

        if(this.state.editName && this.state.editName !== n) delete this.data.bank[this.state.editName];
        this.data.bank[n] = {p,f,c,k,unit};
        
        this.save(); 
        document.getElementById('bankEditModal').style.display='none';
        this.closeModal(); 
        
        setTimeout(() => {
            this.renderBank();
            this.render();
        }, 300);
    },
    delFromBank() {
        if(confirm('Видалити з бази назавжди?')) {
            delete this.data.bank[this.state.editName];
            this.save(); this.renderBank();
            document.getElementById('bankEditModal').style.display='none';
            this.closeModal();
        }
    },

    openTargets() {
        this.toggleFab(false); // ХОВАЄМО ЗІРКУ
        const t = this.data.targets;
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
        this.data.targets = {
            p: parseFloat(document.getElementById('tgP').value)||0,
            f: parseFloat(document.getElementById('tgF').value)||0,
            c: parseFloat(document.getElementById('tgC').value)||0,
            k: parseFloat(document.getElementById('tgK').value)||0
        };
        this.save(); this.updateStats();
        document.getElementById('targetsModal').style.display='none';
        this.closeModal();
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
