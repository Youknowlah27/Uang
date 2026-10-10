import {Config} from '@remotion/cli/config';

// Sandbox has a pre-installed Chromium; point Remotion at it instead of downloading one.
Config.setBrowserExecutable('/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setConcurrency(4);
Config.setOverwriteOutput(true);
