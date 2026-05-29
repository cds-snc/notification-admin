---
name: skill-and-agent-authoring
description: 'Authors VS Code Copilot skills (`.github/skills/<name>/SKILL.md`) and subagents (`.github/agents/<name>.md` or `<name>.agent.md`) for this repo — kebab-case names, YAML frontmatter with a "pushy" what+when description, "When NOT to Use" section, < 500 line body, and validation. Use this skill whenever the user asks to "create a skill", "new skill", "add a skill", "make an agent", "new subagent", "package this workflow", or is editing files under .github/skills/ or .github/agents/, even if they don''t mention skills or agents by name.'
---

# Skill and Agent Authoring (notify-admin)

Use this skill when adding or editing files under `.github/skills/` or `.github/agents/`. For doing the work end-to-end (interview → draft → validate), delegate to the `skill-author` agent instead. This skill exists so the same conventions apply when you're making a quick one-off edit and don't want to spawn a subagent.

## Skill vs. Agent — pick the right shape

| Want to... | Use a |
|---|---|
| Bake "how we do X here" conventions into every relevant edit | **Skill** |
| Define a multi-step workflow someone can delegate to | **Agent** |
| Capture a checklist that should auto-apply when matching files are touched | **Skill** |
| Do scaffolding across many files without cluttering the main conversation | **Agent** |

Skills are passive context bundles loaded when their description matches; agents are invokable specialists run via `runSubagent`. Many features benefit from both — a skill encodes the rules, an agent uses the skill to do work end-to-end.

## File layout

```
.github/
├── skills/
│   └── <skill-name>/
│       └── SKILL.md          (required, exact filename)
└── agents/
    └── <agent-name>.md       (or <agent-name>.agent.md)
```

- Folder/file names: kebab-case. No `claude` or `anthropic` in the name.
- One SKILL.md per skill folder. No `README.md` inside a skill folder (duplicates content).
- Don't use XML-style brackets like `<topic>` in skill/agent content.
- Keep the body under ~500 lines. If it grows, split into `references/<topic>.md` files and point to them from SKILL.md.

## YAML frontmatter

### Skill frontmatter

```yaml
---
name: kebab-case-skill-name
description: 'One-sentence summary of what the skill does. Use this skill whenever the user asks to "<trigger 1>", "<trigger 2>", or is editing files under <path>/, even if they don''t mention <topic> explicitly.'
---
```

Why this shape:

- **`name`** must match the folder. Kebab-case.
- **`description`** is the *only* signal the model uses to decide whether to load the skill, so combine **what** it does + **when** to use it in the same field. Don't hide triggers in the body.
- Make the description a little **"pushy"** — current models tend to *under*-trigger skills. Phrases like *"Use this skill whenever..."* and *"even if they don't explicitly mention..."* combat that without being misleading.
- Single-quote the value and escape inner apostrophes as `''` so YAML parses cleanly.

### Agent frontmatter

```yaml
---
description: "Use when: <trigger phrases or scenarios>. Handles <what it does end-to-end>."
tools: [read, edit, search, todo]
argument-hint: "Describe <what the user should supply> (e.g., '<concrete example>')"
---
```

Look at [admin-api-client-builder.md](../../../.github/agents/admin-api-client-builder.md) and [notify-fullstack-scaffold.agent.md](../../../.github/agents/notify-fullstack-scaffold.agent.md) for the in-repo pattern.

## Body structure (skills)

A skill body usually wants these sections, in this order. Keep each tight.

1. **One-line orientation** — what this skill governs.
2. **When to Use** — concrete trigger phrases and file paths.
3. **When NOT to Use** — adjacent topics this skill *isn't* for, so it doesn't mis-trigger. This is the highest-leverage section for accuracy.
4. **Core Files / Locations** — exact paths the editor needs to know.
5. **Conventions** — the rules. Prefer explaining *why* over rigid `ALWAYS`/`NEVER` in all caps — modern models follow reasoned guidance better than commands. Reserve hard "must" language for things that are genuinely non-negotiable (security, accessibility) and explain the consequence.
6. **Procedure** — numbered steps for the common task this skill supports.
7. **Validation** — exact commands or checks to confirm the change is correct.
8. **Guardrails** — short list of things to avoid.

## Body structure (agents)

1. **Role statement** — "You are the <Name>, a specialist that ...".
2. **Your Job** — the input/output contract.
3. **Constraints** — `DO NOT` / `ALWAYS` rules specific to the task.
4. **Approach** — numbered workflow.
5. **Workflows** — if the agent handles distinct cases (e.g., "Workflow A: adding to existing client; Workflow B: creating from scratch"), enumerate them.
6. **Validation** — what to run before reporting back.

## Writing patterns

- **Imperative voice**: "Add the route to `app/main/views/<module>.py`", not "The route should be added".
- **Explain the why**: "Use `data-testid` selectors so refactoring markup doesn't break tests" is more durable than "NEVER use CSS class selectors".
- **Reference real files** with markdown links so the model can jump to them: `[app/utils.py](app/utils.py)`.
- **Avoid duplicating** content from [AGENTS.md](../../../AGENTS.md) — link instead.
- **Negative space matters**: a clear "When NOT to Use" prevents the skill from misfiring on adjacent work.

## Procedure: create a new skill

1. **Capture intent**: clarify what the skill should enable, what trigger phrases real users say, what files it governs, and what's out of scope.
2. Pick a kebab-case `<skill-name>` that's specific to this repo (e.g., `cypress-e2e-notify-admin`, not `cypress-tests`).
3. Create `.github/skills/<skill-name>/SKILL.md` with the frontmatter above.
4. Draft the body in the order listed under "Body structure (skills)".
5. Re-read with fresh eyes — cut anything not pulling its weight, soften rigid commands into reasoned guidance.
6. Validate (see below).
7. If the user might also want it as a workflow, propose a matching agent under `.github/agents/`.

## Procedure: create a new agent

1. Capture intent: what end-to-end task should the agent own; what input does it take; what files does it touch.
2. Create `.github/agents/<agent-name>.agent.md` (or `.md`) with the frontmatter above.
3. Write the role statement, constraints, and a numbered approach. Reference the matching skill (if any) so the agent inherits its conventions.
4. If the agent shares conventions with an existing skill, link to that skill rather than duplicating rules.
5. Validate.

## Validation

Run these checks on any new or edited skill/agent file:

- `name` (skill) and folder name are identical and kebab-case.
- File is named exactly `SKILL.md` (skill) or `<name>.md` / `<name>.agent.md` (agent).
- YAML frontmatter parses (no unescaped apostrophes; single-quoted values).
- Description includes *both* what the thing does *and* when to use it.
- Body is under ~500 lines.
- No XML brackets in content.
- No `README.md` inside the skill folder.
- No `claude` or `anthropic` in the name.

Optional helper (mirrors upstream skill-creator):

```bash
python -c "import yaml,sys,pathlib; p=pathlib.Path('$FILE'); t=p.read_text(); \
  fm=t.split('---',2)[1]; m=yaml.safe_load(fm); \
  assert m.get('name','').replace('-','').isalnum() or 'description' in m, 'bad frontmatter'; \
  print('ok:', m.get('name') or '(agent)')"
```

## Guardrails

- Don't vendor upstream tooling that depends on `claude -p` CLI or Claude Code subagents — it won't run in this workspace.
- Don't create skills that overlap heavily with existing ones; extend the existing skill instead.
- Don't embed secrets, real user data, or production URLs in skill content.
- If a skill or agent encodes auth/permission rules, keep them aligned with `app/utils.py` decorators rather than inventing new patterns.
