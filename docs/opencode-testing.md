# OpenCode Integration Test Plan

## Overview
Comprehensive test suite for OpenCode AI integration with OpenClaw.

## Test Coverage

### 1. Configuration Tests ✅
**File:** `src/config/opencode-config.test.ts`

Tests:
- Minimal valid configuration (docker runtime)
- Podman runtime configuration
- All security modes (always/on-miss/auto)
- Resource limits validation
- Invalid runtime rejection
- Invalid approval mode rejection
- Negative resource value rejection
- Optional config (not required)
- Required field validation

**Run:**
```bash
pnpm test src/config/opencode-config.test.ts
```

### 2. Tool Tests ✅
**File:** `src/agents/tools/opencode-tool.test.ts`

Tests:
- Tool metadata validation
- TypeBox schema validation
- Action parameter requirement
- Unknown action rejection
- Create action requires prompt
- Approve action requires taskId
- Cancel action requires taskId
- Logs action requires taskId
- Default timeout (30s)
- Custom timeout handling

**Run:**
```bash
pnpm test src/agents/tools/opencode-tool.test.ts
```

### 3. Integration Tests (TODO)

#### Gateway Handler Tests
- `opencode.status` endpoint
- `opencode.config.get` endpoint
- `opencode.task.create` with prompt
- `opencode.task.approve` flow
- `opencode.task.cancel` flow
- `opencode.task.list` with filtering
- `opencode.task.logs` retrieval
- `opencode.audit.list` pagination
- Error handling for invalid requests

#### Container Runtime Tests
- Docker runtime detection
- Podman runtime detection
- Apple Container runtime detection
- Auto-detection fallback
- Container lifecycle management
- Resource limit enforcement
- Network isolation

#### Security Tests
- Command allowlist enforcement
- Command blocklist enforcement
- Path whitelist restrictions
- Path blacklist restrictions
- Approval mode behavior (always/on-miss/auto)
- Audit log recording
- Container sandboxing

#### UI Tests
- Dashboard rendering
- Task creation flow
- Task approval UI
- Settings form validation
- Security configuration UI
- Audit log display

## Running Tests

### Unit Tests
```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/config/opencode-config.test.ts

# Run tests matching pattern
pnpm test -- opencode
```

### Live Tests (requires container runtime)
```bash
# Run live tests with real containers
CLAWDBOT_LIVE_TEST=1 pnpm test:live
```

### Docker Integration Test
```bash
# Test Docker runtime
docker --version
pnpm test src/containers/docker-runtime.test.ts

# Test Podman runtime
podman --version
pnpm test src/containers/podman-runtime.test.ts
```

## Manual Testing Checklist

### Configuration
- [ ] Add minimal OpenCode config to openclaw.json
- [ ] Validate with `openclaw config validate`
- [ ] Test with `openclaw doctor`

### Gateway API
- [ ] Start gateway: `openclaw gateway run`
- [ ] Check status: `openclaw message send --method opencode.status`
- [ ] Create task: `openclaw message send --method opencode.task.create --params '{"prompt":"Hello"}'`
- [ ] List tasks: `openclaw message send --method opencode.task.list`

### UI
- [ ] Open web UI
- [ ] Navigate to OpenCode tab
- [ ] Create a test task
- [ ] View task details
- [ ] Access settings
- [ ] Configure security rules

### Agent Tool
- [ ] Start chat session
- [ ] Ask agent to use opencode tool
- [ ] Verify task creation
- [ ] Check approval flow (if enabled)

## Known Limitations

1. **Apple Container**: Requires macOS 15+ and Xcode 16+
2. **Podman**: Requires podman 4.0+ with podman-compose
3. **Resource Limits**: Actual enforcement depends on container runtime
4. **Network Isolation**: Only effective with bridge network mode

## Security Considerations

1. Always use `approvalMode: "always"` in production
2. Enable command blocklist with dangerous commands
3. Set path whitelist to allowed directories only
4. Enable audit logging
5. Use strict seccomp profile
6. Enable read-only containers when possible

## Troubleshooting

### Common Issues

1. **"No container runtime found"**
   - Install Docker or Podman
   - Check daemon is running
   - Verify user has permissions

2. **"Failed to pull image"**
   - Check internet connection
   - Verify image name exists
   - Check Docker Hub credentials

3. **"Permission denied"**
   - Add user to docker group
   - Check workspace path permissions
   - Verify config file ownership

4. **"Task timeout"**
   - Increase timeout in config
   - Check container resource limits
   - Review task logs for errors

### Debug Commands

```bash
# Check OpenCode status
openclaw message send --method opencode.status

# View config
openclaw config get opencode

# Check container runtime
openclaw doctor --check containers

# View logs
openclaw logs --tail 100 | grep opencode
```
