require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# Minimum React Native version that supports New Architecture
MIN_RN_VERSION = "0.77.0"

Pod::Spec.new do |s|
  s.name         = "PushPlatform"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/pushplatform/pushpilot-sdk-react-native.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.exclude_files = "ios/ContractTests/**/*", "ios/Tests/**/*", "ios/Package.swift", "ios/standalone_test.swift", "ios/PushPlatformSDKMock.swift"
  s.public_header_files = []

  s.dependency "React-Core"

  # The host app resolves this dependency from pushpilot-sdk-ios in its Podfile.
  s.dependency "PushPlatformSDK", "~> 1.0"

  s.swift_version = "5.9"

  # Warn if React Native version is too old
  if defined?(Pod::REACT_NATIVE_PATH) && Pod::REACT_NATIVE_PATH
    rn_package_path = File.join(Pod::REACT_NATIVE_PATH, "package.json")
    if File.exist?(rn_package_path)
      rn_package = JSON.parse(File.read(rn_package_path))
      rn_version = rn_package["version"]
      if Gem::Version.new(rn_version) < Gem::Version.new(MIN_RN_VERSION)
        Pod::UI.warn "PushPlatform requires React Native >= #{MIN_RN_VERSION} with New Architecture enabled. Found #{rn_version}."
      end
    end
  end
end
