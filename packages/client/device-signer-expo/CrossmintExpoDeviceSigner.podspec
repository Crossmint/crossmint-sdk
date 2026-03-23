require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'CrossmintExpoDeviceSigner'
  s.version      = package['version']
  s.summary      = package['description']
  s.license      = package['license']
  s.author       = 'Paella Labs Inc'
  s.homepage     = 'https://github.com/Crossmint/crossmint-sdk'
  s.platforms    = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.source       = { :path => '.' }
  s.source_files = 'ios/**/*.{h,m,mm,swift}'

  s.dependency 'ExpoModulesCore'
  s.dependency 'CrossmintDeviceSigner', '~> 0.11.1'
end
