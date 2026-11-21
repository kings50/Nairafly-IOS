import { createClient } from '@supabase/supabase-js';

const TASKS = {
  X_follow: {
    id: 'ig_follow',
    title: 'Follow our X page',
    rewardKobo: 1500, // ₦15
    url: 'https://X.com/@godswilleva'
  },
  tiktok_follow: {
    id: 'tiktok_follow',
    title: 'Follow our TikTok page',
    rewardKobo: 10000, // ₦100
    url: 'https://tiktok.com/@itzskiv0id'
  },
  quick_survey: {
    id: 'quick_survey',
    title: 'Complete quick user survey',
    rewardKobo: 25000, // ₦250
    url: 'https://your-survey-link.example'
  }
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
  const task = TASKS[task_id];

  if (!task) {
    return res.status(400).json({ status: false, message: 'Invalid task.' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase.rpc('claim_task_reward', {
    p_email: email,
    p_task_id: task.id,
    p_reward_kobo: task.rewardKobo,
    p_proof_note: proof_note ? String(proof_note).slice(0, 200) : null
  });

  if (error) {
    return res.status(500).json({ status: false, message: error.message });
  }

  return res.status(data?.status ? 200 : 400).json(data);
}
