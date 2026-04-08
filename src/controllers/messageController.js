const supabase = require('../config/supabase');

const getMessagesSync = async (req, res) => {
    try {
        const { channel_id } = req.params;
        if (!channel_id) return res.status(400).json({ error: "channel_id is required" });

        // Enforce Privacy
        const { data: channel } = await supabase.from('channels').select('type').eq('id', channel_id).single();
        if (channel && channel.type === 'private') {
             const { data: member } = await supabase.from('private_pod_members').select('*').eq('channel_id', channel_id).eq('user_id', req.user.id).single();
             if (!member) return res.status(403).json({ error: "Access denied" });
        }

        // Fetch standard Chat Messages
        const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select(`
                id, content, created_at, user_id, 
                users ( email, username )
            `)
            .eq('channel_id', channel_id)
            .order('created_at', { ascending: true });

        if (msgError) throw msgError;

        // Fetch Vault Files
        const { data: files, error: fileError } = await supabase
            .from('files')
            .select(`
                id, file_name, file_url, file_type, size_bytes, created_at, user_id,
                users ( email, username )
            `)
            .eq('channel_id', channel_id)
            .order('created_at', { ascending: true });

        if (fileError) throw fileError;

        // Unified Stream Architecture: Combine, Map type, and chronologically sort
        const history = [
            ...messages.map(m => ({ ...m, is_file: false })),
            ...files.map(f => ({ ...f, is_file: true }))
        ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        return res.status(200).json(history);
    } catch(err) {
        console.error("History Syncing Error:", err);
        return res.status(500).json({ error: "Failed to fetch synchronized history stream" });
    }
};

module.exports = { getMessagesSync };
