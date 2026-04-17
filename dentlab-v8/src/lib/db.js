import { supabase } from './supabase';

export const auth = {
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signUpAdmin: (email, password, name, labName) =>
    supabase.auth.signUp({ email, password, options: { data: { role: 'admin', name, lab_name: labName } } }),
  signOut: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),
  onChange: (cb) => supabase.auth.onAuthStateChange((_e, session) => cb(session)),
  resetPassword: (email) => supabase.auth.resetPasswordForEmail(email),
};

export const labs = {
  mine: () => supabase.from('labs').select('*').single(),
  update: (id, patch) => supabase.from('labs').update(patch).eq('id', id),
};

export const profiles = {
  getById: (id) => supabase.from('profiles').select('*').eq('id', id).single(),
  list: () => supabase.from('profiles').select('*').order('name'),
  update: (id, patch) => supabase.from('profiles').update(patch).eq('id', id),
  delete: (id) => supabase.from('profiles').delete().eq('id', id),
};

export const cases = {
  list: () => supabase.from('cases').select('*').order('created_at', { ascending: false }),
  create: (row) => supabase.from('cases').insert(row).select().single(),
  update: (labId, id, patch) =>
    supabase.from('cases').update({ ...patch, updated_at: new Date().toISOString() })
      .eq('lab_id', labId).eq('id', id),
  delete: (labId, id) => supabase.from('cases').delete().eq('lab_id', labId).eq('id', id),
};

export const stages = { list: () => supabase.from('stages').select('*').order('ord') };

export const types = {
  list: () => supabase.from('prosthesis_types').select('*').order('name'),
  create: (row) => supabase.from('prosthesis_types').insert(row),
  update: (id, patch) => supabase.from('prosthesis_types').update(patch).eq('id', id),
  delete: (id) => supabase.from('prosthesis_types').delete().eq('id', id),
};

export const stock = {
  list: () => supabase.from('stock').select('*').order('name'),
  create: (row) => supabase.from('stock').insert(row),
  update: (id, patch) => supabase.from('stock').update(patch).eq('id', id),
  delete: (id) => supabase.from('stock').delete().eq('id', id),
  addMovement: (row) => supabase.from('stock_movements').insert(row),
};

export const suppliers = {
  list: () => supabase.from('suppliers').select('*, supplier_purchases(*), supplier_payments(*)').order('name'),
  create: (row) => supabase.from('suppliers').insert(row),
  update: (id, patch) => supabase.from('suppliers').update(patch).eq('id', id),
  delete: (id) => supabase.from('suppliers').delete().eq('id', id),
  addPurchase: (row) => supabase.from('supplier_purchases').insert(row),
  addPayment: (row) => supabase.from('supplier_payments').insert(row),
  deletePurchase: (id) => supabase.from('supplier_purchases').delete().eq('id', id),
  deletePayment: (id) => supabase.from('supplier_payments').delete().eq('id', id),
};

export const dentistPayments = {
  list: (dentistId) => dentistId
    ? supabase.from('dentist_payments').select('*').eq('dentist_id', dentistId).order('date', { ascending: false })
    : supabase.from('dentist_payments').select('*').order('date', { ascending: false }),
  create: (row) => supabase.from('dentist_payments').insert(row),
  delete: (id) => supabase.from('dentist_payments').delete().eq('id', id),
};

export const expenses = {
  list: () => supabase.from('expenses').select('*').order('date', { ascending: false }),
  create: (row) => supabase.from('expenses').insert(row),
  update: (id, patch) => supabase.from('expenses').update(patch).eq('id', id),
  delete: (id) => supabase.from('expenses').delete().eq('id', id),
};

export const settingsApi = {
  get: () => supabase.from('lab_settings').select('*').single(),
  update: (labId, patch) => supabase.from('lab_settings').update(patch).eq('lab_id', labId),
};

// NEW — subscriptions (read-only for lab members)
export const subscriptions = {
  mine: () => supabase.from('subscriptions').select('*').single(),
  payments: () => supabase.from('subscription_payments').select('*').order('paid_at', { ascending: false }),
};

// NEW — global dev branding (read-only everywhere)
export const branding = {
  get: () => supabase.from('app_branding').select('*').eq('id', 1).single(),
};

export const storage = {
  upload: async (caseId, file) => {
    const path = `${caseId}/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from('case-files').upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('case-files').getPublicUrl(path);
    return { path: data.path, url: urlData.publicUrl, name: file.name, size: file.size };
  },
  remove: (path) => supabase.storage.from('case-files').remove([path]),
};
