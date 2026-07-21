"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { apiFetch, problemMessage, type CategoryDetailDto, type CategoryDto, type CategoryType } from "@/lib/api-client";
import { categoryTypeLabels, commonLabels } from "@/lib/labels";
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
    try {
      setCategories(await apiFetch<CategoryDto[]>(`/api/categories?type=${type}&includeArchived=${includeArchived}`, accessToken, {}, refreshSession));
      setError(null);
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { if (accessToken) load(); }, [accessToken, type, includeArchived]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const body = JSON.stringify({ name: form.name, type: form.type, parentCategoryId: form.parentCategoryId || null, icon: form.icon || null });
      if (editingId) await apiFetch<CategoryDetailDto>(`/api/categories/${editingId}`, accessToken, { method: "PUT", body }, refreshSession);
      else await apiFetch<CategoryDetailDto>("/api/categories", accessToken, { method: "POST", body }, refreshSession);
      setForm({ ...emptyForm, type });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  async function archive(id: string) { await apiFetch<void>(`/api/categories/${id}`, accessToken, { method: "DELETE" }, refreshSession); await load(); }
  async function restore(id: string) { await apiFetch<CategoryDetailDto>(`/api/categories/${id}/restore`, accessToken, { method: "POST" }, refreshSession); await load(); }
  async function move(parentCategoryId: string | null, ids: string[], index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];
    await apiFetch<void>("/api/categories/reorder", accessToken, { method: "PUT", body: JSON.stringify({ parentCategoryId, categoryIds: next }) }, refreshSession);
    await load();
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        title="分類"
        description="收入與支出分類支援父子層級，交易只會儲存分類 id，不改變 API enum。"
        actions={<div className="flex flex-wrap gap-2"><select className="ui-input w-auto" value={type} onChange={(e) => { const next = e.target.value as CategoryType; setType(next); setForm({ ...emptyForm, type: next }); }}><option value="Expense">支出分類</option><option value="Income">收入分類</option></select><label className="flex min-h-10 items-center gap-2 rounded-ui border bg-surface px-3 text-sm"><input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} /> {commonLabels.showArchived}</label></div>}
      />
      {error && <ErrorState message={error} />}
      <Card>
        <CardTitle title={editingId ? "編輯分類" : "新增分類"} description="父分類留空時會建立第一層分類。" />
        <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-5">
          <label className="ui-label">名稱<input className="ui-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="ui-label">圖示文字<input className="ui-input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></label>
          <label className="ui-label">類型<select className="ui-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CategoryType, parentCategoryId: "" })}><option value="Expense">支出</option><option value="Income">收入</option></select></label>
          <label className="ui-label">父分類<select className="ui-input" value={form.parentCategoryId} onChange={(e) => setForm({ ...form, parentCategoryId: e.target.value })}><option value="">無父分類</option>{parents.filter((parent) => parent.type === form.type).map((parent) => <option key={parent.id} value={parent.id}>{parent.name} 的子分類</option>)}</select></label>
          <div className="flex items-end"><Button type="submit" className="w-full">{editingId ? commonLabels.update : commonLabels.create}</Button></div>
        </form>
      </Card>
      {isLoading ? <LoadingState /> : categories.length === 0 ? <EmptyState title="尚未建立分類" description="建立分類後即可在新增交易時選用。" /> : (
        <div className="grid gap-4">
          {categories.map((category, parentIndex) => {
            const parentIds = categories.filter((item) => !item.isArchived).map((item) => item.id);
            const childIds = category.children.filter((item) => !item.isArchived).map((item) => item.id);
            return <Card key={category.id}><CategoryRow category={category} kind="父分類" onEdit={() => { setEditingId(category.id); setForm({ name: category.name, type: category.type, parentCategoryId: "", icon: category.icon ?? "" }); }} onArchive={() => archive(category.id)} onRestore={() => restore(category.id)} onUp={() => move(null, parentIds, parentIndex, -1)} onDown={() => move(null, parentIds, parentIndex, 1)} />{category.children.length > 0 && <div className="mt-3 grid gap-2 border-l pl-4">{category.children.map((child, childIndex) => <CategoryRow key={child.id} category={child} kind="子分類" onEdit={() => { setEditingId(child.id); setForm({ name: child.name, type: child.type, parentCategoryId: category.id, icon: child.icon ?? "" }); }} onArchive={() => archive(child.id)} onRestore={() => restore(child.id)} onUp={() => move(category.id, childIds, childIndex, -1)} onDown={() => move(category.id, childIds, childIndex, 1)} />)}</div>}</Card>;
          })}
        </div>
      )}
    </section>
  );
}

function CategoryRow({ category, kind, onEdit, onArchive, onRestore, onUp, onDown }: { category: CategoryDto["children"][number] | CategoryDto; kind: string; onEdit: () => void; onArchive: () => void; onRestore: () => void; onUp: () => void; onDown: () => void }) {
  return <div className="flex flex-col gap-3 rounded-ui border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{category.icon ? `${category.icon} ` : ""}{category.name}</h2><Badge tone={category.isArchived ? "neutral" : "success"}>{category.isArchived ? commonLabels.archived : commonLabels.active}</Badge></div><p className="mt-1 text-sm text-muted">{kind} / {categoryTypeLabels[category.type]} / 排序 {category.displayOrder}</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={onUp} disabled={category.isArchived}>上移</Button><Button type="button" variant="outline" size="sm" onClick={onDown} disabled={category.isArchived}>下移</Button><Button type="button" variant="outline" size="sm" onClick={onEdit}>{commonLabels.edit}</Button>{category.isArchived ? <Button type="button" variant="outline" size="sm" onClick={onRestore}>{commonLabels.restore}</Button> : <Button type="button" variant="outline" size="sm" onClick={onArchive}>{commonLabels.archive}</Button>}</div></div>;
}
