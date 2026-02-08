---
applyTo: '**'
---

# Project general coding standards

# GitHub Copilot Custom Instructions for React, TypeScript, Amplify, and Tanstack Project

## Project Overview

This project is a full-stack web application built with React and TypeScript on the frontend, using AWS Amplify for backend services (authentication, data/API, storage), and the Tanstack suite for data fetching and routing.

## Technology Stack & Style Guide

Adhere to the following conventions and technologies:

- **Language:** Use **TypeScript** for all code, favoring interfaces over types for complex structures.
- **UI Framework:** Use **React** functional components with TypeScript interfaces for props.
- **Styling:** Use **CSS Modules** for component styling. Each component should have a corresponding `.module.css` file (e.g., `Button.tsx` with `Button.module.css`). Import styles as `styles` and apply using `className={styles.className}`. The project also uses **PrimeReact** UI components for consistent design patterns.
- **Data Fetching:** All data fetching should be handled using **Tanstack Query** (e.g., `useQuery`, `useMutation`) for managing server state, including loading and error states.
- **Backend:** Interact with the backend using the **AWS Amplify** libraries (e.g., `Amplify.API`, `Amplify.Data`, `Amplify.Auth`). Assume the Amplify environment is already configured.
- **Routing:** Use **Tanstack Router** for all application routing and navigation.
- **State Management:** For client-side state, use React's `useState` and `useReducer` hooks. For shared complex state, use React Context or a library like mobx if necessary.
- **Code Style:**
  - Use `camelCase` for function and variable names, `PascalCase` for component names.
  - Destructure props in the component's function signature.
  - Use `<>...</>` or `React.Fragment` to avoid unnecessary DOM wrapper elements.
  - Extract reusable stateful logic into custom hooks (e.g., `useAuth`, `useApiData`).
  - Avoid 'todo' comments or placeholders; fully implement requested functionality.
  - Write comprehensive unit and integration tests covering both success and failure scenarios.

## Folder Structure

- `src/components/`: Reusable UI components.
- `src/pages/`: Page-level components used by the router.
- `src/hooks/`: Custom React hooks (e.g., `useAuth.ts`, `useApi.ts`).
- `src/api/`: Amplify Data/API logic and data models.
- `src/types/`: TypeScript interfaces and types.
- `src/utils/`: Utility functions and helpers.

## Naming Conventions

- Use PascalCase for component names, interfaces, and type aliases
- Use camelCase for variables, functions, and methods
- Prefix private class members with underscore (\_)
- Use ALL_CAPS for constants
- Component folder names should be kebab-case and match the component name

## Error Handling

- Use try/catch blocks for async operations
- Implement proper error boundaries in React components
- Always log errors with contextual information

## Instructions

- When generating new components, prioritize functional components that use TypeScript interfaces for props.
- Use react hooks for managing component-level state
- For data fetching, always use Tanstack Query hooks (`useQuery`, `useMutation`) to handle server state, caching, and background updates.
- When interacting with backend services, use AWS Amplify libraries (e.g., `Amplify.API`, `Amplify.Data`, `Amplify.Auth`) to perform operations like authentication, data retrieval, and storage.
- When a task involves data fetching, suggest using Tanstack Query hooks and appropriate data structures from `src/types/`.
- Ensure all code snippets are complete and runnable within the project context, without leaving missing pieces.
- Provide clear comments where necessary, but focus primarily on clean, self-documenting code.
- When writing tests, use the AAA (Arrange, Act, Assert) pattern and ensure async operations are handled properly with `async/await`.
- If a request seems incomplete or requires additional context, ask clarifying questions instead of guessing.
