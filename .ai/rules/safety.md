# Safety & Security Rules

## Code Security
- No hardcoded secrets in source files
- Use environment variables for sensitive config
- Validate all external inputs
- Sanitize MQTT message payloads
- Use Content Security Policy headers

## Smart TV Platform Safety
- Handle platform API failures gracefully
- Implement timeout for all async operations
- Clean up event listeners on unmount
- Avoid infinite loops in retry logic
- Respect platform memory constraints

## Offline-First Requirements
- All network operations must be recoverable
- IndexedDB operations must be atomic
- Service Worker must handle cache invalidation
- Display fallback content on sync failure

## Data Protection
- Encrypt sensitive data at rest
- Use secure MQTT connection (TLS/SSL)
- No PII logging to console
- Clear sensitive data on app reset
