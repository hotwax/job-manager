# Job-Manager X Ionic-Vue TypeScript Style Guide

## Introduction

The primary goal of code review for the Job Manager Application is to ensure the long-term health and maintainability of the codebase. This guide provides a framework for reviewers to evaluate code changes, ensuring they align with our established patterns and architectural goals.

## Review Principles

*   **Code Health:** Prioritize the overall health of the codebase. A change should generally leave the code better than it was found.
*   **Simplicity:** Reviewers should favor simple, readable solutions over complex or "clever" ones.
*   **Technical Debt:** Avoid introducing patterns that will be difficult to change or maintain in the future.
*   **Consistency:** Verify that new code follows existing conventions to reduce cognitive load for the team.

## Review Checklist: Language & Formatting

### General Standards
*   **Variable Declarations:** Ensure `const` is used for all variables that are not reassigned. `var` must never be used.
*   **String Formatting:** Verify that **double quotes** (`"`) are used for strings. Check that template literals are used only when string interpolation is required.
*   **Reactivity:** Ensure primitive values use `ref()` and objects/arrays use `reactive()`. Verify that all variables driving UI updates are properly reactive.
*   **Modern JavaScript:** Look for modern methods like `.includes()`, `.find()`, and `.some()` instead of older alternatives like `.indexOf()`.
*   **Asynchronous Code:** Ensure `async/await` is used for all asynchronous operations and that `try...catch` blocks are implemented for error handling.

### Naming Conventions
*   **General:** Verify `camelCase` for variables and functions, and `PascalCase` for types and interfaces.
*   **Vue Components:** Ensure filenames and component names use `PascalCase`.
*   **Composables:** Verify that all composable names start with `use`.
*   **Pinia Stores:** Check that store IDs use simple lowercase names (e.g., `job`, `user`, `util`).
*   **Constants:** Verify `UPPER_SNAKE_CASE` is reserved for truly static, global constants.

### Formatting
*   **Indentation:** Ensure a consistent 2-space indentation is maintained throughout.
*   **Object Spacing:** Check for spaces inside curly braces: `{ name: "John" }`.
*   **Semicolons:** Verify that semicolons are used consistently to terminate statements.

## Review Checklist: Vue Components

*   **API Style:** Confirm the use of `<script setup>` with the **Composition API**. Discourage the use of the Options API in new components.
*   **Directives:** Ensure shorthand syntax is used: `@click` and `:prop`.
*   **Data Fetching:** **Strictly verify** that `api` or `client` are NOT imported directly in `.vue` files. These interactions should be encapsulated in Pinia store actions or composables.
*   **Props & Emits:** Check that `defineProps` and `defineEmits` are used correctly within the setup block.
*   **Ionic Patterns:** Verify the use of the `slot` attribute for positioning Ionic elements (e.g., `slot="start"`).

## Review Checklist: State Management & i18n

### Pinia Stores
*   **Definition:** Use `defineStore`.
*   **Naming (ID):** Ensure that store IDs use simple lowercase names (e.g., `defineStore("user", ...)`).
*   **Naming (Export):** The exported hook should follow the `use[Name]Store` pattern (e.g., `export const useUserStore = ...`).
*   **File Naming:** Verify that the file name matches the store ID (e.g., `user.ts` for the user store). Avoid suffixes like `Store` in the filename.
*   **Organization:** Ensure state, getters, and actions are logically grouped and focused on a single domain.

### Internationalization (i18n)
*   **Translation Usage:** Ensure all user-facing text is wrapped in the `translate()` function.
*   **Key Validation:** Verify that all keys used in `translate()` exist in the appropriate `[locale].json` files. While the linter provides automated checks, reviewers should ensure the keys are descriptive and correctly placed.

## Review Checklist: Documentation & Imports

*   **JSDoc:** Verify that all exported functions and complex logic are documented with JSDoc, including `@param` and `@returns` tags where appropriate.
*   **Import Organization:** Ensure imports are grouped (Built-in, External, Internal) and sorted alphabetically within those groups. Check for a single newline after the import block.

## Review Checklist: Error Handling & Logging

*   **Error Resilience:** Verify that `try...catch` blocks are used for all API calls and that user feedback (e.g., Toasts) is provided on failure.
*   **Logging:** Ensure the project's `logger` utility is used for debugging information. `console.log` and `debugger` should be removed before code is merged.
*   **Safety:** Confirm that `alert()` is not used for user notifications.