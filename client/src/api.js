async function req(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Нет связи с сервером');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

export const api = {
  categories: () => req('GET', '/api/categories'),
  products: () => req('GET', '/api/products'),
  looks: (room) => req('GET', `/api/looks?room=${room}`),
  saveLook: (room_id, product_ids, name) => req('POST', '/api/looks', { room_id, product_ids, name }),
  deleteLook: (id) => req('DELETE', `/api/looks/${id}`),
  createRequest: (room_id, items) => req('POST', '/api/requests', { room_id, items }),
  setRequest: (id, status) => req('PATCH', `/api/requests/${id}`, { status }),
  callAssist: (room_id) => req('POST', '/api/assist', { room_id }),
  setAssist: (id, status) => req('PATCH', `/api/assist/${id}`, { status }),
  queue: () => req('GET', '/api/staff/queue'),
};

export const formatPrice = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
