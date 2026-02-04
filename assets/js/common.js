// assets/common.js
const SysSwitch = {
    el: document.getElementById('sys-overlay'),
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
