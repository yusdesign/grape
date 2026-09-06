// www/capacitor.js - Mock for GitHub Pages
window.Capacitor = {
    isNativePlatform: function() {
        return false;
    },
    getPlatform: function() {
        return 'web';
    },
    convertFileSrc: function(path) {
        return path;
    },
    Plugins: {
        Filesystem: {
            readFile: async function(options) {
                console.warn('📁 Filesystem plugin not available on web');
                return { data: '' };
            },
            writeFile: async function(options) {
                console.warn('📁 Filesystem plugin not available on web');
                return {};
            },
            getUri: async function(options) {
                return { uri: '' };
            }
        },
        Share: {
            share: async function(options) {
                console.warn('📤 Share plugin not available on web');
                return {};
            }
        },
        FilePicker: {
            pickFiles: async function(options) {
                console.warn('📂 FilePicker plugin not available on web');
                return { files: [] };
            }
        }
    }
};

// Prevent "listener indicated async response" errors
if (window.webkit && window.webkit.messageHandlers) {
    // Do nothing - just prevent the error
}

console.log('📱 Capacitor mock loaded (web mode)');
