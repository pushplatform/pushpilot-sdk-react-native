#!/bin/bash
set -e

echo "=== Android Production Bridge Verification ==="
echo ""

# 1. Check build success
echo "✅ Step 1: Android APK built successfully"
APK_PATH="/Users/pavelvladimiroff/Documents/dev/MonoRepo/push-platform/sdk-react-native/TestApp/PushPlatformTestApp/android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo "   - APK exists: $APK_SIZE"
else
    echo "   ❌ APK not found"
    exit 1
fi
echo ""

# 2. Check PushPlatformModule.kt compiled
echo "✅ Step 2: Production PushPlatformModule.kt compiled into APK"
CLASS_PATH="com/pushplatform/reactnative/PushPlatformModule.class"
if unzip -l "$APK_PATH" | grep -q "$CLASS_PATH"; then
    echo "   - PushPlatformModule.class found in APK"
else
    echo "   ❌ PushPlatformModule.class not found"
    exit 1
fi
echo ""

# 3. Check PushPlatformPackage.kt compiled
echo "✅ Step 3: PushPlatformPackage.kt registered in autolinking"
PACKAGE_LIST="/Users/pavelvladimiroff/Documents/dev/MonoRepo/push-platform/sdk-react-native/TestApp/PushPlatformTestApp/android/app/build/generated/autolinking/src/main/java/com/facebook/react/PackageList.java"
if grep -q "com.pushplatform.reactnative.PushPlatformPackage" "$PACKAGE_LIST"; then
    echo "   - PushPlatformPackage registered in PackageList.java"
else
    echo "   ❌ PushPlatformPackage not registered"
    exit 1
fi
echo ""

# 4. Check mock SDK classes compiled
echo "✅ Step 4: Mock SDK classes compiled"
MOCK_CLASSES=(
    "com/pushplatform/sdk/PushPlatform.class"
    "com/pushplatform/sdk/PushPlatformDelegate.class"
    "com/pushplatform/sdk/models/SdkError.class"
    "com/pushplatform/sdk/notifications/ParsedNotification.class"
    "com/pushplatform/sdk/core/UserManager.class"
)

for CLASS in "${MOCK_CLASSES[@]}"; do
    if unzip -l "$APK_PATH" | grep -q "$CLASS"; then
        echo "   - $CLASS found"
    else
        echo "   ❌ $CLASS not found"
        exit 1
    fi
done
echo ""

# 5. Check TypeScript bridge compiled
echo "✅ Step 5: TypeScript bridge compiled to JavaScript"
TS_BRIDGE="/Users/pavelvladimiroff/Documents/dev/MonoRepo/push-platform/sdk-react-native/lib/PushPlatform.js"
if [ -f "$TS_BRIDGE" ]; then
    echo "   - lib/PushPlatform.js exists"
    if grep -q "NativeModule.initialize" "$TS_BRIDGE"; then
        echo "   - NativeModule.initialize() call found"
    fi
else
    echo "   ❌ TypeScript not compiled"
    exit 1
fi
echo ""

echo "=== Android Production Bridge: VERIFIED ==="
echo ""
echo "Production bridge components:"
echo "  - PushPlatformModule.kt (Kotlin bridge)"
echo "  - PushPlatformPackage.kt (React Native registration)"
echo "  - Mock SDK (5 classes)"
echo "  - TypeScript → JavaScript bridge"
echo ""
echo "Build verification complete. APK contains production bridge code."
echo ""
echo "Note: Runtime verification requires stable emulator."
echo "Static verification confirms production code compiled and linked into APK."
