# Orchestration Rules

## State Manager
- Responsibility: Maintain `.ai/` structure and task state
- Authority: Can create/modify any state file
- Output format: Status, Findings, Evidence, Risks, Blockers, Confidence

## Workflow
1. Check for existing state in `.ai/state/`
2. Validate all required files exist
3. Read current task from `current-task.txt`
4. Load task details from `tasks/index.json`
5. Execute task with context
6. Update state and append to history

## Task States
- `pending`: Not started
- `in-progress`: Currently working
- `blocked`: Cannot proceed
- `completed`: Done
- `aborted`: Cancelled

## Handoff Protocol
- Update `current-task.txt` with new task ID
- Log event to `events.jsonl`
- Update `state.json` with current context
