# Primary Model Selector Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a primary model dropdown in the local model settings modal and persist it as the LLM config `model` field.

**Architecture:** Add `primaryModel` state to `LocalModelSettingsModal` with options sourced from `modelTags`. On save, validate models via `/api/llm-models`, ensure `primaryModel` exists in `validatedModels` (fallback to first), then persist `model=primaryModel` and `models=validatedModels`.

**Tech Stack:** React 19, Next.js 16, next-intl, Radix UI Select, sonner toast, Node smoke-test.

### Task 1: Extend smoke-test coverage for primary model selection

**Files:**
- Modify: `scripts/smoke-test.mjs`

**Step 1: Write failing test (smoke-test assertions)**

Append assertions like:

```js
check(
  readFile("src/components/game/LocalModelSettingsModal.tsx").includes("primaryModel"),
  "LocalModelSettingsModal should manage primaryModel."
);
check(
  readFile("src/i18n/messages/zh.json").includes("\"primaryModel\""),
  "Missing localLlmSettings.fields.primaryModel (zh)."
);
check(
  readFile("src/i18n/messages/en.json").includes("\"primaryModel\""),
  "Missing localLlmSettings.fields.primaryModel (en)."
);
```

**Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL (missing primaryModel key/state)

### Task 2: Add i18n labels

**Files:**
- Modify: `src/i18n/messages/zh.json`
- Modify: `src/i18n/messages/en.json`

**Step 1: Add field labels**

Add `primaryModel` under `localLlmSettings.fields`:

```json
"fields": {
  "baseUrl": "BaseUrl",
  "apiKey": "API Key",
  "model": "模型",
  "primaryModel": "主模型"
}
```

English example:

```json
"fields": {
  "baseUrl": "BaseUrl",
  "apiKey": "API Key",
  "model": "Models",
  "primaryModel": "Primary model"
}
```

**Step 2: Run test (should still fail until UI is implemented)**

Run: `pnpm test`
Expected: FAIL (missing primaryModel state/UI)

### Task 3: Implement primary model dropdown + save logic

**Files:**
- Modify: `src/components/game/LocalModelSettingsModal.tsx`

**Step 1: Import Select components**

```ts
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
```

**Step 2: Add state and helpers**

```ts
const [primaryModel, setPrimaryModel] = useState("");

const resolvePrimaryModel = (models: string[], fallback?: string) => {
  if (fallback && models.includes(fallback)) return fallback;
  return models[0] ?? "";
};
```

Initialize in `useEffect`:

```ts
const initialPrimary = resolvePrimaryModel(initialModels, existing.model);
setPrimaryModel(initialPrimary);
...
const nextPrimary = resolvePrimaryModel(nextModels, cfg.model);
setPrimaryModel(nextPrimary);
```

**Step 3: Keep primary model valid when tags change**

When removing a tag:

```ts
setModelTags((prev) => {
  const next = prev.filter((item) => item !== tag);
  setPrimaryModel((current) => resolvePrimaryModel(next, current));
  return next;
});
```

If you add tags via `addTags`, after updating tags, ensure `primaryModel` is set (if empty):

```ts
setModelTags((prev) => {
  const next = normalizeTags([...prev, ...parts]);
  setPrimaryModel((current) => resolvePrimaryModel(next, current));
  return next;
});
```

**Step 4: Add dropdown UI**

```tsx
<div className="space-y-2">
  <Label className="text-xs">{t("localLlmSettings.fields.primaryModel")}</Label>
  <Select
    value={primaryModel}
    onValueChange={setPrimaryModel}
    disabled={modelTags.length === 0}
  >
    <SelectTrigger className="w-full">
      <SelectValue placeholder={LOCAL_LLM_DEFAULTS.model} />
    </SelectTrigger>
    <SelectContent>
      {modelTags.map((model) => (
        <SelectItem key={model} value={model}>
          {model}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

**Step 5: Save with validated primary model**

In `handleSave` after `validatedModels` is set:

```ts
const nextPrimary = resolvePrimaryModel(validatedModels, primaryModel);

await saveLlmConfig({
  baseUrl: baseUrlValue,
  apiKey: apiKeyValue,
  model: nextPrimary,
  models: validatedModels,
});

setModelTags(validatedModels);
setPrimaryModel(nextPrimary);
```

Optionally notify if the primary model was adjusted.

**Step 6: Run tests**

Run: `pnpm test`
Expected: PASS

### Task 4: Manual verification + commit

**Step 1: Manual checks**
- Add multiple model tags and select a primary model
- Delete the selected primary model; it should fall back to the first tag
- Save and verify WelcomeScreen shows correct primary model

**Step 2: Commit**

```bash
git add scripts/smoke-test.mjs src/i18n/messages/zh.json src/i18n/messages/en.json src/components/game/LocalModelSettingsModal.tsx
git commit -m "feat: add primary model selector for local models"
```
