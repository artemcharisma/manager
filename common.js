/* common.js - Фінальна оптимізована версія */

window.SysSwitch = {
    el: null,
    
    init() {
        // 1. Отримуємо шлях поточної сторінки
        const path = window.location.pathname;
        
        // 2. Якщо ми на index.html або в корені папки — меню НЕ малюємо і виходимо
  if (!path || path.includes('index.html') || path.endsWith('/')) {
       return;
        }

        // 3. Перевірка на дублікат (якщо раптом скрипт підключили двічі)
        if (document.getElementById('sys-fab')) return;

        // 4. Малюємо меню тільки для внутрішніх сторінок (Pharm, Train, Food)
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
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
        this.el = document.getElementById('sys-overlay');
        
        // 5. Підсвічуємо поточну іконку в меню
        const links = document.querySelectorAll('.sys-card');
        links.forEach(a => {
            const href = a.getAttribute('href');
            if (path.includes(href)) {
                a.style.borderColor = '#555';
                a.style.background = '#222';
            }
        });
    },

    toggle() { 
        if(this.el.classList.contains('open')) this.close();
        else this.open(); 
    },
    
    open() { 
        this.el.style.display = 'flex';
        void this.el.offsetHeight; // Force reflow
        this.el.classList.add('open'); 
    },
    
    close() { 
        this.el.classList.remove('open');
        setTimeout(() => this.el.style.display = 'none', 300); 
    }
};

// Запуск

window.SysSwitch.init();

