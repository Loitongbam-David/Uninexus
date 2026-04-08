document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('uninexus_token');
    if (!token) { window.location.href = 'index.html'; return; }

    let userData;
    try {
        userData = JSON.parse(localStorage.getItem('uninexus_user'));
        if (!userData || !userData.email) throw new Error();
    } catch {
        localStorage.clear();
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('user-email').textContent = userData.email;
    document.getElementById('user-name').textContent = userData.email.split('@')[0];
    document.getElementById('user-avatar').src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.email}`;

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    const socket = io();
    let currentChannel = null;
    let currentChannelName = null;

    socket.on('connect', () => {
        if (currentChannel) socket.emit('join_channel', currentChannel);
    });

    const chatContainer = document.getElementById('chat-messages');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const publicList = document.getElementById('public-channels');
    const privateList = document.getElementById('private-channels');

    // UI Search Filter Mechanics
    document.getElementById('chat-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.message-item');
        items.forEach(item => {
            const nodes = item.querySelectorAll('.searchable-text');
            let match = false;
            nodes.forEach(node => {
                if (node.textContent.toLowerCase().includes(query)) match = true;
            });
            if (match || query === '') {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // Unified DOM Builder for Timeline Elements
    function renderMessageItem(item) {
        const isMe = item.user_id === userData.id;
        const email = item.users && item.users.email ? item.users.email : (item.user_email || 'You'); // Fallback logic
        const pfps = `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`;
        const time = item.timestamp ? item.timestamp : new Date(item.created_at || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        let contentHtml = item.content || '';
        let embedHtml = '';
        
        if (item.is_file) {
            const isPdf = item.file_name.toLowerCase().endsWith('.pdf');
            const sizeMb = (item.size_bytes / (1024*1024)).toFixed(1);
            contentHtml = '';
            embedHtml = `
                <div class="mt-2 bg-gray-800/60 border border-gray-700 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-2/3 shadow-sm">
                    <div class="${isPdf ? 'text-red-400' : 'text-indigo-400'} text-3xl"><i class="fa-solid ${isPdf ? 'fa-file-pdf' : 'fa-file-image'}"></i></div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-semibold text-white truncate searchable-text">${item.file_name}</h4>
                        <p class="text-xs text-gray-500">${sizeMb} MB Document</p>
                    </div>
                    <a href="${item.file_url}" target="_blank" download class="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded transition mt-2 sm:mt-0 shadow-sm shrink-0 flex items-center gap-2">
                        <i class="fa-solid fa-download"></i> Open
                    </a>
                </div>
            `;
        }
        else if (contentHtml.startsWith('[SANDBOX:')) {
            const lang = contentHtml.replace('[SANDBOX:', '').replace(']', '');
            let url = '';
            let title = '';
            let newTabUrl = '';

            if(lang === 'c') { url = 'https://onecompiler.com/embed/c?hideLanguageSelection=true&hideTitle=true&theme=dark'; title = 'C (GCC)'; newTabUrl = 'https://onecompiler.com/c'; }
            else if(lang === 'cpp') { url = 'https://onecompiler.com/embed/cpp?hideLanguageSelection=true&hideTitle=true&theme=dark'; title = 'C++ (G++)'; newTabUrl = 'https://onecompiler.com/cpp'; }
            else if(lang === 'python') { url = 'https://onecompiler.com/embed/python?hideLanguageSelection=true&hideTitle=true&theme=dark'; title = 'Python 3'; newTabUrl = 'https://onecompiler.com/python'; }
            else if(lang === 'js') { url = 'https://stackblitz.com/edit/js?embed=1&file=index.js'; title = 'Vanilla JS'; newTabUrl = 'https://stackblitz.com/edit/js'; }
            else if(lang === 'react') { url = 'https://stackblitz.com/edit/react?embed=1&file=src/App.js'; title = 'React.js'; newTabUrl = 'https://stackblitz.com/edit/react'; }

            contentHtml = `<p class="text-indigo-400 font-medium text-sm mt-1 searchable-text"><i class="fa-solid fa-terminal mr-1"></i> Invoked a ${title} Code Editor Environment.</p>`;
            embedHtml = `
                <div class="mt-3 bg-darker border border-gray-700/50 rounded-lg overflow-hidden w-full max-w-3xl shadow-lg relative" style="height:450px;">
                    <!-- Header Control -->
                    <div class="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700 absolute top-0 left-0 right-0 z-10">
                        <span class="text-xs font-semibold text-gray-300 tracking-wider flex items-center"><i class="fa-solid fa-code text-indigo-400 mr-2 text-base"></i> ${title} Terminal Sandbox</span>
                        <a href="${newTabUrl}" target="_blank" class="text-xs text-white hover:text-white transition flex items-center bg-primary px-3 py-1.5 rounded shadow-md hover:bg-indigo-500">
                            <i class="fa-solid fa-arrow-up-right-from-square mr-1.5"></i> Take Control
                        </a>
                    </div>
                    <!-- Inline IDE Frame -->
                    <iframe src="${url}" width="100%" height="100%" style="border:0;" class="w-full absolute inset-0 pt-10 pb-0 bg-darker"></iframe>
                </div>
            `;
        } else {
            contentHtml = `<p class="text-gray-300 mt-1 leading-relaxed text-sm md:text-base searchable-text whitespace-pre-wrap">${contentHtml}</p>`;
        }

        return `
            <div class="flex items-start gap-4 hover:bg-gray-800/30 p-2 rounded-lg transition -mx-2 message-item animate-fade-in mb-2">
                <img src="${pfps}" class="w-10 h-10 rounded-full bg-gray-700 border border-gray-600 shrink-0" alt="Avatar">
                <div class="w-full min-w-0 pr-4">
                    <div class="flex items-baseline gap-2">
                        <span class="font-bold cursor-pointer hover:underline ${isMe ? 'text-primary' : 'text-indigo-300'}">${email.split('@')[0]}</span>
                        <span class="text-xs text-gray-500">${time}</span>
                    </div>
                    ${contentHtml}
                    ${embedHtml}
                </div>
            </div>
        `;
    }


    async function loadHistory(channelId) {
        chatContainer.innerHTML = '<div class="text-sm text-gray-500 text-center py-4"><i class="fa-solid fa-circle-notch fa-spin mr-2 text-primary"></i> Syncing Messages & Files...</div>';
        try {
            const res = await fetch(`/api/history/${channelId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch history");
            const history = await res.json();
            
            chatContainer.innerHTML = `
                <div class="flex items-start gap-4 hover:bg-gray-800/30 p-2 rounded-lg transition -mx-2 mt-auto mb-4">
                    <div class="w-10 h-10 rounded-full bg-indigo-500 shrink-0 flex items-center justify-center text-white">
                        <i class="fa-solid fa-robot"></i>
                    </div>
                    <div>
                        <div class="flex items-baseline gap-2">
                            <span class="font-bold text-indigo-400">System</span>
                        </div>
                        <p class="text-gray-300 mt-1">Welcome to the beginning of the <strong class="text-white">#${currentChannelName}</strong> timeline!</p>
                    </div>
                </div>
            `;

            if (history.length === 0) return;

            history.forEach(item => {
                chatContainer.insertAdjacentHTML('beforeend', renderMessageItem(item));
            });
            chatContainer.scrollTop = chatContainer.scrollHeight;
        } catch (err) {
            console.error(err);
            chatContainer.innerHTML = '<div class="text-center text-red-400 py-4">Error loading channel history.</div>';
        }
    }

    async function loadChannels() {
        try {
            const res = await fetch('/api/channels', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            publicList.innerHTML = '';
            privateList.innerHTML = '';

            if(data.public) data.public.forEach(c => publicList.insertAdjacentHTML('beforeend', createChannelBtn(c)));
            if(data.private) data.private.forEach(c => privateList.insertAdjacentHTML('beforeend', createChannelBtn(c)));

            attachSidebarEvents();

            if (!currentChannel && data.public && data.public.length > 0) {
                const firstBtn = document.querySelector(`button[data-id="${data.public[0].id}"]`);
                if (firstBtn) firstBtn.click();
            }
        } catch (err) {
            console.error("Failed to load channel structures", err);
        }
    }

    function createChannelBtn(c) {
        const icon = c.type === 'public' ? 'fa-hashtag' : 'fa-lock';
        const color = c.type === 'public' ? 'text-primary' : 'text-gray-500 group-hover:text-gray-300';
        
        const isOwner = userData.id === c.created_by;
        const deleteBtn = isOwner ? `<button data-del="${c.id}" class="delete-channel-btn text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition px-2 shrink-0"><i class="fa-solid fa-trash-can"></i></button>` : '';

        return `
            <li>
                <div class="flex items-center group w-full text-left rounded-md hover:bg-gray-700/50 transition pr-2">
                    <button data-id="${c.id}" data-name="${c.name}" data-type="${c.type}" class="channel-btn flex-1 px-3 py-2 text-gray-400 hover:text-white flex items-center min-w-0">
                        <i class="fa-solid ${icon} ${color} mr-2 text-sm w-4 shrink-0"></i>
                        <span class="truncate font-medium">${c.name}</span>
                    </button>
                    ${deleteBtn}
                </div>
            </li>`;
    }

    function attachSidebarEvents() {
        document.querySelectorAll('.delete-channel-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm("Are you sure you want to permanently delete this Hub? All messages, files, and members will be deeply destroyed.")) return;
                try {
                    const id = btn.dataset.del;
                    const res = await fetch(`/api/channels/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) {
                        const err = await res.json().catch(()=>({}));
                        throw new Error(err.error || "Failed to delete.");
                    }
                    
                    if (currentChannel === id) {
                         currentChannel = null;
                         currentChannelName = null;
                         document.getElementById('chat-messages').innerHTML = '';
                         document.querySelector('header h1').textContent = 'Select a Hub';
                         const inviteBtn = document.getElementById('header-invite-btn');
                         if(inviteBtn) inviteBtn.classList.add('hidden');
                    }
                    await loadChannels();
                } catch(err) {
                    alert(err.message);
                }
            });
        });

        document.querySelectorAll('.channel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.active-channel').forEach(el => el.classList.remove('active-channel', 'bg-gray-700/50', 'border-l-2', 'border-primary'));
                btn.classList.add('active-channel', 'bg-gray-700/50');
                
                const id = btn.dataset.id;
                const name = btn.dataset.name;
                const type = btn.dataset.type;
                
                currentChannel = id;
                currentChannelName = name;
                
                const inviteBtn = document.getElementById('header-invite-btn');
                const iconElem = document.getElementById('header-icon');
                
                if (type === 'private') {
                     inviteBtn.classList.remove('hidden');
                     iconElem.innerHTML = '<i class="fa-solid fa-lock text-lg text-indigo-400"></i>';
                } else {
                     inviteBtn.classList.add('hidden');
                     iconElem.textContent = '#';
                }

                document.querySelector('header h1').textContent = name;
                messageInput.placeholder = `Message #${name}`;
                socket.emit('join_channel', id);
                
                loadHistory(id);
            });
        });
    }

    // Modal Create Mechanics (Phase 5)
    const modal = document.getElementById('create-hub-modal');
    const typeSelect = document.getElementById('hub-type');
    const form = document.getElementById('create-hub-form');

    document.querySelectorAll('.create-hub-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.classList.remove('hidden');
            typeSelect.value = btn.dataset.type;
        });
    });

    document.getElementById('cancel-hub').addEventListener('click', () => {
        modal.classList.add('hidden');
        form.reset();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('hub-name').value;
        const type = typeSelect.value;
        try {
            const res = await fetch('/api/channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name, type })
            });
            if (!res.ok) throw new Error("Failed to create pod");
            await loadChannels();
            modal.classList.add('hidden');
            form.reset();
        } catch (err) {
            alert(err.message);
        }
    });

    // Invitation Mechanics (Phase 6)
    const inviteModal = document.getElementById('invite-modal');
    const inviteForm = document.getElementById('invite-form');
    
    const headerBtn = document.getElementById('header-invite-btn');
    if(headerBtn) {
        headerBtn.addEventListener('click', () => {
            inviteModal.classList.remove('hidden');
        });
    }

    document.getElementById('cancel-invite').addEventListener('click', () => {
        inviteModal.classList.add('hidden');
        inviteForm.reset();
    });

    inviteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('invite-email').value;
        try {
            const res = await fetch('/api/channels/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ channel_id: currentChannel, email })
            });
            if (!res.ok) throw new Error("Invitation failed.");
            alert("Invite successfully dispatched!");
            inviteModal.classList.add('hidden');
            inviteForm.reset();
        } catch (err) {
            alert(err.message);
        }
    });

    // Sandbox Generation Mechanics (Phase 10)
    const sandboxModal = document.getElementById('sandbox-modal');
    const sandboxBtn = document.getElementById('sandbox-trigger-btn');
    const sandboxForm = document.getElementById('sandbox-form');

    if(sandboxBtn) {
        sandboxBtn.addEventListener('click', () => {
            if(!currentChannel) return alert("Select a channel first!");
            sandboxModal.classList.remove('hidden');
        });
    }
    
    document.getElementById('cancel-sandbox').addEventListener('click', () => {
         sandboxModal.classList.add('hidden');
    });

    sandboxForm.addEventListener('submit', (e) => {
         e.preventDefault();
         const lang = document.getElementById('sandbox-language').value;
         const specialCommand = `[SANDBOX:${lang}]`;
         
         const msgData = {
             channel_id: currentChannel,
             user_id: userData.id,
             user_email: userData.email,
             content: specialCommand,
             timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
         };
         socket.emit('send_message', msgData);
         sandboxModal.classList.add('hidden');
    });


    // Realtime message processing
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const content = messageInput.value.trim();
        if (!content || !currentChannel) return;

        const msgData = {
            channel_id: currentChannel,
            user_id: userData.id,
            user_email: userData.email,
            content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        socket.emit('send_message', msgData);
        messageInput.value = '';
    });

    socket.on('receive_message', (msg) => {
        if (msg.channel_id !== currentChannel) return;
        chatContainer.insertAdjacentHTML('beforeend', renderMessageItem(msg));
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });

    loadChannels();
});
