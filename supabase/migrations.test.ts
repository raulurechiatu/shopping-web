import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Regression guard for the household-join bug: merge_pantry_into_household
// kept calling `select * from public.user_items` for several migrations
// after 0022 dropped that table, so every create_household/join_household_by_code
// call failed with "relation user_items does not exist" until 0025 fixed it.
// Postgres doesn't statically check plpgsql function bodies against the
// schema at CREATE time, so nothing in the database itself would have
// caught this — this test replays the migrations as plain text and checks
// that no function's *final* definition references a table that isn't
// part of the *final* schema, without needing a live database connection.

const MIGRATIONS_DIR = __dirname + "/migrations";
const BASELINE_SCHEMA = __dirname + "/schema.sql";

type Event =
  | { index: number; kind: "createTable"; name: string }
  | { index: number; kind: "dropTable"; name: string }
  | { index: number; kind: "createFunction"; name: string; bodyStart: number; bodyEnd: number }
  | { index: number; kind: "dropFunction"; name: string };

function findAll(re: RegExp, text: string): RegExpExecArray[] {
  const out: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(re, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((m = r.exec(text))) out.push(m);
  return out;
}

function parseFileEvents(text: string): Event[] {
  const events: Event[] = [];

  for (const m of findAll(/create table (?:if not exists )?public\.(\w+)/gi, text)) {
    events.push({ index: m.index, kind: "createTable", name: m[1].toLowerCase() });
  }
  for (const m of findAll(/drop table (?:if exists )?public\.(\w+)/gi, text)) {
    events.push({ index: m.index, kind: "dropTable", name: m[1].toLowerCase() });
  }
  for (const m of findAll(/drop function (?:if exists )?public\.(\w+)/gi, text)) {
    events.push({ index: m.index, kind: "dropFunction", name: m[1].toLowerCase() });
  }
  for (const m of findAll(/create (?:or replace )?function public\.(\w+)/gi, text)) {
    const bodyStart = text.indexOf("$$", m.index);
    if (bodyStart === -1) throw new Error(`No $$ found for function ${m[1]} (malformed test fixture or migration)`);
    const bodyEnd = text.indexOf("$$", bodyStart + 2);
    if (bodyEnd === -1) throw new Error(`No closing $$ found for function ${m[1]}`);
    events.push({ index: m.index, kind: "createFunction", name: m[1].toLowerCase(), bodyStart: bodyStart + 2, bodyEnd });
  }

  return events.sort((a, b) => a.index - b.index);
}

// A `public.<name>` reference counts as a table/data reference unless it's
// immediately followed by `(` (a function call like `public.foo(...)`) —
// that's the same heuristic used to tell "insert into public.household_items"
// apart from "perform public.merge_pantry_into_household(...)".
function referencedNames(body: string): string[] {
  const names = new Set<string>();
  for (const m of findAll(/public\.(\w+)\s*(\()?/g, body)) {
    if (!m[2]) names.add(m[1].toLowerCase());
  }
  return Array.from(names);
}

// schema.sql predates the migrations folder — it's the tables/functions
// that already existed before incremental migrations started being
// tracked (lists, list_members, etc. are never `create table`-d in any
// numbered migration). It has to be replayed first, as an implicit "migration
// zero", or this check would think those tables never existed at all.
function loadMigrationFiles(): { name: string; text: string }[] {
  const baseline = { name: "schema.sql (baseline)", text: fs.readFileSync(BASELINE_SCHEMA, "utf8") };
  const migrations = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, text: fs.readFileSync(path.join(MIGRATIONS_DIR, name), "utf8") }));
  return [baseline, ...migrations];
}

describe("supabase migrations stay internally consistent", () => {
  it("has migration files to check (sanity check the fixture path itself)", () => {
    expect(loadMigrationFiles().length).toBeGreaterThan(20);
  });

  it("never leaves a function referencing a table that no longer exists", () => {
    const tables = new Set<string>();
    const functionBodies = new Map<string, string>();

    for (const file of loadMigrationFiles()) {
      for (const event of parseFileEvents(file.text)) {
        if (event.kind === "createTable") tables.add(event.name);
        else if (event.kind === "dropTable") tables.delete(event.name);
        else if (event.kind === "dropFunction") functionBodies.delete(event.name);
        else if (event.kind === "createFunction") {
          functionBodies.set(event.name, file.text.slice(event.bodyStart, event.bodyEnd));
        }
      }
    }

    const problems: string[] = [];
    for (const [fnName, body] of functionBodies) {
      for (const referenced of referencedNames(body)) {
        // A reference is fine if it's a real table, or another function
        // (called without a directly-adjacent "(", e.g. across a line
        // break — none of the current functions do this, but the check
        // should not false-positive if one ever does).
        if (tables.has(referenced) || functionBodies.has(referenced)) continue;
        problems.push(`${fnName}() references public.${referenced}, which doesn't exist in the final schema`);
      }
    }

    expect(problems).toEqual([]);
  });

  it("would have caught the actual regression: merge_pantry_into_household referencing dropped user_items", () => {
    // Simulates the exact broken state this test suite is guarding
    // against — 0022 dropped user_items, but if a function still had the
    // pre-0025 body (querying user_items), this check must fail.
    const tables = new Set(["household_items"]); // user_items is not present
    const brokenBody = `
      declare
        item record;
      begin
        for item in
          select * from public.user_items where owner_id = auth.uid()
        loop
          insert into public.household_items (household_id, name) values (1, item.name);
        end loop;
      end;
    `;
    const problems = referencedNames(brokenBody).filter((name) => !tables.has(name));
    expect(problems).toEqual(["user_items"]);
  });
});
