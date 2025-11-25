---
description: Create a clear, human-readable git commit
---

Analyze the current git changes and create a commit with a clear, concise message.

Requirements:
- Run `git status` and `git diff --staged` (or `git diff` if nothing staged)
- Write a commit message that's human-readable and to the point
- Format: Start with a brief summary (50 chars max), then detailed explanation if needed
- Focus on WHAT changed and WHY, not HOW
- Use present tense ("Add feature" not "Added feature")
- Be specific and clear - avoid vague terms like "fix stuff" or "update code"

After drafting the message, create the commit using `git commit -m "message"`.

If nothing is staged, ask if I should stage all changes first.
