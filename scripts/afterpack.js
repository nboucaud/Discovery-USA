// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const path = require('path');
const fs = require('fs');

const {spawn} = require('electron-notarize/lib/spawn.js');

const SETUID_PERMISSIONS = '4755';

const {flipFuses, FuseVersion, FuseV1Options} = require('@electron/fuses');

function fixSetuid(context) {
    return async (target) => {
        if (!['appimage', 'snap'].includes(target.name.toLowerCase())) {
            const result = await spawn('chmod', [SETUID_PERMISSIONS, path.join(context.appOutDir, 'chrome-sandbox')]);
            if (result.code !== 0) {
                throw new Error(
                    `Failed to set proper permissions for linux arch on ${target.name}`,
                );
            }
        }
    };
}

function getAppFileName(context) {
    switch (context.electronPlatformName) {
    case 'win32':
        return 'Mattermost.exe';
    case 'darwin':
    case 'mas':
        return 'Mattermost.app';
    case 'linux':
        return context.packager.executableName;
    default:
        return '';
    }
}

function replaceTerminalIconForNotifications(context) {
    if (context.electronPlatformName === 'darwin') {
        console.log({context});
        try {
            fs.copyFileSync(
                path.join(__dirname, 'src/assets/Terminal.icns'),
                path.join(context.appOutDir, 'app.asar.unpacked/node_modules/node-notifier/vendor/mac.noindex/terminal-notifier.app/Contents/Resources/Terminal.icns'),
            );
        } catch (error) {
            throw new Error(
                'Failed to replace Terminal icon for Macos',
            );
        }
    }
}

exports.default = async function afterPack(context) {
    await flipFuses(
        `${context.appOutDir}/${getAppFileName(context)}`, // Returns the path to the electron binary
        {
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false, // Disables ELECTRON_RUN_AS_NODE
        });

    if (context.electronPlatformName === 'linux') {
        context.targets.forEach(fixSetuid(context));
    }

    if (context.electronPlatformName === 'darwin') {
        replaceTerminalIconForNotifications(context);
    }
};
