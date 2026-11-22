import { createClient } from '@supabase/supabase-js';

const TASKS = {
  x_follow: {
    id: 'x_follow',
    title: 'Follow our X page',
    rewardKobo: 30000, // ₦3,000
    url: 'https://x.com/godswilleva'
  },
  tiktok_follow: {
    id: 'tiktok_follow',
    title: 'Follow our TikTok page',
    rewardKobo: 3000000, // ₦30,000
    url: 'https://tiktok.com/@itzskiv0id'
  },
 whatsapp_follow: {
    id: 'whatsapp_follow',
    title: 'Follow our Whatsapp group',
    rewardKobo: 3000000, // ₦30,000
    url: 'https://chat.whatsapp.com/EVkbFxFHXG0JgLhohIgysE'
  },
  ig_follow: {
    id: 'ig_follow',
    title: 'Follow our instagram page',
    rewardKobo: 30000, // ₦3,000
    url: ''
  },
  linkedin_follow: {
    id: 'linkedin_follow',
    title: 'Follow our Linkedin page',
    rewardKobo: 3000000, // ₦30,000
    url: 'www.linkedin.com/in/juliana-iroka-aca-c-8469b12ab'
  },
 whatsapp_follow: {
    id: 'follow our channel',
    title: 'Follow our Whatsapp group',
    rewardKobo: 25000, // ₦2,500
    url: 'https://whatsapp.com/channel/0029Vb9C3gS6hENmkXMDTG2K'
  },
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const list = Object.values(TASKS).map(({ id, title, rewardKobo, url }) => ({
      id,
      title,
      reward_ngn: rewardKobo / 100,
      url
    }));
    return res.status(200).json({ status: true, tasks: list });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  const { email, task_id, proof_note } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const normalizedId = task_id === 'ig_follow' || task_id === 'X_follow' ? 'x_follow' : task_id;
  const task = TASKS[normalizedId];

  if (!cleanEmail) {
    return res.status(400).json({ status: false, message: 'Email is required.' });
  }

  if (!task) {
    return res.status(400).json({ status: false, message: 'Invalid task.' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase.rpc('claim_task_reward', {
    p_email: cleanEmail,
    p_task_id: task.id,
    p_reward_kobo: task.rewardKobo,
    p_proof_note: proof_note ? String(proof_note).slice(0, 200) : null
  });

  if (error) {
    return res.status(500).json({ status: false, message: error.message });
  }

  return res.status(data?.status ? 200 : 400).json(data);
}