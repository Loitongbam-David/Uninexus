const supabase = require('../config/supabase');

const createChannel = async (req, res) => {
    try {
        const { name, type } = req.body;
        
        if (!name) return res.status(400).json({ error: "Channel name is required" });
        if (!['public', 'private'].includes(type)) return res.status(400).json({ error: "Type must be public or private" });

        // Insert new channel
        const { data: channelData, error: channelError } = await supabase
            .from('channels')
            .insert([{ name, type, created_by: req.user.id }])
            .select()
            .single();

        if (channelError) {
             console.error("Channel Create Error", channelError);
             return res.status(500).json({ error: channelError.message });
        }

        // Add creator permission for private pods immediately
        if (type === 'private') {
            const { error: memberError } = await supabase
                .from('private_pod_members')
                .insert([{ channel_id: channelData.id, user_id: req.user.id }]);
            
            if (memberError) {
                console.error("Private Membership Error", memberError);
                 return res.status(500).json({ error: memberError.message });
            }
        }

        return res.status(201).json({ message: "Channel Created", channel: channelData });
    } catch (err) {
        console.error("Exception in createChannel", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const getChannels = async (req, res) => {
    try {
        // Fetch public channels globally
        const { data: publicChannels, error: publicError } = await supabase
            .from('channels')
            .select('*')
            .eq('type', 'public')
            .order('created_at', { ascending: true });
        
        if (publicError) throw publicError;

        // Fetch user's enrolled private channels
        const { data: memberships, error: memberError } = await supabase
            .from('private_pod_members')
            .select('channel_id')
            .eq('user_id', req.user.id);

        if (memberError) throw memberError;

        let privateChannels = [];
        if (memberships.length > 0) {
            const channelIds = memberships.map(m => m.channel_id);
            const { data: privData, error: privError } = await supabase
                .from('channels')
                .select('*')
                .in('id', channelIds)
                .order('created_at', { ascending: true });
            
            if (privError) throw privError;
            privateChannels = privData;
        }

        return res.status(200).json({ public: publicChannels || [], private: privateChannels || [] });
    } catch (err) {
        console.error("Exception in getChannels", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const inviteToChannel = async (req, res) => {
    try {
        const { channel_id, email } = req.body;
        if (!channel_id || !email) return res.status(400).json({ error: "Channel and email required" });

        // 1. Verify channel is private
        const { data: channelData, error: channelError } = await supabase
            .from('channels')
            .select('type, created_by')
            .eq('id', channel_id)
            .single();
            
        if (channelError || !channelData) return res.status(404).json({ error: "Channel not found" });
        if (channelData.type !== 'private') return res.status(400).json({ error: "You cannot invite peers to a Public Hub, they can join instantly by default." });

        // 2. Enforce only existing members can invite
        const { data: memberCheck } = await supabase
            .from('private_pod_members')
            .select('*')
            .eq('channel_id', channel_id)
            .eq('user_id', req.user.id)
            .single();
            
        if (!memberCheck) return res.status(403).json({ error: "You must be a member of this private pod to invite others." });

        // 3. Look up target user UUID
        const { data: targetUser, error: targetError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (targetError || !targetUser) return res.status(404).json({ error: "Scholar with this specific email does not exist." });

        // 4. Register them globally to the Pod
        const { error: inviteError } = await supabase
            .from('private_pod_members')
            .insert([{ channel_id: channel_id, user_id: targetUser.id }]);

        if (inviteError) {
             if (inviteError.code === '23505') return res.status(400).json({ error: "User is already in this pod!" });
             throw inviteError;
        }

        return res.status(200).json({ message: "Successfully invited to the pod!" });
    } catch (err) {
        console.error("Exception in inviteToChannel", err);
        return res.status(500).json({ error: "Server error during invitation." });
    }
};

const deleteChannel = async (req, res) => {
    try {
        const { channel_id } = req.params;
        if (!channel_id) return res.status(400).json({ error: "Missing channel id" });
        
        const { data: channel, error: fetchErr } = await supabase
            .from('channels')
            .select('created_by')
            .eq('id', channel_id)
            .single();
            
        if (fetchErr || !channel) return res.status(404).json({ error: "Channel not found" });
        if (channel.created_by !== req.user.id) return res.status(403).json({ error: "Unauthorized. Only the creator can delete this Hub." });
        
        const { error: delErr } = await supabase
            .from('channels')
            .delete()
            .eq('id', channel_id);
            
        if (delErr) throw delErr;
        
        return res.status(200).json({ message: "Channel successfully deleted." });
    } catch(err) {
        console.error("Delete Channel Error:", err);
        res.status(500).json({ error: "Failed to delete channel" });
    }
};

module.exports = { createChannel, getChannels, inviteToChannel, deleteChannel };
