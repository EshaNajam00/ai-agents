# Project Guidelines

This project is a web app with companion mobile apps (iOS and Android). The product requirements live in [prd.md](prd.md).

## Working rules

- **Code quality and scalability**: write clean, modular, typed code with clear boundaries between layers (UI, business logic, data access). Share code between web and mobile where possible. Avoid shortcuts that won't hold up as users and features grow.
- **Security first**: validate all input on the server, never trust the client, keep secrets out of the repo (use environment variables and `.env` files that are git-ignored), use parameterized queries, apply least-privilege access, and follow OWASP guidance for web and mobile.
- **Commit often**: commit after each meaningful change, with clear, descriptive messages.
- **Latest versions**: use the latest stable releases of packages and frameworks. Check the current version before adding a dependency rather than relying on memory.
