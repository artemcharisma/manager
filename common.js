/* common.js */

// 1. Спільна логіка для всіх сторінок
window.Core = {
    // Історія змін (Undo)
    History: {
        stack: [],
        limit: 20,
        // Зберегти стан
        push(data) {
            if (this.stack.length > this.limit) this.stack.shift();
            this.stack.push(JSON.stringify(data));
            this.toggleUI(true);
        },
        // Повернути стан
        pop() {
            if (!this.stack.length) return null;
            const data = JSON.parse(this.stack.pop());
            if (!this.stack.length) this.toggleUI(false);
            return data;
        },
        // Показати/сховати кнопку Undo
        toggleUI(show) {
            const btn = document.getElementById('undoBtn'); // Кнопка в хедері
            const float = document.getElementById('undoFloat'); // Плаваюча кнопка
            if (btn) btn.style.display = show ? 'flex' : 'none';
            if (float && document.body.classList.contains('editing')) {
                show ? float.classList.add('visible') : float.classList.remove('visible');
            }
        }
    }
};

// 2. Нижнє меню (твоє старе меню)
window.SysSwitch = {
    el: null,
    init() {
        const path = window.location.pathname;
        if (path.includes('index.html') || path.endsWith('/')) return;
        if (document.getElementById('sys-fab')) return;

        const html = `
        <div id="sys-fab" onclick="window.SysSwitch.toggle()">✦</div>
        <div id="sys-overlay" onclick="window.SysSwitch.close()">
            <div class="sys-panel" onclick="event.stopPropagation()">
                <div class="sys-header">
                    <span>MANAGER OS</span>
                    <div class="sys-close" onclick="window.SysSwitch.close()">✕</div>
                </div>
                <div class="sys-grid">
                    <a href="index.html" class="sys-card"><div class="sys-icon" style="color:#fff">🏠</div><span>HUB</span></a>
                    <a href="pharm.html" class="sys-card"><div class="sys-icon" style="color:#d4af37">🏆</div><span>PHARM</span></a>
                    <a href="training.html" class="sys-card"><div class="sys-icon" style="color:#3b82f6">⚖️</div><span>TRAIN</span></a>
                    <a href="nutrition.html" class="sys-card"><div class="sys-icon" style="color:#10b981">🥑</div><span>FOOD</span></a>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', html);
        this.el = document.getElementById('sys-overlay');
        
        // Підсвітка активної сторінки
        document.querySelectorAll('.sys-card').forEach(a => {
            if (path.includes(a.getAttribute('href'))) {
                a.style.background = '#222';
                a.style.borderColor = '#555';
            }
        });
    },
    toggle() { this.el.classList.contains('open') ? this.close() : this.open(); },
    open() { this.el.style.display = 'flex'; void this.el.offsetHeight; this.el.classList.add('open'); },
    close() { this.el.classList.remove('open'); setTimeout(() => this.el.style.display = 'none', 300); }
};

window.SysSwitch.init();
