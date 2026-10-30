require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'CrossmintReactNativeUI'
  s.version        = package['version']
  s.summary        = 'Crossmint React Native UI SDK'
  s.homepage       = 'https://github.com/Crossmint/crossmint-sdk'
  s.license        = { :type => 'Apache-2.0' }
  s.author         = 'Crossmint Inc'
  s.platforms      = { :ios => '16.4' }
  s.source         = { :git => 'https://github.com/Crossmint/crossmint-sdk.git', :tag => "client-sdk-react-native-ui@#{s.version}" }
  s.source_files   = 'DeviceSignerModule.swift'
  s.swift_version  = '6.0'

  s.dependency 'ExpoModulesCore'
  spm_dependency(s,
    url: 'https://github.com/Crossmint/crossmint-swift-sdk',
    requirement: { kind: 'upToNextMajorVersion', minimumVersion: '1.4.0' },
    products: ['CrossmintDeviceSigner']
  )
end
