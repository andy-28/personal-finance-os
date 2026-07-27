"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameWindow } from "@/components/ui/game-theme";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { apiFetch, problemMessage, type CategoryDetailDto, type CategoryDto, type CategoryType } from "@/lib/api-client";
import { categoryTypeLabels } from "@/lib/labels";
import { useAuth } from "../../auth-context";

type CategoryFilter = CategoryType | "All" | "Archived";
type CategoryNode = CategoryDto | CategoryDto["children"][number];
type FormState = typeof emptyForm;

const emptyForm = { name: "", type: "Expense" as CategoryType, parentCategoryId: "", icon: "" };

export default function CategoriesPage() {
  const { accessToken, refreshSession } = useAuth();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [filter, setFilter] = useState<CategoryFilter>("Expense");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const nextCategories = await loadCategories(filter, includeArchived || filter === "Archived", accessToken, refreshSession);
      setCategories(nextCategories);
      setError(null);
      if (!selectedId && nextCategories.length > 0) setSelectedId(nextCategories[0].id);
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { if (accessToken) load(); }, [accessToken, filter, includeArchived]);

  const flatCategories = useMemo(() => categories.flatMap((category) => [category, ...category.children]), [categories]);
  const selectedCategory = useMemo(() => flatCategories.find((category) => category.id === selectedId) ?? null, [flatCategories, selectedId]);
  const parentMap = useMemo(() => {
    const map = new Map<string, CategoryDto>();
    categories.forEach((parent) => parent.children.forEach((child) => map.set(child.id, parent)));
    return map;
  }, [categories]);
  const visibleCategories = useMemo(() => {
    if (filter === "Archived") return categories.map((category) => ({ ...category, children: category.children.filter((child) => child.isArchived) })).filter((category) => category.isArchived || category.children.length > 0);
    if (includeArchived) return categories;
    return categories.map((category) => ({ ...category, children: category.children.filter((child) => !child.isArchived) })).filter((category) => !category.isArchived);
  }, [categories, filter, includeArchived]);
  const activeParents = useMemo(() => categories.filter((category) => !category.isArchived && category.type === form.type), [categories, form.type]);

  function startCreate(type: CategoryType = filter === "Income" ? "Income" : "Expense", parentCategoryId = "") {
    setForm({ ...emptyForm, type, parentCategoryId });
    setEditingId(null);
    setSelectedId(null);
    setIsCreating(true);
  }

  function startEdit(category: CategoryNode) {
    const parent = parentMap.get(category.id);
    setForm({ name: category.name, type: category.type, parentCategoryId: parent?.id ?? "", icon: category.icon ?? "" });
    setEditingId(category.id);
    setSelectedId(category.id);
    setIsCreating(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const body = JSON.stringify({ name: form.name, type: form.type, parentCategoryId: form.parentCategoryId || null, icon: form.icon || null });
      const saved = editingId
        ? await apiFetch<CategoryDetailDto>(`/api/categories/${editingId}`, accessToken, { method: "PUT", body }, refreshSession)
        : await apiFetch<CategoryDetailDto>("/api/categories", accessToken, { method: "POST", body }, refreshSession);
      setForm({ ...emptyForm, type: form.type });
      setEditingId(null);
      setIsCreating(false);
      setSelectedId(saved.id);
      await load();
    } catch (err) {
      setError(problemMessage(err));
    }
  }

  async function archive(id: string) {
    await apiFetch<void>(`/api/categories/${id}`, accessToken, { method: "DELETE" }, refreshSession);
    await load();
  }

  async function restore(id: string) {
    await apiFetch<CategoryDetailDto>(`/api/categories/${id}/restore`, accessToken, { method: "POST" }, refreshSession);
    await load();
  }

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
        description="Category Taxonomy"
        actions={<Button type="button" onClick={() => startCreate()}>新增分類</Button>}
      />
      {error && <ErrorState message={error} />}
      <GameWindow title="分類" description="Aether Taxonomy Window">
        <div className="aether-management-window">
          <div className="aether-toolbar">
            {(["Expense", "Income", "All", "Archived"] as CategoryFilter[]).map((nextFilter) => (
              <button key={nextFilter} type="button" className={`aether-filter-tab ${filter === nextFilter ? "aether-filter-tab-active" : ""}`} onClick={() => setFilter(nextFilter)}>
                {filterLabel(nextFilter)}
              </button>
            ))}
            <label className="aether-toolbar-check">
              <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />
              顯示封存項目
            </label>
          </div>
          {isLoading ? <LoadingState label="載入分類..." /> : (
            <div className="aether-master-detail">
              <div className="aether-list-pane" aria-label="分類樹">
                <AetherSectionHeader title="分類樹" meta={`${flatCategories.length} 個節點`} />
                {visibleCategories.length === 0 ? (
                  <EmptyState title="沒有分類" description="建立收入或支出分類，讓交易紀錄更容易追蹤。" />
                ) : visibleCategories.map((category, parentIndex) => {
                  const parentIds = visibleCategories.filter((item) => !item.isArchived).map((item) => item.id);
                  return (
                    <div key={category.id} className="aether-tree-group">
                      <CategoryListRow category={category} selected={selectedId === category.id} onSelect={() => { setSelectedId(category.id); setIsCreating(false); setEditingId(null); }} />
                      {category.children.map((child) => (
                        <CategoryListRow key={child.id} category={child} selected={selectedId === child.id} isChild onSelect={() => { setSelectedId(child.id); setIsCreating(false); setEditingId(null); }} />
                      ))}
                      <div className="aether-tree-actions">
                        <Button type="button" variant="ghost" size="sm" onClick={() => startCreate(category.type, category.id)}>新增子分類</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => move(null, parentIds, parentIndex, -1)} disabled={category.isArchived}>上移</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => move(null, parentIds, parentIndex, 1)} disabled={category.isArchived}>下移</Button>
                        {category.children.length > 0 && <span className="text-xs text-muted">子分類可在右側選取後調整</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="aether-detail-pane">
                {isCreating || editingId ? (
                  <CategoryForm form={form} setForm={setForm} parents={activeParents.filter((category) => category.id !== editingId)} editingId={editingId} onSubmit={submit} onCancel={() => { setIsCreating(false); setEditingId(null); setForm(emptyForm); }} />
                ) : selectedCategory ? (
                  <CategoryDetail
                    category={selectedCategory}
                    parent={parentMap.get(selectedCategory.id) ?? null}
                    childCount={childrenCount(selectedCategory, categories)}
                    siblingIds={siblingIds(selectedCategory, categories)}
                    siblingIndex={siblingIndex(selectedCategory, categories)}
                    onEdit={() => startEdit(selectedCategory)}
                    onArchive={() => archive(selectedCategory.id)}
                    onRestore={() => restore(selectedCategory.id)}
                    onMove={(ids, index, delta) => move(parentMap.get(selectedCategory.id)?.id ?? null, ids, index, delta)}
                  />
                ) : (
                  <div className="aether-empty-panel">
                    <p>選擇左側分類查看內容，或建立新分類。</p>
                    <Button type="button" onClick={() => startCreate()}>新增分類</Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </GameWindow>
    </section>
  );
}

async function loadCategories(filter: CategoryFilter, includeArchived: boolean, accessToken: string | null, refreshSession: () => Promise<string | null>) {
  if (filter === "Expense" || filter === "Income") {
    return apiFetch<CategoryDto[]>(`/api/categories?type=${filter}&includeArchived=${includeArchived}`, accessToken, {}, refreshSession);
  }
  const [expense, income] = await Promise.all([
    apiFetch<CategoryDto[]>(`/api/categories?type=Expense&includeArchived=${includeArchived}`, accessToken, {}, refreshSession),
    apiFetch<CategoryDto[]>(`/api/categories?type=Income&includeArchived=${includeArchived}`, accessToken, {}, refreshSession)
  ]);
  return [...expense, ...income];
}

function CategoryForm({ form, setForm, parents, editingId, onSubmit, onCancel }: { form: FormState; setForm: (form: FormState) => void; parents: CategoryNode[]; editingId: string | null; onSubmit: (event: FormEvent) => void; onCancel: () => void }) {
  return (
    <form onSubmit={onSubmit} className="aether-detail-scroll">
      <AetherSectionHeader title={editingId ? "編輯分類" : "建立分類"} meta="Taxonomy Setup" />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="ui-label md:col-span-2">名稱<input className="ui-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="ui-label">類型<select className="ui-input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as CategoryType, parentCategoryId: "" })}><option value="Expense">支出</option><option value="Income">收入</option></select></label>
        <label className="ui-label">圖示文字<input className="ui-input" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} placeholder="例如 Food" /></label>
        <label className="ui-label md:col-span-2">父分類<select className="ui-input" value={form.parentCategoryId} onChange={(event) => setForm({ ...form, parentCategoryId: event.target.value })}><option value="">作為主分類</option>{parents.filter((parent) => parent.type === form.type).map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select></label>
      </div>
      <div className="aether-action-bar">
        <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
        <Button type="submit">{editingId ? "更新" : "建立"}</Button>
      </div>
    </form>
  );
}

function CategoryDetail({ category, parent, childCount, siblingIds, siblingIndex, onEdit, onArchive, onRestore, onMove }: {
  category: CategoryNode;
  parent: CategoryDto | null;
  childCount: number;
  siblingIds: string[];
  siblingIndex: number;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onMove: (ids: string[], index: number, delta: number) => void;
}) {
  return (
    <div className="aether-detail-scroll">
      <AetherSectionHeader title={category.name} meta={categoryTypeLabels[category.type]} />
      <div className="flex flex-wrap gap-2">
        <Badge tone={category.isArchived ? "neutral" : "success"}>{category.isArchived ? "已封存" : "啟用中"}</Badge>
        <Badge tone={category.type === "Income" ? "success" : "warning"}>{categoryTypeLabels[category.type]}</Badge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Definition label="分類名稱" value={category.name} />
        <Definition label="父分類" value={parent?.name ?? "主分類"} />
        <Definition label="子分類數" value={`${childCount} 個`} />
        <Definition label="顯示順序" value={`${category.displayOrder}`} />
        <Definition label="圖示文字" value={category.icon ?? "未設定"} />
        <Definition label="狀態" value={category.isArchived ? "已封存" : "啟用中"} />
      </div>
      <div className="aether-action-bar">
        <Button type="button" variant="outline" onClick={() => onMove(siblingIds, siblingIndex, -1)} disabled={category.isArchived || siblingIndex <= 0}>上移</Button>
        <Button type="button" variant="outline" onClick={() => onMove(siblingIds, siblingIndex, 1)} disabled={category.isArchived || siblingIndex >= siblingIds.length - 1}>下移</Button>
        <Button type="button" variant="outline" onClick={onEdit}>編輯</Button>
        {category.isArchived ? <Button type="button" variant="outline" onClick={onRestore}>還原</Button> : <Button type="button" variant="danger" onClick={onArchive}>封存</Button>}
      </div>
    </div>
  );
}

function CategoryListRow({ category, selected, isChild, onSelect }: { category: CategoryNode; selected: boolean; isChild?: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={`aether-list-row ${selected ? "aether-list-row-active" : ""} ${isChild ? "aether-tree-child" : ""}`} onClick={onSelect}>
      <span className="min-w-0">
        <strong>{category.icon ? `${category.icon} ` : ""}{category.name}</strong>
        <small>{isChild ? "子分類" : "主分類"} / {categoryTypeLabels[category.type]}</small>
      </span>
      <span className="text-right">
        <Badge tone={category.isArchived ? "neutral" : "success"}>{category.isArchived ? "封存" : "啟用"}</Badge>
      </span>
    </button>
  );
}

function AetherSectionHeader({ title, meta }: { title: string; meta?: string }) {
  return <div className="aether-section-header"><h2>{title}</h2>{meta && <span>{meta}</span>}</div>;
}

function Definition({ label, value }: { label: string; value: string }) {
  return <div className="aether-definition"><span>{label}</span><strong>{value}</strong></div>;
}

function childrenCount(category: CategoryNode, categories: CategoryDto[]) {
  const parent = categories.find((item) => item.id === category.id);
  return parent?.children.length ?? 0;
}

function siblingIds(category: CategoryNode, categories: CategoryDto[]) {
  const parent = categories.find((item) => item.children.some((child) => child.id === category.id));
  return parent ? parent.children.filter((child) => !child.isArchived).map((child) => child.id) : categories.filter((item) => !item.isArchived).map((item) => item.id);
}

function siblingIndex(category: CategoryNode, categories: CategoryDto[]) {
  return siblingIds(category, categories).indexOf(category.id);
}

function filterLabel(filter: CategoryFilter) {
  const labels: Record<CategoryFilter, string> = { Expense: "支出", Income: "收入", All: "全部", Archived: "封存" };
  return labels[filter];
}
