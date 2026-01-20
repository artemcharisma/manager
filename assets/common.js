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