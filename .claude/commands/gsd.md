# GSD — Get Shit Done

A project management system for solo developers using Claude agents. Use this to break down work and execute systematically.

## Instructions

1. **Ask** the user what they want to accomplish (if not already specified via $ARGUMENTS)
2. **Explore** the codebase to understand the current state
3. **Break down** the goal into concrete, actionable tasks using TaskCreate
4. **Execute** tasks one by one:
   - Mark task as `in_progress` before starting
   - Do the work (write code, run commands, etc.)
   - Mark task as `completed` when done
   - Move to next task
5. **Verify** by building/testing after all tasks are done
6. **Report** a summary of what was accomplished

## Rules
- Keep tasks small and focused (1 task = 1 logical change)
- Always verify your work compiles/builds before marking complete
- If blocked, create a new task for the blocker and move on
- Use $ARGUMENTS as the goal if provided
