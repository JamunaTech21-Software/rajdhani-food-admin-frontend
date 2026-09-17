import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const field = strip(read("components/ui/PasswordField.jsx"));
const login = strip(read("pages/LoginPage.jsx"));

test("the toggle swaps the input type rather than the input", () => {
  // Replacing the element would lose focus and the caret position mid-word.
  assert.match(field, /type=\{visible \? "text" : "password"\}/);
  assert.match(field, /setVisible\(\(shown\) => !shown\)/);
});

test("the toggle is a button that does not submit the form", () => {
  // Inside a <form>, a button with no type is a submit button — revealing the
  // password would post the login form instead.
  assert.match(field, /<button\s+type="button"/);
});

test("it starts hidden on every page load", () => {
  // Not remembered anywhere: hidden is the state to be in by default on a
  // screen someone else might be standing behind.
  assert.match(field, /useState\(false\)/);
  assert.doesNotMatch(field, /localStorage|sessionStorage/);
});

test("which state it is in is announced, not only drawn", () => {
  // Two similar glyphs are no signal at all to a screen reader.
  assert.match(field, /aria-pressed=\{visible\}/);
  assert.match(field, /aria-controls=\{id\}/);
  assert.match(field, /<span className="sr-only">\{visible \? "Hide password" : "Show password"\}<\/span>/);
});

test("the toggle is reachable and visible by keyboard", () => {
  assert.doesNotMatch(field, /tabIndex=\{-1\}/);
  assert.match(field, /focus-visible:outline-brand/);
});

test("the toggle follows the field's disabled state", () => {
  // The form disables its controls while signing in and while locked out; a
  // live reveal button beside a dead field reads as broken.
  assert.match(field, /disabled=\{disabled\}[\s\S]*disabled=\{disabled\}/);
});

test("the control keeps the labelling and error wiring every other field has", () => {
  assert.match(field, /<FieldFrame/);
  assert.match(field, /aria-describedby=\{describedBy\}/);
  assert.match(field, /aria-invalid=\{invalid \|\| undefined\}/);
});

test("the glyph leaves room for itself", () => {
  // Without the right padding, a long password runs underneath the button.
  assert.match(field, /"h-11 pl-3 pr-11"/);
});

test("the login form uses it, and still autofills as a password", () => {
  assert.match(login, /<PasswordField/);
  assert.match(login, /autoComplete="current-password"/);
  assert.doesNotMatch(login, /type="password"/, "the type is the component's job now");
});
