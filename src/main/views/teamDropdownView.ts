// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BrowserView, ipcMain, IpcMainEvent} from 'electron';

import {MattermostTeam} from 'types/config';

import AppState from 'common/appState';
import {
    CLOSE_TEAMS_DROPDOWN,
    EMIT_CONFIGURATION,
    OPEN_TEAMS_DROPDOWN,
    UPDATE_TEAMS_DROPDOWN,
    UPDATE_APPSTATE,
    REQUEST_TEAMS_DROPDOWN_INFO,
    RECEIVE_DROPDOWN_MENU_SIZE,
    SERVERS_UPDATE,
} from 'common/communication';
import Config from 'common/config';
import {Logger} from 'common/log';
import {TAB_BAR_HEIGHT, THREE_DOT_MENU_WIDTH, THREE_DOT_MENU_WIDTH_MAC, MENU_SHADOW_WIDTH} from 'common/utils/constants';
import ServerManager from 'common/servers/serverManager';

import {getLocalPreload, getLocalURLString} from 'main/utils';

import MainWindow from '../windows/mainWindow';

const log = new Logger('TeamDropdownView');

export class TeamDropdownView {
    private view?: BrowserView;
    private teams: MattermostTeam[];
    private hasGPOTeams: boolean;
    private isOpen: boolean;
    private bounds: Electron.Rectangle;

    private unreads: Map<string, boolean>;
    private mentions: Map<string, number>;
    private expired: Map<string, boolean>;

    private windowBounds?: Electron.Rectangle;

    constructor() {
        this.teams = [];
        this.hasGPOTeams = false;
        this.isOpen = false;
        this.bounds = this.getBounds(0, 0);

        this.unreads = new Map();
        this.mentions = new Map();
        this.expired = new Map();

        ipcMain.on(OPEN_TEAMS_DROPDOWN, this.handleOpen);
        ipcMain.on(CLOSE_TEAMS_DROPDOWN, this.handleClose);
        ipcMain.on(RECEIVE_DROPDOWN_MENU_SIZE, this.handleReceivedMenuSize);

        ipcMain.on(EMIT_CONFIGURATION, this.updateDropdown);
        ipcMain.on(REQUEST_TEAMS_DROPDOWN_INFO, this.updateDropdown);

        AppState.on(UPDATE_APPSTATE, this.updateMentions);
        ServerManager.on(SERVERS_UPDATE, this.updateServers);
    }

    init = () => {
        const preload = getLocalPreload('desktopAPI.js');
        this.view = new BrowserView({webPreferences: {
            preload,

            // Workaround for this issue: https://github.com/electron/electron/issues/30993
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            transparent: true,
        }});
        this.view.webContents.loadURL(getLocalURLString('dropdown.html'));

        this.setOrderedTeams();
        this.windowBounds = MainWindow.getBounds();
        this.updateDropdown();
        MainWindow.get()?.addBrowserView(this.view);
    }

    updateWindowBounds = () => {
        this.windowBounds = MainWindow.getBounds();
        this.updateDropdown();
    }

    private updateDropdown = () => {
        log.silly('updateDropdown');

        this.view?.webContents.send(
            UPDATE_TEAMS_DROPDOWN,
            this.teams,
            Config.darkMode,
            this.windowBounds,
            ServerManager.hasServers() ? ServerManager.getCurrentServer().id : undefined,
            Config.enableServerManagement,
            this.hasGPOTeams,
            this.expired,
            this.mentions,
            this.unreads,
        );
    }

    private updateServers = () => {
        this.setOrderedTeams();
        this.updateDropdown();
    }

    private updateMentions = (expired: Map<string, boolean>, mentions: Map<string, number>, unreads: Map<string, boolean>) => {
        log.silly('updateMentions', {expired, mentions, unreads});

        this.unreads = this.reduceNotifications(this.unreads, unreads, (base, value) => base || value || false);
        this.mentions = this.reduceNotifications(this.mentions, mentions, (base, value) => (base ?? 0) + (value ?? 0));
        this.expired = this.reduceNotifications(this.expired, expired, (base, value) => base || value || false);
        this.updateDropdown();
    }

    /**
     * Menu open/close/size handlers
     */

    private handleOpen = () => {
        log.debug('handleOpen');

        if (!this.bounds) {
            return;
        }
        if (!this.view) {
            return;
        }
        this.view.setBounds(this.bounds);
        MainWindow.get()?.setTopBrowserView(this.view);
        this.view.webContents.focus();
        MainWindow.sendToRenderer(OPEN_TEAMS_DROPDOWN);
        this.isOpen = true;
    }

    private handleClose = () => {
        log.debug('handleClose');

        this.view?.setBounds(this.getBounds(0, 0));
        MainWindow.sendToRenderer(CLOSE_TEAMS_DROPDOWN);
        this.isOpen = false;
    }

    private handleReceivedMenuSize = (event: IpcMainEvent, width: number, height: number) => {
        log.silly('handleReceivedMenuSize', {width, height});

        this.bounds = this.getBounds(width, height);
        if (this.isOpen) {
            this.view?.setBounds(this.bounds);
        }
    }

    /**
     * Helpers
     */

    private getBounds = (width: number, height: number) => {
        return {
            x: (process.platform === 'darwin' ? THREE_DOT_MENU_WIDTH_MAC : THREE_DOT_MENU_WIDTH) - MENU_SHADOW_WIDTH,
            y: TAB_BAR_HEIGHT - MENU_SHADOW_WIDTH,
            width,
            height,
        };
    }

    private reduceNotifications = <T>(inputMap: Map<string, T>, items: Map<string, T>, modifier: (base?: T, value?: T) => T) => {
        return [...items.keys()].reduce((map, key) => {
            const view = ServerManager.getTab(key);
            if (!view) {
                return map;
            }
            map.set(view.server.id, modifier(map.get(view.server.id), items.get(key)));
            return map;
        }, inputMap);
    }

    private setOrderedTeams = () => {
        this.teams = ServerManager.getOrderedServers().map((team) => team.toMattermostTeam());
        this.hasGPOTeams = this.teams.some((srv) => srv.isPredefined);
    }
}

const teamDropdownView = new TeamDropdownView();
export default teamDropdownView;
