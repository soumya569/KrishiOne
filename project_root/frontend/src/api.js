const API_BASE_URL = 'http://localhost:5000/api';

export async function detectDisease(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE_URL}/crop-disease`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Detection failed');
  return res.json();
}

export async function health() {
  const res = await fetch(`${API_BASE_URL}/health`);
  return res.json();
}



