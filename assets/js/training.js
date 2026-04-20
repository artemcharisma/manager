const Groups = ["Груди", "Спина", "Ноги", "Плечі", "Руки", "Прес", "Кардіо", "Інше"];
const ResolveGroup = (n) => {
    if(!n) return "Інше";
    n = n.toLowerCase();
    if(n.includes("жим")||n.includes("розводка")||n.includes("пек-дек")) return "Груди";
    if(n.includes("підтягування")||n.includes("тяга")||n.includes("блок")||n.includes("пуловер")) return "Спина";
    if(n.includes("присідання")||n.includes("ніг")||n.includes("ікри")||n.includes("румунська")) return "Ноги";
    if(n.includes("мах")||n.includes("дельта")) return "Плечі";
    if(n.includes("біцепс")||n.includes("трицепс")||n.includes("французький")||n.includes("молотки")||n.includes("згинання")||n.includes("розгинання")) return "Руки";
    if(n.includes("прес")||n.includes("планка")) return "Прес";
    if(n.includes("кардіо")||n.includes("біг")||n.includes("ходьба")) return "Кардіо";
    return "Інше";
};

// ЧИСТИЙ КАРКАС ТЕМПЛЕЙТІВ (Без дублювання і сміття)
const Templates = {
    balanced: {
        mass: [
            { day: "Понеділок", group: "Upper", exercises: [] },
            { day: "Вівторок", group: "Lower", exercises: [] },
            { day: "Середа", group: "Відновлення", exercises: [] },
            { day: "Четвер", group: "Push", exercises: [] },
            { day: "П'ятниця", group: "Pull", exercises: [] },
            { day: "Субота", group: "Legs + Core", exercises: [] },
            { day: "Неділя", group: "Відпочинок", exercises: [] }
        ],
        cut: [
            { day: "Понеділок", group: "Upper", exercises: [] },
            { day: "Вівторок", group: "Lower", exercises: [] },
            { day: "Середа", group: "LISS", exercises: [] },
            { day: "Четвер", group: "Push", exercises: [] },
            { day: "П'ятниця", group: "Pull", exercises: [] },
            { day: "Субота", group: "Legs + Core", exercises: [] },
            { day: "Неділя", group: "Відпочинок", exercises: [] }
        ]
    },
    arms: {
        mass: [
            { day: "Понеділок", group: "Тренування 1", exercises: [] },
            { day: "Вівторок", group: "Тренування 2", exercises: [] },
            { day: "Середа", group: "Відновлення", exercises: [] },
            { day: "Четвер", group: "Тренування 3", exercises: [] },
            { day: "П'ятниця", group: "Тренування 4", exercises: [] },
            { day: "Субота", group: "Тренування 5", exercises: [] },
            { day: "Неділя", group: "Відпочинок", exercises: [] }
        ],
        cut: [
            { day: "Понеділок", group: "Тренування 1", exercises: [] },
            { day: "Вівторок", group: "Тренування 2", exercises: [] },
            { day: "Середа", group: "Відновлення", exercises: [] },
            { day: "Четвер", group: "Тренування 3", exercises: [] },
            { day: "П'ятниця", group: "Тренування 4", exercises: [] },
            { day: "Субота", group: "Тренування 5", exercises: [] },
            { day: "Неділя", group: "Відпочинок", exercises: [] }
        ]
    }
};

const InitialData = {
    weeks: [],
    guideMode: 'mass',
    currentProgram: 'balanced', 
    exBank: [],
    hiddenBank: [],
    customTemplates: [],
    targets: { "Груди": 12, "Спина": 14, "Ноги": 16, "Плечі": 10, "Руки": 10, "Прес": 6, "Кардіо": 3 },
    guidelines: {
        balanced: { mass: [], cut: [] },
        arms: { mass: [], cut: [] }
    }
};
const App = {
    data: null, 
    state: new StateManager('training_protocol', InitialData), 
    timerState: { interval: null, left: 0, default: 90, el: null, endTime: null, currentExKey: null },
    historyIndex: {}, 

    buildIndex() {
        this.historyIndex = {};
        if (!this.data || !this.data.weeks) return;
        
        const sortedWeeks = [...this.data.weeks].sort((a, b) => a.num - b.num);

        sortedWeeks.forEach(week => {
            week.days.forEach((day, dIdx) => {
                day.exercises.forEach(ex => {
                    if (!ex.n) return;
                    const name = ex.n.trim().toLowerCase();
                    if (!this.historyIndex[name]) this.historyIndex[name] = [];

                    let sessionMax1RM = 0;
                    let hasValidSets = false;

                    if (ex.sets) {
                        ex.sets.forEach(s => {
                            if (s.w || s.r) hasValidSets = true;
                            
                            if (s.t === 'WU') return;
                            const w = parseFloat(s.w) || 0;
                            const r = parseFloat(s.r) || 0;
                            if (w > 0 && r > 0) {
                                const rm = w * (1 + r / 30);
                                if (rm > sessionMax1RM) sessionMax1RM = rm;
                            }
                        });
                    }
                    this.historyIndex[name].push({
                        wNum: week.num,
                        prog: week.prog,
                        dIdx: dIdx,
                        sets: ex.sets,
                        maxRM: sessionMax1RM,
                        hasData: hasValidSets
                    });
                });
            });
        });
    },

    async init() {
        this.data = await this.state.init();

        if(!this.data.targets) this.data.targets = JSON.parse(JSON.stringify(InitialData.targets));
        if(!this.data.guidelines) this.data.guidelines = JSON.parse(JSON.stringify(InitialData.guidelines));
        
        if (this.data.guidelines.mass && Array.isArray(this.data.guidelines.mass)) {
            const oldG = this.data.guidelines;
            this.data.guidelines = {
                balanced: { mass: JSON.parse(JSON.stringify(oldG.mass || [])), cut: JSON.parse(JSON.stringify(oldG.cut || [])) },
                arms: { mass: JSON.parse(JSON.stringify(oldG.mass || [])), cut: JSON.parse(JSON.stringify(oldG.cut || [])) }
            };
            this.save();
        }
        if(!this.data.exBank) this.data.exBank = [];
        if(!this.data.hiddenBank) this.data.hiddenBank = [];
        if(!this.data.customTemplates) this.data.customTemplates = [];
        if(!this.data.opened) this.data.opened = {}; 
        
        if(!this.data.customNames) this.data.customNames = { balanced: "ЗБАЛАНСОВАНА", arms: "РУКИ" };
        if(!this.data.settings) this.data.settings = {}; 
        if(!this.data.globalRules) this.data.globalRules = {};
        
        const extraStyles = document.createElement('style');
        extraStyles.innerHTML = `
            @keyframes fadeInDown {
                from { opacity: 0; transform: translateY(-5px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .ghost-active::placeholder { 
                color: rgba(212, 175, 55, 0.6) !important; 
                font-weight: 700; 
                text-shadow: 0 0 5px rgba(212, 175, 55, 0.3);
            }
        `;
        document.head.appendChild(extraStyles);

        window.addEventListener('scroll', () => {
            const btn = document.getElementById('scrollTopBtn');
            if(btn) {
                if (window.scrollY > 300) btn.classList.add('visible');
                else btn.classList.remove('visible');
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.ex-name-input') && !e.target.closest('.custom-dropdown') && e.target.id !== 'newBankItem') {
                document.querySelectorAll('.custom-dropdown').forEach(el => el.style.display = 'none');
            }
            // ФІКС: Закриття модалок при кліку на темний фон
            if (e.target.classList.contains('modal')) {
                App.closeModal();
            }
        });

        const brandBlock = document.getElementById('brandBlock');
        const brandIcon = brandBlock.querySelector('.brand-icon');

        brandIcon.onclick = (e) => {
            e.stopPropagation(); 
            brandIcon.classList.remove('hint-active');
            void brandIcon.offsetWidth; 
            brandIcon.classList.add('hint-active');
        };

        brandBlock.ondblclick = async () => {
            if(await Modal.confirm("⚠ HARD RESET?<br><br>Це незворотно видалить усі дані тренувань.", "КРИТИЧНО", "red")) {
                localStorage.removeItem('training_protocol');
                try { indexedDB.deleteDatabase('ProtocolOS_DB'); } catch(e) {}
                location.reload();
            }
        };

        if(!this.data.currentProgram) this.data.currentProgram = 'balanced';
        this.setTheme(this.data.currentProgram);
        this.updateBank();
        this.buildIndex();
        this.render();
        this.save();
        this.initTimer();
        this.initDesktopScroll(); 
    },

    initDesktopScroll() {
        const sliders = document.querySelectorAll('.week-scroll');
        
        sliders.forEach(slider => {
            slider.addEventListener('wheel', (e) => {
                e.preventDefault();
                slider.scrollLeft += e.deltaY;
            });

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
                slider.style.cursor = 'default';
            });
            slider.addEventListener('mouseup', () => {
                isDown = false;
                slider.style.cursor = 'default';
            });
            slider.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - slider.offsetLeft;
                const walk = (x - startX) * 1.5; 
                slider.scrollLeft = scrollLeft - walk;
            });
        });
    },

    openExList(w, d, e) {
        const inp = document.getElementById(`ex-${w}-${d}-${e}`);
        if(inp) this.filterExList(inp.value, w, d, e);
    },
    
    filterExList(q, w, d, e) {
        document.querySelectorAll('.custom-dropdown').forEach(el => el.style.display = 'none');
        
        const list = document.getElementById(`list-${w}-${d}-${e}`);
        if (!list) return;
        
        const matches = this.data.exBank.filter(x => x.toLowerCase().includes(q.toLowerCase()));
        
        if (matches.length === 0) {
            list.innerHTML = `<div style="padding:10px; color:#666; font-size:0.8rem; text-align:center;">Немає збігів</div>`;
        } else {
            list.innerHTML = matches.map(m => `
                <div style="padding: 12px 15px; border-bottom: 1px solid #222; color: #fff; font-size: 0.85rem; cursor: pointer; transition: 0.2s;" 
                     onclick="App.selectEx('${m.replace(/'/g, "\\'")}', ${w}, ${d}, ${e})"
                     onmouseover="this.style.background='#333'" onmouseout="this.style.background='transparent'">
                    ${m}
                </div>
            `).join('');
        }
        list.style.display = 'block';
        list.style.animation = 'fadeInDown 0.2s ease forwards';
    },
    
    selectEx(val, w, d, e) {
        const inp = document.getElementById(`ex-${w}-${d}-${e}`);
        if (inp) {
            inp.value = val;
            this.updateEx(w, d, e, 'n', val); 
        }
        document.getElementById(`list-${w}-${d}-${e}`).style.display = 'none';
    },

    openGuideExList(p, m, i) {
        const inp = document.getElementById(`guide-ex-${p}-${m}-${i}`);
        if(inp) this.filterGuideExList(inp.value, p, m, i);
    },

    filterGuideExList(q, p, m, i) {
        document.querySelectorAll('.custom-dropdown').forEach(el => el.style.display = 'none');
        
        const list = document.getElementById(`guide-list-${p}-${m}-${i}`);
        if (!list) return;
        
        const matches = this.data.exBank.filter(x => x.toLowerCase().includes(q.toLowerCase()));
        
        if (matches.length === 0) {
            list.innerHTML = `<div style="padding:10px; color:#666; font-size:0.8rem; text-align:center;">Немає збігів</div>`;
        } else {
            list.innerHTML = matches.map(name => `
                <div style="padding: 12px 15px; border-bottom: 1px solid #222; color: #fff; font-size: 0.85rem; cursor: pointer; transition: 0.2s;" 
                     onclick="App.selectGuideEx('${name.replace(/'/g, "\\'")}', '${p}', '${m}', ${i})"
                     onmouseover="this.style.background='#333'" onmouseout="this.style.background='transparent'">
                    ${name}
                </div>
            `).join('');
        }
        list.style.display = 'block';
        list.style.animation = 'fadeInDown 0.2s ease forwards';
    },

    selectGuideEx(val, p, m, i) {
        const inp = document.getElementById(`guide-ex-${p}-${m}-${i}`);
        if (inp) {
            inp.value = val;
            this.updateGuide(p, m, i, 'n', val); 
        }
        document.getElementById(`guide-list-${p}-${m}-${i}`).style.display = 'none';
    },
    toggleDay(uid, el) {
        if(!this.data.opened) this.data.opened = {};
        
        if(this.data.opened[uid]) {
            delete this.data.opened[uid];
        } else {
            this.data.opened[uid] = true;
        }
        
        this.save();
        
        if (el) {
            const card = el.closest('.day-card');
            if(card) card.classList.toggle('collapsed');
        }
    },

    getGhostData(exerciseName, currentWNum, currentDIdx, prog) {
        if (!exerciseName || !this.historyIndex) return null;
        const name = exerciseName.trim().toLowerCase();
        const history = this.historyIndex[name];
        if (!history) return null;

        for (let i = history.length - 1; i >= 0; i--) {
            const entry = history[i];
            if (entry.prog !== prog) continue;
            
            if (entry.wNum < currentWNum || (entry.wNum === currentWNum && entry.dIdx < currentDIdx)) {
                if (entry.hasData) return entry.sets;
            }
        }
        return null;
    },

    getEstimated1RM(exerciseName, currentWNum, currentDIdx, prog) {
        if (!exerciseName || !this.historyIndex) return 0;
        const name = exerciseName.trim().toLowerCase();
        const history = this.historyIndex[name];
        if (!history) return 0;

        let maxRM = 0;
        for (let i = 0; i < history.length; i++) {
            const entry = history[i];
            if (entry.prog !== prog) continue;
            
            if (entry.wNum > currentWNum || (entry.wNum === currentWNum && entry.dIdx >= currentDIdx)) continue;
            
            if (entry.maxRM > maxRM) maxRM = entry.maxRM;
        }
        return Math.round(maxRM);
    },

    cycleSetType(w, d, e, s, event) { // Додано event
        const setObj = this.data.weeks[w].days[d].exercises[e].sets[s];
        let msg = ""; let color = ""; let newLabel = s + 1; let newClass = "";

        if (!setObj.t) {
            setObj.t = 'WU'; msg = "🟡 WU: Підвідний / Розминка"; color = "var(--theme)";
            newLabel = "WU"; newClass = "type-WU";
        } else if (setObj.t === 'WU') {
            setObj.t = 'TS'; msg = "🔴 TS: Top Set (Максимальна відмова)"; color = "var(--danger)";
            newLabel = "TS"; newClass = "type-TS";
        } else if (setObj.t === 'TS') {
            setObj.t = 'BO'; msg = "🔵 BO: Back-off (-20% ваги)"; color = "#3b82f6";
            newLabel = "BO"; newClass = "type-BO";
        } else if (setObj.t === 'BO') {
            setObj.t = 'DS'; msg = "🟣 DS: Drop-set (Інтенсифікація)"; color = "#8b5cf6";
            newLabel = "DS"; newClass = "type-DS";
        } else {
            delete setObj.t; msg = "⚪ Робочий / Filler підхід"; color = "#444";
        }
        
        this.save();
        
        // ФІКС МЕРЕХТІННЯ: Оновлюємо DOM точково
        if (event && event.target) {
            const numEl = event.target;
            const rowEl = numEl.closest('.set-row');
            numEl.innerText = newLabel;
            numEl.className = `set-num ${newClass}`;
            if (rowEl) rowEl.className = `set-row ${newClass}`;
        } else {
            this.render(); // Запасний план
        }
        this.showToast(msg, color);
    },
    showToast(msg, color="var(--success)") {
        document.querySelectorAll('.sys-toast').forEach(t => t.remove());
        const toast = document.createElement('div');
        toast.className = 'sys-toast';
        toast.innerHTML = msg; 
        
        // АБСОЛЮТНИЙ ФІКС ДЛЯ iPHONE:
        // Замість left:50% використовуємо margin:auto з жорсткими обмеженнями по краях
        toast.style.cssText = `
            position: fixed; 
            bottom: 90px; 
            left: 20px; 
            right: 20px; 
            margin: auto; 
            width: fit-content; 
            max-width: calc(100vw - 40px);
            box-sizing: border-box;
            background: ${color}; 
            color: #fff; 
            padding: 12px 20px; 
            border-radius: 12px; 
            z-index: 20000; 
            font-weight: bold; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.5); 
            font-size: 0.85rem; 
            text-align: center; 
            white-space: normal; 
            word-wrap: break-word;
            animation: fadeInDown 0.2s ease forwards; 
            display: flex; 
            align-items: center; 
            justify-content: center;
        `;
        document.body.appendChild(toast);
        setTimeout(() => { if(toast) toast.remove(); }, 2500);
    },
    moveEx(w, d, e, direction) {
        const arr = this.data.weeks[w].days[d].exercises;
        if (direction === -1 && e > 0) {
            [arr[e-1], arr[e]] = [arr[e], arr[e-1]];
            this.pushHistory();
            this.save();
            this.render();
        } else if (direction === 1 && e < arr.length - 1) {
            [arr[e+1], arr[e]] = [arr[e], arr[e+1]];
            this.pushHistory();
            this.save();
            this.render();
        }
    },

    toggleSuperset(w, d, e) {
        this.pushHistory();
        const ex = this.data.weeks[w].days[d].exercises[e];
        ex.linkNext = !ex.linkNext;
        this.save();
        this.render();
    },

    copyGhostToSet(w, d, e, s, gw, gr) {
        if (!gw || !gr) return;
        this.pushHistory();
        this.data.weeks[w].days[d].exercises[e].sets[s].w = gw.toString();
        this.data.weeks[w].days[d].exercises[e].sets[s].r = gr.toString();
        this.save();
        this.render();
        this.showToast(`✅ Вставлено: ${gw}кг × ${gr}`, "var(--success)");
    },

    render() {
        const c = document.getElementById('scheduleList');
        const nav = document.getElementById('weekNav');
        const isEd = document.body.classList.contains('editing');
        const prog = this.data.currentProgram;

        const nameBal = this.data.customNames ? this.data.customNames.balanced : "ЗБАЛАНСОВАНА";
        const nameArms = this.data.customNames ? this.data.customNames.arms : "РУКИ";

        const progSel = document.querySelector('.program-selector');
        if (progSel) {
            progSel.innerHTML = `
                <div class="prog-opt ${prog === 'balanced' ? 'active' : ''}" 
                     onclick="App.setProgram('balanced')" 
                     ondblclick="App.renameProgram('balanced'); event.stopPropagation();">
                    ⚖️ ${nameBal}
                </div>
                <div class="prog-opt ${prog === 'arms' ? 'active' : ''}" 
                     onclick="App.setProgram('arms')" 
                     ondblclick="App.renameProgram('arms'); event.stopPropagation();">
                    💪 ${nameArms}
                </div>
            `;
        }

        const filteredWeeks = this.data.weeks.filter(w => w.prog === prog);

        nav.innerHTML = filteredWeeks.map((w) => {
            const specialClass = w.prog === 'arms' ? 'is-arms' : '';
            return `<div class="week-btn ${w.type} ${specialClass}" onclick="document.getElementById('week-${w.id}').scrollIntoView({behavior:'smooth'})">
                <span>${w.num}</span>
                <small>${w.type}</small>
            </div>`;
        }).join('') + `
        <div class="week-btn" onclick="App.addWeek('mass')" style="border:1px dashed #444; opacity:0.5; font-size:0.7rem">+ MASS</div>
        <div class="week-btn" onclick="App.addWeek('cut')" style="border:1px dashed #444; opacity:0.5; font-size:0.7rem">+ CUT</div>
        <div class="week-btn" onclick="App.copyWeekFromOther()" style="border:1px dashed var(--theme); color:var(--theme); background:rgba(212,175,55,0.05); font-size:0.7rem" title="Імпорт з іншої програми">📥 ІМПОРТ</div>
        `;

        if (filteredWeeks.length === 0) {
            c.innerHTML = `<div style="text-align:center; padding:40px; color:#666">Програма порожня. Натисніть + MASS або + CUT зверху.</div>`;
        } else {
            c.innerHTML = filteredWeeks.map((week) => {
                const theme = week.type === 'mass' ? 'mass-theme' : 'cut-theme';
                const realWIdx = this.getRealIndex(week);
                
                const daysHtml = week.days.map((day, dIdx) => {
                    const uid = week.id + '-' + dIdx;
                    const isOpen = this.data.opened && this.data.opened[uid];

                    const exsHtml = day.exercises.map((ex, eIdx) => {
                        const m = ex.m || 'wr';
                        
                        if(m === 'cardio') {
                            const s = ex.sets[0] || {};
                            return `<div class="exercise cardio-block">
                                ${isEd ? `<div class="ex-del" onclick="App.delEx(${realWIdx},${dIdx},${eIdx})">✕</div>` : ''}
                                <div class="cardio-header">🏃 ${ex.n}</div>
                                <div class="cardio-grid">
                                    <div class="c-input-box"><span class="c-label">ХВ</span><input class="c-input" type="number" inputmode="decimal" value="${s.r||''}" onblur="App.updateSet(${realWIdx},${dIdx},${eIdx},0,'r',this.value)"></div>
                                    <div class="c-input-box"><span class="c-label">КМ</span><input class="c-input" type="number" inputmode="decimal" value="${s.w||''}" onblur="App.updateSet(${realWIdx},${dIdx},${eIdx},0,'w',this.value)"></div>
                                    <div class="c-input-box"><span class="c-label">ККАЛ</span><input class="c-input" type="number" inputmode="decimal" value="${s.d||''}" onblur="App.updateSet(${realWIdx},${dIdx},${eIdx},0,'d',this.value)"></div>
                                    <div class="c-input-box"><span class="c-label">BPM</span><input class="c-input" type="number" inputmode="decimal" value="${s.h||''}" placeholder="❤️" style="color:var(--danger) !important" onblur="App.updateSet(${realWIdx},${dIdx},${eIdx},0,'h',this.value)"></div>
                                </div>
                            </div>`;
                        }

                        const groupSelect = isEd ? `<select class="group-select" onchange="App.updateEx(${realWIdx},${dIdx},${eIdx},'g',this.value)">${Groups.map(g => `<option value="${g}" ${ex.g===g?'selected':''}>${g}</option>`).join('')}</select>` : `<span class="ex-badge group">${ex.g || ResolveGroup(ex.n)}</span>`;
                        
                        let smartGuideHtml = '';
                        let exKeyName = "";
                        
                        if (ex.n && typeof ex.n === 'string') {
                            exKeyName = ex.n.trim().toLowerCase();
                            
                            const guideInfo = this.data.guidelines[prog] && this.data.guidelines[prog][week.type] 
                            ? this.data.guidelines[prog][week.type].find(g => g.n && g.n.trim().toLowerCase() === exKeyName) 
                            : null;
                            if (guideInfo && !isEd) {
                                let weightHint = "";
                                const e1RM = this.getEstimated1RM(exKeyName, week.num, dIdx, prog);
                                // ФІКС: Шукаємо відсоток ТІЛЬКИ на початку рядка (напр. "70%"). Ігноруємо "TS + BO (-20%)".
                                if (e1RM > 0 && guideInfo.p) {
                                    const match = guideInfo.p.match(/^\s*(\d{2,3})\s*%/); 
                                    if (match) {
                                        const pct = parseInt(match[1]);
                                        const calcW = Math.round((e1RM * (pct/100)) / 2.5) * 2.5;
                                        weightHint = ` <span style="color:#10b981; font-weight:900;">(≈${calcW}кг)</span>`;
                                    }
                                }
                                smartGuideHtml = `
                                <div style="margin-top: 4px; font-family: 'JetBrains Mono', monospace; line-height: 1.3;">
                                    <div style="font-size: 0.65rem; color: var(--theme); font-weight: 700; opacity: 0.9;">
                                        ⚡ ${guideInfo.p}${weightHint} | ${guideInfo.s} | ${guideInfo.w}
                                    </div>
                                    ${guideInfo.i ? `<div style="font-size: 0.65rem; color: #777; font-style: italic; margin-top: 2px;">"${guideInfo.i}"</div>` : ''}
                                </div>`;
                            }
                        }

                        const currentSetting = (exKeyName && this.data.settings && this.data.settings[exKeyName]) ? this.data.settings[exKeyName] : "";
                        let settingHtml = '';
                        
                        if (isEd) {
                            settingHtml = `<input type="text" class="modal-input" style="padding:4px 8px; font-size:0.65rem; margin-top:4px; border:1px dashed #333; background:rgba(0,0,0,0.5); width:100%;" placeholder="Налаштування (Спинка 4, Валик 2)..." value="${currentSetting}" onblur="App.updateSetting('${exKeyName.replace(/'/g, "\\'")}', this.value)">`;
                        } else if (currentSetting) {
                            settingHtml = `<div style="font-size:0.6rem; color:#8b5cf6; margin-top:4px; font-family:'JetBrains Mono'; font-weight:700;">⚙️ ${currentSetting}</div>`;
                        }

                        let exNameHtml = '';
                        if (isEd) {
                            exNameHtml = `
                            <div style="position:relative; flex:1; margin-right:10px;">
                                <input class="ex-name-input" id="ex-${realWIdx}-${dIdx}-${eIdx}" autocomplete="off" value="${ex.n}" 
                                       onfocus="App.openExList(${realWIdx}, ${dIdx}, ${eIdx})" 
                                       oninput="App.filterExList(this.value, ${realWIdx}, ${dIdx}, ${eIdx})" 
                                       onblur="setTimeout(() => App.updateEx(${realWIdx},${dIdx},${eIdx},'n',document.getElementById('ex-${realWIdx}-${dIdx}-${eIdx}').value), 200)">
                                ${settingHtml}
                                <div id="list-${realWIdx}-${dIdx}-${eIdx}" class="custom-dropdown" style="display:none; position:absolute; top:calc(100% + 4px); left:0; width:100%; background:#1a1a1a; border:1px solid #444; border-radius:8px; max-height:200px; overflow-y:auto; z-index:9999; box-shadow:0 10px 30px rgba(0,0,0,0.9);"></div>
                            </div>`;
                        } else {
                            exNameHtml = `<div style="display:flex; flex-direction:column;"><span class="ex-name">${ex.n || '<span style="color:#555;font-size:0.8rem">Вправа</span>'}</span>${settingHtml}${smartGuideHtml}</div>`;
                        }

                        const isLinked = ex.linkNext === true;
                        const isChild = eIdx > 0 && day.exercises[eIdx-1].linkNext === true;

                        let timerHtml = '';
                        if (!isEd && m !== 'cardio' && !isLinked) {
                            const exTime = ex.t || (this.timerState ? this.timerState.default : 90);
                            const isTimerRunningForThisEx = this.timerState && this.timerState.interval && this.timerState.currentExKey === `${realWIdx}-${dIdx}-${eIdx}`;
                            
                            if (isTimerRunningForThisEx) {
                                timerHtml = `
                                <div class="ex-timer-btn active-timer" id="timer-btn-${realWIdx}-${dIdx}-${eIdx}" style="touch-action: manipulation; user-select: none; background: var(--success); color: #fff; border-color: var(--success);"
                                     onclick="App.stopTimer()">
                                    ⏳ Іде відпочинок
                                </div>`;
                            } else {
                                timerHtml = `
                                <div class="ex-timer-btn" id="timer-btn-${realWIdx}-${dIdx}-${eIdx}" style="touch-action: manipulation; user-select: none;"
                                     onclick="App.handleTimerClick(${realWIdx}, ${dIdx}, ${eIdx}, ${exTime})">
                                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" style="margin-right:4px"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    ${exTime}s
                                </div>`;
                            }
                        }

                        const ghostSets = App.getGhostData(ex.n, week.num, dIdx, prog);

                        const setsHtml = ex.sets.map((s, sIdx) => {
                            if (m === 't') {
                                return `<div class="set-row"><div class="set-num">${sIdx+1}</div><div class="set-part"><input class="set-input" type="number" inputmode="decimal" value="${s.r||''}" onblur="App.updateSet(${realWIdx},${dIdx},${eIdx},${sIdx},'r',this.value, this)"><span class="set-unit">час</span></div></div>`;
                            }

                            let ghostW = (ghostSets && ghostSets[sIdx] && ghostSets[sIdx].w) ? ghostSets[sIdx].w : '';
                            let ghostR = (ghostSets && ghostSets[sIdx] && ghostSets[sIdx].r) ? ghostSets[sIdx].r : '';

                            let sType = s.t || '';
                            let typeLabel = sIdx + 1;
                            let typeClass = '';
                            if (sType === 'WU') { typeLabel = 'WU'; typeClass = 'type-WU'; }
                            else if (sType === 'TS') { typeLabel = 'TS'; typeClass = 'type-TS'; }
                            else if (sType === 'BO') { typeLabel = 'BO'; typeClass = 'type-BO'; }
                            else if (sType === 'DS') { typeLabel = 'DS'; typeClass = 'type-DS'; }

                            let progressHtml = '&nbsp;';
                            if (ghostW && ghostR && sType !== 'WU') {
                                let prev1RM = parseFloat(ghostW) * (1 + parseFloat(ghostR) / 30);
                                let curW = parseFloat(s.w) || 0;
                                let curR = parseFloat(s.r) || 0;
                                let cur1RM = (curW > 0 && curR > 0) ? curW * (1 + curR / 30) : 0;
                                
                                let icon = '<span style="color:#555">➖</span>';
                                if (cur1RM > prev1RM) icon = '<span style="color:var(--success); text-shadow: 0 0 5px var(--success);">🔥</span>';
                                else if (cur1RM > 0 && cur1RM < prev1RM) icon = '<span style="color:var(--danger)">🔻</span>';

                                progressHtml = `<span style="color:#777; font-weight:600; cursor:pointer; padding:2px;" onclick="App.copyGhostToSet(${realWIdx},${dIdx},${eIdx},${sIdx}, '${ghostW}', '${ghostR}')" title="Вставити дані">⏮ ${ghostW}x${ghostR} ${icon}</span>`;
                            }

                            let placeholderW = "";
                            if (sType === 'BO' && sIdx > 0 && !s.w) {
                                const prevSet = ex.sets[sIdx - 1];
                                if (prevSet && prevSet.t === 'TS' && prevSet.w) {
                                    const tsWeight = parseFloat(prevSet.w);
                                    if (!isNaN(tsWeight) && tsWeight > 0) {
                                        placeholderW = Math.round((tsWeight * 0.8) / 2.5) * 2.5; 
                                    }
                                }
                            }

                            return `
                            <div style="display:flex; flex-direction:column; gap:2px; position:relative;">
                                <div id="hud-${realWIdx}-${dIdx}-${eIdx}-${sIdx}" style="font-size:0.55rem; text-align:right; padding-right:4px; font-family:'JetBrains Mono'; height:12px; letter-spacing:0.5px; width:100%; white-space:nowrap;">
                                    ${progressHtml}
                                </div>
                                <div class="set-row ${typeClass}">
                                    <div class="set-num ${typeClass}" title="Клікніть, щоб змінити тип" onclick="App.cycleSetType(${realWIdx},${dIdx},${eIdx},${sIdx}, event)">${typeLabel}</div>
                                    <div class="set-part">
                                        <input type="text" inputmode="text" class="set-input w-val ${placeholderW ? 'ghost-active' : ''}" value="${s.w||''}" placeholder="${placeholderW}" 
                                               onkeydown="if(event.key===' '){ event.preventDefault(); this.closest('.set-row').querySelector('.r-val').focus(); }" 
                                               onblur="App.updateSet(${realWIdx},${dIdx},${eIdx},${sIdx},'w',this.value, this)">
                                        <span class="set-unit">кг</span>
                                    </div>
                                    <div class="set-part">
                                        <input type="number" inputmode="decimal" class="set-input r-val" value="${s.r||''}" 
                                               onblur="App.updateSet(${realWIdx},${dIdx},${eIdx},${sIdx},'r',this.value, this)">
                                        <span class="set-unit">x</span>
                                    </div>
                                </div>
                            </div>`;
                        }).join('');

                        return `<div class="exercise ${isLinked ? 'superset-link' : ''} ${isChild ? 'superset-child' : ''}">
                            ${isEd ? `<div class="ex-del" onclick="App.delEx(${realWIdx},${dIdx},${eIdx})">✕</div>` : ''}
                            <div class="ex-info">
                                <div class="ex-name-row">
                                    ${exNameHtml}
                                    <div style="display: flex; gap: 10px; align-items: center; margin-top: 6px;">
                                        ${groupSelect}
                                        ${timerHtml}
                                    </div>
                                </div>
                                <div class="edit-ui" style="gap:5px; align-items:center;">
                                    <div class="set-btn" onclick="App.moveEx(${realWIdx},${dIdx},${eIdx},-1)" style="font-size:1.2rem; line-height:1" title="Вгору">↑</div>
                                    <div class="set-btn" onclick="App.moveEx(${realWIdx},${dIdx},${eIdx},1)" style="font-size:1.2rem; line-height:1" title="Вниз">↓</div>
                                    <div class="btn-link ${isLinked ? 'active' : ''}" title="Зв'язати в суперсет" onclick="App.toggleSuperset(${realWIdx},${dIdx},${eIdx})">🔗</div>
                                    <div class="set-btn" onclick="App.changeSets(${realWIdx},${dIdx},${eIdx},-1)">-</div>
                                    <div class="set-btn" onclick="App.changeSets(${realWIdx},${dIdx},${eIdx},1)">+</div>
                                </div>
                            </div>
                            <div class="sets-wrapper">${setsHtml}</div>
                        </div>`;
                        }).join('');

                    const dayGroup = isEd ? `<span class="day-group" contenteditable="true" onblur="App.updateDay(${realWIdx},${dIdx},'group',this.innerText)" onclick="event.stopPropagation()">${day.group}</span>` : `<span class="day-group">${day.group}</span>`;

                    return `
                    <div class="day-card ${isOpen ? '' : 'collapsed'}">
                        <div class="day-header" onclick="App.toggleDay('${uid}', this)">
                            <div style="display:flex; align-items:center">
                                <span class="day-chevron">▼</span>
                                <span class="day-title">${day.day}</span>
                            </div>
                            ${dayGroup}
                        </div>
                        <div class="ex-list">
                            ${exsHtml}
                            <div class="add-controls edit-ui">
                                <div class="btn-add" style="color:var(--success)" onclick="App.addEx(${realWIdx},${dIdx},'wr'); event.stopPropagation()">+ Вправа</div>
                                <div class="btn-add" style="color:var(--cardio)" onclick="App.addEx(${realWIdx},${dIdx},'cardio'); event.stopPropagation()">+ 🏃</div>
                            </div>
                            <textarea class="notes-area" placeholder="Нотатки..." onblur="App.updateEx(${realWIdx},${dIdx},'note',this.value)" onclick="event.stopPropagation()">${day.note||''}</textarea>
                        </div>
                    </div>`;
                }).join('');

                const weekNumHtml = isEd 
                    ? `<input type="number" inputmode="numeric" value="${week.num}" style="width:40px; background:transparent; border:1px dashed #666; border-radius:4px; color:var(--${week.type}); font-size:1.1rem; text-align:center; padding:0; font-weight:800; font-family:'JetBrains Mono';" onblur="App.updateWeekNum(${week.id}, this.value)" onclick="event.stopPropagation()">`
                    : week.num;

                return `<div id="week-${week.id}" class="${theme}">
                    <div style="padding:10px 0; display:flex; justify-content:space-between; align-items:center">
                        <div><h3 style="margin:0; color:#fff; display:flex; align-items:center; gap:8px;">ТИЖДЕНЬ ${weekNumHtml} <span style="font-size:0.8rem; color:var(--${week.type})">// ${week.type.toUpperCase()}</span></h3></div>
                        <span class="edit-ui" style="color:var(--danger); cursor:pointer" onclick="App.delWeek(${week.id})">Видалити</span>
                    </div>
                    <div class="days-list">${daysHtml}</div>
                </div><hr style="border:0; border-top:1px dashed #333; margin:30px 0">`;
            }).join('');
        }
        
        this.renderGuide();
    },

    saveTimer: null,
    bankTimer: null,

    save() { 
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => {
            this.buildIndex(); 
            this.state.save(this.data); 
            this.saveTimer = null;
        }, 800);
    },

    forceSave() {
        this.buildIndex();
        this.state.save(this.data);
    },
    
    undo() {
        const prev = this.state.undo(this.data);
        if (prev) {
            this.data = prev;
            this.render();
            
            // Якщо історія порожня — ховаємо обидві кнопки (і верхню, і плаваючу)
            if (this.state.history.length === 0) {
                const btn = document.getElementById('undoBtn');
                if(btn) btn.style.display='none';
                
                const fab = document.getElementById('undoFab');
                if(fab) fab.classList.remove('visible');
            }
            
            // Сповіщення, щоб юзер бачив, що дія точно скасувалася
            this.showToast("↩ Дію скасовано", "var(--theme)");
        }
    },
    
    pushHistory() {
        this.state.push(this.data);
        
        // Показуємо обидві кнопки
        const btn = document.getElementById('undoBtn');
        if(btn) btn.style.display='flex';
        
        const fab = document.getElementById('undoFab');
        if(fab) fab.classList.add('visible');
    },

    setProgram(prog) {
        this.data.currentProgram = prog;
        this.setTheme(prog);
        this.save();
        this.render();
    },

    setTheme(prog) {
        document.body.className = `prog-${prog}`;
    },
    
    getRealIndex(weekObj) {
        return this.data.weeks.findIndex(w => w.id === weekObj.id);
    },

    updateBank() {
        const allNames = new Set(this.data.exBank);
        
        if (this.data.weeks) {
            this.data.weeks.forEach(w => w.days.forEach(d => d.exercises.forEach(e => {
                if(e.n && e.n.length > 2) allNames.add(e.n);
            })));
        }
        
        if (this.data.guidelines) {
            Object.values(this.data.guidelines).forEach(progObj => {
                if (progObj) {
                    Object.values(progObj).forEach(list => {
                        if (Array.isArray(list)) {
                            list.forEach(r => {
                                if(r.n && r.n.length > 2) allNames.add(r.n);
                            });
                        }
                    });
                }
            });
        }
        
        this.data.exBank = Array.from(allNames).filter(n => !this.data.hiddenBank || !this.data.hiddenBank.includes(n)).sort();
    },

    openBank() {
        this.toggleFab(false);
        document.getElementById('bankModal').style.display = 'flex';
        this.renderBankList(); 
    },
    
    renderBankList(query = '') {
        const list = document.getElementById('bankList');
        const q = query.toLowerCase().trim();
        const filtered = this.data.exBank.filter(n => n.toLowerCase().includes(q));

        if (filtered.length === 0) {
            list.innerHTML = `<div style="padding:20px; text-align:center; color:#666; font-size:0.8rem;">Нічого не знайдено</div>`;
            return;
        }

        list.innerHTML = filtered.map(n => `
            <div class="bank-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px dashed #333;">
                <span style="cursor:pointer; color:#fff; flex:1; transition:0.2s;" onclick="App.renameGlobalEx('${n.replace(/'/g, "\\'")}')" title="Натисніть, щоб перейменувати" onmouseover="this.style.color='var(--theme)'" onmouseout="this.style.color='#fff'">
                    ${n}
                </span>
                <span class="bank-del" style="color:var(--danger); cursor:pointer; padding:0 10px; font-weight:bold; font-size:1.1rem;" onclick="App.deleteFromBank('${n.replace(/'/g, "\\'")}')">✕</span>
            </div>
        `).join('');
    },

    filterBank(q) {
        this.renderBankList(q);
    },
    filterNewBankItem(q) {
        const drop = document.getElementById('newBankDropdown');
        if (!drop) return;
        
        if (!q || q.trim().length === 0) {
            drop.style.display = 'none';
            return;
        }

        // Збираємо всі унікальні назви з бази та всієї історії тренувань
        let allNames = new Set(this.data.exBank);
        this.data.weeks.forEach(w => w.days.forEach(d => d.exercises.forEach(e => {
            if(e.n && e.n.length > 2) allNames.add(e.n.trim());
        })));
        
        const matches = Array.from(allNames).filter(x => x.toLowerCase().includes(q.toLowerCase())).sort();
        
        if (matches.length === 0) {
            drop.style.display = 'none';
        } else {
            drop.innerHTML = matches.map(m => `
                <div style="padding: 12px 15px; border-bottom: 1px solid #222; color: #fff; font-size: 0.85rem; cursor: pointer;" 
                     onclick="document.getElementById('newBankItem').value='${m.replace(/'/g, "\\'")}'; document.getElementById('newBankDropdown').style.display='none';">
                    ${m}
                </div>
            `).join('');
            drop.style.display = 'block';
            drop.style.animation = 'fadeInDown 0.2s ease forwards';
        }
    },

    async renameGlobalEx(oldName) {
        const newName = await Modal.prompt(`Змінити назву "<b>${oldName}</b>"?<br><br><span style="font-size:0.75rem; color:#888;">Вона автоматично оновиться в розкладі, історії, довідниках та налаштуваннях тренажерів.</span>`, "ПЕРЕЙМЕНУВАННЯ", oldName);
        
        if (!newName || newName.trim() === "" || newName.trim().toLowerCase() === oldName.trim().toLowerCase()) return;
        
        const oldKey = oldName.trim().toLowerCase();
        const newKey = newName.trim().toLowerCase();
        
        this.pushHistory();
        
        if (this.data.weeks) {
            this.data.weeks.forEach(w => w.days.forEach(d => d.exercises.forEach(e => {
                if (e.n && e.n.trim().toLowerCase() === oldKey) e.n = newName.trim();
            })));
        }
        
        if (this.data.guidelines) {
            Object.values(this.data.guidelines).forEach(progObj => {
                if (progObj) {
                    Object.values(progObj).forEach(list => {
                        if (Array.isArray(list)) {
                            list.forEach(r => {
                                if (r.n && r.n.trim().toLowerCase() === oldKey) r.n = newName.trim();
                            });
                        }
                    });
                }
            });
        }
        
        if (this.data.settings && this.data.settings[oldKey] !== undefined) {
            this.data.settings[newKey] = this.data.settings[oldKey];
            delete this.data.settings[oldKey];
        }
        
        this.data.exBank = this.data.exBank.map(n => n.trim().toLowerCase() === oldKey ? newName.trim() : n);
        
        this.updateBank();
        this.save();
        this.render();
        this.renderBankList(document.querySelector('#bankModal input[placeholder="🔍 Пошук по базі..."]').value);
        this.showToast(`✅ Вправу оновлено скрізь!`, 'var(--success)');
    },

    addToBank() {
        const val = document.getElementById('newBankItem').value.trim();
        if(val) {
            this.pushHistory();
            
            if (this.data.hiddenBank) {
                this.data.hiddenBank = this.data.hiddenBank.filter(x => x.toLowerCase() !== val.toLowerCase());
            }
            
            const exists = this.data.exBank.find(x => x.toLowerCase() === val.toLowerCase());
            if (!exists) {
                this.data.exBank.push(val);
            }
            
            this.data.exBank.sort();
            this.save();
            this.updateBank(); 
            
            const searchInput = document.querySelector('#bankModal input[placeholder*="Пошук"]');
            this.renderBankList(searchInput ? searchInput.value : ''); 
            document.getElementById('newBankItem').value = '';
            this.showToast("✅ Додано в базу", "var(--success)");
        }
    },

    async deleteFromBank(name) {
        if(!(await Modal.confirm(`Видалити "${name}" з бази назавжди?`, "ВИДАЛЕННЯ", "red"))) return;
        this.pushHistory();
        this.data.exBank = this.data.exBank.filter(x => x !== name);
        
        if (!this.data.hiddenBank) this.data.hiddenBank = [];
        if (!this.data.hiddenBank.includes(name)) this.data.hiddenBank.push(name);
        
        this.save();
        this.updateBank();
        
        // Зберігаємо пошуковий запит
        const searchInput = document.querySelector('#bankModal input[placeholder*="Пошук"]');
        this.renderBankList(searchInput ? searchInput.value : '');
    },
    calc1RM() {
        const w = parseFloat(document.getElementById('rm-w').value) || 0;
        const r = parseFloat(document.getElementById('rm-r').value) || 0;
        
        if(w > 0 && r > 0) {
            const oneRm = Math.round(w * (1 + r / 30));
            document.getElementById('rm-result').innerText = oneRm;
            document.getElementById('rm-95').innerText = Math.round(oneRm * 0.95);
            document.getElementById('rm-85').innerText = Math.round(oneRm * 0.85);
            document.getElementById('rm-75').innerText = Math.round(oneRm * 0.75);
            document.getElementById('rm-65').innerText = Math.round(oneRm * 0.65);
        } else {
            document.getElementById('rm-result').innerText = "0";
        }
    },
    
    closeModal() {
        document.querySelectorAll('.modal').forEach(el => el.style.display = 'none');
        this.toggleFab(true);
    },

    initTimer() {
        const t = document.createElement('div');
        t.id = 'rest-timer';
        t.style.cssText = `
            position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%);
            background: rgba(20, 20, 22, 0.95); border: 1px solid var(--theme, #d4af37);
            color: var(--theme, #d4af37); padding: 10px 28px; border-radius: 30px;
            font-family: 'JetBrains Mono', monospace; font-size: 1.2rem; font-weight: 800;
            box-shadow: 0 5px 25px rgba(0,0,0,0.8); cursor: pointer; z-index: 8000;
            transition: all 0.2s ease; display: none; align-items: center; justify-content: center;
            backdrop-filter: blur(10px); user-select: none; touch-action: manipulation;
            min-width: 140px; text-align: center;
        `;
        
        t.onclick = (e) => {
            e.preventDefault();
            this.stopTimer(); 
        };

        document.body.appendChild(t);
        this.timerState.el = t;
        
        const savedTime = localStorage.getItem('rest_timer_default');
        if (savedTime) this.timerState.default = parseInt(savedTime);
    },

    toggleTimer() {
        if (this.timerState.interval) {
            this.stopTimer();
        } else {
            this.startTimer(this.timerState.default);
        }
    },

    startTimer(seconds, exKey = null) {
        this.stopTimer();
        this.timerState.left = seconds;
        this.timerState.endTime = Date.now() + (seconds * 1000);
        this.timerState.currentExKey = exKey; 
        
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
        
        this.timerState.el.style.display = 'flex';
        this.timerState.el.style.background = 'var(--theme, #d4af37)';
        this.timerState.el.style.color = '#000';
        this.timerState.el.style.boxShadow = '0 0 25px var(--theme, #d4af37)';
        
        this.updateTimerUI();
        if (window.Haptics) window.Haptics.light();

        this.timerState.interval = setInterval(() => {
            const now = Date.now();
            this.timerState.left = Math.ceil((this.timerState.endTime - now) / 1000);
            
            this.updateTimerUI();

            if (this.timerState.left <= 0) {
                clearInterval(this.timerState.interval);
                this.timerState.interval = null;
                this.timerState.endTime = null;
                
                this.timerState.el.style.background = 'var(--success)';
                this.timerState.el.style.color = '#fff';
                this.timerState.el.style.boxShadow = '0 0 25px var(--success)';
                this.timerState.el.innerHTML = "🔥 ГОТОВИЙ!";
                
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("Час відпочинку вийшов!", { body: "Пора робити наступний підхід", icon: "icon.png", vibrate: [200, 100, 200] });
                }
                
                if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
                if (window.Haptics) window.Haptics.heavy();
                
                setTimeout(() => { if(!this.timerState.interval) this.timerState.el.style.display = 'none'; }, 5000);
            }
        }, 250); 
    },

    stopTimer() {
        if(this.timerState.interval) clearInterval(this.timerState.interval);
        this.timerState.interval = null;
        this.timerState.endTime = null; 
        this.timerState.currentExKey = null; 
        
        this.timerState.el.style.background = 'rgba(20, 20, 22, 0.95)';
        this.timerState.el.style.color = 'var(--theme, #d4af37)';
        this.timerState.el.style.boxShadow = '0 5px 25px rgba(0,0,0,0.8)';
        
        this.timerState.el.style.display = 'none';
        this.timerState.left = this.timerState.default;
        this.render(); 
    },

    updateTimerUI() {
        if (!this.timerState.el) return;
        const timeToFormat = this.timerState.interval ? this.timerState.left : this.timerState.default;
        
        const m = Math.floor(timeToFormat / 60).toString().padStart(2, '0');
        const s = (timeToFormat % 60).toString().padStart(2, '0');
        
        if (this.timerState.interval) {
            this.timerState.el.innerHTML = `⏳ ${m}:${s}`;
        }
    },

    async setTimerForExercise(w, d, e, currentVal) {
        const val = await Modal.prompt(`Введіть час (сек) для цієї вправи:<br><br><span style='color:#888; font-size:0.8rem'>Наприклад: 90 (1.5 хв) або 120 (2 хв)</span>`, "ТАЙМЕР ВПРАВИ", currentVal.toString());
        
        if (val !== null && val !== "") {
            const newTime = parseInt(val);
            if (!isNaN(newTime) && newTime > 0) {
                this.data.weeks[w].days[d].exercises[e].t = newTime;
                this.save();
                
                const btnId = `timer-btn-${w}-${d}-${e}`;
                const btnEl = document.getElementById(btnId);
                if (btnEl) {
                    btnEl.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" style="margin-right:4px"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>${newTime}s`;
                    btnEl.setAttribute('onclick', `App.startTimer(${newTime})`);
                    btnEl.setAttribute('oncontextmenu', `App.setTimerForExercise(${w}, ${d}, ${e}, ${newTime}); return false;`);
                }
            }
        }
    },
        
    _timerTaps: {},
    handleTimerClick(w, d, e, time) {
        const key = `${w}-${d}-${e}`;
        if (this._timerTaps[key]) {
            clearTimeout(this._timerTaps[key]);
            this._timerTaps[key] = null;
            this.setTimerForExercise(w, d, e, time);
        } else {
            this._timerTaps[key] = setTimeout(() => {
                this._timerTaps[key] = null;
                this.startTimer(time, key); 
                this.render(); 
            }, 250);
        }
    },

    updateWeekNum(id, val) {
        const num = parseInt(val);
        if (!isNaN(num) && num > 0) {
            const w = this.data.weeks.find(x => x.id === id);
            if (w && w.num !== num) {
                this.pushHistory();
                w.num = num;
                this.data.weeks.sort((a, b) => a.num - b.num); 
                this.save();
                this.render();
            }
        }
    },

    async renameProgram(key) {
        const currentName = this.data.customNames[key] || (key === 'balanced' ? "ЗБАЛАНСОВАНА" : "РУКИ");
        const val = await Modal.prompt("Введіть нову назву для цієї вкладки:", "ПЕРЕЙМЕНУВАННЯ", currentName);
        
        if (val !== null && val.trim() !== "") {
            this.pushHistory();
            this.data.customNames[key] = val.trim().toUpperCase();
            this.save();
            this.render();
        }
    },

    async addWeek(type, init=false) {
        if (!init) this.pushHistory(); 
        
        const prog = this.data.currentProgram || 'balanced';
        let newData;
        
        const currentProgWeeks = this.data.weeks.filter(w => w.prog === prog);
        const maxNum = currentProgWeeks.length > 0 ? Math.max(...currentProgWeeks.map(w => w.num)) : 0;
        const newWeekNum = maxNum + 1; 

        const lastWeek = [...this.data.weeks].reverse().find(w => w.type === type && w.prog === prog);
        
        if(lastWeek && !init) {
            const hardCopy = await Modal.confirm(
                "Скопіювати минулий тиждень <b>разом з вагами і повторами</b>?<br><br><span style='font-size:0.8rem; color:#888'>ОК — повна копія (для прогресії).<br>Скасувати — тільки структура.</span>", 
                "РЕЖИМ КОПІЮВАННЯ", 
                "var(--theme)"
            );

            newData = JSON.parse(JSON.stringify(lastWeek.days));
            newData.forEach(d => {
                d.exercises.forEach(ex => { 
                    ex.sets.forEach(s => { 
                        if (!hardCopy) {
                            s.w = ""; 
                            s.r = ""; 
                        }
                        s.d = ""; 
                    }); 
                });
            });
        } else {
            newData = JSON.parse(JSON.stringify(Templates[prog][type]));
        }
        
        const w = { id: Date.now(), type, prog, num: newWeekNum, days: newData };
        this.data.weeks.push(w);
        this.data.weeks.sort((a, b) => a.num - b.num);
        this.updateBank();
        this.buildIndex(); 
        this.save(); 
        this.render();
    },

    async copyWeekFromOther() {
        const targetP = this.data.currentProgram;
        const sourceP = targetP === 'balanced' ? 'arms' : 'balanced';
        const sourceName = this.data.customNames[sourceP] || sourceP;
        
        const sourceWeeks = this.data.weeks.filter(w => w.prog === sourceP).sort((a, b) => b.num - a.num);
        
        if (sourceWeeks.length === 0) {
            this.showToast(`У програмі "${sourceName}" немає тижнів для копіювання.`, "var(--danger)");
            return;
        }

        // ФІКС ВІЗУАЛУ: Жорсткий Flex + Monospace для ідеальної лінії
        let menuHtml = `<div style="text-align:left; font-size:0.85rem; color:#aaa; line-height:1.6; background:#000; padding:10px; border-radius:8px; border:1px solid #333; max-height: 250px; overflow-y: auto;">`;
        sourceWeeks.forEach((w, idx) => {
            menuHtml += `<div style="display:flex; align-items:flex-start; margin-bottom:8px;">
                <div style="flex:0 0 30px; color:var(--theme); font-weight:bold; text-align:right; margin-right:10px; font-family:'JetBrains Mono', monospace;">${idx + 1}.</div>
                <div style="flex:1;">Тиждень ${w.num} <span style="font-size:0.65rem; color:#666">(${w.type.toUpperCase()})</span></div>
            </div>`;
        });
        menuHtml += `</div>`;

        const val = await Modal.prompt(`Введіть цифру, щоб імпортувати тиждень з "<b>${sourceName}</b>" сюди:<br><br>${menuHtml}`, "📥 ІМПОРТ ТИЖНЯ", "1");
        if (!val) return;
        
        const selectedIdx = parseInt(val) - 1;
        if (isNaN(selectedIdx) || selectedIdx < 0 || selectedIdx >= sourceWeeks.length) return;

        const weekToCopy = sourceWeeks[selectedIdx];
        
        const hardCopy = await Modal.confirm(
            "Скопіювати <b>разом з вагами і повторами</b>?<br><br><span style='font-size:0.8rem; color:#888'>ОК — повна копія (з цифрами).<br>Скасувати — тільки структура (як чистий шаблон).</span>", 
            "РЕЖИМ КОПІЮВАННЯ", 
            "var(--theme)"
        );

        this.pushHistory();

        // ФІКС ДНІВ: Беремо каркас днів із ЦІЛЬОВОГО шаблону, щоб "Тренування 1" залишалося "Тренуванням 1"
        let targetTemplate = Templates[targetP][weekToCopy.type];
        let newData = JSON.parse(JSON.stringify(targetTemplate)); 
        
        newData.forEach((targetDay, dIdx) => {
            if (weekToCopy.days[dIdx]) {
                // Вставляємо тільки самі вправи у правильні дні
                targetDay.exercises = JSON.parse(JSON.stringify(weekToCopy.days[dIdx].exercises));
                if (!hardCopy) {
                    targetDay.exercises.forEach(ex => { 
                        ex.sets.forEach(s => { s.w = ""; s.r = ""; s.d = ""; }); 
                    });
                }
            }
        });

        const currentProgWeeks = this.data.weeks.filter(w => w.prog === targetP);
        const maxNum = currentProgWeeks.length > 0 ? Math.max(...currentProgWeeks.map(w => w.num)) : 0;
        const newWeekNum = maxNum + 1; 

        const newWeek = { id: Date.now(), type: weekToCopy.type, prog: targetP, num: newWeekNum, days: newData };
        this.data.weeks.push(newWeek);
        this.data.weeks.sort((a, b) => a.num - b.num);
        this.updateBank();
        this.buildIndex(); 
        this.save(); 
        this.render();
        this.showToast(`✅ Тиждень імпортовано як базу!`, "var(--success)");
    },
    async delWeek(id) {
        if(!(await Modal.confirm("Видалити цей тиждень повністю?", "ВИДАЛЕННЯ ТИЖНЯ", "red"))) return;
        this.pushHistory();
        const idx = this.data.weeks.findIndex(w => w.id === id);
        if (idx !== -1) {
            this.data.weeks.splice(idx, 1);
            this.save(); 
            this.render();
        }
    },

    addEx(w, d, type) {
        this.pushHistory();
        const def = type === 'cardio' ? { n: "Ходьба", g: "Кардіо", m: "cardio", sets: [{}] } : { n: "", g: "Інше", m: "wr", sets: [{},{},{}] };
        this.data.weeks[w].days[d].exercises.push(def);
        this.save(); this.render();
    },
    
    async delEx(w, d, e) {
        if(!(await Modal.confirm("Видалити цю вправу з дня?", "ВИДАЛЕННЯ ВПРАВИ", "red"))) return;
        this.pushHistory();
        this.data.weeks[w].days[d].exercises.splice(e, 1);
        this.save(); this.render();
    },

    updateDay(w, d, f, v) {
        if(this.data.weeks[w].days[d][f] !== v) {
            this.pushHistory();
            this.data.weeks[w].days[d][f] = v;
            this.save();
        }
    },

    updateSetting(key, val) {
        if (!this.data.settings) this.data.settings = {};
        if (this.data.settings[key] !== val) {
            this.pushHistory();
            this.data.settings[key] = val;
            this.save();
        }
    },

    updateEx(w, d, e, field, val) {
        if(this.data.weeks[w].days[d].exercises[e][field] !== val) {
            this.pushHistory();
            this.data.weeks[w].days[d].exercises[e][field] = val;
            
            if(field === 'n') {
                if (val.length > 2 && !this.data.exBank.includes(val)) {
                    this.updateBank();
                } else {
                    if(this.bankTimer) clearTimeout(this.bankTimer);
                    this.bankTimer = setTimeout(() => this.updateBank(), 500);
                }
            }
            
            this.save();
        }
    },

    changeSets(w, d, e, delta) {
        this.pushHistory();
        const ex = this.data.weeks[w].days[d].exercises[e];
        if(delta > 0) ex.sets.push({});
        else if(ex.sets.length > 1) ex.sets.pop();
        this.save(); this.render();
    },

    updateSet(w, d, e, s, f, val, inputEl) {
        let finalVal = val;

        if (f === 'w' && typeof val === 'string' && (val.includes('%') || val.toLowerCase().includes('p'))) {
            const percent = parseFloat(val);
            if (!isNaN(percent) && percent > 0) {
                const exName = this.data.weeks[w].days[d].exercises[e].n;
                const wNum = this.data.weeks[w].num;
                const e1RM = this.getEstimated1RM(exName, wNum, d, this.data.currentProgram);
                
                if (e1RM > 0) {
                    const calcWeight = e1RM * (percent / 100);
                    finalVal = (Math.round(calcWeight / 2.5) * 2.5).toString();
                    if (inputEl) inputEl.value = finalVal;
                    this.showToast(`🎯 1RM: ${e1RM}кг. ${percent}% = ${finalVal}кг`, 'var(--success)');
                } else {
                    this.showToast(`⚠️ Немає історії для розрахунку`, 'var(--danger)');
                    finalVal = ""; 
                    if (inputEl) inputEl.value = "";
                }
            }
        }

        const exObj = this.data.weeks[w].days[d].exercises[e];
        const setObj = exObj.sets[s];

        if(setObj[f] !== finalVal) {
            setObj[f] = finalVal;
            
            if (setObj.t !== 'WU') {
                const ghostSets = this.getGhostData(exObj.n, this.data.weeks[w].num, d, this.data.currentProgram);
                if (ghostSets && ghostSets[s]) {
                    let ghostW = ghostSets[s].w;
                    let ghostR = ghostSets[s].r;
                    if (ghostW && ghostR) {
                        let prev1RM = parseFloat(ghostW) * (1 + parseFloat(ghostR) / 30);
                        let curW = parseFloat(setObj.w) || 0;
                        let curR = parseFloat(setObj.r) || 0;
                        let cur1RM = (curW > 0 && curR > 0) ? curW * (1 + curR / 30) : 0;
                        
                        let icon = '<span style="color:#555">➖</span>';
                        if (cur1RM > prev1RM) icon = '<span style="color:var(--success); text-shadow: 0 0 5px var(--success);">🔥</span>';
                        else if (cur1RM > 0 && cur1RM < prev1RM) icon = '<span style="color:var(--danger)">🔻</span>';

                        const hudEl = document.getElementById(`hud-${w}-${d}-${e}-${s}`);
                        if (hudEl) {
                            hudEl.innerHTML = `<span style="color:#777; font-weight:600; cursor:pointer; padding:2px;" onclick="App.copyGhostToSet(${w},${d},${e},${s}, '${ghostW}', '${ghostR}')" title="Клікніть, щоб вставити ці цифри">⏮ ${ghostW}x${ghostR} ${icon}</span>`;
                        }
                    }
                }
            }
            this.save(); 
        }
    },

    setGuideMode(m) { this.data.guideMode = m; this.save(); this.renderGuide(); },
    
    updateTarget(group, val) { 
        const nVal = parseInt(val)||0;
        if(this.data.targets[group] !== nVal) {
            this.pushHistory();
            this.data.targets[group] = nVal; 
            this.save(); 
            this.renderStats(); 
        }
    },

    async promptTarget(group, currentTarget) {
        const val = await Modal.prompt(`Встановіть цільову кількість робочих підходів для групи <b>${group}</b>:`, "ЦІЛЬОВИЙ ОБ'ЄМ", currentTarget.toString());
        if (val !== null && val !== "") {
            const num = parseInt(val);
            if (!isNaN(num) && num > 0) this.updateTarget(group, num);
        }
    },
    
    filterGuide(q) {
        const rows = document.querySelectorAll('.guide-table > div'); // ФІКС: шукаємо блоки-картки
        const query = q.toLowerCase();
        rows.forEach(r => {
            const inputsText = Array.from(r.querySelectorAll('input, textarea')).map(inp => inp.value).join(' ').toLowerCase();
            const rowText = r.innerText.toLowerCase();
            r.style.display = (rowText.includes(query) || inputsText.includes(query)) ? '' : 'none';
        });
    },

    updateGuide(p, m, i, f, v) { 
        if(this.data.guidelines[p][m][i][f] !== v) {
            this.pushHistory();
            this.data.guidelines[p][m][i][f] = v; 
            
            if(f === 'n') {
                if (v.length > 2 && !this.data.exBank.includes(v)) {
                    this.updateBank();
                } else {
                    if(this.bankTimer) clearTimeout(this.bankTimer);
                    this.bankTimer = setTimeout(() => this.updateBank(), 500);
                }
            }
            
            this.save(); 
        }
    },
    
    async delGuideRow(p, m, i) {
        if(!(await Modal.confirm("Видалити цю вправу з довідника?", "ВИДАЛЕННЯ", "red"))) return;
        this.pushHistory();
        this.data.guidelines[p][m].splice(i, 1);
        this.save();
        this.renderGuide();
    },

    toggleEdit() {
        const isEditing = document.body.classList.contains('editing');
        const btn = document.getElementById('editBtn');
        
        if (isEditing) {
            document.body.classList.remove('editing');
            if (btn) btn.classList.remove('active');
        } else {
            document.body.classList.add('editing');
            if (btn) btn.classList.add('active');
        }
        
        this.render(); 
        this.renderGuide();
    },

    setView(v) {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.getElementById(`nav-${v}`).classList.add('active');
        
        document.getElementById('viewSchedule').style.display = v==='schedule'?'block':'none';
        document.getElementById('viewStats').style.display = v==='stats'?'block':'none';
        document.getElementById('viewGuide').style.display = v==='guide'?'block':'none';
        
        if(v === 'stats') this.renderStats();
        if(v === 'guide') this.renderGuide();
    },

    updateGlobalRule(m, v) { 
        if(!this.data.globalRules) this.data.globalRules = {}; 
        if(this.data.globalRules[m] !== v) {
            this.pushHistory();
            this.data.globalRules[m] = v; 
            this.save(); 
        }
    },

    renderGuide() {
        const c = document.getElementById('guideContent');
        const m = this.data.guideMode || 'mass';
        const p = this.data.currentProgram || 'balanced'; 
        
        document.getElementById('btnG-mass').classList.toggle('active', m==='mass');
        document.getElementById('btnG-cut').classList.toggle('active', m==='cut');

        const list = this.data.guidelines[p] ? this.data.guidelines[p][m] : [];
        const isEd = document.body.classList.contains('editing');
        const ruleKey = p + '_' + m; 
        const globalRule = this.data.globalRules ? (this.data.globalRules[ruleKey] || "") : "";
        
        // Генеруємо HTML для списку вправ АБО повідомлення "Порожньо"
        let listHtml = '';
        if (!list || list.length === 0) {
            listHtml = `<div style="padding:40px 20px; text-align:center; color:#666; font-size:0.9rem; background:rgba(255,255,255,0.02); border:1px dashed #333; border-radius:12px;">Список порожній.<br><br>Увімкніть Олівець (✎) зверху та натисніть "СИНХРОН", щоб підтягнути вправи з розкладу.</div>`;
        } else {
            listHtml = list.map((r, i) => `
            <div style="background:rgba(255,255,255,0.02); border:1px solid #333; border-radius:12px; padding:12px; position:relative;">
                
                ${isEd ? `<div style="position:absolute; top:12px; right:12px; z-index:10; color:var(--danger); cursor:pointer; font-weight:bold; font-size:1.2rem; background:#000; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:1px solid #333;" onclick="event.stopPropagation(); App.delGuideRow('${p}', '${m}',${i})">✕</div>` : ''}

                <div style="margin-bottom:10px; padding-right:${isEd ? '40px' : '0'}; position:relative;">
                    ${isEd ? `
                        <input class="ex-name-input modal-input" id="guide-ex-${p}-${m}-${i}" autocomplete="off" style="padding:8px; font-size:16px; margin:0; width:100%; border-color:#555; color:var(--theme); font-weight:bold;" value="${r.n}" placeholder="Назва вправи" 
                               onfocus="App.openGuideExList('${p}', '${m}', ${i})" 
                               oninput="App.filterGuideExList(this.value, '${p}', '${m}', ${i})" 
                               onblur="setTimeout(() => App.updateGuide('${p}', '${m}',${i},'n',document.getElementById('guide-ex-${p}-${m}-${i}').value), 200)">
                        <div id="guide-list-${p}-${m}-${i}" class="custom-dropdown" style="display:none; position:absolute; top:calc(100% + 4px); left:0; width:100%; background:#1a1a1a; border:1px solid #444; border-radius:8px; max-height:200px; overflow-y:auto; z-index:9999; box-shadow:0 10px 30px rgba(0,0,0,0.9);"></div>
                    ` : `<strong style="color:var(--theme); font-size:1.1rem;">${r.n}</strong>`}
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:10px;">
                    <div>
                        <div style="font-size:0.65rem; color:#666; margin-bottom:2px;">ІНТЕНСИВНІСТЬ (%)</div>
                        ${isEd ? `<input class="modal-input" style="padding:8px; font-size:16px; margin:0; width:100%; text-align:center;" value="${r.p}" placeholder="TS+BO" onblur="App.updateGuide('${p}', '${m}',${i},'p',this.value)">` : `<div style="font-weight:900; color:#fff;">${r.p || '-'}</div>`}
                    </div>
                    <div>
                        <div style="font-size:0.65rem; color:#666; margin-bottom:2px;">ПІДХОДИ (SETS)</div>
                        ${isEd ? `<input class="modal-input" style="padding:8px; font-size:16px; margin:0; width:100%; text-align:center;" value="${r.s}" placeholder="1+1" onblur="App.updateGuide('${p}', '${m}',${i},'s',this.value)">` : `<div style="color:#aaa;">${r.s || '-'}</div>`}
                    </div>
                </div>

                <div style="margin-bottom:10px;">
                    <div style="font-size:0.65rem; color:#666; margin-bottom:2px;">РОЗМИНКА / ВАГА</div>
                    ${isEd ? `<input class="modal-input" style="padding:8px; font-size:16px; margin:0; width:100%;" value="${r.w}" placeholder="40%, 60%, 80%" onblur="App.updateGuide('${p}', '${m}',${i},'w',this.value)">` : `<div style="font-size:0.8rem; color:#888; background:#000; padding:6px 10px; border-radius:6px; border:1px dashed #333;">${r.w || '-'}</div>`}
                </div>
                
                <div>
                    <div style="font-size:0.65rem; color:#666; margin-bottom:2px; display:flex; justify-content:space-between; align-items:center;">
                        <span>ОПИС (INFO)</span>
                        ${isEd ? `<span style="color:var(--theme); font-weight:bold; cursor:pointer; padding:4px 10px; background:rgba(212,175,55,0.1); border-radius:6px; border:1px solid var(--theme);" onclick="App.generateProPlan('${p}', '${m}', ${i})">⚡ ШАБЛОН</span>` : ''}
                    </div>
                    ${isEd ? `<textarea class="modal-input" style="padding:8px; min-height:60px; font-size:16px; margin:0; width:100%;" placeholder="Техніка, RIR..." onblur="App.updateGuide('${p}', '${m}',${i},'i',this.value)">${r.i}</textarea>` : `<div class="row-note" style="white-space:pre-wrap; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; color:#ddd;">${r.i || '-'}</div>`}
                </div>
            </div>
            `).join('');
        }

        // Рендеримо головний каркас: Правила -> Кнопки -> Список
        c.innerHTML = `
        <div style="margin-bottom: 20px; background: rgba(255,255,255,0.02); border: 1px solid #333; border-radius: 12px; padding: 15px;">
            <div style="font-size: 0.7rem; color: var(--theme); font-weight: 800; text-transform: uppercase; margin-bottom: 8px;">📌 МЕХАНІКА ВАГ ТА ГЛОБАЛЬНІ ПРАВИЛА (${m.toUpperCase()}):</div>
            ${isEd ? 
                `<textarea class="modal-input" style="min-height:80px; padding:8px; font-size:0.8rem;" placeholder="Впишіть правила прогресії, темп тощо..." onblur="App.updateGlobalRule('${ruleKey}', this.value)">${globalRule}</textarea>` : 
                `<div style="font-size:0.8rem; color:#aaa; line-height:1.4; white-space: pre-wrap;">${globalRule || '<i style="color:#555">Немає глобальних правил. Натисніть Олівець, щоб додати.</i>'}</div>`
            }
        </div>

        ${isEd ? `
        <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:15px;">
            <div style="display:flex; gap:8px;">
                <div class="btn-add" style="flex:1; text-align:center; font-weight:bold; height:40px;" onclick="App.addGuideRow('${p}', '${m}')">+ РЯДОК</div>
                <div class="btn-add" style="flex:1; text-align:center; background:var(--theme); color:#000; font-weight:bold; border:none; height:40px;" onclick="App.syncGuide('${p}', '${m}')">🔄 СИНХРОН</div>
            </div>
            <div class="btn-add" style="font-size:0.75rem; padding:6px; border-style:dashed; opacity:0.8; height:30px;" onclick="App.copyGuideFromOther('${p}', '${m}')">📥 Копіювати базу з іншої програми</div>
        </div>
        ` : ''}

        <div class="guide-table" style="display:flex; flex-direction:column; gap:10px;">
            ${listHtml}
        </div>
        `;

        // ФІКС UX: Якщо в пошуку є текст, застосовуємо його знову після перемальовування
        const searchBox = document.querySelector('.guide-search');
        if (searchBox && searchBox.value.trim() !== '') {
            this.filterGuide(searchBox.value);
        }
    },
    
    addGuideRow(p, m) {
        this.pushHistory();
        if (!this.data.guidelines[p]) this.data.guidelines[p] = { mass: [], cut: [] };
        this.data.guidelines[p][m].unshift({n:"", p:"", s:"", w:"", i:""});
        this.save(); 
        
        // ФІКС UX: Очищаємо пошук, щоб новий порожній рядок не був прихованим
        const searchBox = document.querySelector('.guide-search');
        if (searchBox) searchBox.value = '';
        
        this.renderGuide();
    },

    async generateProPlan(p, m, i) {
        if (!this.data.customTemplates) this.data.customTemplates = [];
        
        // ГОЛОВНЕ МЕНЮ (Ідеально рівні колонки)
        let menuHtml = `<div style="text-align:left; font-size:0.85rem; color:#aaa; line-height:1.6; background:#000; padding:10px; border-radius:8px; border:1px solid #333; max-height: 250px; overflow-y: auto;">
        <div style="display:flex; align-items:flex-start; margin-bottom:8px;"><div style="flex:0 0 30px; color:var(--theme); font-weight:bold; text-align:right; margin-right:10px; font-family:'JetBrains Mono', monospace;">1.</div> <div style="flex:1;">Важка База (ПП: 4 кроки, TS+BO)</div></div>
        <div style="display:flex; align-items:flex-start; margin-bottom:8px;"><div style="flex:0 0 30px; color:var(--theme); font-weight:bold; text-align:right; margin-right:10px; font-family:'JetBrains Mono', monospace;">2.</div> <div style="flex:1;">Ізоляція (ПП: 2 кроки, TS+BO)</div></div>
        <div style="display:flex; align-items:flex-start; margin-bottom:8px;"><div style="flex:0 0 30px; color:var(--theme); font-weight:bold; text-align:right; margin-right:10px; font-family:'JetBrains Mono', monospace;">3.</div> <div style="flex:1;">Класика (3x10-12, RIR 1-2)</div></div>
        <div style="display:flex; align-items:flex-start; margin-bottom:8px;"><div style="flex:0 0 30px; color:var(--theme); font-weight:bold; text-align:right; margin-right:10px; font-family:'JetBrains Mono', monospace;">4.</div> <div style="flex:1;">Памп/Філлер (3x15-20)</div></div>`;
        
        let startIndex = 5;
        this.data.customTemplates.forEach((tpl, idx) => {
            menuHtml += `<div style="display:flex; align-items:flex-start; margin-bottom:8px;"><div style="flex:0 0 30px; color:var(--theme); font-weight:bold; text-align:right; margin-right:10px; font-family:'JetBrains Mono', monospace;">${startIndex + idx}.</div> <div style="flex:1;">${tpl.name}</div></div>`;
        });

        menuHtml += `<hr style="border-color:#333; margin:10px 0;">
        <div style="display:flex; align-items:flex-start; margin-bottom:8px;"><div style="flex:0 0 30px; color:#10b981; font-weight:bold; text-align:right; margin-right:10px; font-family:'JetBrains Mono', monospace;">S.</div> <div style="flex:1;">💾 Зберегти рядок як шаблон</div></div>
        <div style="display:flex; align-items:flex-start; margin-bottom:8px;"><div style="flex:0 0 30px; color:#eab308; font-weight:bold; text-align:right; margin-right:10px; font-family:'JetBrains Mono', monospace;">E.</div> <div style="flex:1;">✏️ Редагувати шаблон</div></div>
        <div style="display:flex; align-items:flex-start; margin-bottom:8px;"><div style="flex:0 0 30px; color:#ef4444; font-weight:bold; text-align:right; margin-right:10px; font-family:'JetBrains Mono', monospace;">D.</div> <div style="flex:1;">🗑 Видалити шаблон</div></div>
        <div style="display:flex; align-items:flex-start;"><div style="flex:0 0 30px; color:#ef4444; font-weight:bold; text-align:right; margin-right:10px; font-family:'JetBrains Mono', monospace;">0.</div> <div style="flex:1;">🧹 Очистити рядок</div></div>
        </div>`;

        const val = await Modal.prompt(`Виберіть дію (введіть цифру або букву):<br><br>${menuHtml}`, "⚡ ШАБЛОНИ", "");
        if (!val) return;

        const choice = val.trim().toUpperCase();

        // 🗑 ВИДАЛЕННЯ ШАБЛОНУ (з рівним меню)
        if (choice === 'D') {
            if (this.data.customTemplates.length === 0) return this.showToast("Немає власних шаблонів", "var(--danger)");
            let delHtml = `<div style="text-align:left; font-size:0.85rem; color:#aaa; line-height:1.6; background:#000; padding:10px; border-radius:8px; border:1px solid #333;">`;
            this.data.customTemplates.forEach((tpl, idx) => {
                delHtml += `<div style="display:flex; align-items:flex-start; margin-bottom:8px;"><div style="flex:0 0 30px; color:var(--danger); font-weight:bold; text-align:right; margin-right:10px; font-family:'JetBrains Mono', monospace;">${startIndex + idx}.</div> <div style="flex:1;">${tpl.name}</div></div>`;
            });
            delHtml += `</div>`;
            
            const delVal = await Modal.prompt(`Введіть номер шаблону для ВИДАЛЕННЯ (починаючи з ${startIndex}):<br><br>${delHtml}`, "ВИДАЛЕННЯ", "");
            if (!delVal) return;
            const delIdx = parseInt(delVal) - startIndex;
            if (!isNaN(delIdx) && delIdx >= 0 && delIdx < this.data.customTemplates.length) {
                const deletedName = this.data.customTemplates[delIdx].name;
                this.data.customTemplates.splice(delIdx, 1);
                this.save();
                this.showToast(`✅ Шаблон "${deletedName}" видалено!`, 'var(--success)');
            }
            return;
        }

        // ✏️ РЕДАГУВАННЯ ШАБЛОНУ (з рівним меню)
        if (choice === 'E') {
            if (this.data.customTemplates.length === 0) return this.showToast("Немає власних шаблонів", "var(--danger)");
            let editHtml = `<div style="text-align:left; font-size:0.85rem; color:#aaa; line-height:1.6; background:#000; padding:10px; border-radius:8px; border:1px solid #333;">`;
            this.data.customTemplates.forEach((tpl, idx) => {
                editHtml += `<div style="display:flex; align-items:flex-start; margin-bottom:8px;"><div style="flex:0 0 30px; color:#eab308; font-weight:bold; text-align:right; margin-right:10px; font-family:'JetBrains Mono', monospace;">${startIndex + idx}.</div> <div style="flex:1;">${tpl.name}</div></div>`;
            });
            editHtml += `</div>`;
            const editVal = await Modal.prompt(`Введіть номер шаблону для РЕДАГУВАННЯ (починаючи з ${startIndex}):<br><br>${editHtml}`, "РЕДАГУВАННЯ", "");
            if (!editVal) return;
            const editIdx = parseInt(editVal) - startIndex;
            if (!isNaN(editIdx) && editIdx >= 0 && editIdx < this.data.customTemplates.length) {
                const tpl = this.data.customTemplates[editIdx];
                const newName = await Modal.prompt("Введіть нову назву для шаблону:", "РЕДАГУВАННЯ", tpl.name);
                if (newName && newName.trim() !== "") {
                    tpl.name = newName.trim();
                    this.save();
                    this.showToast(`✅ Назву змінено на "${tpl.name}"`, 'var(--success)');
                }
            }
            return;
        }

        this.pushHistory();
        const row = this.data.guidelines[p][m][i];

        if (choice === 'S') {
            const tplName = await Modal.prompt("Введіть назву для нового шаблону:", "ЗБЕРЕГТИ ШАБЛОН", "Мій шаблон");
            if (tplName && tplName.trim() !== "") {
                this.data.customTemplates.push({
                    name: tplName.trim(), p: row.p || "", s: row.s || "", w: row.w || "", i: row.i || ""
                });
                this.save();
                this.showToast(`✅ Шаблон "${tplName}" збережено!`, 'var(--success)');
            }
            return;
        }

        if (choice === '0') {
            row.p = ""; row.s = ""; row.w = ""; row.i = "";
            this.save(); this.renderGuide(); return;
        }

        if (choice === "1") {
            row.p = "TS + BO"; row.s = "1 + 1"; row.w = "40%, 60%, 80%, 90%"; row.i = "🔥 TS: 6-9 (Відмова)\n💧 BO: -20% (10-14)\n⏳ Темп 3-0-1-0";
        } else if (choice === "2") {
            row.p = "TS + BO"; row.s = "1 + 1"; row.w = "50%, 75%"; row.i = "🔥 TS: Відмова\n💧 BO: -20%\n⏳ Максимальний контроль";
        } else if (choice === "3") {
            row.p = "70-75%"; row.s = "3x10-12"; row.w = "50% x 10"; row.i = "Залишати 1-2 RIR.\nБез мертвої відмови.";
        } else if (choice === "4") {
            row.p = "60%"; row.s = "3x15-20"; row.w = "Легка вага"; row.i = "Памп, нагнітання крові.\nВідмова суворо заборонена.";
        } else {
            const customIdx = parseInt(choice) - startIndex;
            if (!isNaN(customIdx) && customIdx >= 0 && customIdx < this.data.customTemplates.length) {
                const tpl = this.data.customTemplates[customIdx];
                row.p = tpl.p; row.s = tpl.s; row.w = tpl.w; row.i = tpl.i;
            } else { return; }
        }

        this.save();
        this.renderGuide();
        this.showToast(`✅ Шаблон застосовано`, 'var(--theme)');
    },
    syncGuide(p, m) {
        if (!this.data.weeks || !this.data.guidelines[p] || !this.data.guidelines[p][m]) return;
        
        this.pushHistory();
        const guideList = this.data.guidelines[p][m];
        const existingNames = new Set(guideList.map(g => (g.n || "").trim().toLowerCase()));
        let addedCount = 0;

        this.data.weeks.filter(w => w.prog === p && w.type === m).forEach(w => {
            w.days.forEach(d => {
                d.exercises.forEach(ex => {
                    if (ex.n && ex.n.length > 2 && ex.m !== 'cardio') {
                        const nameToSync = ex.n.trim();
                        if (!existingNames.has(nameToSync.toLowerCase())) {
                            guideList.unshift({ n: nameToSync, p: "", s: "", w: "", i: "" });
                            existingNames.add(nameToSync.toLowerCase());
                            addedCount++;
                        }
                    }
                });
            });
        });

        if (addedCount > 0) {
            this.save();
            
            // ФІКС UX: Очищаємо пошук, щоб побачити синхронізовані вправи
            const searchBox = document.querySelector('.guide-search');
            if (searchBox) searchBox.value = '';
            
            this.renderGuide();
            this.showToast(`✅ Синхронізовано: додано ${addedCount} нових вправ з розкладу`, 'var(--success)');
        } else {
            this.showToast(`ℹ️ Усі вправи з розкладу вже є у довіднику`, '#3b82f6');
        }
    },
    async copyGuideFromOther(targetP, targetM) {
        let menuHtml = `<div style="text-align:left; font-size:0.85rem; color:#aaa; line-height:1.6; background:#000; padding:10px; border-radius:8px; border:1px solid #333;">`;
        
        const options = [];
        let idx = 1;

        // Генеруємо список усіх доступних довідників (крім поточного)
        Object.keys(this.data.guidelines).forEach(progKey => {
            Object.keys(this.data.guidelines[progKey]).forEach(modeKey => {
                if (progKey === targetP && modeKey === targetM) return; // Пропускаємо поточний, щоб не скопіювати сам в себе
                
                const progName = this.data.customNames[progKey] || (progKey === 'balanced' ? "ЗБАЛАНСОВАНА" : "РУКИ");
                const modeName = modeKey.toUpperCase();
                
                options.push({ p: progKey, m: modeKey });
                menuHtml += `<div style="display:flex; align-items:flex-start; margin-bottom:8px;">
                    <div style="flex:0 0 30px; color:var(--theme); font-weight:bold; text-align:right; margin-right:10px; font-family:'JetBrains Mono', monospace;">${idx}.</div>
                    <div style="flex:1;">${progName} <span style="font-size:0.7rem; color:#666;">(${modeName})</span></div>
                </div>`;
                idx++;
            });
        });
        menuHtml += `</div>`;

        if (options.length === 0) {
            this.showToast("Немає інших довідників для копіювання", "var(--danger)");
            return;
        }

        const val = await Modal.prompt(`Оберіть цифру бази, яку хочете імпортувати сюди:<br><br><small style="color:#ef4444;">УВАГА: Це повністю замінить поточні дані у цій вкладці!</small><br><br>${menuHtml}`, "ІМПОРТ БАЗИ", "1");
        
        if (!val) return;

        const selectedIdx = parseInt(val) - 1;
        if (isNaN(selectedIdx) || selectedIdx < 0 || selectedIdx >= options.length) return;

        const source = options[selectedIdx];
        
        this.pushHistory();
        const sourceList = this.data.guidelines[source.p][source.m] || [];
        // Робимо глибоку копію, щоб уникнути посилань на один і той же масив
        this.data.guidelines[targetP][targetM] = JSON.parse(JSON.stringify(sourceList));
        this.save();
        
        // Очищаємо пошук після імпорту
        const searchBox = document.querySelector('.guide-search');
        if (searchBox) searchBox.value = '';
        
        this.renderGuide();
        this.showToast(`✅ Базу "${source.p.toUpperCase()} ${source.m.toUpperCase()}" успішно імпортовано!`, "var(--success)");
    },
    renderStats(forceIndex = null) {
        const allWeeks = this.data.weeks.map((w, idx) => ({ ...w, realIndex: idx }));

        if (allWeeks.length === 0) {
            const nav = document.getElementById('statsWeekNav');
            if(nav) nav.innerHTML = '';
            document.getElementById('statsContent').innerHTML = '<div style="text-align:center;color:#666;padding:40px;">Немає даних</div>'; 
            return;
        }

        if (this.currentStatsIdx === undefined) {
            this.currentStatsIdx = allWeeks[allWeeks.length - 1].realIndex;
        }
        if (forceIndex !== null) {
            this.currentStatsIdx = forceIndex;
        }

        const navHtml = allWeeks.map(w => {
            const isActive = w.realIndex === this.currentStatsIdx;
            const specialClass = w.prog === 'arms' ? 'is-arms' : '';
            return `
            <div class="week-btn ${isActive ? 'active' : ''} ${specialClass}" 
                 id="stats-btn-${w.realIndex}"
                 style="min-width: 70px; padding: 8px 5px; flex: 0 0 auto;"
                 onclick="App.renderStats(${w.realIndex})">
                <span style="font-size:0.85rem; font-weight:800;">W ${w.num}</span>
                <small style="font-size:0.55rem; opacity:0.6; text-transform:uppercase;">${w.type}</small>
            </div>`;
        }).join('');
        
        const navEl = document.getElementById('statsWeekNav');
        if (navEl) {
            navEl.innerHTML = navHtml;
            const activeBtn = document.getElementById(`stats-btn-${this.currentStatsIdx}`);
            if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }

        const currentWeek = this.data.weeks[this.currentStatsIdx];
        if (!currentWeek) return; 

        const stats = {}; 
        Groups.forEach(g => stats[g] = { total: 0, ts: 0, bo: 0, ds: 0, norm: 0 });
        
        currentWeek.days.forEach(d => {
            d.exercises.forEach(ex => {
                const g = ex.g || ResolveGroup(ex.n);
                if (stats[g]) {
                    ex.sets.forEach(s => {
                        if (s.t !== 'WU') { 
                            stats[g].total++;
                            if (s.t === 'TS') stats[g].ts++;
                            else if (s.t === 'BO') stats[g].bo++;
                            else if (s.t === 'DS') stats[g].ds++;
                            else stats[g].norm++;
                        }
                    });
                }
            });
        });

        let html = '';
        for(const [k, obj] of Object.entries(stats)) {
            if(k === "Інше") continue;
            const target = this.data.targets[k] || 10; 
            const v = obj.total;
            const pct = Math.min(100, (v / target) * 100);
            
            let color = 'var(--theme)';
            if (v >= target && v <= target + 2) color = 'var(--success)';
            else if (v > target + 2) color = 'var(--danger)';

            let breakdownHtml = '';
            if (v > 0) {
                if (obj.ts > 0) breakdownHtml += `<span style="color:var(--danger)">🔥 TS: ${obj.ts}</span>`;
                if (obj.bo > 0) breakdownHtml += `<span style="color:#3b82f6; margin-top:2px;">💧 BO: ${obj.bo}</span>`;
                if (obj.norm > 0) breakdownHtml += `<span style="color:#aaa; margin-top:2px;">⚪ Base: ${obj.norm}</span>`;
                if (obj.ds > 0) breakdownHtml += `<span style="color:#8b5cf6; margin-top:2px;">🟣 DS: ${obj.ds}</span>`;
            } else {
                breakdownHtml = '<span style="color:#444">Відпочинок</span>';
            }

            html += `
            <div class="stat-box-pro">
                <div class="stat-indicator" style="background:${color}"></div>
                <div class="stat-info">
                    <div class="stat-label-pro">${k}</div>
                    <div class="stat-breakdown">${breakdownHtml}</div>
                </div>
                <div class="stat-ring-wrapper" onclick="App.promptTarget('${k}', ${target})" title="Змінити ціль">
                    <div class="stat-ring" style="background: conic-gradient(${color} ${pct}%, #222 ${pct}% 100%);">
                        <div class="stat-ring-inner">
                            <span class="stat-val-pro">${v}</span>
                            <span class="stat-target-pro">/${target}</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }
        document.getElementById('statsContent').innerHTML = html;
    },
    
    exportData() {
        this.state.export(this.data, "training_protocol.json");
    },
    
    importData(inp) {
        const r = new FileReader();
        r.onload = e => { 
            this.pushHistory(); this.data = JSON.parse(e.target.result); 
            this.save(); location.reload(); 
        };
        r.readAsText(inp.files[0]);
    },
    
    toggleFab(show) {
        const fab = document.getElementById('sys-fab');
        if(fab) fab.style.display = show ? 'flex' : 'none';
    }
};

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
