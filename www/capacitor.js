// www/capacitor.js - Updated Mock
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

// ⭐ FIX: Prevent the "asynchronous response" error
if (window.webkit && window.webkit.messageHandlers) {
    // Override any message handlers that might cause the error
    console.log('📱 WebKit message handlers present, silencing async errors');
}

// ⭐ FIX: Silence the specific error
window.addEventListener('unhandledrejection', function(e) {
    if (e.reason && e.reason.message && 
        e.reason.message.includes('listener indicated an asynchronous response')) {
        e.preventDefault();
        e.stopPropagation();
        console.debug('📱 Silenced Capacitor async listener error (web mode)');
        return false;
    }
});

console.log('📱 Capacitor mock loaded (web mode)');
