"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch, problemMessage, type CategoryDetailDto, type CategoryDto, type CategoryType } from "@/lib/api-client";
import { useAuth } from "../../auth-context";

const emptyForm = { name: "", type: "Expense" as CategoryType, parentCategoryId: "", icon: "" };

export default function CategoriesPage() {
  const { accessToken, refreshSession } = useAuth();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [type, setType] = useState<CategoryType>("Expense");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const parents = useMemo(() => categories.filter((category) => !category.isArchived), [categories]);

  async function load() {
    setIsLoading(true);
    try { setCategories(await apiFetch<CategoryDto[]>(`/api/categories?type=${type}&includeArchived=${includeArchived}`, accessToken, {}, refreshSession)); setError(null); }
    catch (err) { setError(problemMessage(err)); }
    finally { setIsLoading(false); }
  }
  useEffect(() => { if (accessToken) load(); }, [accessToken, type, includeArchived]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const body = JSON.stringify({ name: form.name, type: form.type, parentCategoryId: form.parentCategoryId || null, icon: form.icon || null });
      if (editingId) await apiFetch<CategoryDetailDto>(`/api/categories/${editingId}`, accessToken, { method: "PUT", body }, refreshSession);
      else await apiFetch<CategoryDetailDto>("/api/categories", accessToken, { method: "POST", body }, refreshSession);
      setForm({ ...emptyForm, type }); setEditingId(null); await load();
    } catch (err) { setError(problemMessage(err)); }
  }
  async function archive(id: string) { await apiFetch<void>(`/api/categories/${id}`, accessToken, { method: "DELETE" }, refreshSession); await load(); }
  async function restore(id: string) { await apiFetch<CategoryDetailDto>(`/api/categories/${id}/restore`, accessToken, { method: "POST" }, refreshSession); await load(); }
  async function move(parentCategoryId: string | null, ids: string[], index: number, delta: number) { const target = index + delta; if (target < 0 || target >= ids.length) return; const next = [...ids]; [next[index], next[target]] = [next[target], next[index]]; await apiFetch<void>("/api/categories/reorder", accessToken, { method: "PUT", body: JSON.stringify({ parentCategoryId, categoryIds: next }) }, refreshSession); await load(); }

  return <section className="grid gap-6"><header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-semibold">Categories</h1><p className="text-stone-600">Manage income and expense parent and child categories.</p></div><div className="flex flex-wrap gap-3"><select className="rounded border border-stone-300 px-3 py-2" value={type} onChange={(e) => { const next = e.target.value as CategoryType; setType(next); setForm({ ...emptyForm, type: next }); }}><option>Expense</option><option>Income</option></select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} /> Show archived</label></div></header>{error && <p className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<form onSubmit={submit} className="grid gap-3 rounded border border-stone-300 bg-white p-4 sm:grid-cols-5"><input className="rounded border border-stone-300 px-3 py-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input className="rounded border border-stone-300 px-3 py-2" placeholder="Icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /><select className="rounded border border-stone-300 px-3 py-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CategoryType, parentCategoryId: "" })}><option>Expense</option><option>Income</option></select><select className="rounded border border-stone-300 px-3 py-2" value={form.parentCategoryId} onChange={(e) => setForm({ ...form, parentCategoryId: e.target.value })}><option value="">Parent category</option>{parents.filter((parent) => parent.type === form.type).map((parent) => <option key={parent.id} value={parent.id}>Child of {parent.name}</option>)}</select><button className="rounded bg-stone-950 px-4 py-2 text-white">{editingId ? "Update" : "Create"}</button></form>{isLoading ? <p>Loading...</p> : categories.length === 0 ? <p className="rounded border border-stone-300 bg-white p-5 text-stone-600">No categories yet.</p> : <div className="grid gap-4">{categories.map((category, parentIndex) => { const parentIds = categories.filter((item) => !item.isArchived).map((item) => item.id); const childIds = category.children.filter((item) => !item.isArchived).map((item) => item.id); return <article key={category.id} className="rounded border border-stone-300 bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">{category.icon ? `${category.icon} ` : ""}{category.name}</h2><p className="text-sm text-stone-600">Parent 蝜?{category.type} 蝜?order {category.displayOrder} 蝜?{category.isArchived ? "Archived" : "Active"}</p></div><Actions onEdit={() => { setEditingId(category.id); setForm({ name: category.name, type: category.type, parentCategoryId: "", icon: category.icon ?? "" }); }} onArchive={() => archive(category.id)} onRestore={() => restore(category.id)} isArchived={category.isArchived} onUp={() => move(null, parentIds, parentIndex, -1)} onDown={() => move(null, parentIds, parentIndex, 1)} /></div>{category.children.length > 0 && <div className="mt-3 grid gap-2 border-l border-stone-300 pl-4">{category.children.map((child, childIndex) => <div key={child.id} className="flex flex-col gap-2 rounded border border-stone-200 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{child.icon ? `${child.icon} ` : ""}{child.name}</p><p className="text-sm text-stone-600">Child 蝜?{child.type} 蝜?{child.isArchived ? "Archived" : "Active"}</p></div><Actions onEdit={() => { setEditingId(child.id); setForm({ name: child.name, type: child.type, parentCategoryId: category.id, icon: child.icon ?? "" }); }} onArchive={() => archive(child.id)} onRestore={() => restore(child.id)} isArchived={child.isArchived} onUp={() => move(category.id, childIds, childIndex, -1)} onDown={() => move(category.id, childIds, childIndex, 1)} /></div>)}</div>}</article>; })}</div>}</section>;
}

function Actions({ isArchived, onEdit, onArchive, onRestore, onUp, onDown }: { isArchived: boolean; onEdit: () => void; onArchive: () => void; onRestore: () => void; onUp: () => void; onDown: () => void }) {
  return <div className="flex flex-wrap gap-2"><button className="rounded border px-3 py-1 text-sm" onClick={onUp} disabled={isArchived}>Up</button><button className="rounded border px-3 py-1 text-sm" onClick={onDown} disabled={isArchived}>Down</button><button className="rounded border px-3 py-1 text-sm" onClick={onEdit}>Edit</button>{isArchived ? <button className="rounded border px-3 py-1 text-sm" onClick={onRestore}>Restore</button> : <button className="rounded border px-3 py-1 text-sm" onClick={onArchive}>Archive</button>}</div>;
}
