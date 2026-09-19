require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "PushPlatform"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/pushplatform/react-native.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.exclude_files = "ios/ContractTests/**/*", "ios/Tests/**/*", "ios/Package.swift", "ios/standalone_test.swift"
  s.public_header_files = []

  s.dependency "React-Core"

  s.swift_version = "5.9"
end
