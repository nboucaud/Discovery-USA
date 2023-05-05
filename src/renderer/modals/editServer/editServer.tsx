// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import 'bootstrap/dist/css/bootstrap.min.css';
import 'renderer/css/modals.css';

import React, {useEffect, useState} from 'react';
import ReactDOM from 'react-dom';

import {UniqueServer} from 'types/config';

import IntlProvider from 'renderer/intl_provider';

import NewServerModal from '../../components/NewServerModal'; //'./addServer.jsx';

import setupDarkMode from '../darkMode';

setupDarkMode();

type ModalInfo = {
    server: UniqueServer;
    currentServers: UniqueServer[];
};

const onClose = () => {
    window.desktop.modals.cancelModal();
};

const onSave = (data: UniqueServer) => {
    window.desktop.modals.finishModal(data);
};

const EditServerModalWrapper: React.FC = () => {
    const [server, setServer] = useState<UniqueServer>();
    const [currentServers, setCurrentServers] = useState<UniqueServer[]>();

    useEffect(() => {
        window.desktop.modals.getModalInfo<ModalInfo>().then(({server, currentServers}) => {
            setServer(server);
            setCurrentServers(currentServers);
        });
    }, []);

    return (
        <IntlProvider>
            <NewServerModal
                onClose={onClose}
                onSave={onSave}
                editMode={true}
                show={Boolean(server)}
                server={server}
                currentServers={currentServers}
            />
        </IntlProvider>
    );
};

const start = async () => {
    ReactDOM.render(
        <EditServerModalWrapper/>,
        document.getElementById('app'),
    );
};

start();
