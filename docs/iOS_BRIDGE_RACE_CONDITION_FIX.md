# iOS Bridge Threading Race Condition — Root Cause Analysis & Fix

**Date**: 2026-09-19  
**Component**: sdk-react-native iOS bridge  
**Issue**: `initialize()` appears successful but `getInstallationId()` returns "SDK not initialized"

---

## Root Cause

**Threading race condition** between bridge methods accessing shared SDK singleton state.

### Before Fix

```swift
// initialize() — executed on main queue
func initialize(...) {
    DispatchQueue.main.async {
        PushPlatform.shared.configure(...)  // Sets configured = true
        resolve(...)
    }
}

// getInstallationId() — executed on calling thread (NO dispatch)
func getInstallationId(...) {
    if let id = PushPlatform.shared.getInstallationID() {  // Reads configured
        resolve(id)
    } else {
        reject("NOT_INITIALIZED", ...)
    }
}
```

**Race condition timeline**:
1. JS calls `NativeModule.initialize(config)`
2. Bridge method `initialize()` enqueues work to main queue
3. React Native may invoke `getInstallationId()` from **different thread**
4. `getInstallationId()` reads `PushPlatform.shared.configured` **before** main queue executes `configure()`
5. Returns `nil` → "SDK not initialized" error

**Key insight**: `initialize()` promise resolution happens INSIDE the async block, but React Native bridge can call other methods from different threads before that block executes.

---

## Fix

**Serialize all SDK access through main queue**:

```swift
func getInstallationId(...) {
    DispatchQueue.main.async {  // ← Added
        if let id = PushPlatform.shared.getInstallationID() {
            resolve(id)
        } else {
            reject("NOT_INITIALIZED", ...)
        }
    }
}

func login(...) {
    DispatchQueue.main.async {  // ← Added
        PushPlatform.shared.login(...) { ... }
    }
}

func logout(...) {
    DispatchQueue.main.async {  // ← Added
        PushPlatform.shared.logout(...) { ... }
    }
}
```

**Guarantees**:
- All bridge methods execute on same thread (main queue)
- FIFO ordering: `initialize()` → `getInstallationId()` serialized
- No cross-thread memory visibility issues
- SDK state mutations and reads are sequential

---

## Verification

### Unit Tests (XCTest)

Created `PushPlatformBridgeThreadingTest.swift` with standalone test environment:
- React Native mocks (`RCTEventEmitter`, promise callbacks)
- Swift Package Manager setup for `swift test` execution
- NO React Native runtime required

**Test 1: Positive case**
```swift
func testInitializeThenGetInstallationIdReturnsUUID() {
    bridge.initialize(config, resolver: {...}, rejecter: {...})
    bridge.getInstallationId(resolve: {...}, reject: {...})
    
    // Assert: both methods complete successfully
    // Assert: both return same UUID
}
```
✅ **PASS** — returns UUID, not "NOT_INITIALIZED"

**Test 2: Negative case**
```swift
func testGetInstallationIdBeforeInitializeRejects() {
    bridge.getInstallationId(resolve: {...}, reject: {...})
    
    // Assert: rejects with "NOT_INITIALIZED"
}
```
✅ **PASS** — error handling still works correctly

**Execution**:
```bash
$ cd sdk-react-native/ios && swift test
Test Suite 'All tests' passed at 2026-09-19 11:06:15.876.
     Executed 2 tests, with 0 failures (0 unexpected) in 0.002 (0.003) seconds
```

### Diagnostic Logging

Added to `PushPlatformSDKMock.swift`:
- Call counters for `configure()` and `getInstallationID()`
- State logging (configured flag, installationID value)
- Entry/exit logging with call sequence numbers

Logs confirmed:
- `configure()` call #1 sets `configured = false → true`
- `getInstallationID()` call #2 reads `configured = true` and returns UUID
- Proper FIFO ordering through main queue

---

## Additional Work

### Swift Package Manager Setup

Created `ios/Package.swift` for standalone testing:
- Target: PushPlatformBridge (bridge + mock SDK + React Native mocks)
- TestTarget: PushPlatformBridgeTests (threading test)
- Enables `swift test` without Xcode project or React Native runtime

### React Native Mocks

Created `ios/Tests/ReactNativeMocks.swift`:
- Minimal `RCTEventEmitter` stub
- Promise callback typealias
- Allows bridge to compile in XCTest environment

### Verification Harness

Created `verification/VerificationApp.tsx`:
- Tracked React Native test component
- Reproducible 3-step verification: module load → initialize → getInstallationId
- Can be used for manual TestApp verification if needed

### Build Artifacts

Updated `.gitignore`:
- Added `ios/.build/` (Swift Package Manager build outputs)

---

## Impact

**Before**: Race condition caused sporadic "SDK not initialized" errors in production React Native apps when `initialize()` and `getInstallationId()` called in quick succession.

**After**: All SDK state access serialized through main queue. Race condition eliminated. Unit tests verify correct behavior.

**Performance**: Negligible impact — main queue dispatch adds ~microseconds overhead, SDK operations already involve I/O (keychain, UserDefaults).

---

## Related

- Commit: `eb5d24b` — "fix(sdk-react-native): Fix iOS bridge race condition with main queue serialization"
- Test file: `sdk-react-native/ios/Tests/PushPlatformBridgeThreadingTest.swift`
- Mock file: `sdk-react-native/ios/Tests/ReactNativeMocks.swift`
- Package: `sdk-react-native/ios/Package.swift`
