#import "AppDelegate.h"
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <Firebase.h>

@implementation AppDelegate

- (NSString *)moduleName {
  return @"luxury_lodging_mobile";
}

- (NSDictionary *)initialProps {
  return @{};
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [FIRApp configure];
  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
