// www/js/FilePicker.js
class FilePicker {
    async pickFile(types = ['application/json', 'text/xml', 'image/svg+xml']) {
        // Check if Capacitor FilePicker plugin is available
        if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
            // Use Capacitor plugin
            try {
                const result = await window.Capacitor.Plugins.FilePicker.pickFiles({
                    types: types,
                    multiple: false
                });
                if (result.files && result.files.length > 0) {
                    const file = result.files[0];
                    // Read file content using Filesystem plugin
                    const content = await window.Capacitor.Plugins.Filesystem.readFile({
                        path: file.path,
                        directory: 'Documents'
                    });
                    return {
                        name: file.name,
                        mimeType: file.mimeType || 'application/json',
                        data: content.data
                    };
                }
            } catch (e) {
                console.warn('Capacitor FilePicker failed, falling back to web input:', e);
            }
        }

        // Web fallback: use <input type="file">
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = types.map(t => t.includes('/') ? `.${t.split('/')[1]}` : t).join(',');
            input.onchange = (event) => {
                const file = event.target.files[0];
                if (!file) return resolve(null);
                const reader = new FileReader();
                reader.onload = (e) => {
                    resolve({
                        name: file.name,
                        mimeType: file.type || 'application/json',
                        data: e.target.result
                    });
                };
                reader.readAsText(file);
            };
            input.click();
        });
    }
}
