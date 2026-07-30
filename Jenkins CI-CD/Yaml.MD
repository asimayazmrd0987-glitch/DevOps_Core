# YAML for DevOps — A Complete Guide

YAML ("YAML Ain't Markup Language") is the format almost every DevOps tool
speaks: GitHub Actions, Docker Compose, Kubernetes, Ansible, GitLab CI,
CircleCI, Helm charts. You don't need to memorize a spec — you need to
internalize maybe 10 rules deeply enough that you stop making mistakes.
That's the goal here.

---

## 1. The core idea

YAML represents data using **indentation and structure**, not brackets and
tags like JSON or XML. It's built from exactly three building blocks:

| Concept | What it is | Looks like |
|---|---|---|
| **Scalar** | A single value | `name: Asim` |
| **Mapping** | Key-value pairs (like a dict/object) | `name: Asim` `age: 18` |
| **Sequence** | An ordered list (like an array) | `- item1` `- item2` |

Everything in every YAML file you'll ever read is one of these three things,
nested inside each other. That's it. Once that clicks, YAML stops looking
like magic indentation and starts looking like a tree.

---

## 2. The rules that actually matter

### Rule 1 — Indentation is the syntax
There are no `{ }` or `[ ]` to mark structure (well, there are — see §7 —
but they're rarely used). **Indentation level defines nesting.**

```yaml
person:
  name: Asim
  address:
    city: Mardan
    country: Pakistan
```

`city` and `country` are nested under `address`, which is nested under
`person`, purely because of how far right they're indented.

### Rule 2 — Never use tabs
YAML indentation must be **spaces only**. A single tab character will break
parsing, often with a cryptic error. Every decent editor can be configured
to insert spaces when you press Tab — do that once and forget about it.

### Rule 3 — Indentation amount is your choice, but be consistent
2 spaces is the overwhelming convention (GitHub Actions, Kubernetes, Docker
Compose all use 2). You *can* use 4, but never mix amounts within one file,
and never rely on exact alignment with the parent — just "further right
than parent."

### Rule 4 — `key: value` needs a space after the colon
```yaml
name: Asim      # correct
name:Asim       # WRONG — parsed as a single string "name:Asim"
```

### Rule 5 — Comments start with `#`
```yaml
# this is a full-line comment
name: Asim  # this is an inline comment
```

---

## 3. Scalars — the actual values

### Strings
Usually you don't need quotes at all:
```yaml
name: Asim Ayaz
```
But quote a string when it contains something YAML might misread — a colon,
a `#`, or when it *looks* like another type (see §6, the "Norway Problem" —
this is the single most common real-world YAML bug):
```yaml
title: "DevOps: A Beginner's Guide"   # colon inside needs quotes
answer: "yes"                          # otherwise parsed as boolean true
port: "8080"                           # if you specifically need it as text
```
Single `'quotes'` and double `"quotes"` both work; double quotes support
escape sequences like `\n`, single quotes are literal.

### Numbers, booleans, null
```yaml
port: 8080          # integer
threshold: 0.75     # float
enabled: true        # boolean (also: True, TRUE all valid)
disabled: false
value: null          # also: ~,  or just leave it blank
empty_value:
```

### Multi-line strings — the part everyone finds confusing
Two styles, and the difference matters a lot in real configs (shell scripts
inside CI YAML use this constantly):

**Literal block (`|`)** — keeps line breaks exactly as written:
```yaml
script: |
  echo "Step 1"
  echo "Step 2"
```
This produces the string `"echo \"Step 1\"\necho \"Step 2\"\n"` — newlines
preserved. This is what you want for multi-line shell scripts in CI YAML.

**Folded block (`>`)** — turns line breaks into spaces (folds into one
paragraph):
```yaml
description: >
  This text will all be
  joined onto a single line
  when parsed.
```
Produces `"This text will all be joined onto a single line when parsed.\n"`.
Good for long human-readable text you're just wrapping for editor
readability, bad for scripts (it would break multi-line bash).

Add `-` after `|` or `>` (i.e. `|-` or `>-`) to also strip the trailing
newline — common in CI configs to avoid a stray blank line.

---

## 4. Sequences (lists)

```yaml
fruits:
  - apple
  - banana
  - mango
```

Lists of mappings (extremely common — e.g. a list of steps, a list of
services) look like this:
```yaml
servers:
  - name: web1
    ip: 10.0.0.1
  - name: web2
    ip: 10.0.0.2
```
Read this as: "a list, where each item is a mapping with `name` and `ip`
keys." The `-` marks a new list item; everything indented at the same level
after it belongs to that item.

Inline ("flow") style also exists and is fine for short lists:
```yaml
fruits: [apple, banana, mango]
```

---

## 5. Mappings (dictionaries) — nesting deeply

```yaml
app:
  name: my-service
  env:
    NODE_ENV: production
    PORT: 3000
  ports:
    - 3000
    - 3001
```

This is a mapping (`app`) containing a scalar (`name`), a nested mapping
(`env`), and a sequence (`ports`). Real-world YAML is almost always
mappings and sequences nested inside each other several levels deep — once
you can read this comfortably, you can read a Kubernetes manifest.

---

## 6. The gotchas that actually bite people

These are the mistakes that cost people real debugging time. Learn these
and you'll avoid 90% of YAML pain.

### The "Norway Problem"
YAML auto-converts certain unquoted words into booleans:
```yaml
country: no     # parsed as boolean `false`, not the string "no"!
enabled: yes    # parsed as boolean `true`
```
Words that trigger this: `yes`, `no`, `true`, `false`, `on`, `off`, `y`,
`n` (case-insensitive in older YAML 1.1, which many real-world tools like
Docker Compose and GitHub Actions still use). **Always quote these if you
mean them as literal strings**, e.g. `country: "no"`.

### Numbers-that-look-like-versions become numbers
```yaml
version: 1.10   # parsed as the float 1.1 (trailing zero dropped!)
```
Quote it: `version: "1.10"`.

### Leading zeros
```yaml
zip: 007   # may be parsed as octal, producing 7, not "007"
```
Quote anything with meaningful leading zeros: `zip: "007"`.

### Tabs (again, because it's the #1 cause of "why won't this parse")
If a YAML file mysteriously fails to parse and everything *looks* right,
copy it into a plain text editor and check for tabs. This happens constantly
when copy-pasting from Slack, PDFs, or certain editors.

### Trailing colons without a value
```yaml
key:
value_but_wrong_indent
```
If you write a key with nothing after the colon, YAML expects either a
nested block (indented) or `null`. A common mistake is leaving a key empty
and then writing the next line at the wrong indentation.

### Mixing tabs/spaces or inconsistent indent width
```yaml
app:
  name: test
    env: prod   # WRONG — over-indented, this isn't a sibling of `name`
```

---

## 7. Anchors & aliases — YAML's "copy-paste" feature

This is the feature that makes YAML genuinely powerful (and is used a lot
in Docker Compose and CI configs to avoid repeating yourself).

```yaml
defaults: &default_settings
  retries: 3
  timeout: 30

job1:
  <<: *default_settings
  name: build

job2:
  <<: *default_settings
  name: test
  timeout: 60   # overrides just this one field
```

- `&default_settings` — **defines** an anchor (a reusable block), named
  `default_settings`.
- `*default_settings` — **references** that anchor elsewhere.
- `<<:` — the "merge key": merges the referenced mapping's keys into the
  current mapping (and lets you override individual keys after, like
  `timeout: 60` above).

This is precisely how real GitHub Actions workflows and Docker Compose
files stay DRY instead of repeating the same 10 lines for every job/service.

---

## 8. Multi-document files

A single `.yaml` file can hold multiple separate YAML documents, separated
by `---`:
```yaml
---
name: doc1
---
name: doc2
```
Kubernetes manifests use this constantly to define multiple resources
(a Deployment + a Service) in one file. `...` optionally marks the end of a
document, though it's rarely needed.

---

## 9. Real-world examples (this is where it clicks)

### GitHub Actions workflow
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install and test
        run: |
          npm install
          npm test
```
Read it as a tree: `jobs` → `build` (a mapping) → `steps` (a sequence of
mappings). The `run: |` block is a literal multi-line shell script — this
is exactly §3's literal block syntax in action.

### Docker Compose
```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    environment:
      - ENV=production
    depends_on:
      - api

  api:
    build: ./api
    environment:
      DB_HOST: db
      DB_PORT: "5432"

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: "secret"
```
Notice `DB_PORT: "5432"` is quoted — a good habit for anything that's
semantically a string but numeric-looking, to avoid ambiguity.

### Kubernetes manifest
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:1.0
          ports:
            - containerPort: 8080
          env:
            - name: NODE_ENV
              value: production
```
This is deeply nested but still just mappings and sequences. Read top-down:
a Deployment `spec` has a `template`, whose `spec` has a list of
`containers`, each with its own `env` list.

### Ansible playbook
```yaml
- name: Configure web servers
  hosts: webservers
  become: true
  tasks:
    - name: Install nginx
      apt:
        name: nginx
        state: present

    - name: Start nginx
      service:
        name: nginx
        state: started
        enabled: true
```
Ansible playbooks are a *sequence* (`-`) at the top level — a list of
"plays," each containing a list of `tasks`.

---

## 10. Validate before you debug blindly

Don't hand-trace indentation errors by eye once files get long — use a
linter:

```bash
pip install yamllint --break-system-packages
yamllint my-file.yaml
```

Or paste into an online YAML validator when you just need a quick check.
Most editors (VS Code with the YAML extension, in particular) will
underline indentation errors live as you type — turn that on, it catches
mistakes before you even save.

---

## 11. Quick-reference cheat sheet

```yaml
# Comment
string: hello world
quoted_string: "needs quotes: colon, or looks like yes/no/number"
number: 42
float: 3.14
boolean: true
null_value: null            # or ~, or leave blank

list:
  - item1
  - item2

inline_list: [a, b, c]

mapping:
  key1: value1
  key2: value2

inline_mapping: {key1: value1, key2: value2}

nested:
  level1:
    level2:
      key: value

multiline_literal: |
  line one
  line two

multiline_folded: >
  becomes
  one line

anchor_def: &name
  key: value

anchor_use:
  <<: *name

---              # start of a new document
```

---

## Where to go from here

You now know enough YAML to read *any* config file you'll encounter as a
DevOps engineer without guessing. The next step isn't more YAML theory —
it's reading real files. Open one of your own GitHub Actions workflows, or
a Kubernetes manifest from a public repo, and trace through it using this
guide's framework (mapping/sequence/scalar, check for anchors, check for
literal blocks). That's how it actually sinks in.

If you want, I can also walk through writing a GitHub Actions workflow for
one of your own repos (Attack Path Visualizer or API Sisyphus) from scratch,
step by step, using everything above.