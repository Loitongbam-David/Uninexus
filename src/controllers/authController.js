const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');

// Helper to isolate Auth Operations from global Supabase instance
const getAuthClient = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

const register = async (req, res) => {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
        return res.status(400).json({ error: "Email, username, and password are required" });
    }

    // 🔥 Walled Garden Logic
    if (!email.toLowerCase().endsWith('@cuchd.in')) {
        return res.status(403).json({ error: "Access Denied. Only @cuchd.in emails are permitted to join UniNexus." });
    }

    // 1. Sign up with an isolated Local Auth Client to prevent global mutation
    const authClient = getAuthClient();
    const { data, error } = await authClient.auth.signUp({
        email,
        password,
    });

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    // 2. Automatically create the matching user profile using the powerful global Service Role client
    if (data.user) {
        const { error: profileError } = await supabase
            .from('users')
            .upsert({ 
                id: data.user.id, 
                email: email.toLowerCase(), 
                username: username 
            });
        
        if (profileError) {
             console.error("Profile creation error", profileError);
        }
    }

    return res.status(201).json({ message: "Registration successful. Please login.", user: data.user });
};

const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    if (!email.toLowerCase().endsWith('@cuchd.in')) {
        return res.status(403).json({ error: "Access Denied. Only @cuchd.in emails are permitted." });
    }

    // Isolate login operation to not poison global headers
    const authClient = getAuthClient();
    const { data, error } = await authClient.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return res.status(401).json({ error: error.message });
    }

    return res.status(200).json({ message: "Login successful", session: data.session });
};

module.exports = { register, login };
