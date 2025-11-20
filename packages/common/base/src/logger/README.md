# SDK Logger

The SDK Logger provides structured logging with context management and pluggable sinks for the Crossmint SDK.

## Features

-   **Structured Logging**: Console-like API with automatic context merging
-   **Pluggable Sinks**: Support for multiple log destinations (console, Datadog, etc.)
-   **Context Management**: Global and request-scoped context support
-   **Platform Agnostic**: Works in browser, React Native, and Node.js environments

## Usage

### Basic Initialization

```typescript
import { SdkLoggerInstance, ConsoleSink } from "@crossmint/common-sdk-base";

// Initialize with console sink
SdkLoggerInstance.init({
    sinks: [new ConsoleSink()],
    context: {
        sdk_version: "2.4.1",
        platform: "web",
        package: "@crossmint/wallet-sdk",
    },
});
```

### Logging

```typescript
// Simple logging
SdkLoggerInstance.info("wallet.init.start", { chain: "solana" });
SdkLoggerInstance.warn("wallet.lookup.miss", { strategy: "email_signer" });
SdkLoggerInstance.error("wallet.init.error", { code: "ADMIN_MISMATCH" });

// Console-like API with mixed arguments
SdkLoggerInstance.info(
    "Processing request",
    { userId: "123" },
    "additional info"
);
// Objects are merged into context, primitives are concatenated into message
```

### Context Management

```typescript
// Set global context (applies to all future logs)
SdkLoggerInstance.setContext({ user_id: "user_123" });

// Request-scoped context
SdkLoggerInstance.withContext({ request_id: "req_abc123" }, () => {
    SdkLoggerInstance.info("network.request", {
        method: "POST",
        route: "/wallets",
    });
    SdkLoggerInstance.info("network.response", {
        status: 200,
        latency_ms: 230,
    });
    // request_id is automatically included in all logs within this scope
});
```

### Datadog Integration

Platform-specific Datadog sink implementations are available directly from `@crossmint/common-sdk-base`:

-   **Browser**: `createBrowserDatadogSink()` (requires `@datadog/browser-logs` - optional)
-   **React Native**: `createReactNativeDatadogSink()` (requires `@datadog/mobile-react-native` - optional)
-   **Server**: `createServerDatadogSink()` (uses native fetch, no dependencies)

Example (browser):

```typescript
import {
    SdkLoggerInstance,
    ConsoleSink,
    createBrowserDatadogSink,
    detectEnvironment,
} from "@crossmint/common-sdk-base";

const environment = detectEnvironment();
const sinks = [new ConsoleSink()];

if (environment === "browser") {
    const datadogSink = createBrowserDatadogSink({
        clientToken: "your-token",
        site: "datadoghq.eu",
        service: "crossmint-sdk",
        env: "production",
    });
    datadogSink.initialize();
    sinks.push(datadogSink);
}

SdkLoggerInstance.init({
    sinks,
    context: {
        sdk_version: "2.4.1",
        platform: "web",
    },
});
```

**Note**: The Datadog sinks gracefully handle missing dependencies. If `@datadog/browser-logs` or `@datadog/mobile-react-native` are not installed, the sinks will log a warning and continue with console-only logging.

## Architecture

### Components

1. **SdkLogger**: Main logger class implementing `ISdkLogger`
2. **LogSink**: Interface for log output destinations
3. **ConsoleSink**: Platform-agnostic console sink
4. **DatadogSink**: Interface and implementations for Datadog integration
    - `BrowserDatadogSink`: Browser implementation (uses `@datadog/browser-logs`)
    - `ReactNativeDatadogSink`: React Native implementation (uses `@datadog/mobile-react-native`)
    - `ServerDatadogSink`: Server implementation (uses HTTP API)

### Context Merging

-   Global context is set via `setContext()` and applies to all logs
-   Request-scoped context via `withContext()` is temporary and only active during function execution
-   Log arguments are automatically merged: objects go into context, primitives into message

### Error Handling

-   Sink errors are caught and logged to console.error (not through sinks to avoid loops)
-   Uninitialized logger falls back to console methods
-   All operations are non-blocking and won't affect application performance
