document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const dragOverlay = document.getElementById('drag-overlay');
    const triggerBtn = document.getElementById('upload-trigger-btn');
    const hiddenFileInput = document.getElementById('hidden-file-input');
    
    const progressContainer = document.getElementById('upload-progress-container');
    const uploadBar = document.getElementById('upload-bar');
    const uploadPercentage = document.getElementById('upload-percentage');
    const uploadFilename = document.getElementById('upload-filename');

    // Bridging UI Plus button to hidden native file input
    triggerBtn.addEventListener('click', () => {
        hiddenFileInput.click();
    });

    hiddenFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // ----------------------------------------------------
    // Powerful Drag & Drop Event Pipeline
    // ----------------------------------------------------
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        window.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) { 
        e.preventDefault(); 
        e.stopPropagation(); 
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('drag-active');
    }

    function unhighlight(e) {
        dropZone.classList.remove('drag-active');
    }

    dropZone.addEventListener('drop', (e) => {
        let files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    // ----------------------------------------------------
    // The Core Upload Engine (File API & XHR)
    // ----------------------------------------------------
    function handleFileUpload(file) {
        if (file.size > 10 * 1024 * 1024) {
            alert('File exceeds 10MB limit! Please compress and try again.');
            return;
        }

        // Engage visually appealing UI load states
        progressContainer.classList.remove('hidden');
        uploadFilename.textContent = file.name;
        uploadBar.style.width = '0%';
        uploadPercentage.textContent = '0%';
        uploadBar.classList.remove('bg-red-500');
        uploadBar.classList.add('bg-primary');

        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        
        // Fetch real dynamically injected Database UUID from UI state
        const activeBtn = document.querySelector('.active-channel');
        const currentChannelId = activeBtn ? activeBtn.dataset.id : null;
        
        if (!currentChannelId) {
            alert('Error: Please join or select a valid Hub before uploading.');
            progressContainer.classList.add('hidden');
            return;
        }

        formData.append('file', file);
        formData.append('channel_id', currentChannelId);

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                uploadBar.style.width = percentComplete + '%';
                uploadPercentage.textContent = percentComplete + '%';
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                uploadBar.style.width = '100%';
                uploadPercentage.textContent = 'Secured!';
                
                let fileUrl = '#';
                try {
                     const responseData = JSON.parse(xhr.responseText);
                     if (responseData.file && responseData.file.file_url) fileUrl = responseData.file.file_url;
                } catch(e) {}

                // Trigger dynamic inline chat updating
                renderInlineFileBlock(file.name, file.size, fileUrl);
                
                setTimeout(() => {
                    progressContainer.classList.add('hidden');
                    // Reset File Input
                    hiddenFileInput.value = '';
                }, 2000);
            } else {
                uploadPercentage.textContent = 'Error during storage insertion';
                uploadBar.classList.replace('bg-primary', 'bg-red-500');
            }
        });

        xhr.addEventListener('error', () => {
            uploadPercentage.textContent = 'Network Disconnect';
            uploadBar.classList.replace('bg-primary', 'bg-red-500');
        });

        const token = localStorage.getItem('uninexus_token');
        xhr.open('POST', '/api/upload', true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
    }

    function renderInlineFileBlock(name, size, fileUrl = '#') {
        const chatContainer = document.getElementById('chat-messages');
        const sizeMb = (size / (1024 * 1024)).toFixed(1);
        const isPdf = name.toLowerCase().endsWith('.pdf');
        
        let userData;
        try {
            userData = JSON.parse(localStorage.getItem('uninexus_user'));
        } catch(e) {}
        const email = userData && userData.email ? userData.email : 'You';
        const pfps = `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`;
        
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const fileHtml = `
            <div class="flex items-start gap-4 hover:bg-gray-800/30 p-2 rounded-lg transition -mx-2 message-item animate-fade-in">
                <img src="${pfps}" class="w-10 h-10 rounded-full bg-gray-700 border border-gray-600 shrink-0" alt="Avatar">
                <div class="w-full">
                    <div class="flex items-baseline gap-2">
                        <span class="font-bold text-primary">${email.split('@')[0]}</span>
                        <span class="text-xs text-gray-500">${time}</span>
                    </div>
                    <div class="mt-2 bg-gray-800/60 border border-gray-700 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-2/3 shadow-sm">
                        <div class="${isPdf ? 'text-red-400' : 'text-indigo-400'} text-3xl"><i class="fa-solid ${isPdf ? 'fa-file-pdf' : 'fa-file-image'}"></i></div>
                        <div class="flex-1 min-w-0">
                            <h4 class="text-sm font-semibold text-white truncate searchable-text">${name}</h4>
                            <p class="text-xs text-gray-500">${sizeMb} MB Document</p>
                        </div>
                        <a href="${fileUrl}" target="_blank" download class="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded transition mt-2 sm:mt-0 shadow-sm shrink-0 flex items-center gap-2">
                            <i class="fa-solid fa-download"></i> Open
                        </a>
                    </div>
                </div>
            </div>
        `;
        chatContainer.insertAdjacentHTML('beforeend', fileHtml);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});
