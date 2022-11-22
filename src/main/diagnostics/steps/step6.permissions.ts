// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import fs from 'fs';

import {Notification} from 'electron';
import log, {ElectronLog} from 'electron-log';
import {DiagnosticStepResponse} from 'types/diagnostics';

import DiagnosticsStep from '../DiagnosticStep';
import config from 'common/config';

import {checkPathPermissions} from './internal/utils';

const stepName = 'Step-6';
const stepDescriptiveName = 'PermissionsCheck';

const run = async (logger: ElectronLog): Promise<DiagnosticStepResponse> => {
    try {
        logger.debug(`Diagnostics ${stepName} run`);

        const downloadsFileAccess = await checkPathPermissions(config.downloadLocation, fs.constants.W_OK);
        const logsFileAccess = await checkPathPermissions(log.transports.file.getFile().path, fs.constants.W_OK);

        const payload = {
            notificationsSupported: Notification.isSupported(),
            fileSystem: {
                downloadsFileAccess,
                logsFileAccess,
            },
        };

        return {
            message: `${stepName} finished successfully`,
            succeeded: true,
            payload,
        };
    } catch (error) {
        logger.warn(`Diagnostics ${stepName} Failure`, {error});
        return {
            message: `${stepName} failed`,
            succeeded: false,
            payload: error,
        };
    }
};

const Step6 = new DiagnosticsStep({
    name: `diagnostic-${stepName}/${stepDescriptiveName}`,
    retries: 0,
    run,
});

export default Step6;
