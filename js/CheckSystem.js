// www/js/CheckSystem.js
class CheckSystem {
    constructor() {
        this.allGreen = false;
    }

    runAllChecks() {
        console.log('🔍 grape system check...');
        const checks = [
            this.checkVisNetwork(),
            this.checkCapacitor(),
            this.checkFilesystem(),
            this.checkHtml2canvas()
        ];
        this.allGreen = checks.every(r => r === true);
        if (this.allGreen) {
            console.log('✅ All systems green! 🍇');
        } else {
            console.error('❌ System check failed!');
        }
        return this.allGreen;
    }

    checkVisNetwork() {
        if (typeof vis !== 'undefined' && vis.Network) {
            console.log('✅ vis-network loaded');
            return true;
        }
        console.error('❌ vis-network missing');
        return false;
    }

    checkCapacitor() {
        if (typeof Capacitor !== 'undefined') {
            console.log('✅ Capacitor loaded');
            return true;
        }
        console.warn('⚠️ Capacitor not loaded (web mode)');
        return true;
    }

    checkFilesystem() {
        if (typeof CapacitorFilesystem !== 'undefined') {
            console.log('✅ Filesystem plugin loaded');
            return true;
        }
        console.warn('⚠️ Filesystem plugin not loaded');
        return true;
    }

    checkHtml2canvas() {
        if (typeof html2canvas !== 'undefined') {
            console.log('✅ html2canvas loaded');
            return true;
        }
        console.warn('⚠️ html2canvas not loaded');
        return true;
    }
}

// Auto-run
const checker = new CheckSystem();
checker.runAllChecks();
