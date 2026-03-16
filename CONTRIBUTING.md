# Contributing

## Setup

1. Clone the repo
2. Copy `src/main/resources/application.properties.template` → `application.properties`
3. Fill in your MySQL credentials
4. Run backend: `./mvnw spring-boot:run`
5. Run frontend: `cd SriLaxmiAgencies && npm install && npm run dev`

## Branch Naming

- `feature/your-feature-name`
- `fix/bug-description`
- `chore/task-name`

## Commit Style

```
feat: add supplier payment export
fix: correct invoice total calculation
chore: update dependencies
```
