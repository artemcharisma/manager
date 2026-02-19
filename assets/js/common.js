// assets/common.js
// Автоматичне додавання глобального меню
document.addEventListener('DOMContentLoaded', () => {
    const menuHTML = `
    <div id="sys-fab" onclick="SysSwitch.toggle()">✦</div>
    <div id="sys-overlay" onclick="SysSwitch.close()">
        <div class="sys-panel" onclick="event.stopPropagation()">
            <div class="sys-header">
                <span>MANAGER OS</span>
                <div class="sys-close" onclick="SysSwitch.close()">✕</div>
            </div>
            <div class="sys-grid">
                <a href="index.html" class="sys-card"><div class="sys-icon" style="color:#fff">🏠</div><span>HUB</span></a>
                <a href="pharm.html" class="sys-card"><div class="sys-icon" style="color:#d4af37">🏆</div><span>PHARM</span></a>
                <a href="training.html" class="sys-card"><div class="sys-icon" style="color:#3b82f6">⚖️</div><span>TRAIN</span></a>
                <a href="nutrition.html" class="sys-card"><div class="sys-icon" style="color:#10b981">🥑</div><span>FOOD</span></a>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', menuHTML);
});

const SysSwitch = {
    get el() { return document.getElementById('sys-overlay'); },
    toggle() { 
        if(this.el.classList.contains('open')) this.close();
        else this.open();
    },
    open() {
        this.el.style.display = 'flex';
        // Force reflow
        this.el.offsetHeight; 
        this.el.classList.add('open');
    },
    close() {
        this.el.classList.remove('open');
        setTimeout(() => this.el.style.display = 'none', 300);
    }
};
const Haptics = {
    light: () => { if(navigator.vibrate) navigator.vibrate(10); },
    medium: () => { if(navigator.vibrate) navigator.vibrate(25); },
    heavy: () => { if(navigator.vibrate) navigator.vibrate(50); },
    success: () => { if(navigator.vibrate) navigator.vibrate([10, 30, 10]); }, // дрр-дрр
    error: () => { if(navigator.vibrate) navigator.vibrate([50, 50, 50]); }   // ДРР-ДРР-ДРР
};

// Автоматично додаємо вібрацію на всі кнопки
document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', (e) => {
        // Якщо клікнули по кнопці, іконці або табу
        if (e.target.closest('button') || 
            e.target.closest('.nav-tab') || 
            e.target.closest('.icon-btn') ||
            e.target.closest('.day-tab') ||
            e.target.closest('.phase-btn')) {
            Haptics.light();
        }
    });
});

// Реєстрація Service Worker для PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW зареєстровано!', reg))
            .catch(err => console.error('Помилка реєстрації SW', err));
    });
}


