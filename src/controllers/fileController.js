const supabase = require('../config/supabase');

const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file provided" });
        }
        
        const { channel_id, paper_code } = req.body;
        
        if (!channel_id) {
            return res.status(400).json({ error: "channel_id is required to associate this file." });
        }

        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
        const filePath = `${channel_id}/${fileName}`;

        // 1. Upload to Supabase Storage Bucket 'uninexus_files'
        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('uninexus_files')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (uploadError) {
            console.error("Storage Error:", uploadError);
            return res.status(500).json({ error: "Storage upload failed: " + uploadError.message });
        }

        // 2. Get the public accessible URL
        const { data: publicUrlData } = supabase
            .storage
            .from('uninexus_files')
            .getPublicUrl(filePath);

        // 3. Save File Metadata to Database
        const { data: dbData, error: dbError } = await supabase
            .from('files')
            .insert([{
                channel_id,
                user_id: req.user.id,
                file_name: file.originalname,
                file_url: publicUrlData.publicUrl,
                file_type: file.mimetype,
                paper_code: paper_code || null,
                size_bytes: file.size
            }])
            .select('*')
            .single();

        if (dbError) {
             console.error("DB Error:", dbError);
             return res.status(500).json({ error: "Database save failed: " + dbError.message });
        }

        return res.status(201).json({ message: "File uploaded successfully", file: dbData });
    } catch (err) {
        console.error("Unexpected error in uploadFile:", err);
        return res.status(500).json({ error: "Internal Server Error during upload." });
    }
};

const getFilesForChannel = async (req, res) => {
    try {
        const { channel_id } = req.params;
        if (!channel_id) return res.status(400).json({ error: "channel_id is required" });

        // Security: Verify user can view this channel
        const { data: channel } = await supabase.from('channels').select('type').eq('id', channel_id).single();
        if (channel && channel.type === 'private') {
             const { data: member } = await supabase.from('private_pod_members').select('*').eq('channel_id', channel_id).eq('user_id', req.user.id).single();
             if (!member) return res.status(403).json({ error: "Access denied to this private pod's vault." });
        }

        const { data: files, error } = await supabase
            .from('files')
            .select(`
                id, file_name, file_url, file_type, size_bytes, created_at,
                users ( username )
            `)
            .eq('channel_id', channel_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        return res.status(200).json(files);
    } catch (err) {
        console.error("File Fetch Error:", err);
        return res.status(500).json({ error: "Internal server error fetching vault" });
    }
};

module.exports = { uploadFile, getFilesForChannel };
