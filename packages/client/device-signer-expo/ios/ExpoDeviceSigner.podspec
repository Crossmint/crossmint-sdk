require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoDeviceSigner'
  s.version        = package['version']
  s.summary        = package['description']
  s.homepage       = 'https://github.com/Crossmint/crossmint-sdk'
  s.license        = { :type => 'Apache-2.0' }
  s.author         = 'Paella Labs Inc'
  s.platforms      = { :ios => '15.0' }
  s.source         = { :git => 'https://github.com/Crossmint/crossmint-sdk.git', :tag => "crossmint-expo-device-signer@#{s.version}" }
  s.source_files   = 'DeviceSignerModule.swift'
  s.swift_version  = '5.10'

  s.dependency 'ExpoModulesCore'
  s.dependency 'CrossmintDeviceSigner'
end
