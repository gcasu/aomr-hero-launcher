/**
 * User configuration keys for game settings
 * These correspond to configuration options that can be enabled/disabled in user.cfg
 */
export const USER_CONFIG_KEYS = [
  'aiDebug',
  'aiShowBPValueText',
  'dataValidation',
  'dataValidationOnDebugRandomMaps',
  'debugOutputGameData',
  'debugRandomMaps',
  'debugTriggers',
  'developer',
  'disableAssetPreloading',
  'enableTriggerEcho',
  'generateAIConstants',
  'generateRMConstants',
  'generateTRConstants',
  'noIntroCinematics',
  'showAIEchoes',
  'showAIOutput'
] as const;

export type UserConfigKey = typeof USER_CONFIG_KEYS[number];
