// www/js/FilePicker.js
class FilePicker {
    async pickFile(types = ['application/json', 'text/xml', 'image/svg+xml']) {
        console.log('📂 FilePicker.pickFile() called with types:', types);
        addDebugLog('📂 Opening file picker...', 'info');
        
        // Check if Capacitor FilePicker plugin is available
        if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
            console.log('📱 Native platform detected, using Capacitor FilePicker');
            addDebugLog('📱 Using Capacitor FilePicker', 'info');
            try {
                const result = await window.Capacitor.Plugins.FilePicker.pickFiles({
                    types: types,
                    multiple: false
                });
                console.log('📄 Capacitor FilePicker result:', result);
                
                if (result.files && result.files.length > 0) {
                    const file = result.files[0];
                    console.log('📄 Selected file:', file.name, 'MIME:', file.mimeType, 'Path:', file.path);
                    addDebugLog(`📄 Selected: ${file.name} (${file.mimeType})`, 'success');
                    
                    // Read file content using Filesystem plugin
                    const content = await window.Capacitor.Plugins.Filesystem.readFile({
                        path: file.path,
                        directory: 'Documents'
                    });
                    console.log('📖 File content length:', content.data?.length || 'unknown');
                    addDebugLog(`📖 File size: ${content.data?.length || 0} bytes`, 'info');
                    
                    return {
                        name: file.name,
                        mimeType: file.mimeType || 'application/json',
                        data: content.data
                    };
                }
            } catch (e) {
                console.warn('⚠️ Capacitor FilePicker failed, falling back to web input:', e);
                addDebugLog('⚠️ Capacitor picker failed, using web fallback', 'warn');
            }
        }

        // Web fallback: use <input type="file">
        console.log('🌐 Using web file input fallback');
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = types.map(t => t.includes('/') ? `.${t.split('/')[1]}` : t).join(',');
            input.onchange = (event) => {
                const file = event.target.files[0];
                if (!file) {
                    console.log('❌ No file selected');
                    addDebugLog('❌ No file selected', 'error');
                    return resolve(null);
                }
                console.log('📄 Web file selected:', file.name, 'Type:', file.type);
                addDebugLog(`📄 Selected: ${file.name} (${file.type})`, 'success');
                const reader = new FileReader();
                reader.onload = (e) => {
                    console.log('📖 File read, content length:', e.target.result.length);
                    addDebugLog(`📖 File size: ${e.target.result.length} bytes`, 'info');
                    resolve({
                        name: file.name,
                        mimeType: file.type || 'application/json',
                        data: e.target.result
                    });
                };
                reader.onerror = (e) => {
                    console.error('❌ File read error:', e);
                    addDebugLog('❌ File read error: ' + e.message, 'error');
                    resolve(null);
                };
                reader.readAsText(file);
            };
            input.click();
        });
    }
}
